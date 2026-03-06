# Data & Identity Spine — Detailed Implementation Specification v6

**Document:** `02-data-and-identity-spine-detailed-specification_v6.md`
**Date:** 2026-02-22
**Status:** SPECIFICATION — FINAL — READY FOR IMPLEMENTATION
**Prerequisite:** `01-data-and-identity-spine-spec_v1.md` (Investigation & Gap Log)
**Supersedes:** `02-data-and-identity-spine-detailed-specification_v5.md`
**Source:** v5 spec updated against live codebase (git HEAD as of 2026-02-22) incorporating all QA-phase changes to the RAG module (`v2-mods/008-rag-module-QA_v1.md` through `v2-mods/023-*`).
**Scope:** Bright Run LoRA Training Data Platform (v2-modules)
**SAOL Constraint:** All database DDL/DML operations MUST be executed via SAOL (`agentExecuteDDL` with `transport: 'pg'`, `transaction: true`). Always dry-run first (`dryRun: true`), verify output, then execute with `dryRun: false`.

---

## Table of Contents

1. [Summary](#1-summary)
2. [What Changed Since v5 — QA-Phase RAG Delta](#2-what-changed-since-v5--qa-phase-rag-delta)
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

This specification converts the 48 identity spine gaps identified in the v1 investigation (C1–C16 CRITICAL, H1–H15 HIGH, M1–M13 MEDIUM, L1–L5 LOW) into numbered, implementable changes with exact file paths, **live-validated line numbers (as of 2026-02-22)**, code patterns, and GIVEN-WHEN-THEN acceptance criteria.

### v6 Scope Changes from v5

Since v5 was written, the RAG module underwent ~14 iterative QA fix cycles. All changes were **prompt refinements and LoRA inference improvements** — no architectural changes occurred. Specifically:

- **`rag-retrieval-service.ts`** grew from **1440 → 1693 lines** (+253 net). Three new functions were added: `generateLoRAResponse` (L730), `parseCitationsFromText` (L858), and `selfEvaluate` (L879). All downstream function line numbers shifted.
- **`config.ts`** grew from **96 → 103 lines**. New retrieval config keys: `selfEvalThreshold: 0.6` and `loraMaxContextTokens: 29000`.
- **`claude-llm-provider.ts`** is now **1,010 lines** (not measured in v5). The `LLMProvider` interface gained a `mode` parameter on `selfEvaluate`.
- **`llm-provider.ts`** is **182 lines**.
- **`rag-ingestion-service.ts`** dropped from 1054 → **1053 lines**. `getDocument()` moved from L677 → **L627**. GAP-R1 still open.
- **`process-rag-document.ts`** dropped from 614 → **613 lines**. GAP-R2 still open.
- **`rag.ts`** dropped from 647 → **646 lines**.

**New gap identified (LOW):** `generateLoRAResponse` reads `pipeline_inference_endpoints` using admin client via `jobId` without verifying the requesting user owns that job. Addressed in Section 2.3 as GAP-R3.

**Architecture, RLS, and non-RAG route security:** Unchanged from v5. All decisions, patterns, and acceptance criteria from v5 remain valid.

### Gold Standard Reference Pattern

(from `src/app/api/datasets/route.ts`):

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

## 2. What Changed Since v5 — QA-Phase RAG Delta

### 2.1 RAG Table Security Status (Unchanged — Verified v5, Confirmed v6)

All 6 RAG tables remain fully secured. No changes needed.

| Table | `user_id` | RLS Enabled | Policies | Multi-Doc Columns |
|-------|-----------|-------------|----------|--------------------|
| `rag_knowledge_bases` | `NOT NULL` | ✅ | 4 (CRUD) | `summary TEXT NULL` |
| `rag_documents` | `NOT NULL` | ✅ | 4 (CRUD) | `document_type TEXT NULL` |
| `rag_sections` | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_facts` | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_embeddings` | `NOT NULL` | ✅ | 4 (CRUD) | `knowledge_base_id UUID NULL` |
| `rag_queries` | `NOT NULL` | ✅ | 4 (CRUD) | `query_scope TEXT NULL` |

### 2.2 RAG Route Security Status (Unchanged — Already Secured)

All `/api/rag/*` routes use `requireAuth` and forward `user.id` to service functions. **No identity spine changes are needed for RAG routes.**

### 2.3 RAG Service Gaps — Current State (Updated for v6)

| Gap | File | Line (v6) | Description | Severity | Status |
|-----|------|-----------|-------------|----------|--------|
| **GAP-R1** | `rag-ingestion-service.ts` | **L627** (was L677 in v5) | `getDocument(documentId)` does NOT filter by `user_id` — any internal caller knowing a document ID can fetch its data | **HIGH** | Open → Phase 5 Change 5.17 |
| **GAP-R2** | `process-rag-document.ts` | **L55** | Initial document fetch does NOT verify `docRow.user_id === event.data.userId` — a crafted Inngest event could process another user's doc | **MEDIUM** | Open → Phase 6 Change 6.6 |
| **GAP-R3** | `rag-retrieval-service.ts` | **L796** | `generateLoRAResponse()` reads `pipeline_inference_endpoints` with admin client filtered only by `job_id` — no user ownership verification on the endpoint lookup | **LOW** | Open → Phase 6 Change 6.7 (new) |

### 2.4 Updated Function Line Numbers for RAG Retrieval Service (v6)

The QA-phase implementation added 3 new functions to `rag-retrieval-service.ts`. All downstream function positions shifted. The v5 spec line numbers are now stale. Use the following table:

| Function | v5 Line | **v6 Line (actual)** | Notes |
|----------|---------|----------------------|-------|
| `getLLMProvider` | N/A | L31 | Unchanged position |
| `generateHyDE` | N/A | L42 | Unchanged position |
| `retrieveContext` | L65 | **L63** | Batch-fetches; 2 queries instead of ~50 |
| `assembleContext` | L224 | **L240** | Token-budgeted; `## From:` headers |
| `truncateAtSentence` | L418 (v5) | **L418** | Unchanged position |
| `rerankWithClaude` | L412 | **L440** | Adds `[Doc: name]` prefix for KB-wide |
| `rerankSections` | L504 | **L539** | Section reranking wrapper |
| `deduplicateResults` | L527 | **L569** | Applied to both sections and facts |
| `textSimilarity` | N/A | **L591** | Internal helper |
| `balanceMultiDocCoverage` | L569 | **L617** | Applied to both sections and facts |
| `generateResponse` | L602 | **L651** | Accepts `conversationContext` param |
| `generateLoRAResponse` | **NEW** | **L730** | LoRA inference with context truncation |
| `parseCitationsFromText` | **NEW** | **L858** | Best-effort citation parser for LoRA output |
| `selfEvaluate` | **NEW** | **L879** | Response quality self-evaluation |
| `classifyQuery` | L807 | **L924** | Classifies simple/multi-hop/comparative |
| `assembleMultiHopContext` | L855 | **L985** | Structured context for multi-hop queries |
| `enrichCitationsWithDocumentInfo` | L899 | **L1133** | Document provenance on citations |
| `queryRAG` | L993 | **L1162** | Main entry point; accepts `modelJobId` |
| Guard clause | ~L1002 | **~L1175** | Accepts `knowledgeBaseId` alternative (approx.) |
| `getQueryHistory` | L1396 | **L1659** | Scope-aware (doc vs KB) |

### 2.5 New Functions — Identity Analysis

Three new functions were added during QA. None introduce new HIGH/CRITICAL identity gaps:

| Function | Line | DB Access | User-Scoped | Identity Implication |
|----------|------|-----------|-------------|----------------------|
| `generateLoRAResponse` | L730 | `pipeline_inference_endpoints` (admin, by `job_id`) | ❌ No | **GAP-R3** (LOW): endpoint not verified against requesting user. `jobId` comes from caller who must first authenticate. |
| `parseCitationsFromText` | L858 | None | N/A | Pure text parsing — no identity implications |
| `selfEvaluate` | L879 | None (calls LLM provider only) | N/A | Pure computation — no identity implications |

### 2.6 Updated `queryRAG` Insert Sites (v6)

All 4 insert sites confirmed present and carry `user_id` and `query_scope`. Approximate line locations have shifted:

| Insert | **v6 Approx. Line** | Context | `user_id` | `query_scope` |
|--------|---------------------|---------|-----------|---------------|
| 1. LoRA-only | **~L1217** | When mode is `lora_only` | ✅ | ✅ |
| 2. Multi-hop | **~L1409** | After sub-query aggregation | ✅ | ✅ |
| 3. No-context | **~L1467** | Zero results found | ✅ | ✅ |
| 4. Standard | **~L1607** | Normal retrieval flow | ✅ | ✅ |

### 2.7 Updated Config Keys (v6)

`src/lib/rag/config.ts` is now **103 lines** (was 96). New keys added under `retrieval`:

| Key | Value | Scope |
|-----|-------|-------|
| `selfEvalThreshold` | `0.6` | Quality gate for self-evaluation scoring |
| `loraMaxContextTokens` | `29000` | Token budget for LoRA model context window (32K base − overhead) |

No identity implications from config changes.

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
| Phase 2 — DB | migrations only | 0 source |
| Phase 3 — DB | migrations only | 0 source |
| Phase 4 — CRITICAL Routes | `conversations/*` (13), `batch-jobs/*` (3), `pipeline/jobs/*/download` (1), `export/*` (2), `import/*` (3) | 22 |
| Phase 5 — HIGH Routes & Services | `generation-logs/*` (2), `failed-generations/*` (2), `templates/*` (2), `documents/*` (2), `performance` (1), `training-files/*` (2), `export/*` (5), service files (3), **`rag-ingestion-service.ts`** (1) | 20 |
| Phase 6 — MEDIUM | `training-files/route.ts` (1), `conversations/*/download/*` (2), cron routes (5), **`process-rag-document.ts`** (1), **`rag-retrieval-service.ts`** (1) | 10 |
| Phase 8 — Cleanup | Client hooks, module-scope singletons (~10 files) | ~10 |

### 3.3 Database Tables Affected

**Current state verified via SAOL (2026-02-21, unchanged as of 2026-02-22):**

| Table | Current Ownership Column | `user_id` | RLS | Policies |
|-------|-------------------------|-----------|-----|----------|
| `conversations` (89 cols) | `created_by UUID NULL` | ❌ **MISSING** | ✅ | 8 (some duplicated) |
| `training_files` (20 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ✅ | 3 |
| `batch_jobs` (31 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ✅ | 2 |
| `generation_logs` (20 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ✅ | 2 |
| `failed_generations` (26 cols) | `created_by UUID NOT NULL` | ❌ **MISSING** | ✅ | 5 |
| `documents` (21 cols) | `author_id UUID NULL` | ❌ **MISSING** | ❌ **NO RLS** | 0 |
| `datasets` (22 cols) | `user_id UUID NOT NULL` | ✅ | ✅ | 3 |
| `pipeline_training_jobs` (42 cols) | `user_id UUID NOT NULL` | ✅ | ✅ | 4 |
| `notifications` (10 cols) | `user_id UUID NOT NULL` | ✅ | ❌ **NO RLS** | 0 |
| `cost_records` (8 cols) | `user_id UUID NOT NULL` | ✅ | ❌ **NO RLS** | 0 |
| `metrics_points` (11 cols) | None | ❌ **NO OWNERSHIP** | ❌ **NO RLS** | 0 |
| `export_logs` (25 cols) | `user_id UUID NOT NULL` | ✅ | ✅ | 3 |

**RAG tables — NO CHANGES NEEDED (already secured):**

All 6 RAG tables have `user_id NOT NULL`, RLS enabled, 4 policies each. See Section 2.1.

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
| `documents` | Enable RLS + `COALESCE(user_id, author_id) = auth.uid()` for CRUD; service_role for ALL |
| `notifications` | `user_id = auth.uid()` for SELECT/UPDATE/DELETE; service_role for ALL |
| `cost_records` | `user_id = auth.uid()` for SELECT; service_role for ALL |
| `metrics_points` | JOIN to `pipeline_training_jobs.user_id = auth.uid()` for SELECT; service_role for ALL |

**Special table:**
| Table | Purpose |
|-------|---------|
| `_orphaned_records` | Quarantine table. Existing table shows 0 columns in SAOL introspection — must be dropped and recreated in Phase 3. |

### 3.4 Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking client-side fetch calls that lack auth cookies | HIGH | Verify all `fetch()` calls use `credentials: 'include'` (Supabase SSR handles this) |
| Orphaned records fail NOT NULL constraint | HIGH | Phase 3 backfill + quarantine MUST complete before Phase 7 constraints |
| Batch job processing breaks mid-generation | MEDIUM | Use `job.createdBy` from DB record (not live session) for pipeline userId |
| `batch-job-service.ts` method signature changes break callers | MEDIUM | Deploy all route changes + service changes atomically |
| Large table index creation causes lock contention | LOW | Use `CREATE INDEX CONCURRENTLY` (cannot be in transaction — run standalone) |
| Phase 7 deployed before Phase 3 verified → table lock failure | CRITICAL | Strict phase ordering enforced. Verify zero orphans before constraints. |
| `generateLoRAResponse` uses `modelJobId` without ownership check | LOW | GAP-R3: user selects `modelJobId` from their own deployed models in UI; service layer lacks belt-and-suspenders. Addressed Change 6.7. |
| `getDocument()` service gap (GAP-R1) | HIGH | Change 5.17 adds mandatory `userId` parameter |
| `process-rag-document.ts` Inngest gap (GAP-R2) | MEDIUM | Change 6.6 adds ownership verification |

---

## 4. Phase 0 — Preflight Verification

### Change 0.1: Verify `requireAuth` Function Signature

**File:** `src/lib/supabase-server.ts` (163 lines)
**Action:** READ-ONLY — no changes needed.

Verify `requireAuth(request: NextRequest)` returns `{ user: User | null, response: NextResponse | null }`. Confirmed at line 133.

**GIVEN** `requireAuth` is called with valid auth cookies **THEN** returns `{ user: <User object with .id UUID>, response: null }`
**GIVEN** `requireAuth` is called with no or expired cookies **THEN** returns `{ user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }`

### Change 0.2: Verify SAOL Availability

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');console.log('SAOL exports:', Object.keys(s).filter(k=>k.startsWith('agent')))"
```
Expected: `agentQuery`, `agentCount`, `agentExecuteDDL`, `agentIntrospectSchema`, etc.

### Change 0.3: Verify `generate-with-scaffolding` Is Already Secure

**File:** `src/app/api/conversations/generate-with-scaffolding/route.ts`
**Action:** READ-ONLY — Already uses `requireAuth` (line 45). This route is excluded from Phase 4.

### Change 0.4: Verify RAG Route Security

**Action:** READ-ONLY — Confirm all `/api/rag/*` routes use `requireAuth`.
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && grep -rn "requireAuth" app/api/rag/ --include="*.ts" | wc -l
```
**Expected:** ≥30 occurrences. **Verified 2026-02-21:** 37 occurrences confirmed.

### Change 0.5: Verify `requireAuthOrCron` Does NOT Exist Yet

**File:** `src/lib/supabase-server.ts`
**Action:** READ-ONLY — Confirm `requireAuthOrCron` is NOT yet defined. Phase 1 will add it.
**Verified 2026-02-21:** Not present.

### Change 0.6: Verify RAG Retrieval Service Function Positions (NEW in v6)

**Action:** READ-ONLY — Confirm current function line numbers match v6 table in Section 2.4.
```bash
grep -n "^export async function\|^export function\|^async function\|^function " \
  src/lib/rag/services/rag-retrieval-service.ts
```
**Expected key positions (v6):** `generateLoRAResponse` at L730, `selfEvaluate` at L879, `queryRAG` at L1162, `getQueryHistory` at L1659.

---

## 5. Phase 1 — Auth Infrastructure

### Change 1.1: Add `requireAuthOrCron` Helper

**File:** `src/lib/supabase-server.ts` (163 lines)
**Action:** MODIFY — Add new exported function after `requireAuth` (after line 156)
**Gap ref:** M6 (cron fail-closed pattern)

**Why:** All 5 cron routes currently fail-open when `CRON_SECRET` is not configured. This helper centralizes the fail-closed pattern.

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

**GIVEN** a request with valid `Bearer {CRON_SECRET}` **AND** `CRON_SECRET` is set **THEN** returns `{ isCron: true, user: null, response: null }`
**GIVEN** an invalid Bearer token **AND** `CRON_SECRET` is set **THEN** returns 401
**GIVEN** any Bearer token **AND** `CRON_SECRET` is NOT set **THEN** returns 500
**GIVEN** no Bearer header but valid auth cookies **THEN** falls through to `requireAuth`

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

**SAOL execution one-liner:**
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

**GIVEN** the migration is executed a second time **THEN** no errors (idempotent via `IF NOT EXISTS`)

---

## 7. Phase 3 — Data Backfill & Orphan Quarantine

### Change 3.1: Backfill `user_id` from Existing Ownership Columns

**File:** `src/scripts/migrations/identity-spine-phase3-backfill.ts` (CREATE)

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

> **Note:** The `_orphaned_records` table exists in the DB but shows 0 columns in SAOL introspection (empty shell). Drop and recreate.

```sql
-- Drop existing empty shell
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
Expected: orphans = 0 for all tables.

**GIVEN** `conversations` rows have `created_by` set but `user_id IS NULL`
**WHEN** the backfill runs
**THEN** `user_id = created_by` for all such rows

**GIVEN** orphaned records exist (both `created_by IS NULL AND user_id IS NULL`)
**WHEN** the backfill runs
**THEN** they are logged in `_orphaned_records` for manual resolution

---

## 8. Phase 4 — CRITICAL Route Fixes (C1–C16)

Every change in this phase follows the same pattern:
1. Add `import { requireAuth } from '@/lib/supabase-server';` at top
2. Add auth guard: `const { user, response } = await requireAuth(request); if (response) return response;`
3. Replace any `x-user-id` header reads or body `userId` with `user.id`
4. Add ownership scoping to queries (`.eq('created_by', user.id)` or ownership check post-fetch)
5. Remove NIL UUID and `'test-user'` / `'test_user'` fallbacks

**Remaining spoofable patterns (verified 2026-02-21, confirmed unchanged 2026-02-22):**

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

**Current state:** GET L31: `x-user-id` header — spoofable. POST L66: `x-user-id || 'test-user'` — spoofable hardcoded fallback.

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`

2. **Both GET and POST handlers** — Replace spoofable auth:
   ```typescript
   // REMOVE: const userId = request.headers.get('x-user-id') || undefined;
   // REMOVE: const userId = request.headers.get('x-user-id') || 'test-user';
   const { user, response } = await requireAuth(request);
   if (response) return response;
   const userId = user.id;
   ```

3. Ensure `created_by: userId` is passed to the service listing filter on GET.

**GIVEN** a GET without auth cookies **THEN** 401
**GIVEN** a GET with valid auth for User A **THEN** only conversations where `created_by = user.id`
**GIVEN** a request with `x-user-id` header AND valid auth cookie **THEN** header is IGNORED

---

### Change 4.2: `src/app/api/conversations/[id]/route.ts` — Add Auth + Ownership (C2)

**Current state:** ZERO auth on GET, PATCH, DELETE.

**Modifications:**

1. Add import: `import { requireAuth } from '@/lib/supabase-server';`
2. Add auth guard to all handlers.
3. After fetching by ID, add ownership check:
   ```typescript
   if (!conversation || conversation.created_by !== user.id) {
     return NextResponse.json({ error: 'Not found' }, { status: 404 });
   }
   ```

**GIVEN** User A requests GET/PATCH/DELETE for User B's conversation **THEN** 404 (do not reveal existence)
**GIVEN** unauthenticated **THEN** 401

---

### Change 4.3: `src/app/api/conversations/[id]/status/route.ts` — Replace Spoofable Auth (C3)

**Current state:** PATCH L31: `x-user-id || 'test-user'`.

**Modifications:**
1. Add `requireAuth` import.
2. Add auth guard + ownership check on both GET and PATCH.
3. Replace `x-user-id` with `user.id`.

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

**GIVEN** User A sends bulk-action with mix of owned and non-owned IDs **THEN** only owned conversations affected; skipped count returned

---

### Change 4.5: `src/app/api/conversations/bulk-enrich/route.ts` — Add Auth + Ownership (C5)

**Current state:** ZERO auth. NIL UUID at L113.

**Modifications:**
1. Add `requireAuth` guard.
2. Per-conversation ownership check in loop:
   ```typescript
   if (conversation.created_by !== user.id) {
     results.push({ conversationId, status: 'skipped', error: 'Not owned' });
     continue;
   }
   ```

---

### Change 4.6: `src/app/api/conversations/generate/route.ts` — Add Auth, Remove Body userId (C6)

**Current state:** ZERO auth. NIL UUID fallback at L31.

**Modifications:**
1. Add `requireAuth` guard.
2. Replace NIL UUID with `user.id`.
3. Mark body `userId` as ignored: `userId: z.string().optional(), // DEPRECATED`

---

### Change 4.7: `src/app/api/conversations/generate-batch/route.ts` — Add Auth, Remove Body userId (C7)

**Current state:** ZERO auth. NIL UUID at L38.

**Modifications:** Identical to Change 4.6.

---

### Change 4.8: `src/app/api/batch-jobs/route.ts` — Add Auth + Mandatory User Scoping (C8)

**Current state:** ZERO auth. Optional `createdBy` filter from query string.

**Modifications:**
1. Add `requireAuth` guard.
2. FORCE user scoping — override any `createdBy` query param:
   ```typescript
   const filters: { status?: typeof status; createdBy: string } = { createdBy: user.id };
   if (status) filters.status = status;
   ```

**GIVEN** User A requests `GET /api/batch-jobs?createdBy=<User B UUID>` **THEN** param OVERRIDDEN with `user.id`

---

### Change 4.9: `src/app/api/batch-jobs/[id]/cancel/route.ts` — Add Auth + Ownership (C9)

**Current state:** ZERO auth. Anyone can cancel any job.

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

**Current state:** ZERO auth. NIL UUID at L299.

**Modifications:**
1. Add `requireAuth` guard.
2. Add ownership check after job fetch.
3. Replace NIL UUID with `user.id`.

---

### Change 4.11: `src/app/api/pipeline/jobs/[jobId]/download/route.ts` — Add Auth + Job Ownership (C11)

**Current state:** ZERO auth. **IP THEFT RISK** — anyone can download trained LoRA adapters.

**Modifications:**
1. Add `requireAuth` guard.
2. After fetching job:
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

**Current state:** L54: `x-user-id` + NIL UUID. Ownership check exists but spoofable.

**Modifications:** Replace L54 with `requireAuth`.

---

### Change 4.14: `src/app/api/import/templates/route.ts` — Add Auth (C14)

**Current state:** ZERO auth.

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
| `conversations/[id]/turns/route.ts` | GET, POST | **NONE** | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/link-chunk/route.ts` | POST | **NONE** | `requireAuth` + verify parent conversation ownership |
| `conversations/[id]/unlink-chunk/route.ts` | POST | **NONE** | `requireAuth` + verify parent conversation ownership |
| `conversations/orphaned/route.ts` | GET | **NONE** | `requireAuth`; scope to user's orphaned conversations |
| `conversations/stats/route.ts` | GET | **NONE** | `requireAuth`; scope stats to `created_by = user.id` |
| `conversations/[id]/enrich/route.ts` | POST | NIL UUID at L57 | `requireAuth`; replace NIL UUID with `user.id` |

**Note:** `conversations/generate-with-scaffolding/route.ts` is EXCLUDED — already uses `requireAuth` at L45.

**Pattern for `[id]` sub-routes:**
```typescript
import { requireAuth } from '@/lib/supabase-server';

const { user, response } = await requireAuth(request);
if (response) return response;

const conversation = await service.getConversation(params.id);
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

## 9. Phase 5 — HIGH Route & Service Fixes (H1–H15)

---

### Change 5.1: `src/app/api/generation-logs/route.ts` — Add Auth + User Scoping (H6)

**Current state:** GET: ZERO auth. POST L103: `x-user-id` + NIL UUID.

**Modifications:**
1. Add `requireAuth` guard.
2. Replace `x-user-id` with `user.id`.
3. Scope GET queries to `created_by = user.id`.

---

### Change 5.2: `src/app/api/generation-logs/stats/route.ts` — Add Auth + User Scoping (H6)

**Current state:** ZERO auth. Returns global stats.

**Modifications:** Add `requireAuth`. Scope stats to user.

---

### Change 5.3: `src/app/api/failed-generations/route.ts` — Add Auth + User Scoping (H7)

**Current state:** ZERO auth.

**Modifications:** Add `requireAuth`. Add `.eq('created_by', user.id)`.

---

### Change 5.4: `src/app/api/failed-generations/[id]/route.ts` — Add Auth + Ownership (H7)

**Current state:** ZERO auth.

**Modifications:** Add `requireAuth` + ownership check post-fetch.

---

### Change 5.5: `src/app/api/templates/route.ts` — Add Auth to GET (H4)

**Current state:** GET: ZERO auth.

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
1. Add `requireAuth`.
2. Replace `'test_user'` with `user.id`.

---

### Change 5.7: `src/app/api/documents/route.ts` — Replace Module-Scope Singleton + Add Auth (H10)

**Current state:** Module-scope `createClient()` singleton. No user scoping. GET: ZERO auth.

**Modifications:**
1. Remove module-level singleton.
2. Add `requireAuth` + scope using `author_id` (until Phase 7 backfills `user_id`):
   ```typescript
   const { data } = await supabase
     .from('documents')
     .select('*')
     .eq('author_id', user.id)
     .order('created_at', { ascending: false });
   ```
3. POST: Use `requireAuth` (replace Bearer token auth).

---

### Change 5.8: `src/app/api/documents/[id]/route.ts` — Normalize Auth Pattern (H11)

**Current state:** Bearer token auth. Module-scope admin singleton. Ownership check returns 403.

**Modifications:**
1. Remove module-scope singleton.
2. Replace Bearer auth with `requireAuth`.
3. Change ownership failure from 403 to 404.

---

### Change 5.9: `src/app/api/performance/route.ts` — Add Auth (H8)

**Current state:** ZERO auth.

**Modifications:** Add `requireAuth` guard.

---

### Change 5.10: `src/app/api/training-files/[id]/download/route.ts` — Add Ownership Check (H9)

**Current state:** Auth present via `getUser()`. NO ownership check.

**Modifications:**
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

**Modifications:** Replace `x-user-id` with `requireAuth`. Add `requireAuth` to zero-auth routes.

---

### Change 5.16: `src/lib/services/batch-job-service.ts` — Mandatory `userId` Parameter (H1)

**Current state (verified 2026-02-21, 606 lines):**
- `getAllJobs(filters?: { status?; createdBy? })` — `createdBy` optional
- `getJobById(id: string)` — NO userId
- `cancelJob(id: string)` — NO userId
- `deleteJob(id: string)` — NO userId
- `getActiveJobs(userId: string)` — ALREADY correct

**Modifications:**

1. **`getAllJobs`** — Make `userId` mandatory:
   ```typescript
   async getAllJobs(userId: string, filters?: { status?: BatchJobStatus }): Promise<BatchJob[]> {
     let query = supabase.from('batch_jobs').select('*').eq('created_by', userId);
     if (filters?.status) query = query.eq('status', filters.status);
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

5. Update ALL callers from Phase 4 routes.

---

### Change 5.17: `src/lib/rag/services/rag-ingestion-service.ts` — Add `userId` to `getDocument()` (H2, GAP-R1) — UPDATED IN v6

**Current state (verified 2026-02-22, 1053 lines):**
- `getDocument(documentId: string)` at **line 627** does NOT filter by `user_id`
- Returns `{ success: boolean; data?: RAGDocument; error?: string }`
- `getDocuments({ knowledgeBaseId, userId })` at **L598** correctly filters both `knowledge_base_id` AND `user_id`

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

**⚠️ Multi-doc impact:** All internal code paths that call `getDocument()` must pass the owning `userId`. In the Inngest pipeline, this is `event.data.userId`. In RAG route handlers, this is `user.id` from `requireAuth`.

**GIVEN** `getDocument(docId, userAId)` called with User B's document **THEN** `{ success: false, error: 'Document not found' }`
**GIVEN** missing `userId` argument **THEN** TypeScript compilation error

---

### Change 5.18: `src/lib/services/conversation-service.ts` — Migrate from Deprecated Singleton (H3)

**Current state (verified 2026-02-21, 591 lines):**
- L11: `import { supabase } from '../supabase';` — **deprecated singleton** (null on server side)

**Modifications:**

Accept injected client:
```typescript
export class ConversationService {
  private supabase: SupabaseClient;
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }
  // ... all methods use this.supabase
}
```

Update callers to pass the request-scoped client.

---

### Change 5.19: Add RLS to `notifications` and `cost_records` (H13, H14)

**Current state (verified 2026-02-21):**
- `notifications`: `user_id NOT NULL`, RLS **disabled**, 0 policies
- `cost_records`: `user_id NOT NULL`, RLS **disabled**, 0 policies

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

**Current state:** NO `user_id` column, NO RLS, 0 policies.

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

**Modifications:** Add `.eq('created_by', user.id)` to training files listing query.

---

### Change 6.2: `src/app/api/conversations/[id]/download/raw/route.ts` — Add Ownership Check (M12)

**Current state:** Auth present via `requireAuth` (L59). NO ownership check.

**Modifications:**
```typescript
if (!conversation || conversation.created_by !== user.id) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

### Change 6.3: `src/app/api/conversations/[id]/download/enriched/route.ts` — Add Ownership Check (M13)

**Modifications:** Identical to Change 6.2.

---

### Change 6.4: `src/app/api/conversations/batch/[id]/status/route.ts` — Add Auth + Ownership (M5)

**Modifications:** Add `requireAuth` + verify batch job belongs to user.

---

### Change 6.5: Cron Routes — Fail Closed with `requireAuthOrCron` (M6)

**Files:** 5 routes. All currently fail-open when `CRON_SECRET` is not configured.

| File | Current Pattern |
|------|----------------|
| `cron/daily-maintenance/route.ts` | `if (cronSecret && authHeader !== Bearer)` (L25) |
| `cron/export-file-cleanup/route.ts` | Warns and skips auth when missing (L40–41) |
| `cron/export-log-cleanup/route.ts` | Same |
| `cron/export-metrics-aggregate/route.ts` | Same |
| `cron/hourly-monitoring/route.ts` | Same as daily-maintenance |

**Modifications:** In each cron route:
```typescript
import { requireAuthOrCron } from '@/lib/supabase-server';

const { isCron, response } = await requireAuthOrCron(request);
if (response) return response;
```

**GIVEN** `CRON_SECRET` is NOT set **WHEN** request hits cron endpoint **THEN** 500 returned (not 200)

---

### Change 6.6: `src/inngest/functions/process-rag-document.ts` — Verify Document Ownership (M8, GAP-R2)

**Current state (verified 2026-02-22, 613 lines):**
- Trusts `userId` from event payload without verification (~L55)
- Uses `createServerSupabaseAdminClient()`
- Fetches document by `documentId` only — no `user_id` check

**Modifications:** After extracting `{ documentId, userId }` from event payload and after `supabase` is created:

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

**Why critical post-QA-phase:** The QA phase expanded the pipeline to ~613 lines covering 6 extraction passes, embedding generation, KB summary regeneration, and `knowledge_base_id` denormalization. A crafted event with a stolen `documentId` would contaminate sections, facts, embeddings, and the KB summary across 5 tables.

**GIVEN** event has `userId: A` but document belongs to User B **THEN** processing aborted immediately; no data written

---

### Change 6.7: `src/lib/rag/services/rag-retrieval-service.ts` — LoRA Endpoint Ownership Verification (L3, GAP-R3) — NEW in v6

**Current state (1693 lines, function `generateLoRAResponse` at L730):**

At **~L796**, endpoint lookup:
```typescript
const { data: endpoint } = await supabase
  .from('pipeline_inference_endpoints')
  .select('runpod_endpoint_id, adapter_path')
  .eq('job_id', jobId)
  .eq('endpoint_type', 'adapted')
  .eq('status', 'ready')
  .single();
```

**Gap:** No verification that the `pipeline_training_jobs` record for this endpoint belongs to the requesting user. A user who discovers another user's `jobId` could route inference through their LoRA model.

**Severity:** LOW — `jobId` is only surfaced to the user via the frontend which lists their own deployed jobs. The attack vector requires knowing another user's `jobId` UUID.

**Modifications:** Add user ownership join to the endpoint query:

```typescript
const { data: endpoint } = await supabase
  .from('pipeline_inference_endpoints')
  .select(`
    runpod_endpoint_id,
    adapter_path,
    pipeline_training_jobs!inner ( user_id )
  `)
  .eq('job_id', jobId)
  .eq('endpoint_type', 'adapted')
  .eq('status', 'ready')
  .eq('pipeline_training_jobs.user_id', userId) // ← ADDED
  .single();
```

This requires threading `userId` through to `generateLoRAResponse`. Update signature:

```typescript
async function generateLoRAResponse(params: {
  queryText: string;
  assembledContext: string | null;
  mode: RAGQueryMode;
  jobId: string;
  userId: string; // ← ADDED
}): Promise<...>
```

And update the call site in `queryRAG` to pass `userId: params.userId`.

**GIVEN** User A calls `queryRAG` with `modelJobId` owned by User B **THEN** endpoint lookup returns null → graceful error message returned

---

### Change 6.8: `src/lib/services/training-file-service.ts` — Mandatory `userId` Parameter (M7)

**Modifications:** Add mandatory `userId` parameter to `listTrainingFiles()` and other query methods.

---

## 11. Phase 7 — Database Constraints & RLS

**Prerequisites:** Phase 3 backfill complete AND Phase 4–6 code changes deployed AND `_orphaned_records` resolved.

### Change 7.1: Add NOT NULL Constraints

**File:** `src/scripts/migrations/identity-spine-phase7-constraints.ts` (CREATE)

```sql
-- Pre-check: verify zero orphans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM conversations WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'conversations has NULL user_id — resolve before constraint';
  END IF;
  IF EXISTS (SELECT 1 FROM training_files WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'training_files has NULL user_id';
  END IF;
  IF EXISTS (SELECT 1 FROM batch_jobs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'batch_jobs has NULL user_id';
  END IF;
  IF EXISTS (SELECT 1 FROM generation_logs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'generation_logs has NULL user_id';
  END IF;
  IF EXISTS (SELECT 1 FROM documents WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'documents has NULL user_id';
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

**IMPORTANT:** `CREATE INDEX CONCURRENTLY` cannot be inside a transaction. Run as standalone SAOL calls with `transaction: false`.

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

**Current state:** RLS **disabled**, 0 policies — the **only** production table without RLS.

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

> `COALESCE(user_id, author_id)` handles transition period before all rows have `user_id`.

### Change 7.4: RLS for `notifications`, `cost_records`, `metrics_points`

See Changes 5.19 and 5.20. Can deploy alongside Phase 5 or defer to Phase 7.

---

## 12. Phase 8 — Cleanup & Deprecated Code Removal

### Change 8.1: Remove All `x-user-id` Header Reads

After Phases 4–5 complete, verify zero remain:
```bash
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
# Expected: ZERO results
```

### Change 8.2: Remove All NIL UUID and Test-User Fallbacks

**After Phases 4–5:** Verify:
```bash
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts"
# Expected: ZERO results both
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

**Replace with:** `createServerSupabaseAdminClient()` or `createServerSupabaseClientFromRequest(request)` **inside** handler functions.

Verify after:
```bash
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"
# Expected: ZERO results
```

### Change 8.4: Deprecate `src/lib/supabase.ts` Singleton

Add deprecation notice. Remove imports from service files.

### Change 8.5: Clean Up Duplicate Conversation RLS Policies

**Current state:** `conversations` has 8 RLS policies with duplicates:
- "Users can create own conversations" ← KEEP
- "Users can delete own conversations" ← KEEP
- "Users can delete their own conversations" ← **DROP** (duplicate)
- "Users can insert their own conversations" ← **DROP** (duplicate of create)
- "Users can update own conversations" ← KEEP
- "Users can update their own conversations" ← **DROP** (duplicate)
- "Users can view own conversations" ← KEEP
- "Users can view their own conversations" ← **DROP** (duplicate)

```sql
-- Verify exact policy names before executing
SELECT policyname FROM pg_policies WHERE tablename = 'conversations';

-- Drop duplicates (confirm names match output above first)
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
```

---

## 13. Testing Checkpoints

### Checkpoint After Phase 3

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

**Test T5 — Unauthenticated Rejection** (all return 401):

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
2. User B tries PATCH/DELETE
3. Verify 404, conversation unchanged

### Checkpoint After Phase 5

**Test T8 — Service Layer Scoping:**
- `batchJobService.getAllJobs(userA.id)` returns only User A's jobs
- `getDocument(docId, userA.id)` returns `{ success: false }` when doc belongs to User B

**Test T10 — RLS Verification:**
- User A queries `notifications` via RLS client → only own notifications
- User A queries `cost_records` → only own cost records

**Test T-RAG — RAG Service Identity (Updated for v6):**
- `getDocument(docId, wrongUserId)` returns `{ success: false, error: 'Document not found' }`
- `getDocuments({ knowledgeBaseId, userId: wrongUserId })` returns empty array
- `queryRAG({ documentId: B-doc, userId: A })` — document fetch returns null → 404 at route level
- KB-wide query only returns results from user's own KBs (via RLS on `rag_knowledge_bases`)
- `queryRAG({ modelJobId: B-job, userId: A, mode: 'rag_and_lora' })` — endpoint lookup returns null after Change 6.7 → graceful error message

### Checkpoint After Phase 7

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const r1=await saol.agentExecuteDDL({sql:\`
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name IN ('conversations','training_files','batch_jobs','generation_logs','documents')
AND column_name = 'user_id';\`,transport:'pg'});
  console.log('NOT NULL checks:',JSON.stringify(r1.rows));

  const r2=await saol.agentExecuteDDL({sql:\`
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('documents','notifications','cost_records','metrics_points');\`,transport:'pg'});
  console.log('RLS enabled:',JSON.stringify(r2.rows));

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

# No NIL UUID fallbacks remain
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"

# No test-user fallbacks remain
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts"

# No module-scope createClient singletons remain
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"

# TypeScript compilation clean
npx tsc --noEmit
# All expected: ZERO results / ZERO errors
```

---

## 14. Warnings & Risks

### W1: Client-Side Fetch Credentials

**Risk:** Frontend `fetch()` calls without auth cookies get 401s after Phase 4.
**Mitigation:** Supabase SSR handles cookie forwarding automatically. Verify custom `fetch()` calls use `credentials: 'include'`.

### W2: Batch Job Processing Polling Loop

**Risk:** `batch-jobs/[id]/process-next` is called in a polling loop; adding `requireAuth` requires auth cookies on every poll.
**Mitigation:** Use `job.createdBy` from DB record for the generation `userId`:
```typescript
const pipelineUserId = job.createdBy; // Stored at job creation time
```

### W3: Migration Ordering Is Critical

**Risk:** Phase 4 deployed before Phase 2 → writes to `user_id` column that doesn't exist.
**Mitigation:** Phase 2 + Phase 3 MUST complete before Phase 4. Phase 7 MUST wait for Phase 3–6 AND orphans resolved.

### W4: `batch-job-service.ts` Method Signature Breaking Change

**Risk:** Changing method signatures is breaking — every caller fails.
**Mitigation:** Deploy atomically with Phase 4 route changes.

### W5: Large Table Index Creation Lock Contention

**Mitigation:** `CREATE INDEX CONCURRENTLY` outside a transaction, `transaction: false`.

### W6: Shared Resources (Templates, Scenarios, Edge Cases)

**Risk:** Adding auth to GET endpoints may break unauthenticated tooling.
**Mitigation:** Intentional. All consumers must authenticate.

### W7: Export Download Regeneration Gap

**Risk:** `export/download/[id]` regeneration helper queries conversations without user scope.
**Mitigation:** Add `.eq('created_by', userId)` to the regeneration query (included in Change 4.13).

### W8: DO NOT Deploy Phase 7 Before Phase 3 Verification

NULL rows + NOT NULL constraint = table lock failure during migration.

### W9: DO NOT Remove `created_by` Columns

`created_by` is the **audit actor field**. `user_id` is the **canonical ownership field**. Both coexist after migration.

### W10: DO NOT Change Supabase Auth Infrastructure

Existing auth infrastructure is correct. Only route-level enforcement changes.

### W11: Multi-Document Retrieval Functions Are Identity-Aware (Unchanged from v5)

`classifyQuery`, `assembleMultiHopContext`, `enrichCitationsWithDocumentInfo`, `rerankSections`, `balanceMultiDocCoverage` — all called within `queryRAG` which receives verified `userId`. No additional enforcement needed at function level. RLS on underlying tables provides defense-in-depth.

### W12: KB Summary Auto-Generation Respects Ownership (Unchanged from v5)

KBs summary regeneration in `process-rag-document.ts` writes to `rag_knowledge_bases` via admin client, scoped to a specific `knowledgeBaseId`. GAP-R2 fix (Change 6.6) adds ownership verification at pipeline start before any writes occur.

### W13: `getDocument()` Gap Affects Multi-Doc Code Paths (Updated for v6)

**Gap location moved from L677 (v5) to L627 (v6).** Until Change 5.17 is deployed, any internal call to `getDocument(documentId)` without the `userId` parameter can access cross-user documents at the service layer, despite route-level and RLS protections providing defense-in-depth.

### W14: `generateLoRAResponse` Endpoint Lookup (NEW in v6)

**Severity:** LOW. The `generateLoRAResponse` function at L730 does not verify the `pipeline_inference_endpoints.job_id` belongs to the requesting user. The frontend only exposes the user's own deployed jobs, so exploitation requires knowledge of another user's `jobId` UUID. Change 6.7 adds the ownership join.

### W15: New Functions Are Stateless — No Identity Gaps (NEW in v6)

`parseCitationsFromText` (L858) and `selfEvaluate` (L879) added during QA phase access no database and have no identity implications. They are pure computation functions.

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
Phase 6 (MEDIUM: M1–M13 + GAP-R3) ─────────────────── 1–2 days
       │              ⚑ Checkpoint: cron fail-closed, Inngest ownership, LoRA endpoint
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

### Current RAG File Sizes (Updated for v6)

| File | v4 Lines | v5 Lines | **v6 Lines (actual)** | Status |
|------|----------|----------|-----------------------|--------|
| `src/lib/rag/services/rag-retrieval-service.ts` | 980 | 1440 | **1693** | +253 net (3 new functions) |
| `src/lib/rag/services/rag-ingestion-service.ts` | — | 1054 | **1053** | Essentially unchanged |
| `src/lib/rag/services/rag-embedding-service.ts` | 257 | 309 | **309** | Unchanged |
| `src/lib/rag/services/rag-db-mappers.ts` | 189 | 200 | **~200** | Unchanged |
| `src/lib/rag/providers/claude-llm-provider.ts` | — | — | **1010** | Not measured in v5 |
| `src/lib/rag/providers/llm-provider.ts` | — | — | **182** | Not measured in v5 |
| `src/lib/rag/config.ts` | 93 | 96 | **103** | +7 (selfEvalThreshold, loraMaxContextTokens) |
| `src/types/rag.ts` | 641 | 647 | **646** | Essentially unchanged |
| `src/inngest/functions/process-rag-document.ts` | 586 | 614 | **613** | Essentially unchanged |
| `src/lib/supabase-server.ts` | — | 163 | **163** | Unchanged |
| `src/lib/services/batch-job-service.ts` | — | 606 | **606** | Unchanged |
| `src/lib/services/conversation-service.ts` | — | 591 | **591** | Unchanged |

### Implementation Priority

| Priority | Phases | Blocks |
|----------|--------|--------|
| **P0 — Must complete before soft launch** | 0, 1, 2, 3, 4, 5 | Soft launch |
| **P1 — Must complete before GA** | 6, 7 | GA |
| **P2 — Post-launch OK** | 8, Tests | Technical debt |

### Model Routes (Gold Standard)

These routes implement the target pattern correctly and should be used as reference:
- `src/app/api/datasets/route.ts` — Exemplary: `requireAuth` + `user.id` scoping + Zod validation
- `src/app/api/conversations/generate-with-scaffolding/route.ts` — `requireAuth` at L45
- `src/app/api/rag/knowledge-bases/route.ts` — `requireAuth` + user scoping
- `src/app/api/rag/query/route.ts` — Both POST and GET use `requireAuth`, forward `user.id`
- `src/app/api/rag/documents/route.ts` — Both handlers use `requireAuth`

### Supabase Client Quick Reference

| Function | Module | RLS | Use For |
|----------|--------|-----|---------|
| `requireAuth(request)` | `supabase-server.ts` L133 | N/A | All API routes — **USE THIS** |
| `requireAuthOrCron(request)` | `supabase-server.ts` (Phase 1) | N/A | Cron routes — **ADD IN PHASE 1** |
| `createServerSupabaseClient()` | `supabase-server.ts` L37 | ✅ | Server components |
| `createServerSupabaseClientFromRequest(request)` | `supabase-server.ts` L68 | ✅ | API routes needing Supabase client |
| `createServerSupabaseAdminClient()` | `supabase-server.ts` L14 | ❌ **BYPASSED** | Background jobs ONLY — must manually scope `.eq('user_id', userId)` |
| `getSupabaseClient()` | `supabase-client.ts` | ✅ | Client-side React components |
| `supabase` singleton | `supabase.ts` | ⚠️ **DEPRECATED** | **DO NOT USE** — broken server-side |

### RAG Module Identity Status (Updated for v6)

| Component | Line (v6) | Auth Status | Notes |
|-----------|-----------|-------------|-------|
| **All RAG routes** (`/api/rag/*`) | — | ✅ Secured | `requireAuth` on all handlers; `user.id` forwarded |
| **All 6 RAG DB tables** | — | ✅ Secured | `user_id NOT NULL`, RLS enabled, 4 policies each |
| **`queryRAG`** | L1162 | ✅ Receives `userId` | All 4 insert sites (~L1217, ~L1409, ~L1467, ~L1607) write `user_id` |
| **`getQueryHistory`** | L1659 | ✅ Filters by `userId` | `.eq('user_id', params.userId)` |
| **`getKnowledgeBases`** | ingestion-svc | ✅ Filters by `userId` | `.eq('user_id', userId)` |
| **`getDocuments`** | L598 | ✅ Filters by `userId` | `.eq('user_id', userId)` |
| **`getDocument`** | **L627** | ❌ **GAP-R1** | Does NOT filter by `userId` → Phase 5 Change 5.17 |
| **`generateLoRAResponse`** | **L730** | ❌ **GAP-R3** (LOW) | Endpoint lookup no user ownership check → Phase 6 Change 6.7 |
| **`parseCitationsFromText`** | **L858** | ✅ N/A | Pure text parsing — no DB access |
| **`selfEvaluate`** | **L879** | ✅ N/A | Pure LLM call — no DB writes |
| **`classifyQuery`** | **L924** | ✅ Indirect | Called within `queryRAG`; user context from caller |
| **`assembleMultiHopContext`** | **L985** | ✅ Indirect | Pure assembly — no DB writes |
| **`enrichCitationsWithDocumentInfo`** | **L1133** | ✅ Indirect | Reads `rag_documents` already filtered by user via RLS |
| **`process-rag-document` (Inngest)** | ~L55 | ❌ **GAP-R2** | No ownership verification → Phase 6 Change 6.6 |
| **KB summary auto-generation** | Inngest finalize step | ⚠️ Indirect | Scoped by `knowledgeBaseId`; mitigated by GAP-R2 fix |

---

*End of Specification*
