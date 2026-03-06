# Data & Identity Spine — Detailed Implementation Specification v3

**Document:** `02-data-and-identity-spine-detailed-specification_v3.md`
**Date:** 2026-02-19
**Status:** SPECIFICATION — READY FOR IMPLEMENTATION
**Source:** Validated against codebase on 2026-02-19. All investigation claims from `01-data-and-identity-spine-spec_v1.md` confirmed accurate.
**Scope:** Bright Run LoRA Training Data Platform (v2-modules)

---

## Table of Contents

1. [Summary](#1-summary)
2. [Impact Analysis](#2-impact-analysis)
3. [Changes](#3-changes)
   - Phase 1: Auth Infrastructure — `requireAuth` helper hardening
   - Phase 2: CRITICAL Route Fixes (C1–C16)
   - Phase 3: HIGH Route & Service Fixes (H1–H15)
   - Phase 4: MEDIUM Fixes (M1–M13)
   - Phase 5: Database Schema Migration — Add `user_id` columns, backfill, constraints
   - Phase 6: RLS Policy Enforcement
   - Phase 7: Cleanup — Remove deprecated patterns
4. [Testing Checkpoints](#4-testing-checkpoints)
5. [Warnings](#5-warnings)

---

## 1. Summary

This specification converts the Bright Run platform from inconsistent identity enforcement to a canonical "Identity Spine" where **every scoped resource is owned, every request is authenticated, and every query is scoped to the authenticated user**. The work fixes ~75 API routes across 7 phases: hardening the auth infrastructure, securing CRITICAL routes (spoofable/missing auth), securing HIGH-priority routes and services, addressing MEDIUM gaps, migrating database schema to a canonical ownership model, adding missing RLS policies, and removing deprecated patterns. All database operations MUST use SAOL.

---

## 2. Impact Analysis

### 2.1 Files Affected

**Phase 1 — Auth Infrastructure (1 file modified):**
| File | Action |
|------|--------|
| `src/lib/supabase-server.ts` | MODIFY — Add `requireAuthOrCron` helper |

**Phase 2 — CRITICAL Route Fixes (20 files modified):**
| File | Action |
|------|--------|
| `src/app/api/conversations/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/conversations/[id]/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/conversations/[id]/status/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/conversations/[id]/turns/route.ts` | MODIFY — Add requireAuth + parent ownership |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/conversations/bulk-action/route.ts` | MODIFY — Add requireAuth; scope to user's convos |
| `src/app/api/conversations/bulk-enrich/route.ts` | MODIFY — Add requireAuth; scope admin client |
| `src/app/api/conversations/generate/route.ts` | MODIFY — Add requireAuth; remove body userId |
| `src/app/api/conversations/generate-batch/route.ts` | MODIFY — Add requireAuth; remove body userId |
| `src/app/api/conversations/generate-with-scaffolding/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/conversations/orphaned/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/conversations/stats/route.ts` | MODIFY — Add requireAuth; scope stats |
| `src/app/api/batch-jobs/route.ts` | MODIFY — Add requireAuth; scope listing |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/pipeline/jobs/[jobId]/download/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/export/conversations/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/export/download/[id]/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/import/templates/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/import/scenarios/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/import/edge-cases/route.ts` | MODIFY — Add requireAuth |

**Phase 3 — HIGH Route & Service Fixes (18 files modified):**
| File | Action |
|------|--------|
| `src/lib/services/batch-job-service.ts` | MODIFY — Add mandatory userId to all methods |
| `src/lib/rag/services/rag-retrieval-service.ts` | MODIFY — Add user_id scoping to retrieval |
| `src/lib/services/conversation-service.ts` | MODIFY — Migrate from deprecated singleton |
| `src/lib/conversation-service.ts` | MODIFY — Migrate from deprecated singleton |
| `src/app/api/templates/route.ts` | MODIFY — Add requireAuth to GET |
| `src/app/api/templates/test/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/generation-logs/route.ts` | MODIFY — Add requireAuth + scoping |
| `src/app/api/generation-logs/stats/route.ts` | MODIFY — Add requireAuth + scoping |
| `src/app/api/failed-generations/route.ts` | MODIFY — Add requireAuth + scoping |
| `src/app/api/failed-generations/[id]/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/failed-generations/[id]/download/route.ts` | MODIFY — Add requireAuth + ownership check |
| `src/app/api/performance/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/training-files/[id]/download/route.ts` | MODIFY — Add ownership check |
| `src/app/api/documents/route.ts` | MODIFY — Add user scoping to GET |
| `src/app/api/documents/[id]/route.ts` | MODIFY — Add ownership check |
| `src/app/api/export/history/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/export/status/[id]/route.ts` | MODIFY — Replace x-user-id with requireAuth |
| `src/app/api/export/templates/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/export/scenarios/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/export/edge-cases/route.ts` | MODIFY — Add requireAuth |

**Phase 4 — MEDIUM Fixes (8 files modified):**
| File | Action |
|------|--------|
| `src/app/api/training-files/route.ts` | MODIFY — Add user scoping to GET |
| `src/app/api/conversations/[id]/download/raw/route.ts` | MODIFY — Add ownership check |
| `src/app/api/conversations/[id]/download/enriched/route.ts` | MODIFY — Add ownership check |
| `src/app/api/conversations/batch/[id]/status/route.ts` | MODIFY — Add requireAuth |
| `src/app/api/cron/daily-maintenance/route.ts` | MODIFY — Fail closed on missing CRON_SECRET |
| `src/app/api/cron/export-file-cleanup/route.ts` | MODIFY — Fail closed |
| `src/app/api/cron/export-log-cleanup/route.ts` | MODIFY — Fail closed |
| `src/app/api/cron/export-metrics-aggregate/route.ts` | MODIFY — Fail closed |
| `src/app/api/cron/hourly-monitoring/route.ts` | MODIFY — Fail closed |
| `src/inngest/functions/process-rag-document.ts` | MODIFY — Verify userId matches doc owner |
| `src/lib/services/training-file-service.ts` | MODIFY — Add mandatory userId parameter |

**Phase 5 — Database Migration (SAOL scripts, 1 new file):**
| File | Action |
|------|--------|
| `src/scripts/migrations/identity-spine-phase1-add-columns.ts` | CREATE — SAOL migration script |
| `src/scripts/migrations/identity-spine-phase2-backfill.ts` | CREATE — SAOL backfill script |
| `src/scripts/migrations/identity-spine-phase4-constraints.ts` | CREATE — SAOL constraints script |

**Phase 6 — RLS Policies (1 new SAOL migration file):**
| File | Action |
|------|--------|
| `src/scripts/migrations/identity-spine-phase6-rls.ts` | CREATE — SAOL RLS policy script |

**Phase 7 — Cleanup (10+ files modified):**
| File | Action |
|------|--------|
| All files in Appendix A.1/A.2 | MODIFY — Remove x-user-id reads, NIL UUID fallbacks |
| `src/lib/supabase.ts` | DELETE or deprecate with console.error |
| Files using file-scope `createClient()` singletons | MODIFY — Migrate to proper patterns |

### 2.2 Dependencies Touched

| Dependency | Impact |
|------------|--------|
| `src/lib/supabase-server.ts` | Core auth module — all route fixes depend on `requireAuth` |
| `src/lib/services/batch-job-service.ts` | Batch jobs API depends on this service |
| `src/lib/rag/services/rag-retrieval-service.ts` | RAG query API depends on this service |
| `src/lib/services/conversation-service.ts` | Conversation CRUD depends on this service |
| `src/lib/conversation-service.ts` | Legacy conversation service — deprecated |
| `src/lib/services/training-file-service.ts` | Training file API depends on this |
| `src/lib/services/failed-generation-service.ts` | Failed generations API depends on this |
| `src/lib/export-service.ts` | Export API depends on this |
| Client-side hooks (`src/hooks/use-conversations.ts`, etc.) | Must stop sending `x-user-id` header |

### 2.3 Database Tables Affected

**Schema changes (add columns):**
- `conversations` — add `user_id`, `updated_by`
- `training_files` — add `user_id`, `updated_by`
- `batch_jobs` — add `user_id`, `updated_by`
- `generation_logs` — add `user_id`
- `failed_generations` — add `user_id`
- `documents` — add `user_id`
- `datasets` — add `created_by`, `updated_by`
- `pipeline_training_jobs` — add `created_by`, `updated_by`
- `rag_knowledge_bases` — add `updated_by`
- `rag_documents` — add `updated_by`

**RLS policy additions:**
- `notifications` — add user_id scoped policies
- `cost_records` — add user_id scoped policies
- `metrics_points` — add inherited scoping via join

**New tables:**
- `_orphaned_records` — quarantine table for records with NULL ownership

### 2.4 Risk Areas

| Risk | Mitigation |
|------|-----------|
| Breaking client-side code that sends `x-user-id` header | Phase 7 removes header reads; client hooks must be updated simultaneously |
| Orphaned records (NULL `created_by`) fail NOT NULL constraint | Phase 2 backfill + quarantine before Phase 4 constraints |
| Admin client routes lose access to records | Manual `.eq('user_id', user.id)` scoping replaces RLS bypass |
| Batch job background processing breaks | Service methods must accept userId; Inngest events must carry verified userId |
| Export downloads break for existing URLs | Export log ownership verified; old exports with NIL UUID userId become inaccessible (acceptable) |

---

## 3. Changes

---

### Phase 1: Auth Infrastructure Hardening

#### Change 1.1 — Add `requireAuthOrCron` helper

**What changes:** Add a new helper function to `src/lib/supabase-server.ts` that handles the cron route authentication pattern (either valid `CRON_SECRET` Bearer token OR authenticated user session). This provides a single auth check for cron routes that fail closed when `CRON_SECRET` is not configured.

**Where:** `src/lib/supabase-server.ts` — Add after `requireAuth` function (after line ~164)

**Why:** Cron routes currently have an inconsistent pattern where auth is bypassed if `CRON_SECRET` env var is unset. This helper centralizes the fail-closed pattern (Satisfies M6).

**Acceptance Criteria:**
- **GIVEN** a request to a cron endpoint with a valid `Bearer {CRON_SECRET}` header **WHEN** `CRON_SECRET` is set **THEN** the request proceeds (returns `{ isCron: true, user: null }`)
- **GIVEN** a request to a cron endpoint without a valid Bearer token **WHEN** `CRON_SECRET` is set **THEN** a 401 response is returned
- **GIVEN** a request to a cron endpoint **WHEN** `CRON_SECRET` is NOT set **THEN** a 500 response is returned ("CRON_SECRET not configured")
- **GIVEN** a request with a valid user session (no cron header) **THEN** falls through to `requireAuth` and returns `{ isCron: false, user }`

**Implementation:**
```typescript
export async function requireAuthOrCron(request: NextRequest): Promise<{
  isCron: boolean;
  user: User | null;
  response: NextResponse | null;
}> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Check if this is a cron request
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

  // Fall through to standard user auth
  const { user, response } = await requireAuth(request);
  return { isCron: false, user, response };
}
```

---

### Phase 2: CRITICAL Route Fixes (C1–C16)

Every change in this phase follows the same pattern: **replace insecure identity resolution with `requireAuth(request)`** and **scope all queries to `user.id`**.

**Gold standard pattern** (copy from `src/app/api/datasets/route.ts`):
```typescript
import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response; // 401

  const { supabase } = await createServerSupabaseClientFromRequest(request);

  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', user.id)  // OR .eq('created_by', user.id) until migration
    .order('created_at', { ascending: false });
  // ...
}
```

---

#### Change 2.1 — Secure `/api/conversations/route.ts` (C1)

**What changes:** Replace `x-user-id` header with `requireAuth`. Remove `'test-user'` fallback. Scope GET listing to authenticated user.

**Where:** `src/app/api/conversations/route.ts` — GET handler (line ~31) and POST handler (line ~66)

**Why:** Currently uses `request.headers.get('x-user-id')` which is trivially spoofable, and falls back to `'test-user'` on POST.

**Acceptance Criteria:**
- **GIVEN** a GET request without auth cookie **WHEN** the handler executes **THEN** a 401 response is returned
- **GIVEN** a GET request with valid auth **WHEN** the handler executes **THEN** only conversations where `created_by = user.id` are returned
- **GIVEN** a POST request with valid auth **WHEN** a conversation is created **THEN** `created_by` is set to `user.id` from the authenticated session (NOT from header or body)
- **GIVEN** a POST request without auth **THEN** 401 is returned
- **GIVEN** a request with `x-user-id` header AND valid auth cookie **THEN** the header is IGNORED; `user.id` from the session is used

**Implementation hints:**
1. Add `import { requireAuth } from '@/lib/supabase-server'` at top
2. In GET: Replace `const userId = request.headers.get('x-user-id') || undefined` with `const { user, response } = await requireAuth(request); if (response) return response;`
3. In GET: Change query to `.eq('created_by', user.id)`
4. In POST: Replace `const userId = request.headers.get('x-user-id') || 'test-user'` with `const { user, response } = await requireAuth(request); if (response) return response;`
5. In POST: Set `created_by: user.id` in the insert payload
6. Remove all references to `x-user-id` header

---

#### Change 2.2 — Secure `/api/conversations/[id]/route.ts` (C2)

**What changes:** Add `requireAuth` to GET, PATCH, DELETE. Add ownership verification (created_by = user.id) after fetching.

**Where:** `src/app/api/conversations/[id]/route.ts` — All handlers

**Why:** Currently has ZERO authentication. Anyone can read, update, or delete any conversation by ID.

**Acceptance Criteria:**
- **GIVEN** a GET/PATCH/DELETE request without auth **THEN** 401 is returned
- **GIVEN** a GET request for a conversation the user does NOT own **THEN** 404 is returned (do not reveal existence)
- **GIVEN** a PATCH request for another user's conversation **THEN** 404 is returned
- **GIVEN** a DELETE request for another user's conversation **THEN** 404 is returned

**Implementation hints:**
1. Add `requireAuth` to each handler
2. After fetching the conversation by ID, check `if (conversation.created_by !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })`
3. Alternatively, add `.eq('created_by', user.id)` to the Supabase query (returns null if not owned = 404 path)

---

#### Change 2.3 — Secure `/api/conversations/[id]/status/route.ts` (C3)

**What changes:** Replace `x-user-id` header + `'test-user'` fallback with `requireAuth`. Add ownership check.

**Where:** `src/app/api/conversations/[id]/status/route.ts` — line ~31

**Why:** Uses spoofable `x-user-id` header with `'test-user'` fallback.

**Acceptance Criteria:**
- **GIVEN** a PATCH request without auth **THEN** 401 is returned
- **GIVEN** a PATCH to change status of another user's conversation **THEN** 404 is returned

---

#### Change 2.4 — Secure `/api/conversations/bulk-action/route.ts` (C4)

**What changes:** Add `requireAuth`. Filter the provided conversation IDs to only include those owned by the authenticated user.

**Where:** `src/app/api/conversations/bulk-action/route.ts` — POST handler

**Why:** Currently has ZERO auth. Allows unauthenticated bulk approval/rejection/deletion of ANY conversations.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** a bulk action with conversation IDs that include other users' conversations **THEN** only the authenticated user's conversations are affected; the others are silently skipped
- **GIVEN** a bulk delete **WHEN** the user provides IDs they own **THEN** only those conversations are deleted

**Implementation hints:**
1. Add `requireAuth`
2. Before processing, query `conversations` table for the provided IDs filtered by `created_by = user.id`
3. Use the filtered set of IDs for the actual bulk operation
4. Return count of affected vs. skipped

---

#### Change 2.5 — Secure `/api/conversations/bulk-enrich/route.ts` (C5)

**What changes:** Add `requireAuth`. Scope the admin client query to user's conversations.

**Where:** `src/app/api/conversations/bulk-enrich/route.ts` — POST handler (line ~39 uses admin client)

**Why:** No auth + admin client = anyone on the internet can trigger expensive AI enrichment operations.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** an enrichment request **WHEN** the user is authenticated **THEN** only conversations where `created_by = user.id` are enriched

**Implementation hints:**
1. Add `requireAuth` at the start
2. Add `.eq('created_by', user.id)` to the admin client query that fetches conversations to enrich

---

#### Change 2.6 — Secure `/api/conversations/generate/route.ts` (C6)

**What changes:** Add `requireAuth`. Remove `userId` from request body. Use `user.id` from authenticated session.

**Where:** `src/app/api/conversations/generate/route.ts` — POST handler (line ~31 reads `validated.userId`)

**Why:** Currently reads `userId` from POST body with fallback to NIL UUID `'00000000-0000-0000-0000-000000000000'`.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** a POST with auth **WHEN** body contains `userId` field **THEN** the body `userId` is IGNORED; `user.id` from session is used
- **GIVEN** a successful generation **THEN** the created conversation has `created_by = user.id`

**Implementation hints:**
1. Add `requireAuth` at the start
2. Replace `const userId = validated.userId || '00000000-0000-0000-0000-000000000000'` with `const userId = user.id`
3. Remove `userId` from the request body schema/validation (or simply ignore it)

---

#### Change 2.7 — Secure `/api/conversations/generate-batch/route.ts` (C7)

**What changes:** Add `requireAuth`. Remove `userId` from request body. Use `user.id`.

**Where:** `src/app/api/conversations/generate-batch/route.ts` — POST handler (line ~38)

**Why:** Same pattern as C6 — userId from body with NIL UUID fallback.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** a batch generation with auth **THEN** all created conversations and batch jobs have `created_by = user.id`

---

#### Change 2.8 — Secure `/api/batch-jobs/route.ts` (C8)

**What changes:** Add `requireAuth`. Scope listing to user's batch jobs only.

**Where:** `src/app/api/batch-jobs/route.ts` — GET handler

**Why:** No auth. Lists ALL batch jobs globally. Optional `createdBy` filter is user-supplied (spoofable).

**Acceptance Criteria:**
- **GIVEN** a GET without auth **THEN** 401 is returned
- **GIVEN** a GET with auth **THEN** only batch jobs where `created_by = user.id` are returned
- **GIVEN** a GET with a `createdBy` query param that doesn't match the authenticated user **THEN** the query param is IGNORED; user.id is always used

---

#### Change 2.9 — Secure `/api/batch-jobs/[id]/cancel/route.ts` (C9)

**What changes:** Add `requireAuth` + ownership check before cancellation.

**Where:** `src/app/api/batch-jobs/[id]/cancel/route.ts` — POST handler (line ~53)

**Why:** No auth. Anyone can cancel any batch job.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** a cancel request for a batch job the user doesn't own **THEN** 404 is returned

**Implementation hints:**
1. Add `requireAuth`
2. Before `batchJobService.cancelJob(id)`, fetch the job and verify `created_by === user.id`
3. Or: modify `batchJobService.cancelJob` to accept `userId` and scope internally (preferred — see Phase 3 H1)

---

#### Change 2.10 — Secure `/api/pipeline/jobs/[jobId]/download/route.ts` (C11)

**What changes:** Add `requireAuth` + ownership check. The route currently uses admin client with ZERO auth.

**Where:** `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — GET handler (line ~48)

**Why:** Anyone on the internet can download trained model adapters. IP theft risk.

**Acceptance Criteria:**
- **GIVEN** a GET without auth **THEN** 401 is returned
- **GIVEN** a download request for a job the user doesn't own **THEN** 404 is returned
- **GIVEN** a download request for the user's own job **THEN** the adapter file is returned

**Implementation hints:**
1. Add `requireAuth`
2. After fetching the job with admin client, check `job.user_id === user.id`
3. If not owned, return 404

---

#### Change 2.11 — Secure `/api/export/conversations/route.ts` (C12)

**What changes:** Replace `x-user-id` header + NIL UUID fallback with `requireAuth`. Scope exported conversations to user.

**Where:** `src/app/api/export/conversations/route.ts` — POST handler (line ~68)

**Why:** Spoofable identity. When `scope='all'`, exports ALL approved conversations globally — severe data leak.

**Acceptance Criteria:**
- **GIVEN** a POST without auth **THEN** 401 is returned
- **GIVEN** a POST with `scope='all'` **WHEN** user is authenticated **THEN** only the user's approved conversations are exported
- **GIVEN** a POST with `scope='selected'` **WHEN** user provides conversation IDs **THEN** only those owned by user are included

**Implementation hints:**
1. Replace x-user-id with `requireAuth`
2. For `scope='all'`: add `.eq('created_by', user.id)` to conversation query
3. For `scope='selected'`: validate that all provided conversationIds belong to user (filter with `.in('id', ids).eq('created_by', user.id)`)
4. For `scope='filtered'`: add `.eq('created_by', user.id)` to filtered query

---

#### Change 2.12 — Secure `/api/export/download/[id]/route.ts` (C13)

**What changes:** Replace `x-user-id` header with `requireAuth`.

**Where:** `src/app/api/export/download/[id]/route.ts` — GET handler (line ~54)

**Why:** Has an ownership check (`exportLog.user_id !== userId`) but the userId comes from the spoofable `x-user-id` header.

**Acceptance Criteria:**
- **GIVEN** a GET without auth **THEN** 401 is returned
- **GIVEN** a download request where `exportLog.user_id !== user.id` **THEN** 403 is returned

**Implementation hints:**
1. Replace `const userId = request.headers.get('x-user-id') || '00000000...'` with `const { user, response } = await requireAuth(request)`
2. Keep the existing ownership check but use `user.id` instead of the header value

---

#### Change 2.13 — Secure `/api/import/*` routes (C14, C15, C16)

**What changes:** Add `requireAuth` to all three import routes.

**Where:**
- `src/app/api/import/templates/route.ts`
- `src/app/api/import/scenarios/route.ts`
- `src/app/api/import/edge-cases/route.ts`

**Why:** No auth on any import route. Anyone can overwrite templates, scenarios, and edge cases.

**Acceptance Criteria:**
- **GIVEN** a POST to any import endpoint without auth **THEN** 401 is returned
- **GIVEN** a POST with auth **THEN** imported records have `created_by = user.id` stamped

**Implementation hints:**
1. Add `requireAuth` to the start of each POST handler
2. When creating/upserting records, stamp `created_by: user.id`

---

#### Change 2.14 — Secure remaining conversation sub-routes

**What changes:** Add `requireAuth` to the following routes that currently have ZERO auth:

| Route | Handler(s) |
|-------|-----------|
| `src/app/api/conversations/[id]/turns/route.ts` | GET |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | POST |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | POST |
| `src/app/api/conversations/generate-with-scaffolding/route.ts` | POST |
| `src/app/api/conversations/orphaned/route.ts` | GET |
| `src/app/api/conversations/stats/route.ts` | GET |
| `src/app/api/conversations/by-chunk/[chunkId]/route.ts` | GET |
| `src/app/api/conversations/batch/[id]/items/route.ts` | GET |
| `src/app/api/conversations/batch/[id]/route.ts` | GET |

**Why:** All are unauthenticated endpoints that expose or modify conversation data.

**Acceptance Criteria:**
- **GIVEN** a request to any of these routes without auth **THEN** 401 is returned
- **GIVEN** a request with auth **THEN** operations are scoped to user's conversations (via parent conversation ownership check or `.eq('created_by', user.id)`)

**Implementation hints:**
For routes that access a conversation by `[id]`:
1. Add `requireAuth`
2. Fetch conversation and verify `created_by === user.id` before proceeding

For listing routes (stats, by-chunk, batch items):
1. Add `requireAuth`
2. Add `.eq('created_by', user.id)` filter to queries

---

### Phase 3: HIGH Route & Service Fixes (H1–H15)

#### Change 3.1 — Fix `batch-job-service.ts` (H1)

**What changes:** Add mandatory `userId` parameter to all public methods. Enforce `.eq('created_by', userId)` on all queries.

**Where:** `src/lib/services/batch-job-service.ts` — 9 public methods

**Why:** Uses admin client without mandatory user scoping. Only 1 of 9 methods (`getActiveJobs`) currently enforces userId.

**Acceptance Criteria:**
- **GIVEN** any method call without `userId` parameter **THEN** a TypeScript compilation error occurs (parameter is required)
- **GIVEN** `getJobById(id, userId)` **WHEN** the job's `created_by !== userId` **THEN** null is returned
- **GIVEN** `getAllJobs(userId, ...)` **THEN** only jobs where `created_by = userId` are returned
- **GIVEN** `cancelJob(id, userId)` **WHEN** job is not owned by userId **THEN** error is thrown
- **GIVEN** `deleteJob(id, userId)` **WHEN** job is not owned by userId **THEN** error is thrown

**Implementation hints:**
Modify each method signature to require `userId: string` as the first parameter. Add `.eq('created_by', userId)` to every SELECT/UPDATE/DELETE query. Example for `getJobById`:

```typescript
async getJobById(id: string, userId: string): Promise<BatchJob | null> {
  const { data, error } = await this.supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)  // ← ADD THIS
    .single();
  // ...
}
```

**Methods to modify:**
1. `createJob(params)` → `createJob(userId: string, params)` — stamp `created_by: userId`
2. `getJobById(id)` → `getJobById(id: string, userId: string)` — add `.eq('created_by', userId)`
3. `getAllJobs(options)` → `getAllJobs(userId: string, options)` — add `.eq('created_by', userId)`
4. `updateJobStatus(id, status, meta)` → `updateJobStatus(id: string, userId: string, ...)` — add `.eq('created_by', userId)`
5. `incrementProgress(id, amount)` → `incrementProgress(id: string, userId: string, ...)` — add `.eq('created_by', userId)`
6. `cancelJob(id)` → `cancelJob(id: string, userId: string)` — add `.eq('created_by', userId)`
7. `updateItemStatus(...)` → add userId and scope by parent job ownership
8. `deleteJob(id)` → `deleteJob(id: string, userId: string)` — add `.eq('created_by', userId)`
9. `getActiveJobs(userId)` — already correct; keep as-is

**Caller updates required:** All callers of `batchJobService` methods must be updated to pass `user.id`. Search for `batchJobService.` across the codebase.

---

#### Change 3.2 — Fix `rag-retrieval-service.ts` (H2)

**What changes:** Add `user_id` verification to retrieval queries. When using admin client, verify document ownership before allowing retrieval.

**Where:** `src/lib/rag/services/rag-retrieval-service.ts` — `retrieveContext()` (line ~63), `queryRAG()` (line ~655)

**Why:** Currently scopes by `documentId` but not `user_id`. If an attacker knows a documentId, they can retrieve another user's RAG data.

**Acceptance Criteria:**
- **GIVEN** a `queryRAG` call with a `documentId` that the `userId` does not own **THEN** the query returns an error ("Document not found")
- **GIVEN** a `retrieveContext` call **THEN** the document's `user_id` is verified before retrieving embeddings

**Implementation hints:**
1. In `queryRAG()`, before retrieval, verify document ownership:
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
2. In `retrieveContext()`, add the same ownership check
3. Ensure `userId` parameter is required (not optional) in the method signatures

---

#### Change 3.3 — Fix `conversation-service.ts` (H3)

**What changes:** Migrate both conversation service files from the deprecated `supabase` singleton to accept an injected client or use `createServerSupabaseClientFromRequest`.

**Where:**
- `src/lib/services/conversation-service.ts` (line ~11: `import { supabase } from '../supabase'`)
- `src/lib/conversation-service.ts` (line ~8: `import { supabase } from './supabase'`)

**Why:** The deprecated singleton creates a module-scoped Supabase client that is broken server-side (null in SSR context). All operations through this client may silently fail or use incorrect credentials.

**Acceptance Criteria:**
- **GIVEN** the conversation service is used in a server context **THEN** it uses a fresh Supabase client (not the deprecated singleton)
- **GIVEN** a query through the service **THEN** RLS is properly enforced via the cookie-based client

**Implementation hints:**
1. Change the service to accept a `SupabaseClient` via constructor injection (like `TrainingFileService`)
2. Update all callers to pass in the request-scoped client from `createServerSupabaseClientFromRequest(request)`
3. Remove `import { supabase } from '../supabase'`

---

#### Change 3.4 — Secure template, generation-log, failed-generation, performance, and export routes (H4–H12)

**What changes:** Add `requireAuth` and appropriate scoping to all HIGH-priority routes.

**Routes and specific changes:**

| Route | Change |
|-------|--------|
| `src/app/api/templates/route.ts` GET (H4) | Add `requireAuth`. Templates are shared-read, so keep returning all templates for authenticated users. |
| `src/app/api/templates/test/route.ts` (H5) | Add `requireAuth`. This triggers Claude API calls = cost risk. |
| `src/app/api/generation-logs/route.ts` GET (H6) | Add `requireAuth`. Add `.eq('created_by', user.id)` to SELECT. |
| `src/app/api/generation-logs/route.ts` POST (H6) | Replace `x-user-id` header with `user.id` from `requireAuth`. |
| `src/app/api/generation-logs/stats/route.ts` (H6) | Add `requireAuth`. Scope stats to user. |
| `src/app/api/failed-generations/route.ts` (H7) | Add `requireAuth`. Add `.eq('created_by', user.id)`. |
| `src/app/api/failed-generations/[id]/route.ts` (H7) | Add `requireAuth` + ownership check. |
| `src/app/api/failed-generations/[id]/download/route.ts` (H7) | Add `requireAuth` + ownership check. |
| `src/app/api/performance/route.ts` (H8) | Add `requireAuth`. Consider admin-only guard for future. |
| `src/app/api/training-files/[id]/download/route.ts` (H9) | Has auth but no ownership check. Add `.eq('created_by', user.id)` to query. |
| `src/app/api/documents/route.ts` GET (H10) | Add `.eq('author_id', user.id)` to GET query (currently uses service role, returns all docs). |
| `src/app/api/documents/[id]/route.ts` (H11) | Add ownership check post-fetch (`author_id === user.id`). |
| `src/app/api/export/history/route.ts` | Replace `x-user-id` with `requireAuth`. |
| `src/app/api/export/status/[id]/route.ts` | Replace `x-user-id` with `requireAuth`. |
| `src/app/api/export/templates/route.ts` (H12) | Add `requireAuth`. |
| `src/app/api/export/scenarios/route.ts` (H12) | Add `requireAuth`. |
| `src/app/api/export/edge-cases/route.ts` (H12) | Add `requireAuth`. |

**Acceptance Criteria (universal):**
- **GIVEN** a request without auth to any route above **THEN** 401 is returned
- **GIVEN** a request with auth **THEN** data is scoped to the authenticated user (for scoped resources) or all authenticated users can see (for shared resources like templates)

---

#### Change 3.5 — Add RLS to `notifications` and `cost_records` (H13, H14)

**What changes:** Add RLS policies via SAOL migration.

**Where:** Database — `notifications` table and `cost_records` table

**Why:** Both tables have `user_id` columns but NO RLS policies. Data is accessible to any authenticated user via RLS-backed clients.

**Acceptance Criteria:**
- **GIVEN** the RLS policies are applied **WHEN** a user queries `notifications` via an RLS-backed client **THEN** only their own notifications are returned
- **GIVEN** the RLS policies are applied **WHEN** a user queries `cost_records` via an RLS-backed client **THEN** only their own cost records are returned
- **GIVEN** a service-role client queries these tables **THEN** all records are accessible

**Implementation (SAOL):**
```typescript
const saol = require('supa-agent-ops');

await saol.agentExecuteDDL({
  sql: `
    -- notifications
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "notifications_select_own" ON notifications
      FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "notifications_insert_service" ON notifications
      FOR INSERT WITH CHECK (true);  -- System-generated
    CREATE POLICY "notifications_update_own" ON notifications
      FOR UPDATE USING (user_id = auth.uid());
    CREATE POLICY "notifications_service_role" ON notifications
      FOR ALL USING (auth.role() = 'service_role');

    -- cost_records
    ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "cost_records_select_own" ON cost_records
      FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "cost_records_service_role" ON cost_records
      FOR ALL USING (auth.role() = 'service_role');
  `,
  dryRun: false,
  transaction: true,
  transport: 'pg'
});
```

---

#### Change 3.6 — Add RLS to `metrics_points` (H15)

**What changes:** Add RLS policy via join to parent `training_jobs` table.

**Where:** Database — `metrics_points` table

**Why:** No `user_id`, no RLS. Data is accessible to any user.

**Implementation (SAOL):**
```typescript
await saol.agentExecuteDDL({
  sql: `
    ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "metrics_points_select_via_job" ON metrics_points
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM pipeline_training_jobs
          WHERE pipeline_training_jobs.id = metrics_points.job_id
          AND pipeline_training_jobs.user_id = auth.uid()
        )
      );
    CREATE POLICY "metrics_points_service_role" ON metrics_points
      FOR ALL USING (auth.role() = 'service_role');
  `,
  transaction: true,
  transport: 'pg'
});
```

---

### Phase 4: MEDIUM Fixes (M1–M13)

#### Change 4.1 — Scope training files GET (M1)

**Where:** `src/app/api/training-files/route.ts` — GET handler

**What:** Add `.eq('created_by', user.id)` to the training files listing query. Auth is already present.

**Acceptance Criteria:**
- **GIVEN** a GET with auth **THEN** only the user's training files are returned

---

#### Change 4.2 — Add ownership checks to conversation download routes (M12, M13)

**Where:**
- `src/app/api/conversations/[id]/download/raw/route.ts`
- `src/app/api/conversations/[id]/download/enriched/route.ts`

**What:** Both routes have auth but no ownership check. Add `.eq('created_by', user.id)` to the conversation fetch query.

**Acceptance Criteria:**
- **GIVEN** a download request for a conversation the user doesn't own **THEN** 404 is returned

---

#### Change 4.3 — Add auth to batch status check (M5)

**Where:** `src/app/api/conversations/batch/[id]/status/route.ts`

**What:** Add `requireAuth` + ownership check via parent batch job.

---

#### Change 4.4 — Cron routes: fail closed (M6)

**Where:** All 5 cron routes:
- `src/app/api/cron/daily-maintenance/route.ts`
- `src/app/api/cron/export-file-cleanup/route.ts`
- `src/app/api/cron/export-log-cleanup/route.ts`
- `src/app/api/cron/export-metrics-aggregate/route.ts`
- `src/app/api/cron/hourly-monitoring/route.ts`

**What:** Replace the current pattern (which passes if `CRON_SECRET` is unset) with `requireAuthOrCron(request)` from Change 1.1.

**Current pattern (INSECURE):**
```typescript
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// If cronSecret is undefined, auth check is SKIPPED
```

**New pattern:**
```typescript
const { isCron, response } = await requireAuthOrCron(request);
if (response) return response;
// Proceeds only if valid cron token or authenticated user
```

**Acceptance Criteria:**
- **GIVEN** `CRON_SECRET` is NOT set **WHEN** a request hits any cron endpoint **THEN** 500 is returned (not 200)
- **GIVEN** `CRON_SECRET` is set **WHEN** request has wrong/no Bearer token **THEN** 401 is returned

---

#### Change 4.5 — Inngest: verify document ownership (M8)

**Where:** `src/inngest/functions/process-rag-document.ts` — line ~46

**What:** After extracting `{ documentId, userId }` from the event payload, verify that the document's `user_id` matches the event's `userId` before processing.

**Acceptance Criteria:**
- **GIVEN** an Inngest event where `userId` does NOT match the document's `user_id` **THEN** the function throws an error and does NOT process the document
- **GIVEN** an Inngest event where `userId` matches **THEN** processing proceeds normally

**Implementation hints:**
```typescript
const { documentId, userId } = event.data;
const adminClient = createServerSupabaseAdminClient();

// Verify ownership before processing
const { data: doc } = await adminClient
  .from('rag_documents')
  .select('user_id')
  .eq('id', documentId)
  .single();

if (!doc || doc.user_id !== userId) {
  throw new Error(`Document ${documentId} not owned by user ${userId}`);
}
```

---

#### Change 4.6 — Training file service: mandatory userId (M7)

**Where:** `src/lib/services/training-file-service.ts`

**What:** Add mandatory `userId` parameter to `listTrainingFiles()` and other query methods. Replace optional `created_by` filter with required `userId` scoping.

**Acceptance Criteria:**
- **GIVEN** `listTrainingFiles(userId)` is called **THEN** query includes `.eq('created_by', userId)`
- **GIVEN** a method call without `userId` **THEN** TypeScript compilation error

---

### Phase 5: Database Schema Migration

All migrations MUST use SAOL (`agentExecuteDDL` with `transport: 'pg'`, `transaction: true`). Always dry-run first.

#### Change 5.1 — Phase 1: Add missing columns (non-breaking)

**Where:** New file `src/scripts/migrations/identity-spine-phase1-add-columns.ts`

**What:** Add `user_id` column to legacy tables that only have `created_by`. Add `updated_by` to tables that need it. Add `created_by` to tables that only have `user_id`. All new columns are NULLABLE initially.

**SQL (via SAOL):**
```sql
-- Legacy tables: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Standardize documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add updated_by to tables lacking it
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add created_by (audit) to tables lacking it
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Fix missing FKs on existing columns
-- NOTE: Only add FK if column exists and FK doesn't already exist
-- Run agentIntrospectSchema first to check current state
```

**Acceptance Criteria:**
- **GIVEN** the migration runs **THEN** all listed columns exist on their respective tables
- **GIVEN** the migration runs twice **THEN** no errors occur (idempotent via IF NOT EXISTS)
- **GIVEN** the migration runs **THEN** no existing data is modified

---

#### Change 5.2 — Phase 2: Backfill data

**Where:** New file `src/scripts/migrations/identity-spine-phase2-backfill.ts`

**What:** Populate the new `user_id` columns from existing `created_by` or `author_id` columns. Create `_orphaned_records` quarantine table. Log orphans.

**SQL (via SAOL):**
```sql
-- Backfill user_id from created_by on legacy tables
UPDATE conversations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE training_files SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE batch_jobs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE generation_logs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE failed_generations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Backfill documents.user_id from author_id
UPDATE documents SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;

-- Backfill created_by for pipeline tables
UPDATE datasets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE pipeline_training_jobs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;

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

-- Log orphans
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'training_files', id FROM training_files WHERE created_by IS NULL AND user_id IS NULL;
```

**Acceptance Criteria:**
- **GIVEN** the backfill runs **THEN** `SELECT COUNT(*) FROM conversations WHERE user_id IS NULL AND created_by IS NOT NULL` returns 0
- **GIVEN** orphaned records exist **THEN** they are logged in `_orphaned_records` table

---

#### Change 5.3 — Phase 4: Add NOT NULL constraints & indexes

**Where:** New file `src/scripts/migrations/identity-spine-phase4-constraints.ts`

**IMPORTANT:** This must run AFTER Phase 2 backfill AND Phase 3 code changes are deployed. All orphans must be resolved first.

**SQL (via SAOL):**
```sql
-- Enforce NOT NULL on ownership columns (only after backfill + orphan resolution)
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- Add performance indexes for scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_files_user_id ON training_files(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
```

**Acceptance Criteria:**
- **GIVEN** the constraint migration runs **THEN** `INSERT INTO conversations (..., user_id) VALUES (..., NULL)` fails with NOT NULL violation
- **GIVEN** the index migration runs **THEN** `\di idx_conversations_user_id` shows the index exists

---

### Phase 6: RLS Policy Enforcement

#### Change 6.1 — Add missing RLS policies

See Changes 3.5 and 3.6 above for `notifications`, `cost_records`, and `metrics_points`.

Additionally, ensure all newly user_id-bearing tables have RLS policies matching the canonical template from the investigation document (Section 7.4).

---

### Phase 7: Cleanup & Finalize

#### Change 7.1 — Remove x-user-id header reads

**What:** Search for all `x-user-id` in the codebase and remove. Files known from validation:
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/status/route.ts`
- `src/app/api/export/conversations/route.ts`
- `src/app/api/export/history/route.ts`
- `src/app/api/export/status/[id]/route.ts`
- `src/app/api/export/download/[id]/route.ts`
- `src/app/api/generation-logs/route.ts`

Also search client-side hooks that SEND the `x-user-id` header:
- `src/hooks/use-conversations.ts`
- `src/components/conversations/ConversationDashboard.tsx`
- `src/components/import-export/ExportModal.tsx`
- Any other file that sets `'x-user-id'` in fetch headers

**Acceptance Criteria:**
- **GIVEN** a grep for `x-user-id` across the entire `src/` directory **THEN** zero matches are found

---

#### Change 7.2 — Remove NIL UUID and test-user fallbacks

**What:** Remove all fallback values:
- `'00000000-0000-0000-0000-000000000000'`
- `'test-user'`
- `'test_user'`

**Files (from validation):**
- `src/app/api/generation-logs/route.ts` — line 103
- `src/app/api/export/status/[id]/route.ts` — line 58
- `src/app/api/export/history/route.ts` — line 58
- `src/app/api/export/download/[id]/route.ts` — line 54
- `src/app/api/export/conversations/route.ts` — line 68
- `src/app/api/conversations/route.ts` — line 66
- `src/app/api/conversations/[id]/status/route.ts` — line 31

**Acceptance Criteria:**
- **GIVEN** a grep for `00000000-0000-0000-0000-000000000000` OR `test-user` OR `test_user` in `src/app/api/` **THEN** zero matches are found

---

#### Change 7.3 — Deprecate/remove `src/lib/supabase.ts` singleton

**What:** Replace all usages of the deprecated `supabase` singleton with proper server/client patterns. Then either delete the file or add a `console.error` + throw to prevent future usage.

**Files using deprecated singleton (from validation):**
- `src/lib/services/conversation-service.ts`
- `src/lib/conversation-service.ts`
- Any other file importing from `'../supabase'` or `'./supabase'`

**Acceptance Criteria:**
- **GIVEN** a grep for `from '../supabase'` or `from './supabase'` (excluding `supabase-server.ts` and `supabase-client.ts`) **THEN** zero matches in service/route files

---

#### Change 7.4 — Fix file-scope `createClient()` singletons

**What:** Multiple route files create a module-scope Supabase client with service role key. Replace with per-request client creation.

**Files (from validation):**
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/app/api/documents/process/route.ts`
- `src/app/api/documents/status/route.ts`
- `src/app/api/documents/upload/route.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/workflow/route.ts`
- `src/app/api/workflow/session/route.ts`

**Pattern to remove:**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

**Replace with:** For system-global resources (categories, tags): use `createServerSupabaseAdminClient()` inside the handler function (not at module scope). For user-scoped resources (documents): use `requireAuth` + `createServerSupabaseClientFromRequest(request)`.

**Acceptance Criteria:**
- **GIVEN** a grep for `createClient(` in `src/app/api/` **THEN** zero matches remain (all replaced with proper helpers)

---

## 4. Testing Checkpoints

### 4.1 After Phase 2 (CRITICAL Route Fixes)

| # | Test | How to Verify |
|---|------|--------------|
| T1 | **Unauthenticated rejection** | `curl -X GET http://localhost:3000/api/conversations` → 401. Same for all 20 fixed routes. |
| T2 | **Spoofed header ignored** | `curl -H "x-user-id: victim-uuid" -H "Cookie: sb-access-token=..."  http://localhost:3000/api/conversations` → returns ONLY the cookie-authenticated user's data |
| T3 | **Cross-user read isolation** | User A creates conversation. User B tries GET `/api/conversations/{A's-id}` → 404 |
| T4 | **Cross-user mutation isolation** | User A creates conversation. User B tries PATCH `/api/conversations/{A's-id}` → 404 |
| T5 | **Ownership stamping** | POST `/api/conversations` → verify DB record has `created_by = authenticated user.id` |
| T6 | **Bulk action scoping** | User A has 3 convos, User B has 2. User A sends bulk-action with all 5 IDs → only A's 3 are affected |
| T7 | **Adapter download protection** | Unauthenticated GET `/api/pipeline/jobs/{jobId}/download` → 401 |

### 4.2 After Phase 3 (HIGH Fixes)

| # | Test | How to Verify |
|---|------|--------------|
| T8 | **batch-job-service scoping** | `batchJobService.getAllJobs(userA.id)` returns only A's jobs even though admin client bypasses RLS |
| T9 | **RAG retrieval ownership** | `queryRAG({ documentId: B's-doc, userId: A })` → error "Document not found" |
| T10 | **Notifications RLS** | User A queries notifications via RLS client → only sees own. Verify via SAOL query. |
| T11 | **Template GET requires auth** | `curl http://localhost:3000/api/templates` without cookie → 401 |

### 4.3 After Phase 5 (Database Migration)

| # | Test | How to Verify |
|---|------|--------------|
| T12 | **Backfill completeness** | SAOL query: `SELECT COUNT(*) FROM conversations WHERE user_id IS NULL AND created_by IS NOT NULL` → 0 |
| T13 | **NOT NULL enforcement** | After Phase 4: attempt INSERT into conversations with `user_id = NULL` → constraint violation |
| T14 | **Index existence** | SAOL introspect: `agentIntrospectSchema({ table: 'conversations', includeIndexes: true })` → shows `idx_conversations_user_id` |

### 4.4 After Phase 7 (Cleanup)

| # | Test | How to Verify |
|---|------|--------------|
| T15 | **No x-user-id references** | `grep -r "x-user-id" src/` → 0 results |
| T16 | **No NIL UUID fallbacks** | `grep -r "00000000-0000-0000-0000-000000000000" src/app/api/` → 0 results |
| T17 | **No test-user fallbacks** | `grep -r "'test-user'" src/app/api/` → 0 results |
| T18 | **No file-scope createClient** | `grep -rn "^const supabase = createClient" src/app/api/` → 0 results |
| T19 | **TypeScript compilation** | `npx tsc --noEmit` → 0 errors |

---

## 5. Warnings

### MUST NOT Do

1. **DO NOT deploy Phase 4 (NOT NULL constraints) before Phase 2 (backfill) is verified.** If orphaned records exist with NULL user_id, the constraint migration will fail and potentially lock the table.

2. **DO NOT remove `created_by` columns.** `created_by` remains as the audit actor field. The new `user_id` column is the canonical ownership field. Both should exist.

3. **DO NOT use raw `supabase-js` or PostgreSQL scripts for database operations.** All migrations MUST use SAOL (`agentExecuteDDL` with `transport: 'pg'`, `transaction: true`). Reference: `pmc/product_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md`.

4. **DO NOT change RLS policies on tables that already have correct policies** (RAG tables, pipeline tables, datasets). Only ADD policies to tables lacking them (notifications, cost_records, metrics_points).

5. **DO NOT introduce a new `roles` or `organizations` table in this specification.** The scope is limited to single-user ownership enforcement. Multi-tenancy/roles are future work.

6. **DO NOT remove the `batch-jobs/[id]/process-next` route entirely.** It's used by the batch processing pipeline. Instead, add auth + ownership verification.

7. **DO NOT change the Supabase auth configuration, middleware auth redirect, or cookie handling.** The existing auth infrastructure (`requireAuth`, cookie-based JWT, `getUser()`) is correct. Only the *enforcement* at the route level is being fixed.

8. **DO NOT use `x-user-id` header for ANY purpose going forward, including debugging.** If debugging requires a user context, use the authenticated session or a dedicated admin debug endpoint with proper auth.

9. **DO NOT change the `batch-job-service` admin client to an RLS-backed client.** The admin client is correct for background processing; the fix is adding explicit `.eq('created_by', userId)` scoping to every query, not changing the client type.

10. **DO NOT skip dry-runs when executing SAOL DDL.** Always run with `dryRun: true` first, verify the output, then execute with `dryRun: false`.

### Execution Order (CRITICAL)

```
Phase 1 → Phase 5.1 (add columns) → Phase 5.2 (backfill) → Phase 2 → Phase 3 → Phase 4 → Phase 5.3 (constraints) → Phase 6 → Phase 7
```

Phases 2 and 3 can be worked on in parallel after Phase 5.2. Phase 5.3 (NOT NULL constraints) MUST wait until all code changes are deployed and all orphans are resolved. Phase 7 cleanup runs last.

### Frontend Breaking Changes

When Phase 2 deploys, client-side code that sends `x-user-id` headers will have those headers **ignored** (not cause errors — the auth cookie will be used instead). However, if client-side code does NOT send auth cookies (e.g., uses `fetch` without `credentials: 'include'`), those requests will start getting 401s. Verify all client-side `fetch` calls include credentials.

---

*End of Specification*
