# Data & Identity Spine — Detailed Implementation Specification v1

**Document:** `02-data-and-identity-spine-detailed-specification_v1.md`  
**Date:** 2025-06-19  
**Status:** SPECIFICATION — READY FOR IMPLEMENTATION  
**Prerequisite:** `01-data-and-identity-spine-spec_v1.md` (Investigation & Gap Log)  
**SAOL Constraint:** All database DDL/DML operations described herein MUST be executed via the SAOL functional API (`agentExecuteSQL`, `agentQuery`, etc.) with `transport: 'pg'` for DDL and `transport: 'supabase'` for DML, unless explicitly stated otherwise.

---

## Table of Contents

1. [Summary](#1-summary)
2. [Impact Analysis](#2-impact-analysis)
3. [Phase 0 — Pre-Flight Verification](#3-phase-0--pre-flight-verification)
4. [Phase 1 — Database Schema Migration](#4-phase-1--database-schema-migration)
5. [Phase 2 — Data Backfill](#5-phase-2--data-backfill)
6. [Phase 3 — Code Enforcement (Batch 1: CRITICAL)](#6-phase-3--code-enforcement-batch-1-critical)
7. [Phase 4 — Code Enforcement (Batch 2: HIGH)](#7-phase-4--code-enforcement-batch-2-high)
8. [Phase 5 — Code Enforcement (Batch 3: MEDIUM)](#8-phase-5--code-enforcement-batch-3-medium)
9. [Phase 6 — Service Layer Hardening](#9-phase-6--service-layer-hardening)
10. [Phase 7 — Database Constraints & RLS](#10-phase-7--database-constraints--rls)
11. [Phase 8 — Cleanup & Deprecated Code Removal](#11-phase-8--cleanup--deprecated-code-removal)
12. [Testing Checkpoints](#12-testing-checkpoints)
13. [Warnings & Risks](#13-warnings--risks)
14. [Files Modified Summary](#14-files-modified-summary)

---

## 1. Summary

This specification converts the 48 gaps identified in the v1 investigation (C1–C16 CRITICAL, H1–H15 HIGH, M1–M13 MEDIUM) into numbered implementation changes with exact file paths, code locations, and GIVEN-WHEN-THEN acceptance criteria.

**Scope:** 38 route files modified, 3 service files modified, 7 database migrations, 6 test files created.

**Implementation order:** Database schema first → backfill → CRITICAL route fixes → HIGH route fixes → MEDIUM route fixes → service layer → DB constraints → cleanup.

**Gold standard reference pattern** (copy this):

```typescript
// From src/app/api/datasets/route.ts — the canonical pattern
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401 if unauthenticated

  const supabase = await createServerSupabaseClient();
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

---

## 2. Impact Analysis

### 2.1 Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/YYYYMMDD_identity_spine_phase1_columns.sql` | Add `user_id` columns to legacy tables |
| 2 | `supabase/migrations/YYYYMMDD_identity_spine_phase2_backfill.sql` | Backfill ownership data |
| 3 | `supabase/migrations/YYYYMMDD_identity_spine_phase7_constraints.sql` | NOT NULL constraints + RLS + indexes |
| 4 | `src/__tests__/identity-spine/cross-user-isolation.test.ts` | T1, T2, T3 |
| 5 | `src/__tests__/identity-spine/ownership-stamping.test.ts` | T4, T9 |
| 6 | `src/__tests__/identity-spine/auth-enforcement.test.ts` | T5, T6 |
| 7 | `src/__tests__/identity-spine/background-job-isolation.test.ts` | T7 |
| 8 | `src/__tests__/identity-spine/download-isolation.test.ts` | T8 |
| 9 | `src/__tests__/identity-spine/admin-client-scoping.test.ts` | T10 |

### 2.2 Files Modified

| # | File | Changes |
|---|------|---------|
| 1 | `src/app/api/conversations/route.ts` | Replace `x-user-id` with `requireAuth`; add user scoping |
| 2 | `src/app/api/conversations/[id]/route.ts` | Add `requireAuth` + ownership check to GET/PATCH/DELETE |
| 3 | `src/app/api/conversations/[id]/status/route.ts` | Replace `x-user-id` with `requireAuth`; add ownership check |
| 4 | `src/app/api/conversations/bulk-action/route.ts` | Add `requireAuth`; scope operations to user's conversations |
| 5 | `src/app/api/conversations/bulk-enrich/route.ts` | Add `requireAuth`; add ownership verification per conversation |
| 6 | `src/app/api/conversations/generate/route.ts` | Add `requireAuth`; use `user.id` instead of body `userId` |
| 7 | `src/app/api/conversations/generate-batch/route.ts` | Add `requireAuth`; use `user.id` instead of body `userId` |
| 8 | `src/app/api/conversations/stats/route.ts` | Add `requireAuth`; scope stats to user |
| 9 | `src/app/api/conversations/batch/[id]/status/route.ts` | Add `requireAuth` + ownership check |
| 10 | `src/app/api/conversations/[id]/download/raw/route.ts` | Add ownership check |
| 11 | `src/app/api/conversations/[id]/download/enriched/route.ts` | Add ownership check |
| 12 | `src/app/api/batch-jobs/route.ts` | Add `requireAuth`; filter by `created_by = user.id` |
| 13 | `src/app/api/batch-jobs/[id]/cancel/route.ts` | Add `requireAuth` + ownership check |
| 14 | `src/app/api/batch-jobs/[id]/process-next/route.ts` | Add `requireAuth` + ownership check |
| 15 | `src/app/api/pipeline/jobs/[jobId]/download/route.ts` | Add `requireAuth` + job ownership check |
| 16 | `src/app/api/export/conversations/route.ts` | Replace `x-user-id` with `requireAuth`; scope export query |
| 17 | `src/app/api/export/download/[id]/route.ts` | Replace `x-user-id` with `requireAuth` |
| 18 | `src/app/api/export/history/route.ts` | Replace `x-user-id` with `requireAuth` |
| 19 | `src/app/api/export/status/[id]/route.ts` | Replace `x-user-id` with `requireAuth` |
| 20 | `src/app/api/export/templates/route.ts` | Add `requireAuth` |
| 21 | `src/app/api/export/scenarios/route.ts` | Add `requireAuth` |
| 22 | `src/app/api/export/edge-cases/route.ts` | Add `requireAuth` |
| 23 | `src/app/api/import/templates/route.ts` | Add `requireAuth`; stamp `created_by` |
| 24 | `src/app/api/import/scenarios/route.ts` | Add `requireAuth`; stamp `created_by` |
| 25 | `src/app/api/import/edge-cases/route.ts` | Add `requireAuth`; stamp `created_by` |
| 26 | `src/app/api/generation-logs/route.ts` | Add `requireAuth`; replace `x-user-id`; add user scoping to GET |
| 27 | `src/app/api/failed-generations/route.ts` | Add `requireAuth`; add user scoping |
| 28 | `src/app/api/templates/route.ts` | Add `requireAuth` to GET |
| 29 | `src/app/api/templates/test/route.ts` | Add `requireAuth`; replace `'test_user'` with `user.id` |
| 30 | `src/app/api/documents/route.ts` | Replace service-role singleton with `requireAuth` + scoped client; add `user_id` scoping to GET |
| 31 | `src/app/api/performance/route.ts` | Add `requireAuth` |
| 32 | `src/app/api/training-files/route.ts` | Add `user_id` scoping to GET list query |
| 33 | `src/app/api/training-files/[id]/download/route.ts` | Add ownership check post-fetch |
| 34 | `src/lib/services/batch-job-service.ts` | Add mandatory `userId` parameter to `getAllJobs`, `getJobById`, `cancelJob`, `deleteJob` |
| 35 | `src/lib/rag/services/rag-retrieval-service.ts` | Add `userId` parameter to retrieval functions; add `user_id` filter |
| 36 | `src/lib/services/conversation-service.ts` | Migrate from deprecated singleton to injected client |
| 37 | `src/inngest/functions/process-rag-document.ts` | Verify `userId` matches document owner before processing |
| 38 | 5 cron route files | Fail closed when `CRON_SECRET` not configured |

### 2.3 Files Deleted

None. All changes are modifications or additions.

### 2.4 Client-Side Impact

Frontend components that currently send `x-user-id` header must be updated to STOP sending that header. Authentication is now handled entirely via cookies.

Affected client-side files (search for `x-user-id` in `src/` excluding `api/`):
- Any hooks or fetch utilities setting the `x-user-id` header → remove that header
- The authenticated user identity will flow automatically via the Supabase SSR cookie

---

## 3. Phase 0 — Pre-Flight Verification

### Change 0.1: Verify `requireAuth` Function Exists

**File:** `src/lib/supabase-server.ts`  
**Action:** READ-ONLY verification — no changes needed.

Confirm that `requireAuth(request: NextRequest)` exists and returns `{ user: User, response: NextResponse | null }` where `response` is a 401 JSON response if unauthenticated.

**GIVEN** the function `requireAuth` in `src/lib/supabase-server.ts`  
**WHEN** called with a `NextRequest` containing valid Supabase auth cookies  
**THEN** it returns `{ user: <User object with id>, response: null }`

**GIVEN** the function `requireAuth` in `src/lib/supabase-server.ts`  
**WHEN** called with a `NextRequest` containing no auth cookies or expired cookies  
**THEN** it returns `{ user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }`

### Change 0.2: Verify SAOL Availability

**Action:** Run verification script.

```javascript
const saol = require('./supa-agent-ops/dist/index.js');
console.log('SAOL exports:', Object.keys(saol));
// Expected: agentQuery, agentCount, agentExecuteSQL, agentIntrospectSchema, ...
```

---

## 4. Phase 1 — Database Schema Migration

### Change 1.1: Add `user_id` Column to Legacy Tables

**Gap refs:** C1, C8, H6, H7, H10  
**SAOL method:** `agentExecuteSQL` with `transport: 'pg'`, `dryRun: true` first, then `dryRun: false`

```sql
-- Run via SAOL agentExecuteSQL({ sql: '...', transport: 'pg', dryRun: false })

-- 1. conversations: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. training_files: add user_id alongside existing created_by
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. batch_jobs: add user_id alongside existing created_by
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. generation_logs: add user_id alongside existing created_by
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. failed_generations: add user_id alongside existing created_by
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. documents: add user_id alongside existing author_id
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Add updated_by audit columns where missing
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 8. Add created_by audit column to tables that only have user_id
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 9. Fix missing FK constraints
ALTER TABLE rag_embedding_runs
  ADD CONSTRAINT IF NOT EXISTS fk_rag_embedding_runs_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE rag_test_reports
  ADD CONSTRAINT IF NOT EXISTS fk_rag_test_reports_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**GIVEN** the `conversations` table exists without a `user_id` column  
**WHEN** the Phase 1 migration is executed via SAOL  
**THEN** `conversations` has a nullable `user_id` column of type UUID with FK to `auth.users(id)` ON DELETE CASCADE

**GIVEN** the `documents` table exists with `author_id` but no `user_id`  
**WHEN** the Phase 1 migration is executed via SAOL  
**THEN** `documents` has a nullable `user_id` column with FK to `auth.users(id)`, and `author_id` remains unchanged

---

## 5. Phase 2 — Data Backfill

### Change 2.1: Backfill `user_id` from Existing Ownership Columns

**Gap refs:** Prerequisite for all code changes  
**SAOL method:** `agentExecuteSQL` with `transport: 'pg'`

```sql
-- Backfill user_id from created_by on legacy tables
UPDATE conversations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE training_files SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE batch_jobs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE generation_logs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE failed_generations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Backfill documents: user_id from author_id
UPDATE documents SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;

-- Backfill reverse: created_by from user_id on pipeline tables
UPDATE datasets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE pipeline_training_jobs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
```

### Change 2.2: Quarantine Orphaned Records

```sql
-- Create orphan tracking table
CREATE TABLE IF NOT EXISTS _orphaned_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  resolution TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Log orphaned records (ownership is NULL after backfill)
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'generation_logs', id FROM generation_logs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'documents', id FROM documents WHERE author_id IS NULL AND user_id IS NULL;
```

**GIVEN** existing `conversations` rows have `created_by` set but `user_id` is NULL  
**WHEN** the backfill migration runs  
**THEN** `user_id = created_by` for all rows where `created_by IS NOT NULL`  
**AND** any rows with both `created_by IS NULL AND user_id IS NULL` are logged in `_orphaned_records`

**Verification query:**
```sql
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS orphans FROM conversations
UNION ALL
SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL) FROM batch_jobs
UNION ALL
SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL) FROM generation_logs
UNION ALL
SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL) FROM documents;
```

---

## 6. Phase 3 — Code Enforcement (Batch 1: CRITICAL)

All changes in this phase address gaps C1–C16. Each change follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';`
2. Add auth guard at top of handler: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries
5. Remove NIL UUID fallbacks

---

### Change 3.1: `src/app/api/conversations/route.ts` — Replace Spoofable Auth

**Gap ref:** C1  
**Current code (lines 31, 66):** `request.headers.get('x-user-id')` and `|| 'test-user'` fallback  
**Target:** `requireAuth` + `user.id` scoping

**Modifications:**

1. **Add import** (top of file): `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Replace:
   ```typescript
   const userId = request.headers.get('x-user-id') || undefined;
   ```
   With:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```
   Then ensure `created_by: userId` is passed to `service.listConversations` filters (already done — just now userId is verified).

3. **POST handler** — Replace:
   ```typescript
   const userId = request.headers.get('x-user-id') || 'test-user';
   ```
   With:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```

**GIVEN** a request to `GET /api/conversations` with valid auth cookies for User A  
**WHEN** the handler executes  
**THEN** only conversations where `created_by = User A's UUID` are returned  
**AND** the `x-user-id` header is ignored completely

**GIVEN** a request to `GET /api/conversations` with no auth cookies  
**WHEN** the handler executes  
**THEN** a 401 response is returned  
**AND** no conversation data is leaked

**GIVEN** a request to `POST /api/conversations` with valid auth cookies  
**WHEN** the conversation is created  
**THEN** `created_by` is set to the authenticated `user.id`  
**AND** no `'test-user'` fallback value is ever written

---

### Change 3.2: `src/app/api/conversations/[id]/route.ts` — Add Auth + Ownership

**Gap ref:** C2  
**Current code:** Zero auth on GET, PATCH, DELETE. Uses `conversationService` (deprecated singleton).  
**Target:** `requireAuth` + ownership check on all three methods.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add after `const { id } = params;`:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   After fetching the conversation, add ownership check:
   ```typescript
   if (conversation.created_by !== user.id) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```

3. **PATCH handler** — Same pattern. Add auth guard + ownership check after fetch.

4. **DELETE handler** — Same pattern. Add auth guard + ownership check before delete.

**GIVEN** User A requests `GET /api/conversations/{id}` for a conversation owned by User B  
**WHEN** the handler executes  
**THEN** a 403 response is returned

**GIVEN** User A requests `DELETE /api/conversations/{id}` for their own conversation  
**WHEN** the handler executes  
**THEN** the conversation is deleted successfully

**GIVEN** an unauthenticated request to `PATCH /api/conversations/{id}`  
**WHEN** the handler executes  
**THEN** a 401 response is returned

---

### Change 3.3: `src/app/api/conversations/[id]/status/route.ts` — Replace Spoofable Auth

**Gap ref:** C3  
**Current code (line ~33):** `request.headers.get('x-user-id') || 'test-user'`  
**Target:** `requireAuth` + ownership check.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **PATCH handler** — Replace:
   ```typescript
   const userId = request.headers.get('x-user-id') || 'test-user';
   ```
   With:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Then fetch the conversation and verify ownership before calling `updateConversationStatus`:
   ```typescript
   const service = getConversationStorageService();
   const existing = await service.getConversation(params.id);
   if (!existing || existing.created_by !== user.id) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   const conversation = await service.updateConversationStatus(params.id, status, user.id, review_notes);
   ```

3. **GET handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Add ownership check after fetching the conversation.

**GIVEN** a request to `PATCH /api/conversations/{id}/status` with `x-user-id: <victim-uuid>` header but cookies for attacker  
**WHEN** the handler executes  
**THEN** the `x-user-id` header is IGNORED and the operation uses the attacker's authenticated identity  
**AND** if the attacker does not own the conversation, a 403 is returned

---

### Change 3.4: `src/app/api/conversations/bulk-action/route.ts` — Add Auth + Scope

**Gap ref:** C4  
**Current code:** Zero auth. Accepts `reviewerId` from body without verification.  
**Target:** `requireAuth` + scope all operations to user's conversations.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add at top of try block:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Replace `reviewerId` from body** with `user.id` for approve/reject:
   ```typescript
   // Replace: const { reviewerId } = validatedData;
   const reviewerId = user.id; // Always use authenticated user
   ```

4. **Scope conversation access** — Before performing bulk operations, verify all `conversationIds` belong to the authenticated user. Add pre-check:
   ```typescript
   // Verify user owns all conversations
   const supabase = await createServerSupabaseClient();
   const { data: ownedConvs } = await supabase
     .from('conversations')
     .select('id')
     .in('id', conversationIds)
     .eq('created_by', user.id);
   const ownedIds = new Set((ownedConvs || []).map(c => c.id));
   const unauthorizedIds = conversationIds.filter(id => !ownedIds.has(id));
   if (unauthorizedIds.length > 0) {
     return NextResponse.json(
       { error: 'Forbidden', message: `Cannot perform actions on conversations you do not own`, unauthorizedIds },
       { status: 403 }
     );
   }
   ```

**GIVEN** User A sends `POST /api/conversations/bulk-action` with `conversationIds` containing User B's conversation  
**WHEN** the handler executes  
**THEN** a 403 response is returned listing the unauthorized conversation IDs  
**AND** no conversations are modified

---

### Change 3.5: `src/app/api/conversations/bulk-enrich/route.ts` — Add Auth + Ownership Verification

**Gap ref:** C5  
**Current code:** Zero auth + uses `createServerSupabaseAdminClient()` + falls back to NIL UUID.  
**Target:** `requireAuth` + verify each conversation belongs to user before enriching.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **Add auth guard** at top of POST handler:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Replace NIL UUID fallback** (line ~26 of the for-loop): Change:
   ```typescript
   const userId = conversation.created_by || '00000000-0000-0000-0000-000000000000';
   ```
   To:
   ```typescript
   // Verify ownership — skip conversations not owned by the authenticated user
   if (conversation.created_by !== user.id) {
     results.push({ conversationId, status: 'failed', error: 'Not authorized to enrich this conversation' });
     continue;
   }
   const userId = user.id;
   ```

**Note:** The admin client usage is acceptable here since enrichment requires cross-table writes. But it MUST be gated by the ownership check above.

**GIVEN** User A sends `POST /api/conversations/bulk-enrich` with a mix of their own and User B's conversation IDs  
**WHEN** the handler processes the list  
**THEN** User A's conversations are enriched successfully  
**AND** User B's conversations are returned with `status: 'failed', error: 'Not authorized to enrich this conversation'`  
**AND** no NIL UUID (`00000000-...`) is ever written to any record

---

### Change 3.6: `src/app/api/conversations/generate/route.ts` — Add Auth, Remove Body userId

**Gap ref:** C6  
**Current code (line ~32):** `const userId = validated.userId || '00000000-0000-0000-0000-000000000000';`  
**Target:** `requireAuth` + `user.id`.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add auth guard before body parsing:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Replace userId resolution:**
   ```typescript
   // REMOVE: const userId = validated.userId || '00000000-0000-0000-0000-000000000000';
   const userId = user.id;
   ```

4. **Remove `userId` from Zod schema** (or mark it as ignored/deprecated):
   ```typescript
   // Keep accepting the field to avoid breaking clients, but ignore it
   userId: z.string().optional(), // DEPRECATED — ignored, use auth cookie
   ```

**GIVEN** an unauthenticated request to `POST /api/conversations/generate`  
**WHEN** the handler executes  
**THEN** a 401 is returned  
**AND** no conversation is generated  
**AND** no Claude API call is made (cost savings)

**GIVEN** an authenticated request with `userId` in the body set to a different user's ID  
**WHEN** the handler executes  
**THEN** the body `userId` is IGNORED and the authenticated `user.id` is used

---

### Change 3.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId

**Gap ref:** C7  
**Current code (line ~41):** `const userId = validated.userId || '00000000-0000-0000-0000-000000000000';`  
**Target:** Same pattern as Change 3.6.

**Modifications:** Identical to Change 3.6 but applied to this file's POST handler.

**GIVEN** an authenticated request to `POST /api/conversations/generate-batch`  
**WHEN** a batch job is created  
**THEN** the job's `created_by` (and `user_id` after Phase 1 migration) is set to the authenticated `user.id`  
**AND** the body `userId` field is ignored

---

### Change 3.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping

**Gap ref:** C8  
**Current code:** Zero auth. Lists ALL jobs globally from `batchJobService.getAllJobs()`.  
**Target:** `requireAuth` + filter to user's jobs only.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Always pass `createdBy` filter:**
   ```typescript
   // REPLACE the optional createdBy from query params
   // FORCE: always filter by authenticated user
   const filters: { status?: typeof status; createdBy: string } = { createdBy: user.id };
   if (status) filters.status = status;
   ```

**GIVEN** User A requests `GET /api/batch-jobs`  
**WHEN** the handler executes  
**THEN** only batch jobs where `created_by = User A's UUID` are returned  
**AND** User B's jobs are never visible

**GIVEN** User A requests `GET /api/batch-jobs?createdBy=<User B UUID>`  
**WHEN** the handler executes  
**THEN** the `createdBy` query param is OVERRIDDEN with User A's authenticated ID  
**AND** only User A's jobs are returned

---

### Change 3.9: `src/app/api/batch-jobs/[id]/cancel/route.ts` — Add Auth + Ownership

**Gap ref:** C9  
**Current code:** Zero auth. Anyone can cancel any job.  
**Target:** `requireAuth` + verify job belongs to user.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add auth guard after `const { id } = await params;`:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Add ownership check** after `const job = await batchJobService.getJobById(id);`:
   ```typescript
   if (job.createdBy !== user.id) {
     return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
   }
   ```

**GIVEN** User A requests `POST /api/batch-jobs/{userB-job-id}/cancel`  
**WHEN** the handler executes  
**THEN** a 403 is returned  
**AND** User B's job is NOT cancelled

---

### Change 3.10: `src/app/api/batch-jobs/[id]/process-next/route.ts` — Add Auth + Ownership

**Gap ref:** C10  
**Current code:** Zero auth + uses `createServerSupabaseAdminClient()` + NIL UUID fallback.  
**Target:** `requireAuth` + ownership check + remove NIL UUID.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Add ownership check** after job fetch:
   ```typescript
   if (job.createdBy !== user.id) {
     return NextResponse.json({
       success: false, error: 'Forbidden', status: 'error',
       remainingItems: 0, progress: { total: 0, completed: 0, successful: 0, failed: 0, percentage: 0 },
     }, { status: 403 });
   }
   ```

4. **Remove NIL UUID constant** (line ~19): Delete `const NIL_UUID = '00000000-0000-0000-0000-000000000000';`

5. **Replace NIL UUID usage** in `generateSingleConversation` call:
   ```typescript
   // REPLACE: userId: job.createdBy || '00000000-0000-0000-0000-000000000000',
   userId: user.id,
   ```

**GIVEN** an unauthenticated request to `POST /api/batch-jobs/{id}/process-next`  
**WHEN** the handler executes  
**THEN** a 401 is returned  
**AND** no AI generation occurs  
**AND** no admin client operations are performed

---

### Change 3.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership

**Gap ref:** C11 — **IP THEFT RISK** — highest priority single fix  
**Current code:** Zero auth + `createServerSupabaseAdminClient()`. Anyone can download trained LoRA adapter models.  
**Target:** `requireAuth` + verify `pipeline_training_jobs.user_id = user.id`.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard as first operation:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Add ownership check** after `const job = jobResult.data;`:
   ```typescript
   // Verify the authenticated user owns this training job
   if (job.userId !== user.id) {
     return NextResponse.json(
       { error: 'You do not have permission to download this adapter' },
       { status: 403 }
     );
   }
   ```

**GIVEN** User A requests `GET /api/pipeline/jobs/{userB-job-id}/download`  
**WHEN** the handler executes  
**THEN** a 403 response is returned  
**AND** no adapter files are served  
**AND** no storage download operations occur

**GIVEN** an unauthenticated request to `GET /api/pipeline/jobs/{any-id}/download`  
**WHEN** the handler executes  
**THEN** a 401 response is returned

---

### Change 3.12: `src/app/api/export/conversations/route.ts` — Replace Spoofable Auth + Scope Exports

**Gap ref:** C12  
**Current code (line ~71):** `request.headers.get('x-user-id') || '00000000-...'`  
**Target:** `requireAuth` + scope conversation query to user.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Replace:
   ```typescript
   const userId = request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';
   ```
   With:
   ```typescript
   const { user, response: authResponse } = await requireAuth(request);
   if (authResponse) return authResponse;
   const userId = user.id;
   ```

3. **Add user scoping to conversation query** — After building the conversation query, add `.eq('created_by', userId)` to ALL scope cases:
   ```typescript
   // After building conversationQuery based on scope, always add user filter:
   conversationQuery = conversationQuery.eq('created_by', userId);
   ```

**GIVEN** User A requests `POST /api/export/conversations` with `scope: 'all'`  
**WHEN** the handler fetches conversations  
**THEN** only conversations where `created_by = User A's UUID` are included in the export  
**AND** User B's conversations are never exported

---

### Change 3.13: `src/app/api/export/download/[id]/route.ts` — Replace Spoofable Auth

**Gap ref:** C13  
**Current code (line ~54):** `request.headers.get('x-user-id') || '00000000-...'`  
**Target:** `requireAuth` — the ownership check (`exportLog.user_id !== userId`) already exists but uses spoofable userId.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **Replace:**
   ```typescript
   const userId = request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';
   ```
   With:
   ```typescript
   const { user, response: authResponse } = await requireAuth(request);
   if (authResponse) return authResponse;
   const userId = user.id;
   ```

**GIVEN** the existing ownership check `if (exportLog.user_id !== userId)` remains  
**WHEN** `userId` now comes from `requireAuth` instead of `x-user-id` header  
**THEN** an attacker cannot spoof the export download by setting the `x-user-id` header

---

### Change 3.14: `src/app/api/import/templates/route.ts` — Add Auth

**Gap ref:** C14  
**Current code:** Zero auth. Uses `createClient()` without auth check.  
**Target:** `requireAuth` + stamp `created_by` on imported templates.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Stamp ownership** on creates/updates. In the import loop, add:
   ```typescript
   const created = await templateService.create({ ...template, createdBy: user.id });
   ```

**GIVEN** an unauthenticated request to `POST /api/import/templates`  
**WHEN** the handler executes  
**THEN** a 401 is returned  
**AND** no templates are created or overwritten

---

### Change 3.15: `src/app/api/import/scenarios/route.ts` — Add Auth

**Gap ref:** C15  
**Modifications:** Identical pattern to Change 3.14 but for scenarios.

**GIVEN** an unauthenticated request to `POST /api/import/scenarios`  
**WHEN** the handler executes  
**THEN** a 401 is returned

---

### Change 3.16: `src/app/api/import/edge-cases/route.ts` — Add Auth

**Gap ref:** C16  
**Modifications:** Identical pattern to Change 3.14 but for edge cases.

**GIVEN** an unauthenticated request to `POST /api/import/edge-cases`  
**WHEN** the handler executes  
**THEN** a 401 is returned

---

## 7. Phase 4 — Code Enforcement (Batch 2: HIGH)

### Change 4.1: `src/app/api/generation-logs/route.ts` — Add Auth + User Scoping

**Gap ref:** H6  
**Current code:** GET has zero auth. POST uses `x-user-id` header with NIL UUID fallback.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard at top. Add user scoping filter to `generationLogService.list()` call:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   // Add user filter to filters object:
   filters.createdBy = user.id;
   ```

3. **POST handler** — Replace:
   ```typescript
   const userId = request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';
   ```
   With:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```

**GIVEN** User A requests `GET /api/generation-logs`  
**WHEN** the handler executes  
**THEN** only logs where `created_by = User A's UUID` are returned

---

### Change 4.2: `src/app/api/failed-generations/route.ts` — Add Auth + User Scoping

**Gap ref:** H7  
**Current code:** Zero auth. Exposes all failure payloads globally.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard. Add user scoping:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   // Add to filters:
   filters.created_by = user.id;
   ```

**Note:** The `getFailedGenerationService()` must accept and propagate the `created_by` filter. Verify the service implementation supports this, or add `.eq('created_by', user.id)` to the query.

**GIVEN** User A requests `GET /api/failed-generations`  
**WHEN** the handler executes  
**THEN** only failed generation records where `created_by = User A's UUID` are returned  
**AND** error payloads from other users are never exposed

---

### Change 4.3: `src/app/api/templates/route.ts` — Add Auth to GET

**Gap ref:** H4  
**Current code:** GET has zero auth (lists all templates). POST correctly checks auth via `supabase.auth.getUser()`.  
**Decision:** Templates are **shared resources** — all authenticated users can read. But auth is still required.

**Modifications:**

1. **GET handler** — Add auth check (not ownership scoping, since templates are shared):
   ```typescript
   // Verify user is authenticated (shared resource: any authed user can read)
   const { data: { user }, error: authError } = await supabase.auth.getUser();
   if (authError || !user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

**GIVEN** an unauthenticated request to `GET /api/templates`  
**WHEN** the handler executes  
**THEN** a 401 is returned

**GIVEN** an authenticated request to `GET /api/templates`  
**WHEN** the handler executes  
**THEN** ALL templates are returned (shared resource — intentional)

---

### Change 4.4: `src/app/api/templates/test/route.ts` — Add Auth

**Gap ref:** H5  
**Current code:** Zero auth. Calls Claude API (cost risk). Uses `'test_user'` string.

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **POST handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. **Replace `'test_user'`** in `injectParameters` call:
   ```typescript
   // REPLACE: userId: 'test_user',
   userId: user.id,
   ```

**GIVEN** an unauthenticated request to `POST /api/templates/test`  
**WHEN** the handler executes  
**THEN** a 401 is returned  
**AND** no Claude API call is made (prevents unauthorized cost)

---

### Change 4.5: `src/app/api/documents/route.ts` — Replace Service-Role Singleton + Add Auth to GET

**Gap ref:** H10, H11  
**Current code:** Module-level `createClient()` with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). GET lists all documents globally. POST has auth via Bearer token.

**Modifications:**

1. **Remove module-level client:** Delete the module-level `const supabase = createClient(...)` block.

2. **GET handler** — Complete rewrite:
   ```typescript
   import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
   
   export async function GET(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;
     
     const supabase = await createServerSupabaseClient();
     let query = supabase
       .from('documents')
       .select('*')
       .eq('author_id', user.id) // SCOPE to user's documents
       .order('created_at', { ascending: false });
     // ... rest of filter logic unchanged
   }
   ```

3. **POST handler** — Replace Bearer token auth with `requireAuth`:
   ```typescript
   export async function POST(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;
     
     const supabase = await createServerSupabaseClient();
     // ... use user.id instead of extracting from Bearer token
   }
   ```

**GIVEN** User A requests `GET /api/documents`  
**WHEN** the handler executes  
**THEN** only documents where `author_id = User A's UUID` are returned

---

### Change 4.6: `src/app/api/performance/route.ts` — Add Auth

**Gap ref:** H8  
**Current code:** Zero auth. Exposes database performance internals (slow queries, table bloat, indexes).

**Modifications:**

1. **Add import:** `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request as NextRequest);
   if (response) return response;
   ```

**Note:** Consider adding admin-only guard in the future. For now, requiring authentication is the minimum.

**GIVEN** an unauthenticated request to `GET /api/performance`  
**WHEN** the handler executes  
**THEN** a 401 is returned  
**AND** no database internals are exposed

---

### Change 4.7: `src/app/api/training-files/[id]/download/route.ts` — Add Ownership Check

**Gap ref:** H9  
**Current code:** Auth is present (`supabase.auth.getUser()`), but no ownership check on the training file.

**Modifications:**

1. **Add ownership check** after fetching the training file:
   ```typescript
   const trainingFile = await service.getTrainingFile(params.id);
   if (!trainingFile) {
     return NextResponse.json({ error: 'Training file not found' }, { status: 404 });
   }
   // ADD: Ownership check
   if (trainingFile.created_by !== user.id) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```

**GIVEN** User A requests `GET /api/training-files/{userB-file-id}/download`  
**WHEN** the handler executes  
**THEN** a 403 is returned  
**AND** no download URL is generated

---

### Change 4.8: `src/app/api/export/history/route.ts` — Replace Spoofable Auth

**Gap ref:** Related to C12  
**Current code (line ~43):** `request.headers.get('x-user-id') || '00000000-...'`

**Modifications:** Same pattern as Change 3.13. Replace `x-user-id` with `requireAuth`.

**GIVEN** an authenticated request to `GET /api/export/history`  
**WHEN** the handler executes  
**THEN** only export logs belonging to the authenticated user are returned

---

### Change 4.9: `src/app/api/export/templates/route.ts`, `export/scenarios/route.ts`, `export/edge-cases/route.ts` — Add Auth

**Gap ref:** H12  
**Current code:** No auth on any of these export routes.

**Modifications:** Add `requireAuth` guard to each route.

**GIVEN** an unauthenticated request to any `/api/export/{templates|scenarios|edge-cases}` endpoint  
**WHEN** the handler executes  
**THEN** a 401 is returned

---

## 8. Phase 5 — Code Enforcement (Batch 3: MEDIUM)

### Change 5.1: `src/app/api/training-files/route.ts` — Add User Scoping to GET

**Gap ref:** M1  
**Current code:** Auth is present but GET uses admin client and lists ALL training files without user filter.

**Modifications:**

In the GET handler, after getting the admin client, add user scoping:
```typescript
// REPLACE: const files = await service.listTrainingFiles({ status: 'active' });
const files = await service.listTrainingFiles({ status: 'active', created_by: user.id });
```

If the service's `listTrainingFiles` does not support `created_by` filter, add `.eq('created_by', userId)` directly in the service method.

**GIVEN** User A requests `GET /api/training-files`  
**WHEN** the handler executes  
**THEN** only training files where `created_by = User A's UUID` are returned

---

### Change 5.2: `src/app/api/conversations/stats/route.ts` — Add Auth + User Scoping

**Gap ref:** M4  
**Current code:** Zero auth. Returns global statistics.

**Modifications:**

1. Add `requireAuth` guard.
2. Scope all stats queries to `created_by = user.id` (or `user_id = user.id` after migration).

**GIVEN** User A requests `GET /api/conversations/stats`  
**WHEN** the handler executes  
**THEN** statistics reflect ONLY User A's conversations

---

### Change 5.3: `src/app/api/conversations/batch/[id]/status/route.ts` — Add Auth + Ownership

**Gap ref:** M5

**Modifications:** Add `requireAuth` + verify the batch job belongs to the user before returning status.

---

### Change 5.4: `src/app/api/conversations/[id]/download/raw/route.ts` — Add Ownership Check

**Gap ref:** M12  
**Current code:** Auth is present but no ownership check.

**Modifications:** Add after conversation fetch:
```typescript
if (conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**GIVEN** User A requests `GET /api/conversations/{userB-id}/download/raw`  
**WHEN** the handler executes  
**THEN** a 403 is returned

---

### Change 5.5: `src/app/api/conversations/[id]/download/enriched/route.ts` — Add Ownership Check

**Gap ref:** M13  
**Modifications:** Identical to Change 5.4.

---

### Change 5.6: Cron Routes — Fail Closed When `CRON_SECRET` Not Configured

**Gap ref:** M6  
**Files:** All 5 cron routes under `src/app/api/cron/`

**Modifications:** In each cron route, change the `CRON_SECRET` check from fail-open to fail-closed:

```typescript
// CURRENT (fail-open):
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// TARGET (fail-closed):
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  console.error('CRON_SECRET not configured — rejecting cron request');
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
}
if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**GIVEN** the `CRON_SECRET` environment variable is not set  
**WHEN** a request hits any cron route  
**THEN** a 500 error is returned  
**AND** no cron processing occurs

---

### Change 5.7: `src/inngest/functions/process-rag-document.ts` — Verify Document Ownership

**Gap ref:** M8  
**Current code:** Trusts `userId` from event payload. No verification that the userId matches the document owner.

**Modifications:** After extracting `userId` and `documentId` from the event payload, verify:

```typescript
const supabase = createServerSupabaseAdminClient();
const { data: doc } = await supabase
  .from('rag_documents')
  .select('user_id')
  .eq('id', documentId)
  .single();

if (!doc || doc.user_id !== userId) {
  throw new Error(`Document ${documentId} does not belong to user ${userId}`);
}
```

**GIVEN** an Inngest event with `documentId: X` and `userId: A` but document X belongs to User B  
**WHEN** the function processes the event  
**THEN** processing is aborted with an error  
**AND** no RAG embeddings are generated for the mismatched document

---

## 9. Phase 6 — Service Layer Hardening

### Change 6.1: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter

**Gap ref:** H1  
**Current code:** `getAllJobs(filters?)` where `createdBy` is optional. Uses admin client.

**Modifications:**

1. **`getAllJobs`** — Change signature:
   ```typescript
   // BEFORE: async getAllJobs(filters?: { status?: BatchJobStatus; createdBy?: string })
   // AFTER:
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     const supabase = getSupabase();
     let query = supabase.from('batch_jobs').select('*').eq('created_by', userId); // MANDATORY
     if (filters?.status) query = query.eq('status', filters.status);
     // ... rest unchanged
   }
   ```

2. **`getJobById`** — Add userId verification:
   ```typescript
   async getJobById(id: string, userId?: string): Promise<BatchJob> {
     // ... existing fetch logic
     if (userId && jobData.created_by !== userId) {
       throw new Error('Forbidden: job does not belong to user');
     }
     // ... rest unchanged
   }
   ```

3. **`cancelJob`** — Add userId parameter:
   ```typescript
   async cancelJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId); // Verifies ownership
     // ... rest unchanged
   }
   ```

4. **`deleteJob`** — Add userId parameter:
   ```typescript
   async deleteJob(id: string, userId: string): Promise<void> {
     await this.getJobById(id, userId); // Verifies ownership
     // ... rest unchanged
   }
   ```

5. **Update all callers** of these methods to pass `user.id`.

**GIVEN** `batchJobService.getAllJobs(userAId)` is called  
**WHEN** the service queries the database  
**THEN** only jobs where `created_by = userAId` are returned  
**AND** it is impossible to call `getAllJobs` without a userId parameter

---

### Change 6.2: `src/lib/rag/services/rag-retrieval-service.ts` — Add `userId` Filter

**Gap ref:** H2  
**Current code:** Uses admin client, scopes by `documentId` but not `user_id`.

**Modifications:**

In the `retrieveContext` function, after building the search query, add:

```typescript
// Add user_id filter to section search
const sectionResults = await searchSimilarEmbeddings({
  queryText: searchText,
  documentId,
  knowledgeBaseId: params.knowledgeBaseId,
  userId: params.userId, // NEW: pass user_id for scoping
  tier: 2,
  // ...
});
```

If `searchSimilarEmbeddings` does not support `userId`, add `.eq('user_id', userId)` to the underlying RPC call or query filter.

**GIVEN** a RAG retrieval request for User A with `documentId: X` belonging to User B  
**WHEN** the service queries for similar embeddings  
**THEN** no results are returned because `user_id` does not match

---

### Change 6.3: `src/lib/services/conversation-service.ts` — Migrate from Deprecated Singleton

**Gap ref:** H3  
**Current code:** Uses `supabase` singleton from `src/lib/supabase.ts` which is `null` on the server.

**Modifications:**

1. **Change constructor** to accept injected client:
   ```typescript
   // BEFORE: Uses module-level supabase singleton
   // AFTER:
   export class ConversationService {
     private supabase: SupabaseClient;
     
     constructor(supabaseClient: SupabaseClient) {
       this.supabase = supabaseClient;
     }
     // ... methods unchanged but now use this.supabase
   }
   ```

2. **Update `conversations/[id]/route.ts`** and `conversations/bulk-action/route.ts` to inject a server-side client:
   ```typescript
   const supabase = await createServerSupabaseClient();
   const service = new ConversationService(supabase);
   ```

---

## 10. Phase 7 — Database Constraints & RLS

**Prerequisites:** Phase 2 backfill is complete AND Phase 3–5 code changes are deployed.

### Change 7.1: Add NOT NULL Constraints

**SAOL method:** `agentExecuteSQL` with `transport: 'pg'`, `dryRun: true` first.

```sql
-- Enforce NOT NULL only after verifying zero orphans
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
```

**GIVEN** the backfill is complete and `_orphaned_records` has zero rows for a table  
**WHEN** the NOT NULL constraint is applied  
**THEN** the ALTER succeeds without errors

### Change 7.2: Add Missing RLS Policies

**Gap refs:** H13, H14, H15

```sql
-- notifications: add RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "notifications_service_all" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- cost_records: add RLS
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_records_select_own" ON cost_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cost_records_service_all" ON cost_records FOR ALL USING (auth.role() = 'service_role');

-- metrics_points: add RLS via join
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_points_select_via_job" ON metrics_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pipeline_training_jobs
    WHERE pipeline_training_jobs.id = metrics_points.job_id
    AND pipeline_training_jobs.user_id = auth.uid()
  ));
CREATE POLICY "metrics_points_service_all" ON metrics_points FOR ALL USING (auth.role() = 'service_role');
```

**GIVEN** RLS is enabled on `notifications`  
**WHEN** a user queries `notifications` via a non-admin client  
**THEN** only rows where `user_id = auth.uid()` are returned

### Change 7.3: Add Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_files_user_id ON training_files(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_generations_user_id ON failed_generations(user_id);
```

---

## 11. Phase 8 — Cleanup & Deprecated Code Removal

### Change 8.1: Remove All `x-user-id` Header Reads

**Files:** All files listed in Appendix A.1 of the v1 spec.

Search for `request.headers.get('x-user-id')` in the entire codebase and remove/replace every occurrence. After Phase 3 and 4, there should be zero remaining.

**Verification:**
```bash
grep -r "x-user-id" src/ --include="*.ts" --include="*.tsx"
# Expected: ZERO results
```

### Change 8.2: Remove All NIL UUID Fallbacks

**Files:** All files listed in Appendix A.2 of the v1 spec.

Search for `00000000-0000-0000-0000-000000000000` and `'test-user'` and `'test_user'` in the codebase and remove all fallbacks.

**Verification:**
```bash
grep -rn "00000000-0000-0000-0000-000000000000\|'test-user'\|'test_user'" src/ --include="*.ts"
# Expected: ZERO results
```

### Change 8.3: Remove Client-Side `x-user-id` Header Sending

Search all client-side code (React components, hooks, fetch utilities) for any code that sets the `x-user-id` header in HTTP requests and remove it.

```bash
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" --exclude-dir="api"
# REMOVE every hit
```

### Change 8.4: Deprecate `src/lib/supabase.ts` Singleton

Mark the file as deprecated. Add a deprecation notice:

```typescript
/**
 * @deprecated Use createServerSupabaseClient() or createServerSupabaseClientFromRequest()
 * from '@/lib/supabase-server' instead. This module creates a client that is null on
 * the server side and should not be used in API routes or server components.
 */
```

---

## 12. Testing Checkpoints

### Checkpoint After Phase 2 (Data Backfill)

Run:
```sql
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;
```
**Expected:** `nulls = 0` for all tables (or only expected orphans remaining in `_orphaned_records`).

### Checkpoint After Phase 3 (Critical Route Fixes)

**Test T5 — Unauthenticated Rejection:**

| Endpoint | Method | Expected Status |
|----------|--------|----------------|
| `/api/conversations` | GET | 401 |
| `/api/conversations` | POST | 401 |
| `/api/conversations/{id}` | GET | 401 |
| `/api/conversations/{id}` | PATCH | 401 |
| `/api/conversations/{id}` | DELETE | 401 |
| `/api/conversations/{id}/status` | PATCH | 401 |
| `/api/conversations/bulk-action` | POST | 401 |
| `/api/conversations/bulk-enrich` | POST | 401 |
| `/api/conversations/generate` | POST | 401 |
| `/api/conversations/generate-batch` | POST | 401 |
| `/api/batch-jobs` | GET | 401 |
| `/api/batch-jobs/{id}/cancel` | POST | 401 |
| `/api/batch-jobs/{id}/process-next` | POST | 401 |
| `/api/pipeline/jobs/{id}/download` | GET | 401 |
| `/api/export/conversations` | POST | 401 |
| `/api/export/download/{id}` | GET | 401 |
| `/api/import/templates` | POST | 401 |
| `/api/import/scenarios` | POST | 401 |
| `/api/import/edge-cases` | POST | 401 |

**Test T6 — Spoofed Header Ignored:**

For each `x-user-id` route (conversations, exports, generation-logs):
1. Authenticate as User A
2. Send request with `x-user-id: <User B's UUID>` header
3. Verify response contains ONLY User A's data

**Test T1 — Cross-User List Isolation:**

1. Create User A and User B test accounts
2. User A creates a conversation, batch job, export
3. User B lists conversations, batch jobs, exports
4. Verify User B sees ZERO of User A's resources

### Checkpoint After Phase 4 (High Route Fixes)

**Additional 401 checks** for:
- `GET /api/generation-logs`
- `GET /api/failed-generations`
- `GET /api/templates`
- `POST /api/templates/test`
- `GET /api/documents`
- `GET /api/performance`

### Checkpoint After Phase 7 (DB Constraints)

```sql
-- Verify NOT NULL constraints
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('conversations', 'training_files', 'batch_jobs', 'generation_logs', 'documents')
AND column_name = 'user_id';
-- Expected: is_nullable = 'NO' for all
```

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'cost_records', 'metrics_points');
-- Expected: rowsecurity = true for all
```

### Final Checkpoint (All Phases)

```bash
# Verify no x-user-id reads remain
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx"
# Expected: ZERO results

# Verify no NIL UUID fallbacks remain
grep -rn "00000000-0000-0000-0000-000000000000" src/ --include="*.ts"
# Expected: ZERO results

# Verify no 'test-user' fallbacks remain
grep -rn "'test-user'\|'test_user'" src/ --include="*.ts"
# Expected: ZERO results
```

---

## 13. Warnings & Risks

### W1: Client-Side Breakage from Removing `x-user-id`

**Risk:** Frontend code that sends `x-user-id` header will continue to send it, but it will be ignored. If any frontend code DEPENDS on the `x-user-id` header being read AND does NOT set auth cookies, those flows will get 401s.

**Mitigation:** Search all frontend code for `x-user-id` header setting. Ensure all API calls include auth cookies (Supabase SSR handles this automatically via `fetch` credentialing).

### W2: Batch Job Processing Loop

**Risk:** `batch-jobs/[id]/process-next` is called in a polling loop by the frontend. Adding `requireAuth` means the frontend must include auth cookies on every poll request. If the auth cookie expires mid-batch, processing stops.

**Mitigation:** Verify the frontend uses `fetch` with `credentials: 'include'`. Consider implementing token refresh before each poll iteration or switching to a server-side orchestrator (Inngest).

### W3: Conversation Generation Triggered by Batch Process

**Risk:** In `process-next`, the generation service is called with `userId: user.id`. If a batch job was created by User A but User A's session expires before all items are processed, items will fail.

**Mitigation:** For batch processing, consider keeping `createdBy` from the job record rather than requiring a live session. The auth check verifies the requestor is the job owner, but the generation uses the job's stored `createdBy`.

### W4: Admin Client Scoping After Phase 6

**Risk:** Changing `batch-job-service.ts` method signatures is a breaking change. Every caller of `getAllJobs`, `getJobById`, `cancelJob`, `deleteJob` must be updated simultaneously.

**Mitigation:** Implement changes 6.1 atomically with all route-level changes that call these methods: `batch-jobs/route.ts`, `batch-jobs/[id]/cancel/route.ts`, `batch-jobs/[id]/process-next/route.ts`, and any Inngest functions that call batch-job-service.

### W5: Migration Ordering

**Risk:** If Phase 3 (code enforcement) is deployed before Phase 1 (schema migration), the code will try to write `user_id` on tables where the column doesn't exist yet.

**Mitigation:** Strict ordering. Phase 1 and 2 (DB) MUST be deployed and verified BEFORE Phase 3 (code). Phase 7 (constraints) MUST wait for Phase 3–5.

### W6: Performance Impact of Adding Indexes

**Risk:** Creating indexes on large tables (`conversations`, `generation_logs`) may cause lock contention during creation.

**Mitigation:** Use `CREATE INDEX CONCURRENTLY` for production deployment:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
```
Note: `CONCURRENTLY` cannot be used inside a transaction — run these as standalone statements via SAOL.

### W7: Shared Resources (Templates, Scenarios, Edge Cases)

**Risk:**  Adding auth to template/scenario/edge-case GET endpoints may break unauthenticated tools or scripts that read these resources.

**Mitigation:** These are intentional changes. All consumers must authenticate. If automated tools need access, they should use a service account with proper credentials.

---

## 14. Files Modified Summary

| Phase | Files Modified | Files Created | Effort Estimate |
|-------|---------------|---------------|-----------------|
| Phase 0 | 0 | 0 | 0.5 day |
| Phase 1 | 0 (DB only) | 1 migration file | 0.5 day |
| Phase 2 | 0 (DB only) | 1 migration file | 0.5 day |
| Phase 3 | 16 route files | 0 | 3 days |
| Phase 4 | 12 route files | 0 | 2 days |
| Phase 5 | 10 route + service files | 0 | 2 days |
| Phase 6 | 3 service files | 0 | 1 day |
| Phase 7 | 0 (DB only) | 1 migration file | 0.5 day |
| Phase 8 | ~15 files (cleanup) | 0 | 1 day |
| Tests | 0 | 6 test files | 2 days |
| **Total** | **~38 files** | **9 files** | **~13 days** |

### Implementation Priority (Blocks Soft Launch)

**MUST complete before soft launch:**
- Phase 0 (verification)
- Phase 1 (schema migration)
- Phase 2 (backfill)
- Phase 3 (CRITICAL: changes 3.1–3.16)
- Phase 4 (HIGH: changes 4.1–4.9)
- Testing checkpoints after Phase 3 and Phase 4

**Should complete before GA:**
- Phase 5 (MEDIUM)
- Phase 6 (service layer)
- Phase 7 (DB constraints)

**Can complete post-launch:**
- Phase 8 (cleanup)
- Full test suite (test files)

---

*End of Document*
