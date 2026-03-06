# Data & Identity Spine — Detailed Implementation Specification v4

**Document:** `02-data-and-identity-spine-detailed-specification_v4.md`
**Date:** 2026-02-19
**Status:** SPECIFICATION — FINAL — READY FOR IMPLEMENTATION
**Prerequisite:** `01-data-and-identity-spine-spec_v1.md` (Investigation & Gap Log)
**Source:** Merged from v1 and v3 specs. All claims validated against the codebase on 2026-02-19.
**Scope:** Bright Run LoRA Training Data Platform (v2-modules)
**SAOL Constraint:** All database DDL/DML operations MUST be executed via SAOL (`agentExecuteDDL` with `transport: 'pg'`, `transaction: true`). Always dry-run first (`dryRun: true`), verify output, then execute with `dryRun: false`.

---

## Table of Contents

1. [Summary](#1-summary)
2. [Impact Analysis](#2-impact-analysis)
3. [Phase 0 — Preflight Verification](#3-phase-0--preflight-verification)
4. [Phase 1 — Auth Infrastructure](#4-phase-1--auth-infrastructure)
5. [Phase 2 — Database Schema Migration](#5-phase-2--database-schema-migration)
6. [Phase 3 — Data Backfill & Orphan Quarantine](#6-phase-3--data-backfill--orphan-quarantine)
7. [Phase 4 — CRITICAL Route Fixes (C1–C16)](#7-phase-4--critical-route-fixes-c1c16)
8. [Phase 5 — HIGH Route & Service Fixes (H1–H15)](#8-phase-5--high-route--service-fixes-h1h15)
9. [Phase 6 — MEDIUM Fixes (M1–M13)](#9-phase-6--medium-fixes-m1m13)
10. [Phase 7 — Database Constraints & RLS](#10-phase-7--database-constraints--rls)
11. [Phase 8 — Cleanup & Deprecated Code Removal](#11-phase-8--cleanup--deprecated-code-removal)
12. [Testing Checkpoints](#12-testing-checkpoints)
13. [Warnings & Risks](#13-warnings--risks)
14. [Execution Order](#14-execution-order)
15. [Files Summary](#15-files-summary)

---

## 1. Summary

This specification converts the 48 identity spine gaps identified in the v1 investigation (C1–C16 CRITICAL, H1–H15 HIGH, M1–M13 MEDIUM, L1–L5 LOW) into numbered, implementable changes with exact file paths, validated line numbers, code patterns, and GIVEN-WHEN-THEN acceptance criteria.

**Scope:** ~45 route files modified, 3 service files modified, 4 SAOL migration scripts created, 6 test files created.

**Implementation order:** Preflight → Auth infrastructure → DB schema → Backfill → CRITICAL routes → HIGH routes/services → MEDIUM → DB constraints/RLS → Cleanup.

**Gold standard reference pattern** (from `src/app/api/datasets/route.ts`):

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

## 2. Impact Analysis

### 2.1 Files Created

| # | File | Purpose |
|---|------|---------|
| 1 | `src/scripts/migrations/identity-spine-phase2-add-columns.ts` | SAOL: Add `user_id` columns to legacy tables |
| 2 | `src/scripts/migrations/identity-spine-phase3-backfill.ts` | SAOL: Backfill ownership data, quarantine orphans |
| 3 | `src/scripts/migrations/identity-spine-phase7-constraints.ts` | SAOL: NOT NULL constraints + indexes |
| 4 | `src/scripts/migrations/identity-spine-phase7-rls.ts` | SAOL: RLS policies for notifications, cost_records, metrics_points |
| 5 | `src/__tests__/identity-spine/cross-user-isolation.test.ts` | Tests T1–T3 |
| 6 | `src/__tests__/identity-spine/ownership-stamping.test.ts` | Tests T4, T9 |
| 7 | `src/__tests__/identity-spine/auth-enforcement.test.ts` | Tests T5, T6 |
| 8 | `src/__tests__/identity-spine/background-job-isolation.test.ts` | Test T7 |
| 9 | `src/__tests__/identity-spine/download-isolation.test.ts` | Test T8 |
| 10 | `src/__tests__/identity-spine/admin-client-scoping.test.ts` | Test T10 |

### 2.2 Files Modified (Summary)

| Phase | Files | Count |
|-------|-------|-------|
| Phase 1 — Auth Infrastructure | `src/lib/supabase-server.ts` | 1 |
| Phase 4 — CRITICAL Routes | `conversations/*` (13), `batch-jobs/*` (3), `pipeline/jobs/*/download` (1), `export/*` (2), `import/*` (3) | 22 |
| Phase 5 — HIGH Routes & Services | `generation-logs/*` (2), `failed-generations/*` (2), `templates/*` (2), `documents/*` (2), `performance` (1), `training-files/*` (2), `export/*` (5), service files (3) | 19 |
| Phase 6 — MEDIUM | `training-files/route.ts` (1), `conversations/*/download/*` (2), cron routes (5), `inngest/process-rag-document.ts` (1) | 9 |
| Phase 8 — Cleanup | Client hooks, module-scope singletons (~10 files) | ~10 |

### 2.3 Database Tables Affected

**New columns (Phase 2):**
| Table | Columns Added |
|-------|---------------|
| `conversations` | `user_id UUID`, `updated_by UUID` |
| `training_files` | `user_id UUID`, `updated_by UUID` |
| `batch_jobs` | `user_id UUID`, `updated_by UUID` |
| `generation_logs` | `user_id UUID` |
| `failed_generations` | `user_id UUID` |
| `documents` | `user_id UUID` |
| `datasets` | `created_by UUID`, `updated_by UUID` |
| `pipeline_training_jobs` | `created_by UUID`, `updated_by UUID` |
| `rag_knowledge_bases` | `updated_by UUID` |
| `rag_documents` | `updated_by UUID` |

**RLS additions (Phase 7):**
| Table | Policy |
|-------|--------|
| `notifications` | `user_id = auth.uid()` for SELECT/UPDATE/DELETE; service_role for ALL |
| `cost_records` | `user_id = auth.uid()` for SELECT; service_role for ALL |
| `metrics_points` | JOIN to `pipeline_training_jobs.user_id = auth.uid()` for SELECT; service_role for ALL |

**New table (Phase 3):**
| Table | Purpose |
|-------|---------|
| `_orphaned_records` | Quarantine table for records with NULL ownership after backfill |

### 2.4 Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking client-side fetch calls that lack auth cookies | HIGH | Verify all `fetch()` calls use `credentials: 'include'` (Supabase SSR handles this) |
| Orphaned records fail NOT NULL constraint | HIGH | Phase 3 backfill + quarantine MUST complete before Phase 7 constraints |
| Batch job processing breaks mid-generation | MEDIUM | Use `job.createdBy` from DB record (not live session) for pipeline userId |
| `batch-job-service.ts` method signature changes break callers | MEDIUM | Deploy all route changes + service changes atomically |
| Large table index creation causes lock contention | LOW | Use `CREATE INDEX CONCURRENTLY` (cannot be in transaction — run standalone) |
| Phase 7 deployed before Phase 3 verified → table lock failure | CRITICAL | Strict phase ordering enforced. Verify zero orphans before constraints. |

---

## 3. Phase 0 — Preflight Verification

### Change 0.1: Verify `requireAuth` Function Signature

**File:** `src/lib/supabase-server.ts` (line ~148)
**Action:** READ-ONLY — no changes needed.

Confirm that `requireAuth(request: NextRequest)` returns `{ user: User | null, response: NextResponse | null }`. If `user` is null, `response` is a 401 JSON body.

**GIVEN** `requireAuth` is called with a request containing valid Supabase auth cookies
**WHEN** the function resolves
**THEN** it returns `{ user: <User object with .id UUID>, response: null }`

**GIVEN** `requireAuth` is called with a request containing no or expired auth cookies
**WHEN** the function resolves
**THEN** it returns `{ user: null, response: NextResponse.json({ error: 'Unauthorized', message: 'Please log in to access this resource' }, { status: 401 }) }`

### Change 0.2: Verify SAOL Availability

**Action:** Run verification command:
```bash
cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');console.log('SAOL exports:', Object.keys(s).filter(k=>k.startsWith('agent')))"
```
Expected: `agentQuery`, `agentCount`, `agentExecuteDDL`, `agentIntrospectSchema`, etc.

### Change 0.3: Verify `generate-with-scaffolding` Is Already Secure

**File:** `src/app/api/conversations/generate-with-scaffolding/route.ts`
**Action:** READ-ONLY — ALREADY USES `requireAuth` (line 49). No changes needed. This route is excluded from Phase 4.

---

## 4. Phase 1 — Auth Infrastructure

### Change 1.1: Add `requireAuthOrCron` Helper

**File:** `src/lib/supabase-server.ts`
**Action:** MODIFY — Add new exported function after `requireAuth` (after line ~164)
**Gap ref:** M6 (cron fail-closed pattern)

**Why:** All 5 cron routes currently fail-open when `CRON_SECRET` is not configured. This helper centralizes the fail-closed pattern so each cron route uses a one-liner instead of duplicating auth logic.

**Implementation:**

```typescript
/**
 * Require either a valid CRON_SECRET Bearer token or an authenticated user session.
 * Fails closed: if CRON_SECRET is not configured, returns 500.
 * Use in cron routes that may also be triggered manually by authenticated users.
 */
export async function requireAuthOrCron(request: NextRequest): Promise<{
  isCron: boolean;
  user: User | null;
  response: NextResponse | null;
}> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Check if this is a cron request (has Bearer token)
  if (authHeader?.startsWith('Bearer ')) {
    if (!cronSecret) {
      return {
        isCron: false,
        user: null,
        response: NextResponse.json(
          { error: 'CRON_SECRET not configured' },
          { status: 500 }
        ),
      };
    }
    if (authHeader === `Bearer ${cronSecret}`) {
      return { isCron: true, user: null, response: null };
    }
    return {
      isCron: false,
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // No Bearer token — fall through to standard user auth
  const { user, response } = await requireAuth(request);
  return { isCron: false, user, response };
}
```

**GIVEN** a request with a valid `Bearer {CRON_SECRET}` header **WHEN** `CRON_SECRET` is set **THEN** returns `{ isCron: true, user: null, response: null }`
**GIVEN** a request with an invalid Bearer token **WHEN** `CRON_SECRET` is set **THEN** returns 401
**GIVEN** any request **WHEN** `CRON_SECRET` is NOT set **AND** a Bearer token is present **THEN** returns 500
**GIVEN** a request with no Bearer header but valid auth cookies **THEN** falls through to `requireAuth`, returns `{ isCron: false, user, response: null }`

---

## 5. Phase 2 — Database Schema Migration

### Change 2.1: Add `user_id` and Audit Columns to Legacy Tables

**File:** `src/scripts/migrations/identity-spine-phase2-add-columns.ts` (CREATE)
**Gap refs:** C1, C8, H6, H7, H10 (prerequisite for all code-level changes)
**SAOL method:** `agentExecuteDDL({ sql: '...', transport: 'pg', transaction: true, dryRun: true })` — dry-run first, then execute.

```sql
-- 1. Legacy tables: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Standardize documents table (currently has author_id)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add updated_by audit columns where missing
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 4. Add created_by audit column to tables that only have user_id
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
```

**GIVEN** the `conversations` table exists without a `user_id` column
**WHEN** the migration executes via SAOL
**THEN** `conversations` has a nullable `user_id UUID` column with FK to `auth.users(id)` ON DELETE CASCADE

**GIVEN** the migration is executed a second time
**WHEN** all columns already exist
**THEN** no errors occur (idempotent via `IF NOT EXISTS`)

---

## 6. Phase 3 — Data Backfill & Orphan Quarantine

### Change 3.1: Backfill `user_id` from Existing Ownership Columns

**File:** `src/scripts/migrations/identity-spine-phase3-backfill.ts` (CREATE)
**SAOL method:** `agentExecuteDDL({ sql: '...', transport: 'pg', transaction: true })`

```sql
-- Backfill user_id from created_by on legacy tables
UPDATE conversations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE training_files SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE batch_jobs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE generation_logs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE failed_generations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Backfill documents.user_id from author_id
UPDATE documents SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;

-- Backfill reverse: created_by from user_id on pipeline tables
UPDATE datasets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE pipeline_training_jobs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
```

### Change 3.2: Create Orphan Quarantine Table & Log Orphans

```sql
-- Create quarantine table
CREATE TABLE IF NOT EXISTS _orphaned_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  resolution TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Log orphaned records (NULL ownership after backfill)
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'training_files', id FROM training_files WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'generation_logs', id FROM generation_logs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'documents', id FROM documents WHERE author_id IS NULL AND user_id IS NULL;
```

**GIVEN** `conversations` rows have `created_by` set but `user_id IS NULL`
**WHEN** the backfill runs
**THEN** `user_id = created_by` for all such rows

**GIVEN** orphaned records exist (both `created_by IS NULL AND user_id IS NULL`)
**WHEN** the backfill runs
**THEN** they are logged in `_orphaned_records` for manual resolution

**Verification query:**
```sql
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS orphans, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;
-- Expected: orphans = 0 for all tables (or matches _orphaned_records count)
```

---

## 7. Phase 4 — CRITICAL Route Fixes (C1–C16)

Every change in this phase follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';` at top
2. Add auth guard: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries (`.eq('created_by', user.id)` or ownership check post-fetch)
5. Remove NIL UUID and `'test-user'` fallbacks

---

### Change 4.1: `src/app/api/conversations/route.ts` — Replace Spoofable Auth (C1)

**Current state (validated):**
- GET L32: `request.headers.get('x-user-id') || undefined` — spoofable, optional
- POST L68: `request.headers.get('x-user-id') || 'test-user'` — spoofable, hardcoded fallback
- Client: delegates to `getConversationStorageService()`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Replace L32:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || undefined;
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```
   Ensure `created_by: userId` is passed to the service listing filter (already done — now userId is verified instead of optional).

3. **POST handler** — Replace L68:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || 'test-user';
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```

**GIVEN** a GET without auth cookies **THEN** 401 is returned
**GIVEN** a GET with valid auth for User A **THEN** only conversations where `created_by = user.id` are returned
**GIVEN** a POST with valid auth **THEN** `created_by` is set to `user.id` from session, not from header
**GIVEN** a request with `x-user-id` header AND valid auth cookie **THEN** the header is IGNORED

---

### Change 4.2: `src/app/api/conversations/[id]/route.ts` — Add Auth + Ownership (C2)

**Current state (validated):**
- ZERO auth on GET, PATCH, DELETE
- Delegates to `conversationService` from `@/lib/conversation-service`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **All handlers (GET, PATCH, DELETE)** — Add auth guard + ownership check:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   After fetching the conversation by ID:
   ```typescript
   if (!conversation || conversation.created_by !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**GIVEN** User A requests GET/PATCH/DELETE for User B's conversation **THEN** 404 is returned (do not reveal existence)
**GIVEN** an unauthenticated request **THEN** 401 is returned

---

### Change 4.3: `src/app/api/conversations/[id]/status/route.ts` — Replace Spoofable Auth (C3)

**Current state (validated):**
- PATCH L31: `request.headers.get('x-user-id') || 'test-user'` — spoofable with fallback
- GET: no auth at all
- No ownership check on either handler

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **Both GET and PATCH handlers** — Add auth guard and ownership check:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Fetch the conversation and verify:
   ```typescript
   const service = getConversationStorageService();
   const existing = await service.getConversation(params.id);
   if (!existing || existing.created_by !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

3. **PATCH** — Replace `userId = header || 'test-user'` with `user.id`.

**GIVEN** a PATCH with `x-user-id: <victim-uuid>` header but cookies for attacker **THEN** header is IGNORED; if attacker doesn't own the conversation, 404 is returned

---

### Change 4.4: `src/app/api/conversations/bulk-action/route.ts` — Add Auth + Scope (C4)

**Current state (validated):**
- ZERO auth
- `reviewerId` comes from request body (caller-supplied, no verification)
- Delegates to `conversationService`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard at top of POST:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Replace body `reviewerId` with `user.id`:
   ```typescript
   const reviewerId = user.id; // Always use authenticated user
   ```

4. Scope conversation access — verify all `conversationIds` belong to the user:
   ```typescript
   const supabase = await createServerSupabaseClient();
   const { data: ownedConvs } = await supabase
     .from('conversations')
     .select('id')
     .in('id', conversationIds)
     .eq('created_by', user.id);
   const ownedIds = new Set((ownedConvs || []).map(c => c.id));
   const filteredIds = conversationIds.filter(id => ownedIds.has(id));
   const skippedCount = conversationIds.length - filteredIds.length;
   // Use filteredIds for the operation; return skippedCount in response
   ```

**GIVEN** User A sends bulk-action with a mix of owned and non-owned IDs **THEN** only owned conversations are affected; non-owned are silently skipped with count returned
**GIVEN** a POST without auth **THEN** 401 is returned

---

### Change 4.5: `src/app/api/conversations/bulk-enrich/route.ts` — Add Auth + Ownership (C5)

**Current state (validated):**
- ZERO auth
- Uses `createServerSupabaseAdminClient()` (admin client, bypasses RLS) at L40
- Fallback at L98: `conversation.created_by || '00000000-0000-0000-0000-000000000000'`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard at top of POST:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. In the enrichment loop, verify ownership per conversation:
   ```typescript
   // REMOVE: const userId = conversation.created_by || '00000000-0000-0000-0000-000000000000';
   if (conversation.created_by !== user.id) {
     results.push({ conversationId, status: 'skipped', error: 'Not owned by authenticated user' });
     continue;
   }
   const userId = user.id;
   ```

**Note:** Admin client usage is acceptable here (enrichment requires cross-table writes) but MUST be gated by the ownership check above.

**GIVEN** User A sends bulk-enrich with a mix of own and others' IDs **THEN** own conversations are enriched; others return `status: 'skipped'`
**GIVEN** no auth **THEN** 401 is returned; no Claude API calls occur

---

### Change 4.6: `src/app/api/conversations/generate/route.ts` — Add Auth, Remove Body userId (C6)

**Current state (validated):**
- ZERO auth
- L30: `validated.userId || '00000000-0000-0000-0000-000000000000'` — body userId with NIL UUID fallback
- Delegates to `getConversationGenerationService()`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard before body parsing:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Replace userId resolution:
   ```typescript
   // REMOVE: const userId = validated.userId || '00000000-0000-0000-0000-000000000000';
   const userId = user.id;
   ```

4. In the Zod schema, mark `userId` as deprecated-ignored:
   ```typescript
   userId: z.string().optional(), // DEPRECATED — ignored; auth cookie used instead
   ```

**GIVEN** no auth **THEN** 401 returned; no Claude API call made (cost savings)
**GIVEN** auth with `userId` in body set to another user **THEN** body `userId` is IGNORED; `user.id` from session is used

---

### Change 4.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId (C7)

**Current state (validated):**
- ZERO auth
- L37: `validated.userId || '00000000-0000-0000-0000-000000000000'`
- Delegates to `getBatchGenerationService()`

**Modifications:** Identical pattern to Change 4.6.

**GIVEN** an authenticated batch generation **THEN** all created conversations and the batch job have `created_by = user.id`

---

### Change 4.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping (C8)

**Current state (validated):**
- ZERO auth on GET
- Optional `createdBy` filter from query string (L20) — not enforced
- Delegates to `batchJobService.getAllJobs(filters?)`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. FORCE user scoping — override any `createdBy` query param:
   ```typescript
   const filters: { status?: typeof status; createdBy: string } = { createdBy: user.id };
   if (status) filters.status = status;
   ```

**GIVEN** User A requests `GET /api/batch-jobs` **THEN** only jobs where `created_by = user.id` are returned
**GIVEN** User A sends `?createdBy=<User B UUID>` **THEN** the param is OVERRIDDEN with `user.id`

---

### Change 4.9: `src/app/api/batch-jobs/[id]/cancel/route.ts` — Add Auth + Ownership (C9)

**Current state (validated):**
- ZERO auth on POST
- Anyone can cancel any job by ID

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard + ownership check:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   After `const job = await batchJobService.getJobById(id);`:
   ```typescript
   if (!job || job.createdBy !== user.id) {
     return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
   }
   ```

**GIVEN** User A tries to cancel User B's job **THEN** 404 is returned; job is NOT cancelled

---

### Change 4.10: `src/app/api/batch-jobs/[id]/process-next/route.ts` — Add Auth + Ownership (C10)

**Current state (validated):**
- ZERO auth on POST (L141)
- Uses `createServerSupabaseAdminClient()` (admin client, bypasses RLS)
- L306: `job.createdBy || '00000000-0000-0000-0000-000000000000'` NIL UUID fallback for userId

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard at top of POST:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Add ownership check after job fetch:
   ```typescript
   if (!job || job.createdBy !== user.id) {
     return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
   }
   ```

4. Replace NIL UUID usage with `user.id`:
   ```typescript
   // REMOVE: userId: job.createdBy || '00000000-0000-0000-0000-000000000000',
   userId: user.id,
   ```

**GIVEN** no auth **THEN** 401 returned; no admin client operations performed; no AI generation occurs

---

### Change 4.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership (C11)

**Current state (validated):**
- ZERO auth on GET
- Uses `createServerSupabaseAdminClient()` (admin client)
- **IP THEFT RISK** — anyone can download trained LoRA adapter models

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard as first operation in GET:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Add ownership check after fetching the job:
   ```typescript
   if (!job || job.user_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**GIVEN** User A requests download of User B's adapter **THEN** 404 returned; no storage download occurs
**GIVEN** no auth **THEN** 401 returned

---

### Change 4.12: `src/app/api/export/conversations/route.ts` — Replace Spoofable Auth + Scope (C12)

**Current state (validated):**
- POST L68: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'`
- Conversations query has NO `.eq('created_by', ...)` — userId only written to export log, NOT used to scope reads
- Uses `createServerSupabaseClient()` (RLS-backed)

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Replace L68:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';
   const { user, response: authResponse } = await requireAuth(request);
   if (authResponse) return authResponse;
   const userId = user.id;
   ```

3. **CRITICAL:** Add user scoping to the conversation query for ALL scope cases:
   ```typescript
   // After building conversationQuery based on scope, ALWAYS add:
   conversationQuery = conversationQuery.eq('created_by', userId);
   ```

**GIVEN** User A exports with `scope: 'all'` **THEN** only User A's conversations are exported
**GIVEN** `scope: 'selected'` with IDs including another user's conversations **THEN** only owned IDs are included

---

### Change 4.13: `src/app/api/export/download/[id]/route.ts` — Replace Spoofable Auth (C13)

**Current state (validated):**
- GET L57: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'`
- Has existing ownership check at L68-72: `if (exportLog.user_id !== userId)` → 403
- The check is correct but `userId` comes from spoofable header

**Modifications:**

1. Replace L57:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || '00000000-...';
   const { user, response: authResponse } = await requireAuth(request);
   if (authResponse) return authResponse;
   const userId = user.id;
   ```

**GIVEN** the existing ownership check remains but `userId` now comes from `requireAuth` **THEN** an attacker cannot spoof the download

---

### Change 4.14: `src/app/api/import/templates/route.ts` — Add Auth (C14)

**Current state (validated):**
- ZERO auth on POST
- Uses `createClient()` from `@/lib/supabase/server` (different import path from other routes)

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Stamp `created_by: user.id` on imported records.

**GIVEN** no auth **THEN** 401 returned; no templates created or overwritten

---

### Change 4.15: `src/app/api/import/scenarios/route.ts` — Add Auth (C15)

**Current state (validated):** Identical pattern to Change 4.14 (zero auth, uses `createClient()`).
**Modifications:** Identical to Change 4.14 but for scenarios.

---

### Change 4.16: `src/app/api/import/edge-cases/route.ts` — Add Auth (C16)

**Current state (validated):** Identical pattern to Change 4.14.
**Modifications:** Identical to Change 4.14 but for edge cases.

---

### Change 4.17: Secure Remaining Conversation Sub-Routes (C1-adjacent)

The following routes have ZERO auth and are part of the conversations resource group. Each requires `requireAuth` + parent conversation ownership verification.

| Route | Handler(s) | Current Auth | Required Change |
|-------|-----------|-------------|-----------------|
| `src/app/api/conversations/[id]/turns/route.ts` | GET, POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/orphaned/route.ts` | GET | **NONE** | Add `requireAuth`; scope to user's orphaned conversations |
| `src/app/api/conversations/stats/route.ts` | GET | **NONE** | Add `requireAuth`; scope stats to `created_by = user.id` |

**Note:** `conversations/generate-with-scaffolding/route.ts` is EXCLUDED — it already uses `requireAuth` correctly (verified in Phase 0).

**Pattern for `[id]` sub-routes (turns, link-chunk, unlink-chunk):**
```typescript
import { requireAuth } from '@/lib/supabase-server';

// In handler:
const { user, response } = await requireAuth(request);
if (response) return response;

// Verify parent conversation ownership
const conversation = await service.getConversation(params.id);
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
// ... proceed with operation
```

**GIVEN** User A accesses User B's conversation turns **THEN** 404 is returned
**GIVEN** no auth on any of these routes **THEN** 401 is returned

---

## 8. Phase 5 — HIGH Route & Service Fixes (H1–H15)

---

### Change 5.1: `src/app/api/generation-logs/route.ts` — Add Auth + User Scoping (H6)

**Current state (validated):**
- GET: **ZERO auth** — lists all logs globally
- POST L103: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'`
- TODO comment at L97: "Get user ID from auth session"

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard + user scoping:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   // Add to filters:
   filters.createdBy = user.id;
   ```

3. **POST handler** — Replace L103:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || '00000000-...';
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```

**GIVEN** User A requests GET **THEN** only logs where `created_by = user.id` are returned

---

### Change 5.2: `src/app/api/generation-logs/stats/route.ts` — Add Auth + User Scoping (H6)

**Current state (validated):**
- ZERO auth — returns global cost/performance stats across all users
- Delegates to `generationLogService`

**Modifications:** Add `requireAuth` guard. Scope stats queries to `created_by = user.id`.

**GIVEN** User A requests stats **THEN** statistics reflect ONLY User A's generation logs

---

### Change 5.3: `src/app/api/failed-generations/route.ts` — Add Auth + User Scoping (H7)

**Current state (validated):**
- ZERO auth on GET — exposes all failure payloads globally
- Delegates to `getFailedGenerationService()`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Add auth guard + user scoping:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Add `.eq('created_by', user.id)` to the query (either in the route or via a filter parameter to the service).

**GIVEN** no auth **THEN** 401 returned
**GIVEN** User A requests **THEN** only User A's failed generations are returned

---

### Change 5.4: `src/app/api/failed-generations/[id]/route.ts` — Add Auth + Ownership (H7)

**Current state (validated):**
- ZERO auth on GET — any caller can fetch any failed generation by ID
- `failed-generations/[id]/download/route.ts` does NOT exist

**Modifications:** Add `requireAuth` + ownership check post-fetch (`created_by === user.id`).

**GIVEN** User A requests User B's failed generation by ID **THEN** 404 is returned

---

### Change 5.5: `src/app/api/templates/route.ts` — Add Auth to GET (H4)

**Current state (validated):**
- GET: **ZERO auth** — lists all templates
- POST: properly uses `supabase.auth.getUser()` (L93)
- Templates are **shared resources** — all authenticated users can read

**Modifications:** Add auth check to GET handler (do NOT add user scoping — shared resource):
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**GIVEN** no auth on GET **THEN** 401 returned
**GIVEN** any authenticated user **THEN** ALL templates returned (shared resource — intentional)

---

### Change 5.6: `src/app/api/templates/test/route.ts` — Add Auth (H5)

**Current state (validated):**
- ZERO auth on POST
- L131: `userId: 'test_user'` hardcoded
- Triggers Claude API calls (cost risk)

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. Add auth guard:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```

3. Replace `'test_user'` with `user.id`:
   ```typescript
   // REMOVE: userId: 'test_user',
   userId: user.id,
   ```

**GIVEN** no auth **THEN** 401 returned; no Claude API call made (prevents unauthorized cost)

---

### Change 5.7: `src/app/api/documents/route.ts` — Replace Module-Scope Singleton + Add Auth to GET (H10)

**Current state (validated):**
- GET: **ZERO auth**
- POST: Bearer token auth via `Authorization` header → `supabase.auth.getUser(token)` (L76-83)
- **Module-scope singleton** `createClient()` from `@supabase/supabase-js` with **service role key** — bypasses RLS
- Placeholder values: `'http://placeholder'`, `'placeholder'` (L5-6)

**Modifications:**

1. **Remove module-level client** — Delete the `const supabase = createClient(...)` block at L5-6.

2. **GET handler** — Add `requireAuth` + user scoping:
   ```typescript
   import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';

   export async function GET(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;

     const { supabase } = createServerSupabaseClientFromRequest(request);
     const { data } = await supabase
       .from('documents')
       .select('*')
       .eq('author_id', user.id) // SCOPE to user's documents
       .order('created_at', { ascending: false });
     // ...
   }
   ```

3. **POST handler** — Replace Bearer token auth with `requireAuth`:
   ```typescript
   export async function POST(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;
     // Use user.id instead of extracting from Bearer token
   }
   ```

**GIVEN** User A requests GET **THEN** only documents where `author_id = user.id` are returned

---

### Change 5.8: `src/app/api/documents/[id]/route.ts` — Normalize Auth Pattern (H11)

**Current state (validated):**
- Auth present via Bearer token → `supabase.auth.getUser(token)` on all methods (PATCH L57, GET L296, DELETE L363)
- Ownership check EXISTS: `existingDoc.author_id !== user.id` → 403
- BUT uses module-scope admin singleton with placeholder values (L5-6)

**Modifications:**

1. Remove module-scope `createClient()` singleton.
2. Replace Bearer token auth with `requireAuth`:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
3. Replace admin client usage inside handler with `createServerSupabaseAdminClient()` called per-request (inside the handler, not at module scope).
4. Keep the existing ownership check (it correctly returns 403 — change to 404 for consistency):
   ```typescript
   if (!existingDoc || existingDoc.author_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

---

### Change 5.9: `src/app/api/performance/route.ts` — Add Auth (H8)

**Current state (validated):**
- ZERO auth on GET — exposes slow queries, table bloat, and unused index data

**Modifications:** Add `requireAuth` guard.

**GIVEN** no auth **THEN** 401 returned; no DB internals exposed

---

### Change 5.10: `src/app/api/training-files/[id]/download/route.ts` — Add Ownership Check (H9)

**Current state (validated):**
- Auth present via `supabase.auth.getUser()` (L23-24) — correctly rejects unauthenticated
- NO ownership check — any authenticated user can download any training file by ID

**Modifications:** Add ownership check after fetching the training file:
```typescript
if (!trainingFile || trainingFile.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

**GIVEN** User A requests download of User B's training file **THEN** 404 returned; no download URL generated

---

### Change 5.11: `src/app/api/export/history/route.ts` — Replace Spoofable Auth (H6-adjacent)

**Current state (validated):**
- L57: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'`
- userId IS passed to `exportService.listExportLogs(userId, ...)` (scoping exists but spoofable)

**Modifications:** Replace L57 with `requireAuth(request)`. Keep the existing service call pattern.

---

### Change 5.12: `src/app/api/export/status/[id]/route.ts` — Replace Spoofable Auth

**Current state (validated):**
- L60: `request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000'`
- Has ownership check at L72-76: `if (exportLog.user_id !== userId)` → 403

**Modifications:** Replace L60 with `requireAuth(request)`.

---

### Change 5.13: `src/app/api/export/templates/route.ts` — Add Auth (H12)

**Current state (validated):** ZERO auth. Exports all templates.

**Modifications:** Add `requireAuth` guard. Templates are shared resources — export all for authenticated users.

---

### Change 5.14: `src/app/api/export/scenarios/route.ts` — Add Auth (H12)

**Current state (validated):** ZERO auth. Exports all scenarios.

**Modifications:** Add `requireAuth` guard. Scenarios are shared resources.

---

### Change 5.15: `src/app/api/export/edge-cases/route.ts` — Add Auth (H12)

**Current state (validated):** ZERO auth. Exports all edge cases.

**Modifications:** Add `requireAuth` guard. Edge cases are shared resources.

---

### Change 5.16: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter (H1)

**Current state (validated):**
- Uses `createServerSupabaseAdminClient()` (admin client, bypasses RLS)
- Method signatures lack mandatory userId:
  - `getJobById(id: string)` — L129, no userId
  - `getAllJobs(filters?: { status?; createdBy? })` — L201, createdBy is optional
  - `cancelJob(id: string)` — L497, no userId
  - `deleteJob(id: string)` — L581, no userId
  - `getActiveJobs(userId: string)` — L422, ALREADY correct
  - `createJob(job, items)` — L58, createdBy optional in job partial

**Modifications:**

1. **`getAllJobs`** — Make `userId` mandatory first parameter:
   ```typescript
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     let query = supabase.from('batch_jobs').select('*').eq('created_by', userId); // MANDATORY
     if (filters?.status) query = query.eq('status', filters.status);
     // ...
   }
   ```

2. **`getJobById`** — Add mandatory userId:
   ```typescript
   async getJobById(id: string, userId: string): Promise<BatchJob | null> {
     // existing fetch + add: .eq('created_by', userId)
     // Returns null if not owned (instead of throwing)
   }
   ```

3. **`cancelJob`** — Add mandatory userId:
   ```typescript
   async cancelJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId);
     if (!job) throw new Error('Job not found or not owned');
     // ...
   }
   ```

4. **`deleteJob`** — Add mandatory userId:
   ```typescript
   async deleteJob(id: string, userId: string): Promise<void> {
     const job = await this.getJobById(id, userId);
     if (!job) throw new Error('Job not found or not owned');
     // ...
   }
   ```

5. **Update ALL callers** — Search for `batchJobService.getAllJobs`, `.getJobById`, `.cancelJob`, `.deleteJob` across the codebase and pass `user.id`.

**GIVEN** `batchJobService.getAllJobs(userAId)` is called **THEN** only jobs where `created_by = userAId` are returned
**GIVEN** a method call without `userId` **THEN** TypeScript compilation error (parameter is required)

---

### Change 5.17: `src/lib/rag/services/rag-retrieval-service.ts` — Add `userId` Verification (H2)

**Current state (validated):**
- Uses `createServerSupabaseAdminClient()` (admin client)
- Scopes by `documentId` but NOT by `user_id`
- If an attacker knows a documentId, they can retrieve another user's RAG data

**Modifications:**

In `queryRAG()` and `retrieveContext()`, verify document ownership before retrieval:
```typescript
const { data: doc } = await this.supabase
  .from('rag_documents')
  .select('user_id')
  .eq('id', params.documentId)
  .single();

if (!doc || doc.user_id !== params.userId) {
  throw new Error('Document not found');
}
```

Ensure `userId` parameter is required (not optional) in both method signatures.

**GIVEN** a `queryRAG` call with `documentId: X` belonging to User B but `userId: A` **THEN** error "Document not found"

---

### Change 5.18: `src/lib/services/conversation-service.ts` — Migrate from Deprecated Singleton (H3)

**Current state (validated):**
- Imports `supabase` singleton from `@/lib/supabase` — null on server side
- Also: `src/lib/conversation-service.ts` uses `import { supabase } from './supabase'`

**Modifications:**

1. Change to accept injected client:
   ```typescript
   export class ConversationService {
     private supabase: SupabaseClient;
     constructor(supabaseClient: SupabaseClient) {
       this.supabase = supabaseClient;
     }
     // ... all methods use this.supabase
   }
   ```

2. Update callers to pass the request-scoped client:
   ```typescript
   const supabase = await createServerSupabaseClient();
   const service = new ConversationService(supabase);
   ```

**GIVEN** the conversation service is used in a server context **THEN** it uses a fresh client (not the deprecated singleton)

---

### Change 5.19: Add RLS to `notifications` and `cost_records` (H13, H14)

**SAOL method:** `agentExecuteDDL({ sql: '...', transport: 'pg', transaction: true })`

```sql
-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "notifications_service_all" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- cost_records
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_records_select_own" ON cost_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cost_records_service_all" ON cost_records FOR ALL USING (auth.role() = 'service_role');
```

**GIVEN** RLS enabled on `notifications` **WHEN** user queries via non-admin client **THEN** only own notifications returned

---

### Change 5.20: Add RLS to `metrics_points` (H15)

```sql
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_points_select_via_job" ON metrics_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pipeline_training_jobs
    WHERE pipeline_training_jobs.id = metrics_points.job_id
    AND pipeline_training_jobs.user_id = auth.uid()
  ));
CREATE POLICY "metrics_points_service_all" ON metrics_points FOR ALL USING (auth.role() = 'service_role');
```

---

## 9. Phase 6 — MEDIUM Fixes (M1–M13)

---

### Change 6.1: `src/app/api/training-files/route.ts` — Add User Scoping to GET (M1)

**Current state (validated):**
- Auth present via `supabase.auth.getUser()` (L27-28)
- GET fetches ALL `status: 'active'` files regardless of user
- Uses dual-client: RLS for auth, admin for DB

**Modifications:** Add `.eq('created_by', user.id)` to the training files listing query (either in the service or directly in the route handler after the admin client query).

**GIVEN** User A requests GET **THEN** only User A's training files are returned

---

### Change 6.2: `src/app/api/conversations/[id]/download/raw/route.ts` — Add Ownership Check (M12)

**Current state (validated):**
- Auth present via `supabase.auth.getUser()` (L25-30)
- NO ownership check — any authenticated user can download any conversation's raw JSON

**Modifications:** After fetching the conversation:
```typescript
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

**GIVEN** User A requests download of User B's conversation **THEN** 404 returned

---

### Change 6.3: `src/app/api/conversations/[id]/download/enriched/route.ts` — Add Ownership Check (M13)

**Current state (validated):**
- Auth present via `supabase.auth.getUser()` (L29-34)
- NO ownership check — uses service role internally to bypass RLS

**Modifications:** Identical pattern to Change 6.2.

---

### Change 6.4: `src/app/api/conversations/batch/[id]/status/route.ts` — Add Auth + Ownership (M5)

**Modifications:** Add `requireAuth` + verify the batch job belongs to the user before returning status.

---

### Change 6.5: Cron Routes — Fail Closed with `requireAuthOrCron` (M6)

**Files (5 routes, 2 distinct patterns — both fail-open):**
| File | Current Pattern |
|------|----------------|
| `src/app/api/cron/daily-maintenance/route.ts` | `if (cronSecret && authHeader !== Bearer)` — single conditional (L27) |
| `src/app/api/cron/export-file-cleanup/route.ts` | `if (!CRON_SECRET) { warn; skip } else if (...)` — explicit skip (L42-48) |
| `src/app/api/cron/export-log-cleanup/route.ts` | Same as above (L42-48) |
| `src/app/api/cron/export-metrics-aggregate/route.ts` | Same as above (L44-50) |
| `src/app/api/cron/hourly-monitoring/route.ts` | `if (cronSecret && authHeader !== Bearer)` — single conditional (L27) |

**Modifications:** In each cron route, replace the existing CRON_SECRET check with:
```typescript
import { requireAuthOrCron } from '@/lib/supabase-server';

// Replace existing CRON_SECRET check block with:
const { isCron, response } = await requireAuthOrCron(request);
if (response) return response;
// Proceeds only if valid cron token or authenticated user
```

**GIVEN** `CRON_SECRET` is NOT set **WHEN** request hits any cron endpoint **THEN** 500 returned (not 200)
**GIVEN** `CRON_SECRET` is set **WHEN** request has wrong/no Bearer token and no auth cookie **THEN** 401 returned

---

### Change 6.6: `src/inngest/functions/process-rag-document.ts` — Verify Document Ownership (M8)

**Current state (validated):**
- 586 lines, 12-step Inngest pipeline
- Trusts `userId` from event payload without verification
- Uses `createServerSupabaseAdminClient()`

**Modifications:** After extracting `{ documentId, userId }` from event payload:
```typescript
const adminClient = createServerSupabaseAdminClient();

// Verify document ownership before processing
const { data: doc } = await adminClient
  .from('rag_documents')
  .select('user_id')
  .eq('id', documentId)
  .single();

if (!doc || doc.user_id !== userId) {
  throw new Error(`Document ${documentId} does not belong to user ${userId}`);
}
```

**GIVEN** an event with `userId: A` but document belongs to User B **THEN** processing aborted with error

---

### Change 6.7: `src/lib/services/training-file-service.ts` — Mandatory `userId` Parameter (M7)

**Modifications:** Add mandatory `userId` parameter to `listTrainingFiles()` and other query methods. Replace optional `created_by` filter with required scoping.

**GIVEN** `listTrainingFiles(userId)` is called **THEN** query includes `.eq('created_by', userId)`
**GIVEN** a method call without `userId` **THEN** TypeScript compilation error

---

## 10. Phase 7 — Database Constraints & RLS

**Prerequisites:** Phase 3 backfill complete AND Phase 4–6 code changes deployed AND `_orphaned_records` resolved.

### Change 7.1: Add NOT NULL Constraints

**File:** `src/scripts/migrations/identity-spine-phase7-constraints.ts` (CREATE)
**SAOL method:** `agentExecuteDDL({ sql: '...', transport: 'pg', dryRun: true })` — dry-run first.

```sql
-- Pre-check: verify zero orphans (ABORT if any exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM conversations WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'conversations has NULL user_id rows — resolve before adding constraint';
  END IF;
  IF EXISTS (SELECT 1 FROM training_files WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'training_files has NULL user_id rows';
  END IF;
  IF EXISTS (SELECT 1 FROM batch_jobs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'batch_jobs has NULL user_id rows';
  END IF;
  IF EXISTS (SELECT 1 FROM generation_logs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'generation_logs has NULL user_id rows';
  END IF;
  IF EXISTS (SELECT 1 FROM documents WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'documents has NULL user_id rows';
  END IF;
END $$;

-- Enforce NOT NULL
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
```

### Change 7.2: Add Performance Indexes

**IMPORTANT:** Use `CREATE INDEX CONCURRENTLY` for production (cannot be inside a transaction — run as standalone SAOL calls, NOT with `transaction: true`).

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_files_user_id ON training_files(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_failed_generations_user_id ON failed_generations(user_id);
```

### Change 7.3: RLS Policies

See Changes 5.19 and 5.20 — policies for `notifications`, `cost_records`, and `metrics_points` are deployed as part of Phase 5, but can be deferred to Phase 7 if preferred.

Additionally, ensure all newly `user_id`-bearing tables have RLS policies matching the canonical template from the investigation spec (Section 7.4).

---

## 11. Phase 8 — Cleanup & Deprecated Code Removal

### Change 8.1: Remove All `x-user-id` Header Reads

**Files with `x-user-id` reads (validated via codebase grep):**
| File | Line |
|------|------|
| `src/app/api/conversations/route.ts` | L31 (GET), L66 (POST) |
| `src/app/api/conversations/[id]/status/route.ts` | L31 |
| `src/app/api/export/conversations/route.ts` | L68 |
| `src/app/api/export/download/[id]/route.ts` | L57 |
| `src/app/api/export/history/route.ts` | L57 |
| `src/app/api/export/status/[id]/route.ts` | L60 |
| `src/app/api/generation-logs/route.ts` | L103 |

After Phases 4–5, all of these should already be replaced by `requireAuth`. Verify:
```bash
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx"
# Expected: ZERO results (except test files in __tests__/)
```

### Change 8.2: Remove All NIL UUID and Test-User Fallbacks

**Files with fallback values (validated):**
| Fallback | Files |
|----------|-------|
| `'test-user'` | `conversations/route.ts` (L68), `conversations/[id]/status/route.ts` (L31) |
| `'test_user'` | `templates/test/route.ts` (L131) |
| `'00000000-0000-0000-0000-000000000000'` | `conversations/generate/route.ts` (L30), `conversations/generate-batch/route.ts` (L37), `export/conversations/route.ts` (L68), `export/download/[id]/route.ts` (L57), `export/history/route.ts` (L57), `export/status/[id]/route.ts` (L60), `generation-logs/route.ts` (L103), `batch-jobs/[id]/process-next/route.ts` (L306) |

Verify:
```bash
grep -rn "00000000-0000-0000-0000-000000000000\|'test-user'\|'test_user'" src/app/api/ --include="*.ts"
# Expected: ZERO results
```

### Change 8.3: Remove Client-Side `x-user-id` Header Sending

**Validated:** No client-side hooks, components, or lib utilities currently send the `x-user-id` header. The header is ONLY set in API route test files (`src/app/api/export/__tests__/export.integration.test.ts` — 17 occurrences).

**Action:** Update the integration test file to use authenticated test requests instead of `x-user-id` headers. The API routes will no longer read this header after Phase 4.

### Change 8.4: Remove Module-Scope `createClient()` Singletons

**Files with module-scope admin client singletons (validated):**
| File | Pattern |
|------|---------|
| `src/app/api/documents/route.ts` | `const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL \|\| 'http://placeholder', process.env.SUPABASE_SERVICE_ROLE_KEY \|\| 'placeholder', ...)` |
| `src/app/api/documents/[id]/route.ts` | Same pattern |
| `src/app/api/categories/route.ts` | Same pattern |
| `src/app/api/categories/[id]/route.ts` | Same pattern |
| `src/app/api/documents/process/route.ts` | Same pattern |
| `src/app/api/documents/status/route.ts` | Same pattern |
| `src/app/api/documents/upload/route.ts` | Same pattern |
| `src/app/api/tags/route.ts` | Same pattern |
| `src/app/api/workflow/route.ts` | Same pattern |
| `src/app/api/workflow/session/route.ts` | Same pattern |

**Replace with:**
- For system-global resources (categories, tags): Use `createServerSupabaseAdminClient()` **inside** the handler function (not at module scope).
- For user-scoped resources (documents): Use `requireAuth` + `createServerSupabaseClientFromRequest(request)`.

Verify:
```bash
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"
# Expected: ZERO results
```

### Change 8.5: Deprecate `src/lib/supabase.ts` Singleton

Add deprecation notice to the file:
```typescript
/**
 * @deprecated Use createServerSupabaseClient() or createServerSupabaseClientFromRequest()
 * from '@/lib/supabase-server' instead. This module creates a client that is null on
 * the server side and should not be used in API routes or server components.
 */
console.error('[DEPRECATED] src/lib/supabase.ts singleton imported — migrate to @/lib/supabase-server');
```

Remove all imports of this module from service/route files:
```bash
grep -rn "from '../supabase'" src/lib/ --include="*.ts"
grep -rn "from './supabase'" src/lib/ --include="*.ts"
# Expected: ZERO results in service/route files (excluding supabase-server.ts and supabase-client.ts)
```

---

## 12. Testing Checkpoints

### Checkpoint After Phase 3 (Data Backfill)

```sql
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;
-- Expected: nulls = 0 for all tables (or matches _orphaned_records count)
```

### Checkpoint After Phase 4 (CRITICAL Route Fixes)

**Test T5 — Unauthenticated Rejection (all routes return 401 without auth):**

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/conversations` | GET | 401 |
| `/api/conversations` | POST | 401 |
| `/api/conversations/{id}` | GET | 401 |
| `/api/conversations/{id}` | PATCH | 401 |
| `/api/conversations/{id}` | DELETE | 401 |
| `/api/conversations/{id}/status` | PATCH | 401 |
| `/api/conversations/{id}/turns` | GET | 401 |
| `/api/conversations/{id}/link-chunk` | POST | 401 |
| `/api/conversations/{id}/unlink-chunk` | POST | 401 |
| `/api/conversations/bulk-action` | POST | 401 |
| `/api/conversations/bulk-enrich` | POST | 401 |
| `/api/conversations/generate` | POST | 401 |
| `/api/conversations/generate-batch` | POST | 401 |
| `/api/conversations/stats` | GET | 401 |
| `/api/conversations/orphaned` | GET | 401 |
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

For each route that previously used `x-user-id`:
1. Authenticate as User A
2. Send request with `x-user-id: <User B's UUID>` header
3. Verify response contains ONLY User A's data

**Test T1 — Cross-User List Isolation:**

1. Create User A and User B test accounts
2. User A creates a conversation, batch job
3. User B lists conversations, batch jobs
4. Verify User B sees ZERO of User A's resources

**Test T3 — Cross-User Mutation Isolation:**

1. User A creates a conversation
2. User B tries PATCH/DELETE on that conversation
3. Verify 404 returned; conversation unchanged

### Checkpoint After Phase 5 (HIGH Fixes)

Additional 401 checks:

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/generation-logs` | GET | 401 |
| `/api/generation-logs/stats` | GET | 401 |
| `/api/failed-generations` | GET | 401 |
| `/api/failed-generations/{id}` | GET | 401 |
| `/api/templates` | GET | 401 |
| `/api/templates/test` | POST | 401 |
| `/api/documents` | GET | 401 |
| `/api/performance` | GET | 401 |
| `/api/export/templates` | GET | 401 |
| `/api/export/scenarios` | GET | 401 |
| `/api/export/edge-cases` | GET | 401 |
| `/api/export/history` | GET | 401 |
| `/api/export/status/{id}` | GET | 401 |

**Test T8 — Service Layer Scoping:**

- `batchJobService.getAllJobs(userA.id)` returns only User A's jobs (even though admin client bypasses RLS)
- `queryRAG({ documentId: B's-doc, userId: A })` → error "Document not found"

**Test T10 — RLS Verification:**

- User A queries `notifications` via RLS client → only sees own notifications

### Checkpoint After Phase 7 (DB Constraints)

```sql
-- Verify NOT NULL constraints
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('conversations', 'training_files', 'batch_jobs', 'generation_logs', 'documents')
AND column_name = 'user_id';
-- Expected: is_nullable = 'NO' for all

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('notifications', 'cost_records', 'metrics_points');
-- Expected: rowsecurity = true for all

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%_user_id%';
-- Expected: 8 indexes present
```

### Final Checkpoint (All Phases)

```bash
# No x-user-id reads remain
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
# Expected: ZERO results

# No NIL UUID fallbacks remain
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts"
# Expected: ZERO results

# No test-user fallbacks remain
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts"
# Expected: ZERO results

# No module-scope createClient singletons remain
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"
# Expected: ZERO results

# TypeScript compilation
npx tsc --noEmit
# Expected: ZERO errors
```

---

## 13. Warnings & Risks

### W1: Client-Side Fetch Credentials

**Risk:** Frontend code that does NOT include auth cookies in `fetch()` calls will get 401s after Phase 4.
**Mitigation:** Supabase SSR handles cookie forwarding automatically. Verify all custom `fetch()` calls use `credentials: 'include'`. NOTE: Validated that no client-side code currently sends `x-user-id` header — the header is only set server-side in API routes and test files.

### W2: Batch Job Processing Polling Loop

**Risk:** `batch-jobs/[id]/process-next` is called in a polling loop by the frontend. Adding `requireAuth` means auth cookies must be present on every poll request. If the auth cookie expires mid-batch, processing stops.
**Mitigation:** Verify the frontend uses `fetch` with credentials. Consider implementing token refresh before each poll iteration, or using the job's stored `createdBy` from the DB record for the generation userId (keep the auth gate for the request, but use stored ownership for the pipeline):
```typescript
// Auth gate: requireAuth ensures requestor is the job owner
// Pipeline userId: use job.createdBy from DB (doesn't depend on live session)
const pipelineUserId = job.createdBy; // Stored at job creation time
```

### W3: Migration Ordering Is Critical

**Risk:** If Phase 4 (code enforcement) is deployed before Phase 2 (schema migration), code trying to write `user_id` on tables without the column will fail.
**Mitigation:** Strict ordering: Phase 2 (schema) + Phase 3 (backfill) MUST complete before Phase 4 (code). Phase 7 (constraints) MUST wait for Phase 3–6 to complete AND orphans to be resolved.

### W4: `batch-job-service.ts` Method Signature Breaking Change

**Risk:** Changing method signatures is a breaking change. Every caller must be updated simultaneously.
**Mitigation:** Deploy all route changes + service changes for batch-jobs atomically: `batch-jobs/route.ts`, `batch-jobs/[id]/cancel/route.ts`, `batch-jobs/[id]/process-next/route.ts`, and any Inngest functions calling the service.

### W5: Large Table Index Creation Lock Contention

**Risk:** Creating indexes on large tables (`conversations`, `generation_logs`) may cause lock contention.
**Mitigation:** Use `CREATE INDEX CONCURRENTLY` outside a transaction. `CONCURRENTLY` cannot be used inside a `BEGIN/COMMIT` — run each index as a standalone SAOL call with `transaction: false`.

### W6: Shared Resources (Templates, Scenarios, Edge Cases)

**Risk:** Adding auth to GET endpoints may break unauthenticated tools or scripts that read these resources.
**Mitigation:** Intentional change. All consumers must authenticate. If automated tools need access, use a service account.

### W7: Export Download Regeneration

**Risk:** The `export/download/[id]` route's `regenerateExportFile` helper (L195+) reads conversations with NO user scoping when regenerating expired export files.
**Mitigation:** After changing the auth to `requireAuth`, also add `.eq('created_by', userId)` to the conversation query inside `regenerateExportFile`.

### W8: DO NOT Deploy Phase 7 Before Phase 3 Verification

**Risk:** If orphaned records exist with NULL `user_id`, the NOT NULL constraint migration will fail and potentially lock the table.
**Mitigation:** The Phase 7 migration includes a pre-check that RAISEs an EXCEPTION if any NULL rows exist. Additionally, always run with `dryRun: true` first.

### W9: DO NOT Remove `created_by` Columns

`created_by` remains as the **audit actor field** (who performed the create action). The new `user_id` column is the **canonical ownership field**. Both must coexist.

### W10: DO NOT Change Supabase Auth Infrastructure

The existing auth infrastructure (`requireAuth`, cookie-based JWT, `getUser()`) is correct. Do NOT change the middleware auth redirect, cookie handling, or Supabase SSR configuration. Only the *enforcement* at the route level is being fixed.

---

## 14. Execution Order

```
Phase 0 (Preflight) ─────────────────────────────────── 0.5 day
       │
       ▼
Phase 1 (Auth Infrastructure: requireAuthOrCron) ────── 0.5 day
       │
       ▼
Phase 2 (DB: Add Columns) ──────────────────────────── 0.5 day
       │
       ▼
Phase 3 (DB: Backfill + Quarantine) ─────────────────── 0.5 day
       │              ⚑ Checkpoint: verify zero orphans
       ▼
Phase 4 (CRITICAL Routes: C1–C16) ──────────────────── 3–4 days
       │              ⚑ Checkpoint: T1, T3, T5, T6
       │
Phase 5 (HIGH Routes + Services: H1–H15) ───────────── 2–3 days ← can overlap with Phase 4
       │              ⚑ Checkpoint: T8, T10
       │
Phase 6 (MEDIUM: M1–M13) ───────────────────────────── 1–2 days
       │              ⚑ Checkpoint: cron fail-closed, Inngest ownership
       ▼
Phase 7 (DB: Constraints + RLS + Indexes) ───────────── 1 day
       │              ⚑ Checkpoint: NOT NULL, RLS, indexes
       ▼
Phase 8 (Cleanup) ──────────────────────────────────── 1–2 days
                      ⚑ Final checkpoint: grep verifications, TypeScript build
```

**Minimum for soft launch:** Phases 0–5 (all CRITICAL and HIGH gaps closed)
**Required for GA:** Phases 0–7
**Post-launch OK:** Phase 8 (cleanup)

**Total estimated effort: 10–14 days**

---

## 15. Files Summary

### Phase-by-Phase File Count

| Phase | Modified | Created | Effort |
|-------|----------|---------|--------|
| Phase 0 | 0 | 0 | 0.5 day |
| Phase 1 | 1 (supabase-server.ts) | 0 | 0.5 day |
| Phase 2 | 0 (DB only) | 1 migration | 0.5 day |
| Phase 3 | 0 (DB only) | 1 migration | 0.5 day |
| Phase 4 | 22 route files | 0 | 3–4 days |
| Phase 5 | 19 route + service files | 0 | 2–3 days |
| Phase 6 | 9 route + service files | 0 | 1–2 days |
| Phase 7 | 0 (DB only) | 2 migrations | 1 day |
| Phase 8 | ~15 files (cleanup) | 0 | 1–2 days |
| Tests | 0 | 6 test files | 2 days |
| **Total** | **~45 files** | **10 files** | **~13 days** |

### Implementation Priority

| Priority | Phases | Blocks |
|----------|--------|--------|
| **P0 — Must complete before soft launch** | 0, 1, 2, 3, 4, 5 | Soft launch |
| **P1 — Must complete before GA** | 6, 7 | General availability |
| **P2 — Post-launch OK** | 8, Tests | Technical debt |

### Model Routes (Gold Standard — Copy This Pattern)

These routes implement the target pattern correctly:
- `src/app/api/datasets/route.ts` — Exemplary: `requireAuth` + `user.id` scoping + Zod validation
- `src/app/api/conversations/generate-with-scaffolding/route.ts` — Already secure: `requireAuth` + `user.id` stamping
- `src/app/api/rag/knowledge-bases/route.ts` — Properly scoped with `requireAuth`

### Supabase Client Quick Reference

| Function | Module | RLS | Use For |
|----------|--------|-----|---------|
| `requireAuth(request)` | `supabase-server.ts` | N/A (auth check) | All API routes — **USE THIS** |
| `requireAuthOrCron(request)` | `supabase-server.ts` | N/A (auth check) | Cron routes — **NEW** |
| `createServerSupabaseClient()` | `supabase-server.ts` | ✅ Enforced | Server components |
| `createServerSupabaseClientFromRequest(request)` | `supabase-server.ts` | ✅ Enforced | API routes needing Supabase client |
| `createServerSupabaseAdminClient()` | `supabase-server.ts` | ❌ **BYPASSED** | Background jobs ONLY — must manually scope with `.eq('user_id', userId)` |
| `getSupabaseClient()` | `supabase-client.ts` | ✅ Enforced | Client-side React components |
| `supabase` singleton | `supabase.ts` | ⚠️ **DEPRECATED** | **DO NOT USE** — broken server-side |

---

*End of Specification*
