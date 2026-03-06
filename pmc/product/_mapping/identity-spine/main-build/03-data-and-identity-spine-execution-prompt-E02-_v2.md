# Data & Identity Spine — Execution Prompt E02: CRITICAL Route Security Fixes

**Version:** 2.0
**Date:** 2026-02-22
**Section:** E02 — CRITICAL Route Fixes (Phase 4) + Service Layer Refactoring
**Prerequisites:** E01 must be complete (requireAuthOrCron exists, user_id columns exist, data backfilled)
**Builds Upon:** E01 artifacts
**Specification Source:** `02-data-and-identity-spine-detailed-specification_v6.md`

---

## Changelog from v1 → v2

| # | Update | Reason |
|---|--------|--------|
| 1 | `supabase-server.ts` updated line numbers (file now 215 lines, `requireAuth` at L148, `requireAuthOrCron` at L180–213) | E01 was executed — file grew from ~168 to 215 lines |
| 2 | `conversations/[id]/download/route.ts` marked ALREADY COMPLETE | Already has `requireAuth` (added prior to E02). Removed from C1-adj list. |
| 3 | Dual conversation service files documented | Both `src/lib/conversation-service.ts` (1001 lines) and `src/lib/services/conversation-service.ts` (590 lines) use the deprecated singleton. Primary fix is the 1001-line file. |
| 4 | `batch-job-service.ts` identified as object literal, not a class | Service is exported as `batchJobService = { ... }` using a `getSupabase()` factory, not a constructor-based class. Correct modification approach is adding `userId` parameters to each method. |
| 5 | Added `export/history/route.ts` and `export/status/[id]/route.ts` to scope | Both discovered to use `x-user-id` spoofable header (same pattern as other export routes). |
| 6 | TypeScript compilation: run from `src/` directory | E01 execution found `tsconfig.json` lives in `src/`, not repo root. |
| 7 | Accurate current-state line numbers updated throughout | Verified by direct codebase inspection on 2026-02-22. |

---

## Division of Work Across All 4 Prompts

| Prompt | Phases | Description |
|--------|--------|-------------|
| **E01** (complete) | 0, 1, 2, 3 | Preflight verification, auth infrastructure, DB schema migration, data backfill |
| **E02 (this file)** | 4 + service layer | CRITICAL route security fixes (C1–C16 + C17–C18), batch-job-service & conversation-service refactoring |
| **E03** | 5, 6 | HIGH route/service fixes (H1–H15), MEDIUM fixes (M1–M13), RAG gap fixes |
| **E04** | 7, 8 + tests | Database constraints & RLS, cleanup, deprecated code removal, testing |

---

========================


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Verify E01 artifacts exist** before proceeding (see Preflight section below)

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application.

### Codebase Structure

```
v4-show/
├── src/
│   ├── app/api/                      # API routes (target of this prompt)
│   │   ├── conversations/            # 22+ route files
│   │   ├── batch-jobs/               # 3 route files
│   │   ├── pipeline/jobs/            # Pipeline routes including download
│   │   ├── export/                   # 8+ route files (conversations, download, history, status, etc.)
│   │   └── import/                   # 3 route files (templates, scenarios, edge-cases)
│   ├── lib/
│   │   ├── supabase-server.ts        # Auth helpers (requireAuth at L148, requireAuthOrCron at L180–213)
│   │   ├── conversation-service.ts   # PRIMARY conversation service, 1001 lines, deprecated singleton
│   │   └── services/                 # Business logic services
│   │       ├── batch-job-service.ts  # Batch job operations (606 lines), object literal pattern
│   │       └── conversation-service.ts # Secondary conversation service (590 lines), deprecated singleton
│   └── types/                        # TypeScript type definitions
├── supa-agent-ops/                   # SAOL library (CLI only, NOT for codebase imports)
└── supabase/                         # Supabase config
```

---

## SAOL — Mandatory for All Database Operations

**You MUST use SAOL for ALL database DDL/DML operations.** SAOL is a CLI tool, NOT imported into the codebase.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`YOUR_SQL\`,dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## Gold Standard Reference Pattern

From `src/app/api/datasets/route.ts` — the target pattern for ALL routes:

```typescript
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401 if unauthenticated

  const { supabase } = createServerSupabaseClientFromRequest(request);
  const { data } = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)       // ← SCOPED to authenticated user
    .order('created_at', { ascending: false });
  // ...
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { data } = await supabase
    .from('datasets')
    .insert({
      user_id: user.id,            // ← OWNERSHIP stamped
      // ... other fields
    });
  // ...
}
```

**Status code convention for ownership failures:**
- **Single resource by ID:** Return `404 Not found` (do NOT reveal existence to non-owners)
- **Bulk operations:** Silently skip non-owned resources; return count of affected vs. skipped
- **Downloads:** Return `404 Not found`

---

## E01 Artifact Verification (Preflight)

Before starting E02 work, verify E01 completed successfully:

```bash
# 1. Verify requireAuthOrCron exists at lines 180-213
grep -n "export async function requireAuthOrCron" src/lib/supabase-server.ts
# Expected: "180:export async function requireAuthOrCron"

# 2. Verify requireAuth exists at line 148
grep -n "export async function requireAuth" src/lib/supabase-server.ts
# Expected: "148:export async function requireAuth"

# 3. Verify supabase-server.ts is now 215 lines
wc -l src/lib/supabase-server.ts
# Expected: 215

# 4. Verify user_id columns exist on all 6 legacy tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='user_id'
AND table_name IN ('conversations','training_files','batch_jobs','generation_logs','failed_generations','documents')
ORDER BY table_name;\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"
# Expected: 6 rows — one per table

# 5. Verify zero orphan user_id NULLs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL) FROM training_files;\`,transport:'pg'});
console.log(JSON.stringify(r.rows,null,2));})();"
# Expected: nulls = 0 for all tables (or records are logged in _orphaned_records)
```

**All 5 checks must pass before proceeding.**

---

## What This Prompt Implements

This prompt implements **Phase 4 (CRITICAL Route Fixes)** plus the **service layer changes** that Phase 4 routes depend on:

| Section | Changes | Files Modified |
|---------|---------|---------------|
| Service Layer | 5.16, 5.18 | `batch-job-service.ts`, `conversation-service.ts` (both files) |
| Conversations Routes | 4.1–4.7, 4.17 | 18 route files |
| Batch Jobs Routes | 4.8–4.10 | 3 route files |
| Pipeline Download | 4.11 | 1 route file |
| Export Routes | 4.12–4.15 | 4 route files |
| Import Routes | 4.16–4.18 | 3 route files |

**Build Artifacts Produced for E03:**
- All CRITICAL routes secured with `requireAuth`
- `batch-job-service.ts` methods have mandatory `userId` parameter
- `src/lib/conversation-service.ts` (primary) accepts injected Supabase client
- `src/lib/services/conversation-service.ts` (secondary) accepts injected Supabase client
- All `x-user-id` header reads removed from CRITICAL routes
- All NIL UUID fallbacks removed from CRITICAL routes

---

## Service Layer Changes (Deploy Atomically With Route Changes)

### Change 5.16: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter

**File:** `src/lib/services/batch-job-service.ts` (606 lines)

**Current state (verified 2026-02-22):**
- Exported as `batchJobService` object literal — NOT a class. Uses `getSupabase()` factory function that calls `createServerSupabaseAdminClient()` on each call (bypasses RLS — ownership checks MUST be done at application layer).
- `getAllJobs(filters?: { status?: BatchJobStatus; createdBy?: string })` at L201 — `createdBy` is OPTIONAL
- `getJobById(id: string)` at L129 — NO userId parameter
- `cancelJob(id: string)` at L497 — NO userId parameter
- `deleteJob(id: string)` at L581 — NO userId parameter
- `getActiveJobs(userId: string)` — ALREADY correct

**⚠️ IMPORTANT (Admin Client Pattern):** Because `batch-job-service.ts` uses `createServerSupabaseAdminClient` (bypasses RLS), ownership checks must be done explicitly in application code: fetch the record, then compare `job.createdBy !== userId`.

**Modifications:**

1. **`getAllJobs`** — Make `userId` mandatory first parameter, remove `createdBy` from filters:
   ```typescript
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     const supabase = getSupabase();
     try {
       let query = supabase
         .from('batch_jobs')
         .select('*')
         .eq('created_by', userId);  // ← ALWAYS scope to userId
       
       if (filters?.status) {
         query = query.eq('status', filters.status);
       }
       query = query.order('created_at', { ascending: false });
       // ... rest of implementation unchanged
     }
   }
   ```

2. **`getJobById`** — Add mandatory `userId`, return `null` when not owned:
   ```typescript
   async getJobById(id: string, userId: string): Promise<BatchJob | null> {
     const supabase = getSupabase();
     try {
       const { data: jobData, error: jobError } = await supabase
         .from('batch_jobs')
         .select('*')
         .eq('id', id)
         .single();

       if (jobError) throw jobError;
       if (!jobData) return null;
       
       // Ownership check — admin client bypasses RLS so we check explicitly
       if (jobData.created_by !== userId) return null;

       // ... rest of mapping unchanged
     }
   }
   ```
   **Note:** Change return type from `Promise<BatchJob>` to `Promise<BatchJob | null>`.

3. **`cancelJob`** — Add mandatory `userId`:
   ```typescript
   async cancelJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId);
     if (!job) throw new Error('Job not found or not owned by user');
     // ... rest unchanged
   }
   ```
   **Note:** This is an object literal — use `batchJobService.getJobById(id, userId)` internally, not `this.getJobById`.

4. **`deleteJob`** — Add mandatory `userId`:
   ```typescript
   async deleteJob(id: string, userId: string): Promise<void> {
     const job = await batchJobService.getJobById(id, userId);
     if (!job) throw new Error('Job not found or not owned by user');
     // ... rest unchanged
   }
   ```

**⚠️ WARNING (W4):** Changing these method signatures is a BREAKING change. Every caller will fail until updated. This is why E02 deploys service + route changes atomically.

---

### Change 5.18: `src/lib/conversation-service.ts` (PRIMARY) — Migrate from Deprecated Singleton

**File:** `src/lib/conversation-service.ts` (1001 lines)

**Current state (verified 2026-02-22):**
- Line 8: `import { supabase } from './supabase';` — **deprecated singleton** (null on server side)
- Exported as `conversationService` object literal
- Used by: `conversations/[id]/route.ts`, `conversations/bulk-action/route.ts`, `conversations/stats/route.ts`, `conversations/[id]/turns/route.ts`

**Modifications:**

1. Replace the import:
   ```typescript
   // REMOVE: import { supabase } from './supabase';
   import { SupabaseClient } from '@supabase/supabase-js';
   import { createServerSupabaseAdminClient } from './supabase-server';
   ```

2. Since this is an object literal (not a class), add a factory function approach:
   ```typescript
   // Add above the conversationService object:
   function getSupabase(): SupabaseClient {
     return createServerSupabaseAdminClient();
   }
   
   export const conversationService = {
     // ... all existing methods
     // Replace every use of `supabase.from(...)` with `getSupabase().from(...)`
     // OR: create supabase const at start of each method:
     //   const supabase = getSupabase();
   }
   ```

3. **Export a factory function** for route callers that need a request-scoped client:
   ```typescript
   export function createConversationService(supabaseClient: SupabaseClient) {
     // Return object with same interface but using the provided client
     // This is for future migration to request-scoped clients
     return {
       ...conversationService,
       // Override methods that need the injected client
     };
   }
   ```

4. Route callers that currently use `conversationService` directly continue to work — the `getSupabase()` factory gets a fresh client per call (same pattern as `batch-job-service.ts`).

---

### Change 5.18b: `src/lib/services/conversation-service.ts` (SECONDARY) — Same Migration

**File:** `src/lib/services/conversation-service.ts` (590 lines)

**Current state (verified 2026-02-22):**
- Line 11: `import { supabase } from '../supabase';` — **deprecated singleton**
- Exported as `conversationService` object literal (separate from the primary file above)

**Modifications:** Apply the same factory function pattern as Change 5.18 above:
1. Remove `import { supabase } from '../supabase';`
2. Add `import { createServerSupabaseAdminClient } from '../supabase-server';`
3. Add `function getSupabase() { return createServerSupabaseAdminClient(); }`
4. Replace all `supabase.from(...)` calls with a local `const supabase = getSupabase();` at the top of each method.

---

## Phase 4 — CRITICAL Route Fixes (C1–C18)

Every change in this phase follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';` at top
2. Add auth guard: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries (`.eq('created_by', user.id)` or ownership check post-fetch)
5. Remove NIL UUID and `'test-user'` / `'test_user'` fallbacks

---

### Change 4.1: `src/app/api/conversations/route.ts` — Replace Spoofable Auth (C1)

**Current state (verified 2026-02-22):**
- GET line 31: `request.headers.get('x-user-id') || undefined` — spoofable
- POST line 66: `request.headers.get('x-user-id') || 'test-user'` — spoofable hardcoded fallback
- Uses `getConversationStorageService()` from `@/lib/services/conversation-storage-service`
- Does NOT import `requireAuth`

**Modifications:**

1. Add import at top:
   ```typescript
   import { requireAuth } from '@/lib/supabase-server';
   ```

2. **GET handler** — Replace spoofable auth:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || undefined;
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```
   Ensure the listing query filters by `created_by = userId` (or `user_id = userId`).

3. **POST handler** — Replace spoofable auth:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || 'test-user';
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```
   Ensure `created_by: userId` and `user_id: userId` are both passed to the insert.

**Acceptance Criteria:**
- **GIVEN** a GET without auth cookies **THEN** 401
- **GIVEN** a GET with valid auth for User A **THEN** only conversations where `created_by = user.id`
- **GIVEN** a request with `x-user-id` header AND valid auth cookie **THEN** header is IGNORED

---

### Change 4.2: `src/app/api/conversations/[id]/route.ts` — Add Auth + Ownership (C2)

**Current state (verified 2026-02-22):**
- ~123 lines. ZERO auth on GET, PATCH, DELETE.
- Imports `conversationService` from `@/lib/conversation-service` (the 1001-line primary service)

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`
2. Add auth guard to ALL handlers (GET, PATCH, DELETE).
3. After fetching conversation by ID, add ownership check:
   ```typescript
   if (!conversation || conversation.created_by !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**Acceptance Criteria:**
- **GIVEN** User A requests GET/PATCH/DELETE for User B's conversation **THEN** 404 (do not reveal existence)
- **GIVEN** unauthenticated **THEN** 401

---

### Change 4.3: `src/app/api/conversations/[id]/status/route.ts` — Replace Spoofable Auth (C3)

**Current state (verified 2026-02-22):**
- PATCH line 31: `x-user-id || 'test-user'`
- Imports `getConversationStorageService` from `@/lib/services/conversation-storage-service`

**Modifications:**
1. Add `requireAuth` import.
2. Add auth guard + ownership check on both GET and PATCH.
3. Remove `x-user-id` header read and `'test-user'` fallback.
4. Use `user.id` from `requireAuth`.

---

### Change 4.4: `src/app/api/conversations/bulk-action/route.ts` — Add Auth + Scope (C4)

**Current state (verified 2026-02-22):**
- ZERO auth. `reviewerId` from request body (optional UUID).
- Imports `conversationService` from `@/lib/conversation-service`

**Modifications:**
1. Add `requireAuth` guard.
2. Replace body `reviewerId` with `user.id`.
3. Filter `conversationIds` to those owned by `user.id`:
   ```typescript
   const { supabase } = createServerSupabaseClientFromRequest(request);
   const { data: ownedConvs } = await supabase
     .from('conversations')
     .select('id')
     .in('id', conversationIds)
     .eq('created_by', user.id);
   const ownedIds = new Set((ownedConvs || []).map(c => c.id));
   const filteredIds = conversationIds.filter(id => ownedIds.has(id));
   const skippedCount = conversationIds.length - filteredIds.length;
   ```
4. Return skipped count in response.

**Acceptance Criteria:**
- **GIVEN** User A sends bulk-action with mix of owned and non-owned IDs **THEN** only owned conversations affected; skipped count returned

---

### Change 4.5: `src/app/api/conversations/bulk-enrich/route.ts` — Add Auth + Ownership (C5)

**Current state (verified 2026-02-22):**
- ZERO auth. NIL UUID at line ~113: `conversation.created_by || '00000000-0000-0000-0000-000000000000'`

**Modifications:**
1. Add `requireAuth` guard.
2. Remove NIL UUID fallback.
3. Per-conversation ownership check in loop:
   ```typescript
   if (conversation.created_by !== user.id) {
     results.push({ conversationId, status: 'skipped', error: 'Not owned' });
     continue;
   }
   ```

---

### Change 4.6: `src/app/api/conversations/generate/route.ts` — Add Auth, Remove Body userId (C6)

**Current state (verified 2026-02-22):**
- ~135 lines. ZERO auth. NIL UUID fallback at line ~31: `validated.userId || '00000000-0000-0000-0000-000000000000'`

**Modifications:**
1. Add `requireAuth` guard.
2. Replace NIL UUID with `user.id`.
3. Mark body `userId` as ignored if present: `// userId from body is IGNORED — use authenticated user.id`
4. Pass `user.id` as the `userId` for conversation creation.

---

### Change 4.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId (C7)

**Current state (verified 2026-02-22):**
- ~147 lines. ZERO auth. NIL UUID at line ~38: `validated.userId || '00000000-0000-0000-0000-000000000000'`

**Modifications:** Same pattern as Change 4.6.

---

### Change 4.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping (C8)

**Current state (verified 2026-02-22):**
- ZERO auth. Optional `createdBy` filter from query string (line 19) — returns all users' jobs if omitted.
- Passes filter to `batchJobService.getAllJobs(filters)`.

**Modifications:**
1. Add `requireAuth` guard.
2. **FORCE** user scoping — override any `createdBy` query param:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   
   // Override any client-supplied createdBy — always scope to authenticated user
   const jobs = await batchJobService.getAllJobs(user.id, status ? { status } : undefined);
   ```

**Acceptance Criteria:**
- **GIVEN** User A requests `GET /api/batch-jobs?createdBy=<User B UUID>` **THEN** param OVERRIDDEN with `user.id` — only User A's jobs returned

---

### Change 4.9: `src/app/api/batch-jobs/[id]/cancel/route.ts` — Add Auth + Ownership (C9)

**Current state (verified 2026-02-22):**
- ZERO auth. Anyone can cancel any job.

**Modifications:**
1. Add `requireAuth` guard.
2. Use `batchJobService.cancelJob(id, user.id)` (uses updated signature from Change 5.16).
3. If job not found (null from ownership check), return 404.

---

### Change 4.10: `src/app/api/batch-jobs/[id]/process-next/route.ts` — Add Auth + Ownership (C10)

**Current state (verified 2026-02-22):**
- ZERO auth. NIL UUID at line 20: `const NIL_UUID = '00000000-0000-0000-0000-000000000000';` and used at line 299.

**Modifications:**
1. Add `requireAuth` guard.
2. Add ownership check after job fetch using `batchJobService.getJobById(id, user.id)`.
3. Remove NIL_UUID constant and its fallback usages.
4. **IMPORTANT (W2):** For the actual generation processing, use `job.createdBy` from the DB record (not the live session) for the `userId` passed to generation functions:
   ```typescript
   const pipelineUserId = job.createdBy; // Stored at job creation time
   ```

---

### Change 4.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership (C11)

**Current state (verified 2026-02-22):**
- ~222 lines. ZERO auth. Uses `getPipelineJob(jobId)` from `@/lib/services/pipeline-service`. No `requireAuth`, no `x-user-id`. **IP THEFT RISK** — anyone knowing a `jobId` can download trained LoRA adapters.

**Modifications:**
1. Add import: `import { requireAuth } from '@/lib/supabase-server';`
2. Add `requireAuth` guard.
3. After fetching the pipeline job, add ownership check:
   ```typescript
   if (!job || job.user_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**Note:** Pipeline jobs use `user_id` (not `created_by`) as the ownership column.

---

### Change 4.12: `src/app/api/export/conversations/route.ts` — Replace Spoofable Auth + Scope (C12)

**Current state (verified 2026-02-22):**
- ~357 lines. Line 68: `x-user-id` header + NIL UUID fallback. Conversations query has NO user scope.

**Modifications:**
1. Replace spoofable auth with `requireAuth`.
2. **CRITICAL:** Add `.eq('created_by', userId)` to the conversation query so users can only export their own conversations.
3. Also add `.eq('user_id', userId)` to the export_logs insert.

---

### Change 4.13: `src/app/api/export/download/[id]/route.ts` — Replace Spoofable Auth (C13)

**Current state (verified 2026-02-22):**
- ~263 lines. Line 54: `x-user-id` + NIL UUID. Has an ownership check at line ~70 but it's spoofable because userId is from the header.

**Modifications:**
1. Replace `x-user-id` read with `requireAuth`.
2. The existing ownership check becomes valid because `userId` now comes from auth.
3. **WARNING (W7):** If there is a regeneration helper that queries conversations, add `.eq('created_by', userId)` to that query too.

---

### Change 4.14: `src/app/api/export/history/route.ts` — Replace Spoofable Auth (C14 — new in v2)

**Current state (verified 2026-02-22):**
- Line 58: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'` — spoofable
- Queries export history scoped to `user_id`

**Modifications:**
1. Replace `x-user-id` read with `requireAuth`.
2. Scope query to `user.id` from auth (remove NIL UUID fallback).

---

### Change 4.15: `src/app/api/export/status/[id]/route.ts` — Replace Spoofable Auth (C15 — new in v2)

**Current state (verified 2026-02-22):**
- Line 58: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'` — spoofable

**Modifications:**
1. Replace `x-user-id` read with `requireAuth`.
2. Add ownership check to export status lookup.

---

### Change 4.16: `src/app/api/import/templates/route.ts` — Add Auth (C16, was C14 in v1)

**Current state (verified 2026-02-22):**
- ZERO auth. Uses `createClient()` from `@/lib/supabase/server` and `TemplateService`.

**Modifications:**
1. Add `requireAuth` guard.
2. Stamp `created_by: user.id` and `user_id: user.id` on imported records.

---

### Change 4.17: `src/app/api/import/scenarios/route.ts` — Add Auth (C17, was C15 in v1)

**Modifications:** Same pattern as Change 4.16.

---

### Change 4.18: `src/app/api/import/edge-cases/route.ts` — Add Auth (C18, was C16 in v1)

**Modifications:** Same pattern as Change 4.16.

---

### Change 4.19: Secure Remaining Conversation Sub-Routes (C1-adjacent)

These routes have ZERO auth and must all follow the same pattern. **EXCLUDE:**
- `generate-with-scaffolding/route.ts` — Already uses `requireAuth` ✅
- `conversations/[id]/download/route.ts` — **Already uses `requireAuth`** ✅ (done prior to E02)

| Route | Handler(s) | Required Change |
|-------|-----------|-----------------|
| `conversations/[id]/turns/route.ts` | GET, POST | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/link-chunk/route.ts` | POST | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/unlink-chunk/route.ts` | POST | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/enrich/route.ts` | POST | `requireAuth`; replace NIL UUID at ~L57 with `user.id`; add ownership check |
| `conversations/[id]/validation-report/route.ts` | GET | `requireAuth` + verify parent conversation ownership |
| `conversations/orphaned/route.ts` | GET | `requireAuth`; scope to user's orphaned conversations |
| `conversations/stats/route.ts` | GET | `requireAuth`; scope stats to `created_by = user.id` |
| `conversations/by-chunk/[chunkId]/route.ts` | GET | `requireAuth`; scope results to user's conversations |
| `conversations/batch/[id]/route.ts` | GET | `requireAuth` + verify batch job ownership |
| `conversations/batch/[id]/status/route.ts` | GET | `requireAuth` + verify batch job ownership |
| `conversations/batch/[id]/items/route.ts` | GET | `requireAuth` + verify batch job ownership |

**Note:** `conversations/[id]/turns/route.ts` imports from `@/lib/conversation-service` (primary 1001-line service) — this will benefit from Change 5.18 being done first.

**Pattern for `[id]` sub-routes:**
```typescript
import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  // Verify parent conversation ownership
  const { supabase } = createServerSupabaseClientFromRequest(request);
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, created_by')
    .eq('id', params.id)
    .single();
    
  if (!conversation || conversation.created_by !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  // ... proceed with the actual operation
}
```

**Pattern for batch sub-routes:**
```typescript
// Verify batch job ownership
const job = await batchJobService.getJobById(params.id, user.id);
if (!job) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

## Checkpoint Verification — After Phase 4

**Test T5 — Unauthenticated Rejection** (ALL should return 401):

| Endpoint | Method |
|----------|--------|
| `/api/conversations` | GET, POST |
| `/api/conversations/{id}` | GET, PATCH, DELETE |
| `/api/conversations/{id}/status` | PATCH |
| `/api/conversations/{id}/turns` | GET, POST |
| `/api/conversations/{id}/link-chunk` | POST |
| `/api/conversations/{id}/unlink-chunk` | POST |
| `/api/conversations/{id}/enrich` | POST |
| `/api/conversations/bulk-action` | POST |
| `/api/conversations/bulk-enrich` | POST |
| `/api/conversations/generate` | POST |
| `/api/conversations/generate-batch` | POST |
| `/api/conversations/stats` | GET |
| `/api/conversations/orphaned` | GET |
| `/api/batch-jobs` | GET |
| `/api/batch-jobs/{id}/cancel` | POST |
| `/api/batch-jobs/{id}/process-next` | POST |
| `/api/pipeline/jobs/{id}/download` | GET |
| `/api/export/conversations` | POST |
| `/api/export/download/{id}` | GET |
| `/api/export/history` | GET |
| `/api/export/status/{id}` | GET |
| `/api/import/templates` | POST |
| `/api/import/scenarios` | POST |
| `/api/import/edge-cases` | POST |

**Test T6 — Spoofed Header Ignored:**
1. Auth as User A
2. Send request with `x-user-id: <User B's UUID>` header
3. Verify response contains ONLY User A's data

**Test T1 — Cross-User List Isolation:**
1. User A creates conversation + batch job
2. User B lists conversations, batch jobs
3. Verify zero results from User A visible

**Test T3 — Cross-User Mutation Isolation:**
1. User A creates conversation
2. User B tries PATCH/DELETE on that conversation
3. Verify 404 returned, conversation unchanged

### Verification Commands:

```bash
# Verify no x-user-id reads remain in CRITICAL routes
grep -rn "x-user-id" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/export/conversations/ src/app/api/export/download/ src/app/api/export/history/ src/app/api/export/status/ src/app/api/import/ --include="*.ts"
# Expected: zero matches (excluding __tests__ files)

# Verify no NIL UUID fallbacks remain in CRITICAL routes
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/pipeline/jobs/ src/app/api/export/ src/app/api/import/ --include="*.ts"
# Expected: zero matches in non-test route files

# Verify no test-user fallbacks remain
grep -rn "'test-user'\|\"test-user\"" src/app/api/conversations/ --include="*.ts"
# Expected: zero matches

# Verify requireAuth is used in all target routes
grep -rn "requireAuth" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/export/ src/app/api/import/ src/app/api/pipeline/jobs/ --include="*.ts" | grep -v "__tests__" | wc -l
# Expected: ≥25 occurrences

# Verify deprecated singleton is removed from conversation services
grep -n "from.*['\"]./supabase['\"]" src/lib/conversation-service.ts src/lib/services/conversation-service.ts
# Expected: zero matches

# TypeScript compilation check (run from src/ directory where tsconfig.json lives)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit 2>&1 | head -30
# Expected: no new errors introduced by E02 changes
```

---

## Summary of Files Modified

### Service Layer Files:
| File | Change |
|------|--------|
| `src/lib/services/batch-job-service.ts` | Mandatory `userId` parameter on `getAllJobs`, `getJobById`, `cancelJob`, `deleteJob`; return type of `getJobById` changed to `Promise<BatchJob \| null>` |
| `src/lib/conversation-service.ts` | PRIMARY — Remove deprecated singleton, add `getSupabase()` factory using `createServerSupabaseAdminClient` |
| `src/lib/services/conversation-service.ts` | SECONDARY — Same singleton removal as above |

### Route Files (all get `requireAuth` + ownership scoping):
| File | Gap Ref | Note |
|------|---------|------|
| `src/app/api/conversations/route.ts` | C1 | |
| `src/app/api/conversations/[id]/route.ts` | C2 | |
| `src/app/api/conversations/[id]/status/route.ts` | C3 | |
| `src/app/api/conversations/bulk-action/route.ts` | C4 | |
| `src/app/api/conversations/bulk-enrich/route.ts` | C5 | |
| `src/app/api/conversations/generate/route.ts` | C6 | |
| `src/app/api/conversations/generate-batch/route.ts` | C7 | |
| `src/app/api/conversations/[id]/turns/route.ts` | C1-adj | |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | C1-adj | |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | C1-adj | |
| `src/app/api/conversations/[id]/enrich/route.ts` | C1-adj | |
| `src/app/api/conversations/[id]/validation-report/route.ts` | C1-adj | |
| `src/app/api/conversations/[id]/download/route.ts` | C1-adj | **ALREADY DONE** — skip |
| `src/app/api/conversations/orphaned/route.ts` | C1-adj | |
| `src/app/api/conversations/stats/route.ts` | C1-adj | |
| `src/app/api/conversations/by-chunk/[chunkId]/route.ts` | C1-adj | |
| `src/app/api/conversations/batch/[id]/route.ts` | C1-adj | |
| `src/app/api/conversations/batch/[id]/status/route.ts` | C1-adj | |
| `src/app/api/conversations/batch/[id]/items/route.ts` | C1-adj | |
| `src/app/api/batch-jobs/route.ts` | C8 | |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | C9 | |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | C10 | |
| `src/app/api/pipeline/jobs/[jobId]/download/route.ts` | C11 | |
| `src/app/api/export/conversations/route.ts` | C12 | |
| `src/app/api/export/download/[id]/route.ts` | C13 | |
| `src/app/api/export/history/route.ts` | C14 (new) | Added in v2 |
| `src/app/api/export/status/[id]/route.ts` | C15 (new) | Added in v2 |
| `src/app/api/import/templates/route.ts` | C16 | |
| `src/app/api/import/scenarios/route.ts` | C17 | |
| `src/app/api/import/edge-cases/route.ts` | C18 | |

### Routes Already Secured (DO NOT MODIFY — already have requireAuth):
| File | Note |
|------|------|
| `src/app/api/conversations/generate-with-scaffolding/route.ts` | Secured before E01 |
| `src/app/api/conversations/[id]/download/route.ts` | Secured before E02 |
| `src/app/api/pipeline/jobs/route.ts` | Secured before E02 |
| `src/app/api/pipeline/jobs/[jobId]/route.ts` | Secured before E02 |
| `src/app/api/pipeline/jobs/[jobId]/cancel/route.ts` | Secured before E02 |
| `src/app/api/pipeline/jobs/[jobId]/metrics/route.ts` | Secured before E02 |

---

## Warnings

### W1: Client-Side Fetch Credentials
Frontend `fetch()` calls without auth cookies will get 401s after these changes. Supabase SSR handles cookie forwarding automatically. Verify any custom `fetch()` calls use `credentials: 'include'`.

### W2: Batch Job Processing Polling Loop
`batch-jobs/[id]/process-next` is called in a polling loop. After adding `requireAuth`, auth cookies are required on every poll. For the generation `userId`, use `job.createdBy` from the DB record (not the live session):
```typescript
const pipelineUserId = job.createdBy; // Stored at job creation time
```

### W4: `batch-job-service.ts` Method Signature Breaking Change
Changing method signatures breaks every caller. Deploy atomically — all route changes + service changes together.

### W5: `getJobById` Return Type Change
`getJobById` changes from `Promise<BatchJob>` (throws on missing) to `Promise<BatchJob | null>` (returns null when not found or not owned). Any callers that previously expected a throw must now check for null.

### W6: Shared Resources (Templates, Scenarios, Edge Cases)
Adding auth to import routes may break unauthenticated tooling. This is intentional — all consumers must authenticate.

### W7: Export Download Regeneration Gap
`export/download/[id]` may have a regeneration helper that queries conversations without user scope. Add `.eq('created_by', userId)` to that query.

### W8: Dual Conversation Service Files
There are two separate conversation service files — both use the deprecated singleton and both need to be fixed. Fixing only one will leave routes served by the other file broken. Check both:
- `src/lib/conversation-service.ts` — PRIMARY (used by `[id]/route.ts`, `bulk-action`, `stats`, `turns`)
- `src/lib/services/conversation-service.ts` — SECONDARY (used by fewer routes)

---

## What E03 Expects From E02

E03 will begin by verifying these artifacts:
1. All CRITICAL routes use `requireAuth` (no `x-user-id`, no NIL UUID, no `test-user`)
2. `batch-job-service.ts` methods have mandatory `userId` parameter; `getJobById` returns `null` for missing/unowned
3. `src/lib/conversation-service.ts` (primary) no longer imports from deprecated singleton
4. `src/lib/services/conversation-service.ts` (secondary) no longer imports from deprecated singleton
5. TypeScript compiles without new errors (run from `src/` directory)
6. Changes 5.16, 5.18, and 5.18b are complete (E03 will NOT re-implement them)


++++++++++++++++++


