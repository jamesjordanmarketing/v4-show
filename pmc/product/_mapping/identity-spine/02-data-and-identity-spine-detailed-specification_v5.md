# Data & Identity Spine — Detailed Implementation Specification v5

**Document:** `02-data-and-identity-spine-detailed-specification_v5.md`
**Date:** 2026-02-21
**Status:** SPECIFICATION — FINAL — READY FOR IMPLEMENTATION
**Prerequisite:** `01-data-and-identity-spine-spec_v1.md` (Investigation & Gap Log)
**Supersedes:** `02-data-and-identity-spine-detailed-specification_v4.md`
**Source:** v4 spec updated against live codebase and Supabase schema as of 2026-02-21, incorporating all Multi-Document Retrieval changes from `002-multi-doc-retrieval-specification_v3.md`.
**Scope:** Bright Run LoRA Training Data Platform (v2-modules)
**SAOL Constraint:** All database DDL/DML operations MUST be executed via SAOL (`agentExecuteDDL` with `transport: 'pg'`, `transaction: true`). Always dry-run first (`dryRun: true`), verify output, then execute with `dryRun: false`.

---

## Table of Contents

1. [Summary](#1-summary)
2. [What Changed Since v4 — Multi-Document Retrieval Delta](#2-what-changed-since-v4--multi-document-retrieval-delta)
3. [Impact Analysis](#3-impact-analysis)
4. [Phase 0 — Preflight Verification](#4-phase-0--preflight-verification)
5. [Phase 1 — Auth Infrastructure](#5-phase-1--auth-infrastructure)
6. [Phase 2 — Database Schema Migration](#6-phase-2--database-schema-migration)
7. [Phase 3 — Data Backfill & Orphan Quarantine](#7-phase-3--data-backfill--orphan-quarantine)
8. [Phase 4 — CRITICAL Route Fixes (C1–C16)](#8-phase-4--critical-route-fixes-c1c16)
9. [Phase 5 — HIGH Route & Service Fixes (H1–H15)](#9-phase-5--high-route--service-fixes-h1h15)
10. [Phase 6 — MEDIUM Fixes (M1–M13)](#10-phase-6--medium-fixes-m1m13)
11. [Phase 7 — Database Constraints & RLS](#11-phase-7--database-constraints--rls)
12. [Phase 8 — Cleanup & Deprecated Code Removal](#12-phase-8--cleanup--deprecated-code-removal)
13. [Testing Checkpoints](#13-testing-checkpoints)
14. [Warnings & Risks](#14-warnings--risks)
15. [Execution Order](#15-execution-order)
16. [Files Summary](#16-files-summary)

---

## 1. Summary

This specification converts the 48 identity spine gaps identified in the v1 investigation (C1–C16 CRITICAL, H1–H15 HIGH, M1–M13 MEDIUM, L1–L5 LOW) into numbered, implementable changes with exact file paths, **live-validated line numbers (as of 2026-02-21)**, code patterns, and GIVEN-WHEN-THEN acceptance criteria.

### v5 Scope Changes from v4

The **multi-document retrieval specification** (`002-multi-doc-retrieval-specification_v3.md`) has been fully implemented since v4 was written. This v5 specification is updated against the live codebase and Supabase database to account for:

- **Updated file sizes and line numbers** — `rag-retrieval-service.ts` is now **1440 lines** (was 980 in v4), `process-rag-document.ts` is **614 lines** (was 586), `rag-embedding-service.ts` is **309 lines** (was 257)
- **New functions requiring identity awareness** — `classifyQuery`, `assembleMultiHopContext`, `enrichCitationsWithDocumentInfo`, `rerankSections`, `balanceMultiDocCoverage`, `truncateAtSentence`
- **New database columns** — `summary` on `rag_knowledge_bases`, `query_scope` on `rag_queries`, `knowledge_base_id` denormalized onto `rag_sections` and `rag_facts`
- **Existing RAG table security is CONFIRMED GOOD** — All 6 RAG tables (`rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_embeddings`, `rag_queries`) have `user_id NOT NULL` and proper RLS with 4 policies each (select/insert/update/delete)
- **RAG route security is CONFIRMED GOOD** — All `/api/rag/*` routes use `requireAuth` correctly
- **New gap identified** — `getDocument()` in `rag-ingestion-service.ts` does NOT filter by userId
- **New gap identified** — `process-rag-document.ts` does NOT verify userId matches document owner

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

## 2. What Changed Since v4 — Multi-Document Retrieval Delta

### 2.1 RAG Table Security Status (Verified via SAOL 2026-02-21)

The multi-document retrieval implementation has **improved** the RAG module's security baseline. All RAG tables are now fully secured:

| Table | Columns | `user_id` | RLS Enabled | Policies | New Multi-Doc Columns |
|-------|---------|-----------|-------------|----------|-----------------------|
| `rag_knowledge_bases` | 9 | `NOT NULL` | ✅ | 4 (CRUD) | `summary TEXT NULL` |
| `rag_documents` | 28 | `NOT NULL` | ✅ | 4 (CRUD) | `document_type TEXT NULL` |
| `rag_sections` | 14 | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_facts` | 18 | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_embeddings` | 13 | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_queries` | 19 | `NOT NULL` | ✅ | 4 (CRUD) | `query_scope TEXT NULL` |

All RLS policies use `(auth.uid() = user_id)` for row-level isolation. **No identity spine changes are needed for RAG database tables.**

### 2.2 RAG Route Security Status (Verified via grep 2026-02-21)

All `/api/rag/*` routes use `requireAuth` and forward `user.id` to service functions:

| Route | Auth | Forwards userId |
|-------|------|-----------------|
| `/api/rag/query` (POST, GET) | ✅ `requireAuth` | ✅ `user.id` → `queryRAG` / `getQueryHistory` |
| `/api/rag/knowledge-bases` (GET, POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents` (GET, POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]` (GET, DELETE) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]/upload` (POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]/process` (POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]/questions` (GET, POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]/verify` (POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/documents/[id]/diagnostic-test` (POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/dashboard` (GET) | ✅ `requireAuth` | ✅ |
| `/api/rag/feedback` (POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/quality` (GET, POST) | ✅ `requireAuth` | ✅ |
| `/api/rag/models` (GET) | ✅ `requireAuth` | ✅ |
| `/api/rag/test/golden-set/*` (various) | ✅ `requireAuth` | ✅ |

**No identity spine changes are needed for RAG routes.**

### 2.3 RAG Service Gaps Created/Expanded by Multi-Doc

The multi-document retrieval implementation expanded the retrieval service significantly. Two gaps remain:

| Gap | File | Line | Description | Severity |
|-----|------|------|-------------|----------|
| **GAP-R1** | `rag-ingestion-service.ts` | L677 | `getDocument(documentId)` does NOT filter by `user_id` — any caller knowing a document ID can fetch its data | **HIGH** |
| **GAP-R2** | `process-rag-document.ts` | L56 | Initial document fetch does NOT verify `docRow.user_id === event.data.userId` — a crafted Inngest event could process another user's doc | **MEDIUM** |

These are addressed in Phase 5 (Change 5.17) and Phase 6 (Change 6.6) respectively.

### 2.4 Updated Line Numbers for RAG Retrieval Service

The multi-doc implementation rewrote significant portions of `rag-retrieval-service.ts`. All references in Phases 5–6 have been updated:

| Function | v4 Line | v5 Line (actual) | Notes |
|----------|---------|-------------------|-------|
| `retrieveContext` | L68 | L65 | Now batch-fetches (2 queries instead of ~50) |
| `assembleContext` | L214 | L224 | Now token-budgeted with `## From:` headers |
| `rerankWithClaude` | L298 | L412 | Adds `[Doc: name]` prefix for KB-wide |
| `rerankSections` | N/A | L504 | **New** — section reranking wrapper |
| `deduplicateResults` | L371 | L527 | Now applied to both sections and facts |
| `balanceMultiDocCoverage` | L415 | L569 | Now applied to both sections and facts |
| `generateResponse` | L448 | L602 | Now accepts `conversationContext` param |
| `classifyQuery` | N/A | L807 | **New** — query type classification |
| `assembleMultiHopContext` | N/A | L855 | **New** — structured multi-hop context |
| `enrichCitationsWithDocumentInfo` | N/A | L899 | **New** — document provenance on citations |
| `queryRAG` | ~L690 | L993 | Now has 4 insert sites (was 3) |
| `getQueryHistory` | ~L934 | L1396 | Now scope-aware (doc vs KB) |
| Guard clause | L693 | L1002 | Now accepts `knowledgeBaseId` alternative |

### 2.5 `queryRAG` Insert Sites (Updated)

The multi-doc implementation added a 4th insert site for multi-hop queries. All 4 sites correctly include `user_id`, `knowledge_base_id`, `document_id`, and `query_scope`:

| Insert | Approx. Line | Context | Includes `user_id` | Includes `query_scope` |
|--------|-------------|---------|--------------------|-----------------------|
| 1. LoRA-only | ~L1010 | When mode is `lora_only` | ✅ | ✅ |
| 2. Multi-hop | ~L1160 | After sub-query aggregation | ✅ | ✅ |
| 3. No-context | ~L1250 | Zero results found | ✅ | ✅ |
| 4. Standard | ~L1360 | Normal retrieval flow | ✅ | ✅ |

**No identity spine changes are needed for RAG query inserts.**

---

## 3. Impact Analysis

### 3.1 Files Created

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

### 3.2 Files Modified (Summary)

| Phase | Files | Count |
|-------|-------|-------|
| Phase 1 — Auth Infrastructure | `src/lib/supabase-server.ts` | 1 |
| Phase 4 — CRITICAL Routes | `conversations/*` (13), `batch-jobs/*` (3), `pipeline/jobs/*/download` (1), `export/*` (2), `import/*` (3) | 22 |
| Phase 5 — HIGH Routes & Services | `generation-logs/*` (2), `failed-generations/*` (2), `templates/*` (2), `documents/*` (2), `performance` (1), `training-files/*` (2), `export/*` (5), service files (3), **`rag-ingestion-service.ts`** (1) | 20 |
| Phase 6 — MEDIUM | `training-files/route.ts` (1), `conversations/*/download/*` (2), cron routes (5), **`process-rag-document.ts`** (1) | 9 |
| Phase 8 — Cleanup | Client hooks, module-scope singletons (~10 files) | ~10 |

### 3.3 Database Tables Affected

**Current state verified via SAOL (2026-02-21):**

| Table | Current Ownership Column | Has `user_id` | Has `updated_by` | RLS | Policies |
|-------|-------------------------|---------------|-------------------|-----|----------|
| `conversations` (89 cols) | `created_by UUID NULL` | ❌ **MISSING** | ❌ | ✅ | 8 (some duplicated) |
| `training_files` (20 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ❌ | ✅ | 3 |
| `batch_jobs` (31 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ❌ | ✅ | 2 |
| `generation_logs` (20 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ❌ | ✅ | 2 |
| `failed_generations` (26 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ❌ | ✅ | 5 |
| `documents` (21 cols) | `author_id UUID NULL` | ❌ **MISSING** | ❌ | ❌ **NO RLS** | 0 |
| `datasets` (22 cols) | `user_id UUID NOT NULL` | ✅ | ❌ | ✅ | 3 |
| `pipeline_training_jobs` (42 cols) | `user_id UUID NOT NULL` | ✅ | ❌ | ✅ | 4 |
| `notifications` (10 cols) | `user_id UUID NOT NULL` | ✅ | N/A | ❌ **NO RLS** | 0 |
| `cost_records` (8 cols) | `user_id UUID NOT NULL` | ✅ | N/A | ❌ **NO RLS** | 0 |
| `metrics_points` (11 cols) | None | ❌ **NO OWNERSHIP** | N/A | ❌ **NO RLS** | 0 |
| `export_logs` (25 cols) | `user_id UUID NOT NULL` | ✅ | N/A | ✅ | 3 |

**RAG tables — NO CHANGES NEEDED (already secured):**

| Table | `user_id` | RLS | Policies |
|-------|-----------|-----|----------|
| `rag_knowledge_bases` | ✅ NOT NULL | ✅ | 4 |
| `rag_documents` | ✅ NOT NULL | ✅ | 4 |
| `rag_sections` | ✅ NOT NULL | ✅ | 4 |
| `rag_facts` | ✅ NOT NULL | ✅ | 4 |
| `rag_embeddings` | ✅ NOT NULL | ✅ | 4 |
| `rag_queries` | ✅ NOT NULL | ✅ | 4 |

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
| `documents` | Enable RLS + `author_id = auth.uid()` / `user_id = auth.uid()` for CRUD; service_role for ALL |
| `notifications` | `user_id = auth.uid()` for SELECT/UPDATE/DELETE; service_role for ALL |
| `cost_records` | `user_id = auth.uid()` for SELECT; service_role for ALL |
| `metrics_points` | JOIN to `pipeline_training_jobs.user_id = auth.uid()` for SELECT; service_role for ALL |

**New table (Phase 3):**
| Table | Purpose |
|-------|---------|
| `_orphaned_records` | Quarantine table for records with NULL ownership after backfill |

> **Note:** The existing `_orphaned_records` table was found with 0 columns in SAOL introspection. It may need to be dropped and recreated with the proper schema.

### 3.4 Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking client-side fetch calls that lack auth cookies | HIGH | Verify all `fetch()` calls use `credentials: 'include'` (Supabase SSR handles this) |
| Orphaned records fail NOT NULL constraint | HIGH | Phase 3 backfill + quarantine MUST complete before Phase 7 constraints |
| Batch job processing breaks mid-generation | MEDIUM | Use `job.createdBy` from DB record (not live session) for pipeline userId |
| `batch-job-service.ts` method signature changes break callers | MEDIUM | Deploy all route changes + service changes atomically |
| Large table index creation causes lock contention | LOW | Use `CREATE INDEX CONCURRENTLY` (cannot be in transaction — run standalone) |
| Phase 7 deployed before Phase 3 verified → table lock failure | CRITICAL | Strict phase ordering enforced. Verify zero orphans before constraints. |
| Multi-doc retrieval functions process data without ownership verification at service level | MEDIUM | `getDocument()` gap (GAP-R1) is addressed in Phase 5. All route-level auth is already in place. |
| `process-rag-document.ts` Inngest function trusts event payload userId | MEDIUM | GAP-R2 addressed in Phase 6 (Change 6.6). |
| KB summary auto-generation modifies KB record without ownership re-verification | LOW | KB ownership is verified at the route level when processing is initiated. Inngest runs with admin client. |

---

## 4. Phase 0 — Preflight Verification

### Change 0.1: Verify `requireAuth` Function Signature

**File:** `src/lib/supabase-server.ts` (line 133)
**Action:** READ-ONLY — no changes needed.

Confirm that `requireAuth(request: NextRequest)` returns `{ user: User | null, response: NextResponse | null }`. If `user` is null, `response` is a 401 JSON body.

**Verified 2026-02-21:** `requireAuth` exists at line 133. Signature confirmed.

**GIVEN** `requireAuth` is called with a request containing valid Supabase auth cookies
**WHEN** the function resolves
**THEN** it returns `{ user: <User object with .id UUID>, response: null }`

**GIVEN** `requireAuth` is called with a request containing no or expired auth cookies
**WHEN** the function resolves
**THEN** it returns `{ user: null, response: NextResponse.json({ error: 'Unauthorized', message: 'Please log in to access this resource' }, { status: 401 }) }`

### Change 0.2: Verify SAOL Availability

**Action:** Run verification command:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');console.log('SAOL exports:', Object.keys(s).filter(k=>k.startsWith('agent')))"
```
Expected: `agentQuery`, `agentCount`, `agentExecuteDDL`, `agentIntrospectSchema`, etc.

### Change 0.3: Verify `generate-with-scaffolding` Is Already Secure

**File:** `src/app/api/conversations/generate-with-scaffolding/route.ts`
**Action:** READ-ONLY — ALREADY USES `requireAuth` (line 45). No changes needed. This route is excluded from Phase 4.

### Change 0.4: Verify RAG Route Security (NEW in v5)

**Action:** READ-ONLY — Verify all `/api/rag/*` routes use `requireAuth`. Run:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && grep -rn "requireAuth" app/api/rag/ --include="*.ts" | wc -l
```
**Expected:** ≥30 occurrences (covering GET, POST on all RAG route files).
**Verified 2026-02-21:** 37 occurrences confirmed. All RAG routes properly gated.

### Change 0.5: Verify `requireAuthOrCron` Does NOT Exist Yet (NEW in v5)

**File:** `src/lib/supabase-server.ts` (163 lines)
**Action:** READ-ONLY — Confirm `requireAuthOrCron` is NOT yet defined, so Phase 1 can add it.
**Verified 2026-02-21:** Not present. Phase 1 will add it.

---

## 5. Phase 1 — Auth Infrastructure

### Change 1.1: Add `requireAuthOrCron` Helper

**File:** `src/lib/supabase-server.ts` (163 lines)
**Action:** MODIFY — Add new exported function after `requireAuth` (after line 156, before the deprecated alias at line 157)
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

## 6. Phase 2 — Database Schema Migration

### Change 2.1: Add `user_id` and Audit Columns to Legacy Tables

**File:** `src/scripts/migrations/identity-spine-phase2-add-columns.ts` (CREATE)
**Gap refs:** C1, C8, H6, H7, H10 (prerequisite for all code-level changes)
**SAOL method:** `agentExecuteDDL({ sql: '...', transport: 'pg', transaction: true, dryRun: true })` — dry-run first, then execute.

**Current database state (verified 2026-02-21):**
- `conversations`: has `created_by`, NO `user_id`, NO `updated_by`
- `training_files`: has `created_by`, NO `user_id`, NO `updated_by`
- `batch_jobs`: has `created_by`, NO `user_id`, NO `updated_by`
- `generation_logs`: has `created_by`, NO `user_id`
- `failed_generations`: has `created_by`, NO `user_id`
- `documents`: has `author_id`, NO `user_id`, NO `created_by`, NO `updated_by`
- `datasets`: has `user_id`, NO `created_by`, NO `updated_by`
- `pipeline_training_jobs`: has `user_id`, NO `created_by`, NO `updated_by`
- `rag_knowledge_bases`: has `user_id`, NO `updated_by`
- `rag_documents`: has `user_id`, NO `updated_by`

```sql
-- 1. Legacy tables: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Standardize documents table (currently has author_id, no user_id)
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

**SAOL one-liner:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry:',dry.success,dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:',r.success,r.summary);}
})();"
```

**GIVEN** the `conversations` table exists without a `user_id` column
**WHEN** the migration executes via SAOL
**THEN** `conversations` has a nullable `user_id UUID` column with FK to `auth.users(id)` ON DELETE CASCADE

**GIVEN** the migration is executed a second time
**WHEN** all columns already exist
**THEN** no errors occur (idempotent via `IF NOT EXISTS`)

---

## 7. Phase 3 — Data Backfill & Orphan Quarantine

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

> **Note:** The `_orphaned_records` table exists in the DB but shows 0 columns via SAOL introspection (possibly an empty shell or view). Drop and recreate.

```sql
-- Drop existing empty shell if present
DROP TABLE IF EXISTS _orphaned_records;

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
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS orphans, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;
\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"
```
Expected: orphans = 0 for all tables (or matches `_orphaned_records` count).

---

## 8. Phase 4 — CRITICAL Route Fixes (C1–C16)

Every change in this phase follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';` at top
2. Add auth guard: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries (`.eq('created_by', user.id)` or ownership check post-fetch)
5. Remove NIL UUID and `'test-user'` fallbacks

**Remaining spoofable patterns (verified 2026-02-21):**
| File | Pattern | Line |
|------|---------|------|
| `conversations/route.ts` | `x-user-id` + `'test-user'` | L31, L66 |
| `conversations/[id]/status/route.ts` | `x-user-id` + `'test-user'` | L31 |
| `export/conversations/route.ts` | `x-user-id` + NIL UUID | L68 |
| `export/download/[id]/route.ts` | `x-user-id` + NIL UUID | L54 |
| `export/history/route.ts` | `x-user-id` + NIL UUID | L58 |
| `export/status/[id]/route.ts` | `x-user-id` + NIL UUID | L58 |
| `generation-logs/route.ts` | `x-user-id` + NIL UUID | L103 |
| `conversations/generate/route.ts` | NIL UUID | L31 |
| `conversations/generate-batch/route.ts` | NIL UUID | L38 |
| `conversations/bulk-enrich/route.ts` | NIL UUID | L113 |
| `conversations/[id]/enrich/route.ts` | NIL UUID | L57 |
| `batch-jobs/[id]/process-next/route.ts` | NIL UUID | L299 |
| `templates/test/route.ts` | `'test_user'` | L114 |

---

### Change 4.1: `src/app/api/conversations/route.ts` — Replace Spoofable Auth (C1)

**Current state (verified 2026-02-21):**
- GET L31: `request.headers.get('x-user-id') || undefined` — spoofable, optional
- POST L66: `request.headers.get('x-user-id') || 'test-user'` — spoofable, hardcoded fallback
- Client: delegates to `getConversationStorageService()`

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **GET handler** — Replace L31:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || undefined;
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```
   Ensure `created_by: userId` is passed to the service listing filter.

3. **POST handler** — Replace L66:
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

**Current state (verified 2026-02-21):**
- ZERO auth on GET, PATCH, DELETE
- No `requireAuth` import
- Delegates to `conversationService`

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

**Current state (verified 2026-02-21):**
- PATCH L31: `request.headers.get('x-user-id') || 'test-user'` — spoofable with fallback

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **Both GET and PATCH handlers** — Add auth guard + ownership check:
   ```typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   ```
   Fetch conversation and verify ownership before proceeding.

3. Replace `x-user-id` header read with `user.id`.

---

### Change 4.4: `src/app/api/conversations/bulk-action/route.ts` — Add Auth + Scope (C4)

**Current state:** ZERO auth. `reviewerId` from request body (caller-supplied).

**Modifications:**

1. Add `requireAuth` guard.
2. Replace body `reviewerId` with `user.id`.
3. Scope: verify all `conversationIds` belong to the user:
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
   ```

**GIVEN** User A sends bulk-action with a mix of owned and non-owned IDs **THEN** only owned conversations are affected; non-owned are silently skipped with count returned

---

### Change 4.5: `src/app/api/conversations/bulk-enrich/route.ts` — Add Auth + Ownership (C5)

**Current state:** ZERO auth. NIL UUID fallback at L113.

**Modifications:**

1. Add `requireAuth` guard.
2. In enrichment loop, verify ownership per conversation:
   ```typescript
   if (conversation.created_by !== user.id) {
     results.push({ conversationId, status: 'skipped', error: 'Not owned by authenticated user' });
     continue;
   }
   const userId = user.id;
   ```

---

### Change 4.6: `src/app/api/conversations/generate/route.ts` — Add Auth, Remove Body userId (C6)

**Current state:** ZERO auth. L31: NIL UUID fallback.

**Modifications:**

1. Add `requireAuth` guard.
2. Replace `userId = validated.userId || '00000000-...'` with `user.id`.
3. Mark body `userId` as deprecated-ignored:
   ```typescript
   userId: z.string().optional(), // DEPRECATED — ignored; auth cookie used instead
   ```

---

### Change 4.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId (C7)

**Current state:** ZERO auth. L38: NIL UUID fallback.

**Modifications:** Identical pattern to Change 4.6.

---

### Change 4.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping (C8)

**Current state (verified 2026-02-21):**
- ZERO auth on GET
- Optional `createdBy` filter from query string (L20) — not enforced
- No `requireAuth` import

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

**Current state (verified 2026-02-21):** ZERO auth on POST. Anyone can cancel any job.

**Modifications:**

1. Add `requireAuth` guard.
2. After `const job = await batchJobService.getJobById(id);`:
   ```typescript
   if (!job || job.createdBy !== user.id) {
     return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
   }
   ```

---

### Change 4.10: `src/app/api/batch-jobs/[id]/process-next/route.ts` — Add Auth + Ownership (C10)

**Current state:** ZERO auth. L299: NIL UUID fallback. Admin client.

**Modifications:**

1. Add `requireAuth` guard.
2. Add ownership check after job fetch.
3. Replace NIL UUID with `user.id`.

---

### Change 4.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership (C11)

**Current state:** ZERO auth. **IP THEFT RISK** — anyone can download trained LoRA adapter models.

**Modifications:**

1. Add `requireAuth` guard.
2. After fetching the job:
   ```typescript
   if (!job || job.user_id !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

---

### Change 4.12: `src/app/api/export/conversations/route.ts` — Replace Spoofable Auth + Scope (C12)

**Current state:** L68: `x-user-id` + NIL UUID. Conversations query has NO user scope.

**Modifications:**

1. Replace spoofable auth with `requireAuth`.
2. **CRITICAL:** Add `.eq('created_by', userId)` to the conversation query.

---

### Change 4.13: `src/app/api/export/download/[id]/route.ts` — Replace Spoofable Auth (C13)

**Current state:** L54: `x-user-id` + NIL UUID. Has existing ownership check at L68-72 but `userId` is spoofable.

**Modifications:** Replace L54 with `requireAuth`.

---

### Change 4.14: `src/app/api/import/templates/route.ts` — Add Auth (C14)

**Current state:** ZERO auth. Uses `createClient()`.

**Modifications:** Add `requireAuth` + stamp `created_by: user.id`.

---

### Change 4.15: `src/app/api/import/scenarios/route.ts` — Add Auth (C15)

**Modifications:** Identical to Change 4.14.

---

### Change 4.16: `src/app/api/import/edge-cases/route.ts` — Add Auth (C16)

**Modifications:** Identical to Change 4.14.

---

### Change 4.17: Secure Remaining Conversation Sub-Routes (C1-adjacent)

| Route | Handler(s) | Current Auth | Required Change |
|-------|-----------|-------------|-----------------|
| `src/app/api/conversations/[id]/turns/route.ts` | GET, POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/[id]/link-chunk/route.ts` | POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/[id]/unlink-chunk/route.ts` | POST | **NONE** | Add `requireAuth` + verify parent conversation ownership |
| `src/app/api/conversations/orphaned/route.ts` | GET | **NONE** | Add `requireAuth`; scope to user's orphaned conversations |
| `src/app/api/conversations/stats/route.ts` | GET | **NONE** | Add `requireAuth`; scope stats to `created_by = user.id` |
| `src/app/api/conversations/[id]/enrich/route.ts` | POST | NIL UUID at L57 | Add `requireAuth`; replace NIL UUID with `user.id` |

**Note:** `conversations/generate-with-scaffolding/route.ts` is EXCLUDED — already uses `requireAuth` (verified L45).

**Pattern for `[id]` sub-routes (turns, link-chunk, unlink-chunk, enrich):**
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

---

## 9. Phase 5 — HIGH Route & Service Fixes (H1–H15)

---

### Change 5.1: `src/app/api/generation-logs/route.ts` — Add Auth + User Scoping (H6)

**Current state:** GET: ZERO auth. POST L103: `x-user-id` + NIL UUID.

**Modifications:**

1. Add `requireAuth` guard.
2. Replace `x-user-id` header read with `user.id`.
3. Scope GET queries to `created_by = user.id`.

---

### Change 5.2: `src/app/api/generation-logs/stats/route.ts` — Add Auth + User Scoping (H6)

**Current state:** ZERO auth. Returns global stats.

**Modifications:** Add `requireAuth`. Scope stats to user.

---

### Change 5.3: `src/app/api/failed-generations/route.ts` — Add Auth + User Scoping (H7)

**Current state:** ZERO auth. Exposes all failure payloads.

**Modifications:** Add `requireAuth`. Add `.eq('created_by', user.id)` to query.

---

### Change 5.4: `src/app/api/failed-generations/[id]/route.ts` — Add Auth + Ownership (H7)

**Current state:** ZERO auth.

**Modifications:** Add `requireAuth` + ownership check post-fetch.

---

### Change 5.5: `src/app/api/templates/route.ts` — Add Auth to GET (H4)

**Current state:** GET: ZERO auth. POST: uses `supabase.auth.getUser()`.

**Modifications:** Add auth check to GET (templates are shared — all authenticated users can read):
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### Change 5.6: `src/app/api/templates/test/route.ts` — Add Auth (H5)

**Current state:** ZERO auth. L114: `userId: 'test_user'`. Triggers Claude API calls.

**Modifications:**

1. Add `requireAuth` guard.
2. Replace `'test_user'` with `user.id`.

---

### Change 5.7: `src/app/api/documents/route.ts` — Replace Module-Scope Singleton + Add Auth (H10)

**Current state (verified 2026-02-21):**
- Module-scope `createClient()` singleton with placeholder values (L5)
- `documents` table has `author_id` but NO `user_id`, NO RLS, 0 policies
- GET: ZERO auth

**Modifications:**

1. Remove module-level `createClient()` singleton.
2. Add `requireAuth` + user scoping using `author_id` (until Phase 7 when `user_id` is backfilled):
   ```typescript
   const { data } = await supabase
     .from('documents')
     .select('*')
     .eq('author_id', user.id)
     .order('created_at', { ascending: false });
   ```
3. POST: Replace Bearer token auth with `requireAuth`.

---

### Change 5.8: `src/app/api/documents/[id]/route.ts` — Normalize Auth Pattern (H11)

**Current state:** Bearer token auth on all methods. Module-scope admin singleton. Ownership check exists but returns 403 (change to 404).

**Modifications:**

1. Remove module-scope singleton.
2. Replace Bearer auth with `requireAuth`.
3. Change ownership failure from 403 to 404.

---

### Change 5.9: `src/app/api/performance/route.ts` — Add Auth (H8)

**Current state:** ZERO auth. Exposes slow queries, table bloat, unused index data.

**Modifications:** Add `requireAuth` guard.

---

### Change 5.10: `src/app/api/training-files/[id]/download/route.ts` — Add Ownership Check (H9)

**Current state:** Auth present via `getUser()`. NO ownership check.

**Modifications:** Add ownership check:
```typescript
if (!trainingFile || trainingFile.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

### Change 5.11–5.15: Export Routes — Replace Spoofable Auth

| Change | File | Current Pattern |
|--------|------|-----------------|
| 5.11 | `export/history/route.ts` | `x-user-id` + NIL UUID at L58 |
| 5.12 | `export/status/[id]/route.ts` | `x-user-id` + NIL UUID at L58 |
| 5.13 | `export/templates/route.ts` | ZERO auth |
| 5.14 | `export/scenarios/route.ts` | ZERO auth |
| 5.15 | `export/edge-cases/route.ts` | ZERO auth |

**Modifications:** Replace `x-user-id` reads with `requireAuth(request)`. Add `requireAuth` to zero-auth routes.

---

### Change 5.16: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter (H1)

**Current state (verified 2026-02-21, 606 lines):**
- `getJobById(id: string)` — NO userId
- `getAllJobs(filters?: { status?; createdBy? })` — createdBy is optional
- `cancelJob(id: string)` — NO userId
- `deleteJob(id: string)` — NO userId
- `getActiveJobs(userId: string)` — ALREADY correct

**Modifications:**

1. **`getAllJobs`** — Make `userId` mandatory first parameter:
   ```typescript
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     let query = supabase.from('batch_jobs').select('*').eq('created_by', userId);
     if (filters?.status) query = query.eq('status', filters.status);
     // ...
   }
   ```

2. **`getJobById`** — Add mandatory userId:
   ```typescript
   async getJobById(id: string, userId: string): Promise<BatchJob | null>
   ```

3. **`cancelJob`** — Add mandatory userId:
   ```typescript
   async cancelJob(id: string, userId: string): Promise<void>
   ```

4. **`deleteJob`** — Add mandatory userId:
   ```typescript
   async deleteJob(id: string, userId: string): Promise<void>
   ```

5. **Update ALL callers** from Phase 4 changes.

---

### Change 5.17: `src/lib/rag/services/rag-ingestion-service.ts` — Add `userId` to `getDocument()` (H2, GAP-R1) — UPDATED IN v5

**Current state (verified 2026-02-21, 1054 lines):**
- `getDocument(documentId)` at line 677 does NOT filter by `user_id`
- Any caller knowing a document ID can fetch its data via this function
- `getDocuments({ knowledgeBaseId, userId })` at L646 correctly filters both `knowledge_base_id` AND `user_id`

**Modifications:**

Add mandatory `userId` parameter:
```typescript
export async function getDocument(documentId: string, userId: string): Promise<RAGDocument | null> {
  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('rag_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId) // ← ADDED: ownership verification
    .single();

  if (error || !data) return null;
  return mapRowToDocument(data);
}
```

**Update ALL callers** — search for `getDocument(` across the codebase and add `userId` parameter:
```bash
grep -rn "getDocument(" src/ --include="*.ts" | grep -v "node_modules"
```

**⚠️ Multi-doc impact:** The multi-document retrieval implementation relies on fetching documents internally. The service functions (`queryRAG`, `retrieveContext`) already receive `userId` from the route layer. Internal calls to `getDocument()` in the Inngest pipeline use admin context and should be updated to pass the job's `userId`.

**GIVEN** `getDocument(docId, userAId)` is called with User B's document
**WHEN** the query runs
**THEN** `null` is returned (not found for this user)
**GIVEN** a method call without `userId` **THEN** TypeScript compilation error

---

### Change 5.18: `src/lib/services/conversation-service.ts` — Migrate from Deprecated Singleton (H3)

**Current state (verified 2026-02-21, 591 lines):**
- L11: `import { supabase } from '../supabase';` — **deprecated singleton** (null on server side)

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

2. Update callers to pass the request-scoped client.

---

### Change 5.19: Add RLS to `notifications` and `cost_records` (H13, H14)

**Current state (verified 2026-02-21):**
- `notifications`: has `user_id NOT NULL`, RLS **disabled**, 0 policies
- `cost_records`: has `user_id NOT NULL`, RLS **disabled**, 0 policies

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

---

### Change 5.20: Add RLS to `metrics_points` (H15)

**Current state (verified 2026-02-21):**
- `metrics_points`: NO `user_id` column, NO RLS, 0 policies

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

## 10. Phase 6 — MEDIUM Fixes (M1–M13)

---

### Change 6.1: `src/app/api/training-files/route.ts` — Add User Scoping to GET (M1)

**Current state:** Auth present. GET fetches ALL `status: 'active'` files regardless of user.

**Modifications:** Add `.eq('created_by', user.id)` to the training files listing query.

---

### Change 6.2: `src/app/api/conversations/[id]/download/raw/route.ts` — Add Ownership Check (M12)

**Current state:** Auth present via `requireAuth` (L59). NO ownership check — any authenticated user can download any conversation's raw JSON.

**Modifications:** After fetching conversation:
```typescript
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

### Change 6.3: `src/app/api/conversations/[id]/download/enriched/route.ts` — Add Ownership Check (M13)

**Current state:** Auth present. NO ownership check.

**Modifications:** Identical pattern to Change 6.2.

---

### Change 6.4: `src/app/api/conversations/batch/[id]/status/route.ts` — Add Auth + Ownership (M5)

**Modifications:** Add `requireAuth` + verify batch job belongs to user.

---

### Change 6.5: Cron Routes — Fail Closed with `requireAuthOrCron` (M6)

**Files (5 routes — all currently fail-open when `CRON_SECRET` not configured, verified 2026-02-21):**

| File | Current Pattern |
|------|----------------|
| `src/app/api/cron/daily-maintenance/route.ts` | `if (cronSecret && authHeader !== Bearer)` (L25) |
| `src/app/api/cron/export-file-cleanup/route.ts` | Warns and skips auth when missing (L40-41) |
| `src/app/api/cron/export-log-cleanup/route.ts` | Same pattern |
| `src/app/api/cron/export-metrics-aggregate/route.ts` | Same pattern |
| `src/app/api/cron/hourly-monitoring/route.ts` | Same pattern as daily-maintenance |

**Modifications:** In each cron route, replace with:
```typescript
import { requireAuthOrCron } from '@/lib/supabase-server';

const { isCron, response } = await requireAuthOrCron(request);
if (response) return response;
```

**GIVEN** `CRON_SECRET` is NOT set **WHEN** request hits any cron endpoint **THEN** 500 returned (not 200)

---

### Change 6.6: `src/inngest/functions/process-rag-document.ts` — Verify Document Ownership (M8, GAP-R2) — UPDATED IN v5

**Current state (verified 2026-02-21, 614 lines):**
- Trusts `userId` from event payload without verification (L56)
- Uses `createServerSupabaseAdminClient()`
- Multi-doc implementation added KB summary generation and `knowledgeBaseId` propagation but did NOT add ownership verification

**Modifications:** After extracting `{ documentId, userId }` from event payload:
```typescript
const adminClient = createServerSupabaseAdminClient();

// Verify document ownership before processing
const { data: doc } = await adminClient
  .from('rag_documents')
  .select('user_id, knowledge_base_id')
  .eq('id', documentId)
  .single();

if (!doc || doc.user_id !== userId) {
  throw new Error(`Document ${documentId} does not belong to user ${userId}`);
}
```

**Why this matters post-multi-doc:** The Inngest pipeline now does more work per document — 6 extraction passes, embedding generation, KB summary regeneration, `knowledge_base_id` denormalization to sections/facts. Processing another user's document would contaminate more data across more tables than before.

**GIVEN** an event with `userId: A` but document belongs to User B **THEN** processing aborted with error

---

### Change 6.7: `src/lib/services/training-file-service.ts` — Mandatory `userId` Parameter (M7)

**Modifications:** Add mandatory `userId` parameter to `listTrainingFiles()` and other query methods.

---

## 11. Phase 7 — Database Constraints & RLS

**Prerequisites:** Phase 3 backfill complete AND Phase 4–6 code changes deployed AND `_orphaned_records` resolved.

### Change 7.1: Add NOT NULL Constraints

**File:** `src/scripts/migrations/identity-spine-phase7-constraints.ts` (CREATE)

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

**IMPORTANT:** Use `CREATE INDEX CONCURRENTLY` for production (cannot be inside a transaction — run as standalone SAOL calls with `transaction: false`).

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

### Change 7.3: Enable RLS on `documents` Table

**Current state (verified 2026-02-21):** `documents` table has RLS **disabled** with 0 policies. This is the **only table in the codebase without RLS**.

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_own" ON documents FOR SELECT USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY "documents_insert_own" ON documents FOR INSERT WITH CHECK (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY "documents_update_own" ON documents FOR UPDATE USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY "documents_delete_own" ON documents FOR DELETE USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY "documents_service_all" ON documents FOR ALL USING (auth.role() = 'service_role');
```

> **Note:** Uses `COALESCE(user_id, author_id)` to handle both the new `user_id` column and the legacy `author_id` during the transition period. After Phase 3 backfill, `user_id` will always be set.

### Change 7.4: RLS for `notifications`, `cost_records`, `metrics_points`

See Changes 5.19 and 5.20 — can be deployed in Phase 5 or deferred to Phase 7.

---

## 12. Phase 8 — Cleanup & Deprecated Code Removal

### Change 8.1: Remove All `x-user-id` Header Reads

**Remaining files with `x-user-id` reads (verified 2026-02-21, excluding `__tests__/`):**

| File | Line |
|------|------|
| `conversations/route.ts` | L31, L66 |
| `conversations/[id]/status/route.ts` | L31 |
| `export/conversations/route.ts` | L68 |
| `export/download/[id]/route.ts` | L54 |
| `export/history/route.ts` | L58 |
| `export/status/[id]/route.ts` | L58 |
| `generation-logs/route.ts` | L103 |

After Phases 4–5, all should be replaced. Verify:
```bash
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
# Expected: ZERO results
```

### Change 8.2: Remove All NIL UUID and Test-User Fallbacks

**Remaining files (verified 2026-02-21):**

| Fallback | Files |
|----------|-------|
| `'test-user'` | `conversations/route.ts` (L66), `conversations/[id]/status/route.ts` (L31) |
| `'test_user'` | `templates/test/route.ts` (L114) |
| `'00000000...'` | `conversations/generate/route.ts` (L31), `conversations/generate-batch/route.ts` (L38), `conversations/bulk-enrich/route.ts` (L113), `conversations/[id]/enrich/route.ts` (L57), `batch-jobs/[id]/process-next/route.ts` (L299), `export/conversations/route.ts` (L68), `export/download/[id]/route.ts` (L54), `export/history/route.ts` (L58), `export/status/[id]/route.ts` (L58), `generation-logs/route.ts` (L103) |

Verify:
```bash
grep -rn "00000000-0000-0000-0000-000000000000\|'test-user'\|'test_user'" src/app/api/ --include="*.ts" | grep -v "__tests__"
# Expected: ZERO results
```

### Change 8.3: Remove Module-Scope `createClient()` Singletons

**Remaining files (verified 2026-02-21):**

| File |
|------|
| `src/app/api/categories/route.ts` (L5) |
| `src/app/api/documents/process/route.ts` (L7) |
| `src/app/api/documents/route.ts` (L5) |
| `src/app/api/documents/status/route.ts` (L5) |
| `src/app/api/documents/upload/route.ts` (L10) |
| `src/app/api/documents/[id]/route.ts` (L5) |
| `src/app/api/tags/route.ts` (L5) |
| `src/app/api/workflow/session/route.ts` (L6) |

**Replace with:**
- For system-global resources (categories, tags): Use `createServerSupabaseAdminClient()` **inside** the handler function.
- For user-scoped resources (documents): Use `requireAuth` + `createServerSupabaseClientFromRequest(request)`.

Verify:
```bash
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"
# Expected: ZERO results
```

### Change 8.4: Deprecate `src/lib/supabase.ts` Singleton

Add deprecation notice. Remove imports from service files.

### Change 8.5: Clean Up Duplicate Conversation RLS Policies (NEW in v5)

**Current state (verified 2026-02-21):**
The `conversations` table has **8 RLS policies** — some appear to be duplicates:
- "Users can create own conversations"
- "Users can delete own conversations"
- "Users can delete their own conversations" ← duplicate
- "Users can insert their own conversations" ← duplicate of create
- "Users can update own conversations"
- "Users can update their own conversations" ← duplicate
- "Users can view own conversations"
- "Users can view their own conversations" ← duplicate

**Modifications:** Audit and drop duplicate policies. Keep one policy per operation:
```sql
-- Drop duplicates (verify names match before executing)
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
```

---

## 13. Testing Checkpoints

### Checkpoint After Phase 3 (Data Backfill)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;\`,transport:'pg'});
console.log(JSON.stringify(r.rows,null,2));})();"
```
Expected: nulls = 0 for all tables.

### Checkpoint After Phase 4 (CRITICAL Route Fixes)

**Test T5 — Unauthenticated Rejection (all routes return 401):**

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
| `/api/conversations/{id}/enrich` | POST | 401 |
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

**Test T8 — Service Layer Scoping:**

- `batchJobService.getAllJobs(userA.id)` returns only User A's jobs
- `getDocument(docId, userA.id)` returns null when doc belongs to User B

**Test T10 — RLS Verification:**

- User A queries `notifications` via RLS client → only sees own notifications
- User A queries `cost_records` → only sees own cost records

**Test T-RAG — RAG Service Identity Verification (NEW in v5):**

- `getDocument(docId, wrongUserId)` returns `null`
- `getDocuments({ knowledgeBaseId, userId: wrongUserId })` returns empty array
- `queryRAG({ documentId: B-doc, userId: A })` succeeds but returns no results (document is filtered by user)
- KB-wide query only returns results from user's own KBs (verified via RLS on `rag_knowledge_bases`)

### Checkpoint After Phase 7 (DB Constraints)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  // Verify NOT NULL constraints
  const r1=await saol.agentExecuteDDL({sql:\`
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name IN ('conversations','training_files','batch_jobs','generation_logs','documents')
AND column_name = 'user_id';\`,transport:'pg'});
  console.log('NOT NULL checks:',JSON.stringify(r1.rows));

  // Verify RLS enabled
  const r2=await saol.agentExecuteDDL({sql:\`
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('documents','notifications','cost_records','metrics_points');\`,transport:'pg'});
  console.log('RLS enabled:',JSON.stringify(r2.rows));

  // Verify indexes
  const r3=await saol.agentExecuteDDL({sql:\`
SELECT indexname FROM pg_indexes WHERE schemaname='public'
AND indexname LIKE 'idx_%user_id%';\`,transport:'pg'});
  console.log('User indexes:',r3.rows?.length||0);
})();"
```

### Final Checkpoint

```bash
# No x-user-id reads remain
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
# Expected: ZERO results

# No NIL UUID fallbacks remain
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"
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

## 14. Warnings & Risks

### W1: Client-Side Fetch Credentials

**Risk:** Frontend code that does NOT include auth cookies in `fetch()` calls will get 401s after Phase 4.
**Mitigation:** Supabase SSR handles cookie forwarding automatically. Verify all custom `fetch()` calls use `credentials: 'include'`. Validated: no client-side code sends `x-user-id` header.

### W2: Batch Job Processing Polling Loop

**Risk:** `batch-jobs/[id]/process-next` is called in a polling loop. Adding `requireAuth` means auth cookies must be present on every poll request.
**Mitigation:** Use the job's stored `createdBy` from the DB record for the generation userId:
```typescript
const pipelineUserId = job.createdBy; // Stored at job creation time
```

### W3: Migration Ordering Is Critical

**Risk:** If Phase 4 (code enforcement) is deployed before Phase 2 (schema migration), code trying to write `user_id` on tables without the column will fail.
**Mitigation:** Strict ordering: Phase 2 + Phase 3 MUST complete before Phase 4. Phase 7 MUST wait for Phase 3–6 AND orphans resolved.

### W4: `batch-job-service.ts` Method Signature Breaking Change

**Risk:** Changing method signatures is breaking. Every caller must be updated.
**Mitigation:** Deploy atomically.

### W5: Large Table Index Creation Lock Contention

**Risk:** Creating indexes on large tables may cause lock contention.
**Mitigation:** `CREATE INDEX CONCURRENTLY` outside a transaction, with `transaction: false`.

### W6: Shared Resources (Templates, Scenarios, Edge Cases)

**Risk:** Adding auth to GET endpoints may break unauthenticated tools.
**Mitigation:** Intentional change. All consumers must authenticate.

### W7: Export Download Regeneration

**Risk:** `export/download/[id]` regeneration helper reads conversations with no user scoping.
**Mitigation:** Add `.eq('created_by', userId)` to the regeneration query.

### W8: DO NOT Deploy Phase 7 Before Phase 3 Verification

**Risk:** NULL rows + NOT NULL constraint = table lock failure.
**Mitigation:** Pre-check in migration + always dry-run first.

### W9: DO NOT Remove `created_by` Columns

`created_by` remains as the **audit actor field**. The new `user_id` column is the **canonical ownership field**. Both coexist.

### W10: DO NOT Change Supabase Auth Infrastructure

Existing auth infrastructure is correct. Only route-level enforcement is being fixed.

### W11: Multi-Document Retrieval Service Functions Are Already Identity-Aware (NEW in v5)

**Risk:** New multi-doc functions (`classifyQuery`, `assembleMultiHopContext`, `enrichCitationsWithDocumentInfo`, etc.) might bypass user isolation.
**Mitigation:** All these functions are called within `queryRAG()`, which receives `userId` from the route layer. The route (`/api/rag/query`) enforces `requireAuth` and passes `user.id`. The underlying search RPCs (`match_rag_embeddings_kb`, `search_rag_text`) operate on tables with RLS that filters by `user_id`. No additional enforcement needed at the function level.

### W12: KB Summary Auto-Generation Must Respect Ownership (NEW in v5)

**Risk:** The KB summary regeneration in `process-rag-document.ts` (finalize step) writes to `rag_knowledge_bases.summary` using admin client.
**Mitigation:** The write is scoped to a specific `knowledgeBaseId` owned by the processing user. The KB was created by and belongs to the same user. GAP-R2 (Change 6.6) adds ownership verification at the start of processing, ensuring only the owner's documents are processed.

### W13: `getDocument()` Gap Affects Multi-Doc Code Paths (NEW in v5)

**Risk:** The `getDocument()` function without userId filtering means any internal call chain that resolves to `getDocument(documentId)` could leak another user's document data.
**Mitigation:** Change 5.17 adds mandatory `userId` to `getDocument()`. Until implemented, the route-level auth and RLS provide defense-in-depth — but the service-level gap remains.

---

## 15. Execution Order

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
       │              ⚑ Checkpoint: T8, T10, T-RAG
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

## 16. Files Summary

### Phase-by-Phase File Count

| Phase | Modified | Created | Effort |
|-------|----------|---------|--------|
| Phase 0 | 0 | 0 | 0.5 day |
| Phase 1 | 1 (supabase-server.ts) | 0 | 0.5 day |
| Phase 2 | 0 (DB only) | 1 migration | 0.5 day |
| Phase 3 | 0 (DB only) | 1 migration | 0.5 day |
| Phase 4 | 22 route files | 0 | 3–4 days |
| Phase 5 | 20 route + service files | 0 | 2–3 days |
| Phase 6 | 9 route + service files | 0 | 1–2 days |
| Phase 7 | 0 (DB only) | 2 migrations | 1 day |
| Phase 8 | ~15 files (cleanup) | 0 | 1–2 days |
| Tests | 0 | 6 test files | 2 days |
| **Total** | **~47 files** | **10 files** | **~13 days** |

### Implementation Priority

| Priority | Phases | Blocks |
|----------|--------|--------|
| **P0 — Must complete before soft launch** | 0, 1, 2, 3, 4, 5 | Soft launch |
| **P1 — Must complete before GA** | 6, 7 | General availability |
| **P2 — Post-launch OK** | 8, Tests | Technical debt |

### Model Routes (Gold Standard — Copy This Pattern)

These routes implement the target pattern correctly:
- `src/app/api/datasets/route.ts` — Exemplary: `requireAuth` + `user.id` scoping + Zod validation
- `src/app/api/conversations/generate-with-scaffolding/route.ts` — Already secure: `requireAuth` + `user.id` stamping (L45)
- `src/app/api/rag/knowledge-bases/route.ts` — Properly scoped with `requireAuth`
- `src/app/api/rag/query/route.ts` — Both POST and GET use `requireAuth`, forward `user.id` to services
- `src/app/api/rag/documents/route.ts` — Both handlers use `requireAuth`

### Supabase Client Quick Reference

| Function | Module | RLS | Use For |
|----------|--------|-----|---------|
| `requireAuth(request)` | `supabase-server.ts` L133 | N/A (auth check) | All API routes — **USE THIS** |
| `requireAuthOrCron(request)` | `supabase-server.ts` (Phase 1) | N/A (auth check) | Cron routes — **NEW** |
| `createServerSupabaseClient()` | `supabase-server.ts` L37 | ✅ Enforced | Server components |
| `createServerSupabaseClientFromRequest(request)` | `supabase-server.ts` L68 | ✅ Enforced | API routes needing Supabase client |
| `createServerSupabaseAdminClient()` | `supabase-server.ts` L14 | ❌ **BYPASSED** | Background jobs ONLY — must manually scope with `.eq('user_id', userId)` |
| `getSupabaseClient()` | `supabase-client.ts` | ✅ Enforced | Client-side React components |
| `supabase` singleton | `supabase.ts` | ⚠️ **DEPRECATED** | **DO NOT USE** — broken server-side |

### RAG Module Identity Status (NEW in v5)

| Component | Auth Status | Notes |
|-----------|-------------|-------|
| **All RAG routes** (`/api/rag/*`) | ✅ Secured | `requireAuth` on all handlers, `user.id` forwarded |
| **All RAG DB tables** | ✅ Secured | `user_id NOT NULL`, RLS enabled, 4 policies each |
| **`queryRAG` service** | ✅ Receives userId | All 4 insert sites write `user_id` |
| **`getQueryHistory` service** | ✅ Filters by userId | `.eq('user_id', params.userId)` |
| **`getKnowledgeBases` service** | ✅ Filters by userId | `.eq('user_id', userId)` |
| **`getDocuments` service** | ✅ Filters by userId | `.eq('user_id', userId)` |
| **`getDocument` service** | ❌ **GAP-R1** | Does NOT filter by userId → **Phase 5 Change 5.17** |
| **`process-rag-document` Inngest** | ❌ **GAP-R2** | Does NOT verify document ownership → **Phase 6 Change 6.6** |
| **KB summary auto-generation** | ⚠️ Indirect | Writes to KB owned by initiating user; mitigated by GAP-R2 fix |
| **Multi-doc functions** (classifyQuery, etc.) | ✅ Indirect | Called within `queryRAG` which receives verified userId |

---

*End of Specification*
