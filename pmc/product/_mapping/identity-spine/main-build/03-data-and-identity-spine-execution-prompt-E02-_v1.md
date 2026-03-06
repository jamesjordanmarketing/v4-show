# Data & Identity Spine — Execution Prompt E02: CRITICAL Route Security Fixes

**Version:** 1.0
**Date:** 2026-02-22
**Section:** E02 — CRITICAL Route Fixes (Phase 4) + Service Layer Refactoring
**Prerequisites:** E01 must be complete (requireAuthOrCron exists, user_id columns exist, data backfilled)
**Builds Upon:** E01 artifacts
**Specification Source:** `02-data-and-identity-spine-detailed-specification_v6.md`

---

## Division of Work Across All 4 Prompts

| Prompt | Phases | Description |
|--------|--------|-------------|
| **E01** (complete) | 0, 1, 2, 3 | Preflight verification, auth infrastructure, DB schema migration, data backfill |
| **E02 (this file)** | 4 + service layer | CRITICAL route security fixes (C1–C16), batch-job-service & conversation-service refactoring |
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
│   │   ├── conversations/            # 22 route files
│   │   ├── batch-jobs/               # 3 route files
│   │   ├── pipeline/jobs/            # Pipeline routes including download
│   │   ├── export/                   # 8 route files
│   │   └── import/                   # 3 route files
│   ├── lib/
│   │   ├── supabase-server.ts        # Auth helpers (requireAuth, requireAuthOrCron)
│   │   └── services/                 # Business logic services
│   │       ├── batch-job-service.ts  # Batch job operations (606 lines)
│   │       └── conversation-service.ts # Conversation operations (591 lines)
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
# 1. Verify requireAuthOrCron exists
grep -n "export async function requireAuthOrCron" src/lib/supabase-server.ts

# 2. Verify user_id columns exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='user_id'
AND table_name IN ('conversations','training_files','batch_jobs','generation_logs','failed_generations','documents')
ORDER BY table_name;\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"

# 3. Verify zero orphans (or logged)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL) FROM training_files;\`,transport:'pg'});
console.log(JSON.stringify(r.rows,null,2));})();"
```

**Expected:** All 6 tables have `user_id` column. Zero NULLs.

---

## What This Prompt Implements

This prompt implements **Phase 4 (CRITICAL Route Fixes)** plus the **service layer changes** that Phase 4 routes depend on:

| Section | Changes | Files Modified |
|---------|---------|---------------|
| Service Layer | 5.16, 5.18 | `batch-job-service.ts`, `conversation-service.ts` |
| Conversations Routes | 4.1–4.7, 4.17 | 13 route files |
| Batch Jobs Routes | 4.8–4.10 | 3 route files |
| Pipeline Download | 4.11 | 1 route file |
| Export Routes | 4.12–4.13 | 2 route files |
| Import Routes | 4.14–4.16 | 3 route files |

**Build Artifacts Produced for E03:**
- All CRITICAL routes secured with `requireAuth`
- `batch-job-service.ts` methods have mandatory `userId` parameter
- `conversation-service.ts` accepts injected Supabase client
- All `x-user-id` header reads removed from CRITICAL routes
- All NIL UUID fallbacks removed from CRITICAL routes

---

## Service Layer Changes (Deploy Atomically With Route Changes)

### Change 5.16: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter

**File:** `src/lib/services/batch-job-service.ts` (606 lines)

**Current state (verified 2026-02-22):**
- `getAllJobs(filters?: { status?: BatchJobStatus; createdBy?: string })` at ~L227 — `createdBy` is optional
- `getJobById(id: string)` at ~L141 — NO userId
- `cancelJob(id: string)` at ~L497 — NO userId
- `deleteJob(id: string)` at ~L581 — NO userId
- `getActiveJobs(userId: string)` — ALREADY correct

**Modifications:**

1. **`getAllJobs`** — Make `userId` mandatory first parameter:
   ```typescript
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     let query = this.supabase.from('batch_jobs').select('*').eq('created_by', userId);
     if (filters?.status) query = query.eq('status', filters.status);
     // ... rest unchanged
   }
   ```

2. **`getJobById`** — Add mandatory `userId`:
   ```typescript
   async getJobById(id: string, userId: string): Promise<BatchJob | null> {
     // ... existing fetch by id ...
     // After fetching, verify ownership:
     if (!job || job.createdBy !== userId) return null;
     return job;
   }
   ```

3. **`cancelJob`** — Add mandatory `userId`:
   ```typescript
   async cancelJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId);
     if (!job) throw new Error('Job not found');
     // ... rest unchanged
   }
   ```

4. **`deleteJob`** — Add mandatory `userId`:
   ```typescript
   async deleteJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId);
     if (!job) throw new Error('Job not found');
     // ... rest unchanged
   }
   ```

**⚠️ WARNING (W4):** Changing these method signatures is a BREAKING change. Every caller will fail until updated. This is why E02 deploys service + route changes atomically.

### Change 5.18: `src/lib/services/conversation-service.ts` — Migrate from Deprecated Singleton

**File:** `src/lib/services/conversation-service.ts` (591 lines)

**Current state (verified 2026-02-22):**
- Line 12: `import { supabase } from '../supabase';` — **deprecated singleton** (null on server side)
- Class uses `supabase` directly throughout

**Modifications:**

1. Replace the import:
   ```typescript
   // REMOVE: import { supabase } from '../supabase';
   import { SupabaseClient } from '@supabase/supabase-js';
   ```

2. Add constructor-based dependency injection:
   ```typescript
   export class ConversationService {
     private supabase: SupabaseClient;
     
     constructor(supabaseClient: SupabaseClient) {
       this.supabase = supabaseClient;
     }
     // ... all existing methods continue to use this.supabase
   }
   ```

3. If the class already has a `supabase` property assigned from the import, change it to be assigned via constructor instead.

4. **Export a factory function** for backward compatibility during transition:
   ```typescript
   export function createConversationService(supabaseClient: SupabaseClient): ConversationService {
     return new ConversationService(supabaseClient);
   }
   ```

5. Route callers create the service with the request-scoped client:
   ```typescript
   import { createServerSupabaseClientFromRequest } from '@/lib/supabase-server';
   import { createConversationService } from '@/lib/services/conversation-service';
   
   // Inside handler:
   const { supabase } = createServerSupabaseClientFromRequest(request);
   const service = createConversationService(supabase);
   ```

---

## Phase 4 — CRITICAL Route Fixes (C1–C16)

Every change in this phase follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';` at top
2. Add auth guard: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries (`.eq('created_by', user.id)` or ownership check post-fetch)
5. Remove NIL UUID and `'test-user'` / `'test_user'` fallbacks

---

### Change 4.1: `src/app/api/conversations/route.ts` — Replace Spoofable Auth (C1)

**Current state (verified 2026-02-22):**
- GET line ~33: `request.headers.get('x-user-id') || undefined` — spoofable
- POST line ~67: `request.headers.get('x-user-id') || 'test-user'` — spoofable hardcoded fallback
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

**Current state:** 123 lines. ZERO auth on GET, PATCH, DELETE.

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

**Current state:** 82 lines. PATCH line ~31: `x-user-id || 'test-user'`.

**Modifications:**
1. Add `requireAuth` import.
2. Add auth guard + ownership check on both GET and PATCH.
3. Remove `x-user-id` header read and `'test-user'` fallback.
4. Use `user.id` from `requireAuth`.

---

### Change 4.4: `src/app/api/conversations/bulk-action/route.ts` — Add Auth + Scope (C4)

**Current state:** ZERO auth. `reviewerId` from request body.

**Modifications:**
1. Add `requireAuth` guard.
2. Replace body `reviewerId` with `user.id`.
3. Filter `conversationIds` to those owned by `user.id`:
   ```typescript
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

**Current state:** ZERO auth. NIL UUID at line ~113.

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

**Current state:** 135 lines. ZERO auth. NIL UUID fallback at line ~31.

**Modifications:**
1. Add `requireAuth` guard.
2. Replace NIL UUID with `user.id`.
3. Mark body `userId` as ignored if present: `// userId from body is IGNORED — use authenticated user.id`
4. Pass `user.id` as the `userId` for conversation creation.

---

### Change 4.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId (C7)

**Current state:** 147 lines. ZERO auth. NIL UUID at line ~38.

**Modifications:** Same pattern as Change 4.6.

---

### Change 4.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping (C8)

**Current state:** ZERO auth. Optional `createdBy` filter from query string that returns all users' jobs if omitted.

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

**Current state:** ZERO auth. Anyone can cancel any job.

**Modifications:**
1. Add `requireAuth` guard.
2. Use `batchJobService.cancelJob(id, user.id)` (uses updated signature from Change 5.16).
3. If job not found (null from ownership check), return 404.

---

### Change 4.10: `src/app/api/batch-jobs/[id]/process-next/route.ts` — Add Auth + Ownership (C10)

**Current state:** ZERO auth. NIL UUID at line ~299.

**Modifications:**
1. Add `requireAuth` guard.
2. Add ownership check after job fetch using `batchJobService.getJobById(id, user.id)`.
3. Replace NIL UUID with `user.id`.
4. **IMPORTANT (W2):** For the actual generation processing, use `job.createdBy` from the DB record (not the live session) for the `userId` passed to generation functions:
   ```typescript
   const pipelineUserId = job.createdBy; // Stored at job creation time
   ```

---

### Change 4.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership (C11)

**Current state:** 222 lines. ZERO auth. **IP THEFT RISK** — anyone knowing a `jobId` can download trained LoRA adapters.

**Modifications:**
1. Add `requireAuth` guard.
2. After fetching the pipeline job, add ownership check:
   ```typescript
   if (!job || job.user_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**Note:** Pipeline jobs use `user_id` (not `created_by`) as the ownership column.

---

### Change 4.12: `src/app/api/export/conversations/route.ts` — Replace Spoofable Auth + Scope (C12)

**Current state:** 357 lines. Line ~68: `x-user-id` header + NIL UUID fallback. Conversations query has NO user scope.

**Modifications:**
1. Replace spoofable auth with `requireAuth`.
2. **CRITICAL:** Add `.eq('created_by', userId)` to the conversation query so users can only export their own conversations.
3. Also add `.eq('user_id', userId)` to the export_logs insert.

---

### Change 4.13: `src/app/api/export/download/[id]/route.ts` — Replace Spoofable Auth (C13)

**Current state:** 263 lines. Line ~54: `x-user-id` + NIL UUID. Has an ownership check at line ~70 but it's spoofable because userId is from the header.

**Modifications:**
1. Replace `x-user-id` read with `requireAuth`.
2. The existing ownership check becomes valid because `userId` now comes from auth.
3. **WARNING (W7):** If there is a regeneration helper that queries conversations, add `.eq('created_by', userId)` to that query too.

---

### Change 4.14: `src/app/api/import/templates/route.ts` — Add Auth (C14)

**Current state:** ZERO auth.

**Modifications:**
1. Add `requireAuth` guard.
2. Stamp `created_by: user.id` and `user_id: user.id` on imported records.

---

### Change 4.15: `src/app/api/import/scenarios/route.ts` — Add Auth (C15)

**Modifications:** Same pattern as Change 4.14.

---

### Change 4.16: `src/app/api/import/edge-cases/route.ts` — Add Auth (C16)

**Modifications:** Same pattern as Change 4.14.

---

### Change 4.17: Secure Remaining Conversation Sub-Routes (C1-adjacent)

These routes have ZERO auth and must all follow the same pattern. **EXCLUDE `generate-with-scaffolding/route.ts`** — it already uses `requireAuth`.

| Route | Handler(s) | Required Change |
|-------|-----------|-----------------|
| `conversations/[id]/turns/route.ts` | GET, POST | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/link-chunk/route.ts` | POST | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/unlink-chunk/route.ts` | POST | `requireAuth` + verify parent conversation ownership |
| `conversations/orphaned/route.ts` | GET | `requireAuth`; scope to user's orphaned conversations |
| `conversations/stats/route.ts` | GET | `requireAuth`; scope stats to `created_by = user.id` |
| `conversations/[id]/enrich/route.ts` | POST | `requireAuth`; replace NIL UUID at ~L57 with `user.id`; add ownership check |
| `conversations/[id]/validation-report/route.ts` | GET | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/download/route.ts` | GET | `requireAuth` + verify parent conversation ownership (if not already present) |
| `conversations/by-chunk/[chunkId]/route.ts` | GET | `requireAuth`; scope results to user's conversations |
| `conversations/batch/[id]/route.ts` | GET | `requireAuth` + verify batch job ownership |
| `conversations/batch/[id]/status/route.ts` | GET | `requireAuth` + verify batch job ownership |
| `conversations/batch/[id]/items/route.ts` | GET | `requireAuth` + verify batch job ownership |

**Pattern for `[id]` sub-routes:**
```typescript
import { requireAuth } from '@/lib/supabase-server';

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
grep -rn "x-user-id" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/export/conversations/ src/app/api/export/download/ src/app/api/import/ --include="*.ts"

# Verify no NIL UUID fallbacks remain in CRITICAL routes
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/pipeline/jobs/ src/app/api/export/conversations/ src/app/api/export/download/ src/app/api/import/ --include="*.ts"

# Verify no test-user fallbacks remain
grep -rn "'test-user'" src/app/api/conversations/ --include="*.ts"

# Verify requireAuth is used in all target routes
grep -rn "requireAuth" src/app/api/conversations/ src/app/api/batch-jobs/ src/app/api/export/conversations/ src/app/api/export/download/ src/app/api/import/ --include="*.ts" | wc -l

# TypeScript compilation check
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit 2>&1 | head -30
```

**Expected:**
- Zero `x-user-id` reads in target routes
- Zero NIL UUID fallbacks in target routes
- Zero `test-user` fallbacks
- Many `requireAuth` matches (one per route handler minimum)
- TypeScript compiles clean

---

## Summary of Files Modified

### Service Layer Files:
| File | Change |
|------|--------|
| `src/lib/services/batch-job-service.ts` | Mandatory `userId` parameter on `getAllJobs`, `getJobById`, `cancelJob`, `deleteJob` |
| `src/lib/services/conversation-service.ts` | Constructor-based Supabase client injection, removing deprecated singleton |

### Route Files (all get `requireAuth` + ownership scoping):
| File | Gap Ref |
|------|---------|
| `src/app/api/conversations/route.ts` | C1 |
| `src/app/api/conversations/[id]/route.ts` | C2 |
| `src/app/api/conversations/[id]/status/route.ts` | C3 |
| `src/app/api/conversations/bulk-action/route.ts` | C4 |
| `src/app/api/conversations/bulk-enrich/route.ts` | C5 |
| `src/app/api/conversations/generate/route.ts` | C6 |
| `src/app/api/conversations/generate-batch/route.ts` | C7 |
| `src/app/api/conversations/[id]/turns/route.ts` | C1-adj |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | C1-adj |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | C1-adj |
| `src/app/api/conversations/[id]/enrich/route.ts` | C1-adj |
| `src/app/api/conversations/[id]/validation-report/route.ts` | C1-adj |
| `src/app/api/conversations/[id]/download/route.ts` | C1-adj |
| `src/app/api/conversations/orphaned/route.ts` | C1-adj |
| `src/app/api/conversations/stats/route.ts` | C1-adj |
| `src/app/api/conversations/by-chunk/[chunkId]/route.ts` | C1-adj |
| `src/app/api/conversations/batch/[id]/route.ts` | C1-adj |
| `src/app/api/conversations/batch/[id]/status/route.ts` | C1-adj |
| `src/app/api/conversations/batch/[id]/items/route.ts` | C1-adj |
| `src/app/api/batch-jobs/route.ts` | C8 |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | C9 |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | C10 |
| `src/app/api/pipeline/jobs/[jobId]/download/route.ts` | C11 |
| `src/app/api/export/conversations/route.ts` | C12 |
| `src/app/api/export/download/[id]/route.ts` | C13 |
| `src/app/api/import/templates/route.ts` | C14 |
| `src/app/api/import/scenarios/route.ts` | C15 |
| `src/app/api/import/edge-cases/route.ts` | C16 |

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

### W6: Shared Resources (Templates, Scenarios, Edge Cases)
Adding auth to GET endpoints on import routes may break unauthenticated tooling. This is intentional — all consumers must authenticate.

### W7: Export Download Regeneration Gap
`export/download/[id]` may have a regeneration helper that queries conversations without user scope. Add `.eq('created_by', userId)` to that query.

---

## What E03 Expects From E02

E03 will begin by verifying these artifacts:
1. All CRITICAL routes use `requireAuth` (no `x-user-id`, no NIL UUID, no `test-user`)
2. `batch-job-service.ts` methods have mandatory `userId` parameter
3. `conversation-service.ts` accepts constructor-injected Supabase client
4. TypeScript compiles without errors
5. Changes 5.16 and 5.18 are complete (E03 will NOT re-implement them)


++++++++++++++++++



