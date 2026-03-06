# Data & Identity Spine Investigation v1

**Document:** `01-data-and-identity-spine-spec_v1.md`  
**Date:** 2026-02-19  
**Status:** INVESTIGATION COMPLETE — SPEC DRAFT  
**Scope:** Bright Run LoRA Training Data Platform (v2-modules)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Identity Primitives (Phase B)](#2-identity-primitives)
3. [Resource Catalog (Phase A)](#3-resource-catalog)
4. [Identity Flow Diagram (Phase B)](#4-identity-flow-diagram)
5. [Ownership & Scoping Gap Log (Phase C)](#5-ownership--scoping-gap-log)
6. [Resource Classification (Phase D)](#6-resource-classification)
7. [Canonical Data & Identity Spine (Phase E)](#7-canonical-data--identity-spine)
8. [Authorization Model](#8-authorization-model)
9. [Migration & Backfill Plan](#9-migration--backfill-plan)
10. [Endpoint Consistency Checklist](#10-endpoint-consistency-checklist)
11. [Critical Soft-Launch Tests](#11-critical-soft-launch-tests)
12. [Risk Summary & Prioritization](#12-risk-summary--prioritization)
13. [Appendix — Raw Evidence](#appendix--raw-evidence)

---

## 1. Executive Summary

### 1.1 Current State

The Bright Run platform has **~148 API routes** operating across **~40 database tables**. Identity enforcement is **inconsistent** with three distinct patterns in use:

| Pattern | Routes | Risk |
|---------|--------|------|
| Proper auth (`requireAuth` / `supabase.auth.getUser` + enforcement) | ~55 | LOW |
| Spoofable auth (`x-user-id` header / body `userId`, no verification) | ~20 | **CRITICAL** |
| No auth at all | ~55 | **HIGH** |
| Cron with `CRON_SECRET` | 5 | MEDIUM |
| Inngest (signature-verified) | 1 | LOW |

RLS (Row Level Security) is **well-implemented** on most tables (~35 tables), but **8+ API routes use `createServerSupabaseAdminClient()` (service role key)** which **bypasses RLS entirely**, rendering those table-level policies moot for those code paths.

### 1.2 Key Findings

1. **~20 routes use `x-user-id` header as identity** — trivially spoofable. Covers all `export/*`, core `conversations/*`, and `generation-logs/*` routes.
2. **~25 data-modifying routes have ZERO authentication** — including bulk-action, imports, batch-job cancel, conversation CRUD.
3. **3 routes combine no auth + admin client** — `pipeline/jobs/[jobId]/download`, `batch-jobs/[id]/process-next`, `conversations/bulk-enrich` — anyone on the internet can download trained models or trigger expensive AI operations.
4. **Service layer inconsistency** — `batch-job-service.ts` uses admin client without mandatory user scoping; `rag-retrieval-service.ts` scopes by `documentId` but not `user_id`.
5. **No workspace/org/team model exists** — the system is purely user-scoped (`user_id` or `created_by`). The `ai_configurations` table has an `organization_id` column but the org model is a stub.
6. **`user_profiles` table** stores `id`, `email`, `full_name`, `organization` (text field, not FK) — no roles, no org FK, no team membership.

### 1.3 What Must Be True (Spine Invariants)

For every scoped resource object in the system:

1. **Every record has an identifiable owner** (`user_id` or `created_by`, non-null in steady state)
2. **Every list query is scoped** by authenticated request identity
3. **Every read/update/delete is authorized** against the same policy
4. **Sharing/visibility is explicit** (no accidental exposure via missing filters)
5. **Audit events exist** for sensitive mutations (create/update/delete/share/permission change)

---

## 2. Identity Primitives

### 2.1 User Identity Source

| Component | Implementation | Location |
|-----------|---------------|----------|
| **Auth Provider** | Supabase Auth (GoTrue) | Supabase project |
| **Identity Token** | JWT in HTTP-only cookies | Set by Supabase SSR middleware |
| **User Object** | `User` from `@supabase/supabase-js` | `supabase.auth.getUser()` |
| **Primary Key** | `auth.uid()` — UUID from `auth.users` table | Supabase internal |
| **Profile Table** | `user_profiles` (id = auth.uid()) | `src/lib/auth-context.tsx` |

### 2.2 Identity Object Schema (Current)

```typescript
// From Supabase Auth — available after getUser()
interface UserIdentity {
  id: string;            // UUID — primary identity key
  email: string;         // User email
  // No roles, no org, no team — bare minimum
}

// From user_profiles table
interface UserProfile {
  id: string;            // = auth.uid()
  email: string;
  full_name: string;
  organization: string;  // Free-text field, NOT a FK
  created_at: string;
  updated_at: string;
  // No: role, org_id, workspace_id, team_id, permissions
}
```

### 2.3 Workspace/Org/Team Model

**Status: DOES NOT EXIST**

- No `workspaces` table
- No `organizations` table (only a free-text `organization` field on `user_profiles`)
- No `team_memberships` table
- No role assignments beyond Supabase's built-in `authenticated` role
- The `ai_configurations` table has an `organization_id` column with a mutual-exclusion constraint against `user_id`, but there is no backing `organizations` table — it is a **stub for future use**

### 2.4 How Identity Is Attached to Requests

| Pattern | Where Used | Mechanism | Secure? |
|---------|-----------|-----------|---------|
| `requireAuth(request)` | RAG routes, datasets, jobs, models, notifications | Extracts user from request cookies via `supabase.auth.getUser()` | ✅ YES |
| `getAuthenticatedUser(request)` | Some pipeline routes | Same as above but returns null instead of 401 | ✅ YES |
| `supabase.auth.getUser()` inline | Templates, scenarios, edge-cases, pipeline | Inline call in route handler | ✅ YES |
| `request.headers.get('x-user-id')` | Conversations, exports, generation-logs | Reads plain HTTP header — **no verification** | ❌ **CRITICAL** |
| `body.userId` | Conversation generation | Reads userId from POST body | ❌ **CRITICAL** |
| None | ~55 routes | No identity resolution at all | ❌ **HIGH** |
| `CRON_SECRET` Bearer token | 5 cron routes | Shared secret — skips auth entirely if env var unset | ⚠️ MEDIUM |

### 2.5 Roles (Current)

**No application-level roles exist.** The only role in the system is Supabase's built-in `authenticated` role used in RLS policies:

```sql
-- Typical RLS pattern
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

There is no owner/admin/member/viewer role system.

---

## 3. Resource Catalog

### 3.1 User-Generated Scoped Resources

| Resource Type | DB Table | PK Type | Ownership Field | Ownership FK | Visibility Field | Created Via | Listed Via | Notes |
|---------------|----------|---------|-----------------|-------------|------------------|-------------|------------|-------|
| Conversation | `conversations` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/conversations` (POST), `/api/conversations/generate` | API: `/api/conversations` (GET) | Core resource. **x-user-id header auth** |
| Training File | `training_files` | UUID | `created_by` | FK → `user_profiles` (SET NULL) | None | API: `/api/training-files` (POST) | API: `/api/training-files` (GET) | RLS: open SELECT, scoped write |
| Batch Job | `batch_jobs` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/conversations/generate-batch` | API: `/api/batch-jobs` (GET) | **No auth on create/list** |
| Export Log | `export_logs` | UUID | `user_id` | FK → `user_profiles` | None | API: `/api/export/conversations` | API: `/api/export/history` (GET) | **x-user-id header auth** |
| Pipeline Training Job | `pipeline_training_jobs` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/jobs` (POST) | API: `/api/jobs` (GET) | ✅ Properly scoped |
| Pipeline Test Result | `pipeline_test_results` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/pipeline/adapters/test` | API: `/api/pipeline/adapters/test` (GET) | ✅ Properly scoped |
| Pipeline Inference Endpoint | `pipeline_inference_endpoints` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/pipeline/adapters/deploy` | API: `/api/pipeline/adapters/status` | ✅ RLS scoped |
| Dataset | `datasets` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/datasets` (POST) | API: `/api/datasets` (GET) | ✅ Model implementation |
| Model Artifact | `model_artifacts` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | Training pipeline | API: `/api/models` (GET) | ✅ RLS scoped |
| Multi-Turn Conversation | `multi_turn_conversations` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/pipeline/conversations` (POST) | API: `/api/pipeline/conversations` (GET) | ✅ Properly scoped |
| RAG Knowledge Base | `rag_knowledge_bases` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/rag/knowledge-bases` (POST) | API: `/api/rag/knowledge-bases` (GET) | ✅ Model implementation |
| RAG Document | `rag_documents` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/rag/documents/[id]/upload` | API: `/api/rag/documents` (GET) | ✅ Properly scoped |
| RAG Query | `rag_queries` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | API: `/api/rag/query` (POST) | API: `/api/rag/dashboard` (GET) | ✅ Properly scoped |
| AI Configuration | `ai_configurations` | UUID | `user_id` | FK → `auth.users` | `organization_id` (stub) | API: `/api/ai-configuration` | API: `/api/ai-configuration` (GET) | Scoped; org model is stub |
| User Preferences | `user_preferences` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | Auth context | Auth context | ✅ 1:1 per user |
| Notification | `notifications` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | System-generated | API: `/api/notifications` (GET) | ✅ API scoped; **⚠️ No RLS policies** |
| Cost Record | `cost_records` | UUID | `user_id` | FK → `auth.users` (CASCADE) | None | Training pipeline | API: `/api/costs` (GET) | ✅ API scoped; **⚠️ No RLS policies** |
| Document (classification) | `documents` | UUID | `author_id` | Not confirmed FK | None | API: `/api/documents` (POST) | API: `/api/documents` (GET) | Auth on write; **no scoping on read** |
| Template | `conversation_templates` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/templates` (POST) | API: `/api/templates` (GET) | RLS: shared read, user write |
| Scenario | `scenarios` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/scenarios` (POST) | API: `/api/scenarios` (GET) | Auth on both; no user scoping on GET |
| Edge Case | `edge_cases` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/edge-cases` (POST) | API: `/api/edge-cases` (GET) | Auth on both; no user scoping on GET |
| Generation Log | `generation_logs` | UUID | `created_by` | FK → `user_profiles` | None | API: `/api/generation-logs` (POST) | API: `/api/generation-logs` (GET) | **No auth on GET; x-user-id on POST** |
| Failed Generation | `failed_generations` | UUID | `created_by` | FK → `auth.users` | None | Generation pipeline | API: `/api/failed-generations` (GET) | **No auth; exposes payloads** |

### 3.2 Derived Resources (Inherit Scope from Parent)

| Resource Type | DB Table | Parent Resource | Parent FK | Own Ownership Field | Notes |
|---------------|----------|----------------|-----------|---------------------|-------|
| Batch Item | `batch_items` | Batch Job | `batch_job_id` | None | Inherits via `batch_jobs.created_by` |
| Conversation Turn (legacy) | `conversation_turns` | Conversation | `conversation_id` | None | RLS via join on `conversations.created_by` |
| Conversation Turn (multi-turn) | `conversation_turns` | Multi-Turn Conversation | `conversation_id` | None | RLS via join on `multi_turn_conversations.user_id` |
| Training File Conversation | `training_file_conversations` | Training File | `training_file_id` | `added_by` | Has `added_by` FK; RLS open SELECT |
| RAG Section | `rag_sections` | RAG Document | `document_id` | `user_id` (redundant) | Has own `user_id` + parent FK |
| RAG Fact | `rag_facts` | RAG Document | `document_id` | `user_id` (redundant) | Has own `user_id` + parent FK |
| RAG Expert Question | `rag_expert_questions` | RAG Document | `document_id` | `user_id` (redundant) | Has own `user_id` + parent FK |
| RAG Embedding | `rag_embeddings` | RAG Document | `document_id` | `user_id` (redundant) | Has own `user_id` + parent FK |
| RAG Citation | `rag_citations` | RAG Query | `query_id` | None | Inherits from query |
| RAG Quality Score | `rag_quality_scores` | RAG Query | `query_id` | `user_id` (redundant) | Has own `user_id` |
| Pipeline Training Metric | `pipeline_training_metrics` | Pipeline Job | `job_id` | None | RLS via join; service_role ALL |
| Pipeline Evaluation Run | `pipeline_evaluation_runs` | Pipeline Job | `job_id` | None | RLS via join; service_role ALL |
| Pipeline Evaluation Result | `pipeline_evaluation_results` | Evaluation Run | `run_id` | None | Deep inherited via run→job chain |
| Metrics Point | `metrics_points` | Training Job (legacy) | `job_id` | None | **⚠️ No RLS** |

### 3.3 System-Global Resources (No Ownership)

| Resource Type | DB Table | Notes |
|---------------|----------|-------|
| Persona | `personas` | Shared reference data — no ownership, no RLS |
| Emotional Arc | `emotional_arcs` | Shared reference data — no ownership, no RLS |
| Training Topic | `training_topics` | Shared reference data — no ownership, no RLS |
| Base Model | `pipeline_base_models` | Global model registry — no ownership, no RLS |
| Evaluation Prompt | `evaluation_prompts` | Shared templates — `created_by` FK, RLS: SELECT all active |
| Category | `categories` | Shared reference data — no ownership |
| Tag Dimension | `tag_dimensions` | Shared reference data — no ownership |
| Tag | `tags` | Shared reference data — no ownership |
| Prompt Template | `prompt_templates` | Has `created_by`/`last_modified_by` but **no FK constraint**, **no RLS** |

---

## 4. Identity Flow Diagram

### 4.1 Request Lifecycle (Text Diagram)

```
Browser Request
      │
      ▼
┌─────────────────────────────────┐
│  Next.js Middleware              │
│  (src/middleware.ts)             │
│  ─ Creates Supabase SSR client  │
│  ─ Refreshes JWT if expired     │
│  ─ DOES NOT enforce auth        │
│  ─ DOES NOT block unauthenticated│
│  ─ Protected route redirect is  │
│    COMMENTED OUT                 │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  API Route Handler              │
│  (src/app/api/*/route.ts)       │
│                                 │
│  PATTERN A (✅ Secure):          │
│  ─ requireAuth(request)         │
│  ─ Returns 401 if no session    │
│  ─ user.id is verified UUID     │
│                                 │
│  PATTERN B (❌ Spoofable):       │
│  ─ headers.get('x-user-id')    │
│  ─ No verification whatsoever   │
│  ─ Falls back to NIL UUID      │
│                                 │
│  PATTERN C (❌ None):            │
│  ─ No identity resolution      │
│  ─ Proceeds with no userId     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Service Layer                  │
│  (src/lib/services/*.ts)        │
│                                 │
│  3 Client Types:               │
│  ─ RLS-backed (cookie client)  │
│  ─ Admin (service role key)    │
│  ─ Legacy singleton (broken    │
│    server-side)                 │
│                                 │
│  userId stamping: INCONSISTENT │
│  Query scoping: INCONSISTENT   │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Supabase PostgreSQL            │
│  ─ RLS policies on ~35 tables  │
│  ─ Bypassed when service role  │
│    key is used                  │
│  ─ auth.uid() = user_id        │
└─────────────────────────────────┘
```

### 4.2 Client Type Decision Matrix

```
Is this a background job/Inngest function?
  └─ YES → createServerSupabaseAdminClient() [service role, bypasses RLS]
           ⚠️ MUST manually enforce user_id scoping in every query

Is this a server component?
  └─ YES → createServerSupabaseClient() [cookie-based, RLS enforced]

Is this an API route?
  └─ YES → requireAuth(request) for identity
           Then use RLS-backed client OR admin client with manual scoping

Is this client-side React?
  └─ YES → getSupabaseClient() [browser anon key, RLS enforced]
```

---

## 5. Ownership & Scoping Gap Log

### 5.1 CRITICAL Gaps (Immediate Action Required)

| # | Resource | Location | Issue Type | Severity | Proposed Fix |
|---|----------|----------|-----------|----------|-------------|
| C1 | Conversations | `src/app/api/conversations/route.ts` | Spoofable identity (`x-user-id` header) | **CRITICAL** | Replace with `requireAuth(request)`. Remove `x-user-id` header pattern. |
| C2 | Conversations | `src/app/api/conversations/[id]/route.ts` | No auth on GET/PATCH/DELETE | **CRITICAL** | Add `requireAuth` + ownership check (`created_by = user.id`). |
| C3 | Conversations | `src/app/api/conversations/[id]/status/route.ts` | Spoofable identity, no ownership check | **CRITICAL** | Add `requireAuth` + ownership check. |
| C4 | Conversations | `src/app/api/conversations/bulk-action/route.ts` | No auth on bulk approve/reject/delete | **CRITICAL** | Add `requireAuth`. Scope operations to user's conversations. |
| C5 | Conversations | `src/app/api/conversations/bulk-enrich/route.ts` | No auth + admin client | **CRITICAL** | Add `requireAuth`. Remove admin client fallback. |
| C6 | Conversation Generation | `src/app/api/conversations/generate/route.ts` | No auth; userId from body | **CRITICAL** | Add `requireAuth`. Use authenticated user.id, not body field. |
| C7 | Batch Generation | `src/app/api/conversations/generate-batch/route.ts` | No auth; userId from body | **CRITICAL** | Add `requireAuth`. Use authenticated user.id. |
| C8 | Batch Jobs | `src/app/api/batch-jobs/route.ts` | No auth; lists all jobs globally | **CRITICAL** | Add `requireAuth`. Filter by `created_by = user.id`. |
| C9 | Batch Job Cancel | `src/app/api/batch-jobs/[id]/cancel/route.ts` | No auth on cancel | **CRITICAL** | Add `requireAuth` + ownership check. |
| C10 | Batch Job Process | `src/app/api/batch-jobs/[id]/process-next/route.ts` | No auth + admin client | **CRITICAL** | Add `requireAuth` + ownership check. |
| C11 | Adapter Download | `src/app/api/pipeline/jobs/[jobId]/download/route.ts` | No auth + admin client; downloads trained models | **CRITICAL** | Add `requireAuth` + job ownership check (user_id). |
| C12 | Export Conversations | `src/app/api/export/conversations/route.ts` | Spoofable identity + unscoped data | **CRITICAL** | Add `requireAuth`. Scope exports to user's conversations. |
| C13 | Export Download | `src/app/api/export/download/[id]/route.ts` | Spoofable ownership check | **CRITICAL** | Replace x-user-id with `requireAuth`. |
| C14 | Import Templates | `src/app/api/import/templates/route.ts` | No auth on template overwrite | **CRITICAL** | Add `requireAuth`. |
| C15 | Import Scenarios | `src/app/api/import/scenarios/route.ts` | No auth on scenario overwrite | **CRITICAL** | Add `requireAuth`. |
| C16 | Import Edge Cases | `src/app/api/import/edge-cases/route.ts` | No auth on edge case overwrite | **CRITICAL** | Add `requireAuth`. |

### 5.2 HIGH Gaps

| # | Resource | Location | Issue Type | Severity | Proposed Fix |
|---|----------|----------|-----------|----------|-------------|
| H1 | Batch Job Service | `src/lib/services/batch-job-service.ts` | Admin client with no mandatory user scoping | HIGH | Add mandatory `userId` param to all methods; enforce `.eq('created_by', userId)`. |
| H2 | RAG Retrieval Service | `src/lib/rag/services/rag-retrieval-service.ts` | Scopes by documentId not user_id (admin client) | HIGH | Add `user_id` filter to all retrieval queries. |
| H3 | Conversation Service | `src/lib/services/conversation-service.ts` | Uses deprecated `supabase` singleton (null on server) | HIGH | Migrate to `createServerSupabaseClient()` or accept client injection. |
| H4 | Templates | `src/app/api/templates/route.ts` | GET has no auth | HIGH | Add `requireAuth` to GET. Consider shared-read vs user-scoped pattern. |
| H5 | Templates Test | `src/app/api/templates/test/route.ts` | No auth; triggers Claude API (cost risk) | HIGH | Add `requireAuth`. |
| H6 | Generation Logs | `src/app/api/generation-logs/route.ts` | No auth on GET; exposes all logs | HIGH | Add `requireAuth` + user scoping. |
| H7 | Failed Generations | `src/app/api/failed-generations/route.ts` | No auth; exposes error payloads | HIGH | Add `requireAuth` + user scoping. |
| H8 | Performance | `src/app/api/performance/route.ts` | No auth; exposes DB internals | HIGH | Add `requireAuth` + admin-only guard. |
| H9 | Training File Download | `src/app/api/training-files/[id]/download/route.ts` | Auth but no ownership check | HIGH | Add `.eq('created_by', user.id)` filter. |
| H10 | Documents (GET) | `src/app/api/documents/route.ts` | GET lists all docs unscoped via service role | HIGH | Add user scoping (`.eq('author_id', user.id)`). |
| H11 | Documents CRUD | `src/app/api/documents/[id]/route.ts` | Auth present but no ownership check + service role | HIGH | Add ownership check post-fetch. |
| H12 | Export Templates/Scenarios/Edge Cases | `src/app/api/export/templates,scenarios,edge-cases/route.ts` | No auth; exports all data | HIGH | Add `requireAuth`; scope if user-owned. |
| H13 | Notifications table | `notifications` | Has `user_id` but **no RLS policies** | HIGH | Add RLS: `user_id = auth.uid()`. |
| H14 | Cost Records table | `cost_records` | Has `user_id` but **no RLS policies** | HIGH | Add RLS: `user_id = auth.uid()`. |
| H15 | Metrics Points table | `metrics_points` | No `user_id`, no RLS | HIGH | Add RLS via join to `training_jobs.user_id`. |

### 5.3 MEDIUM Gaps

| # | Resource | Location | Issue Type | Severity | Proposed Fix |
|---|----------|----------|-----------|----------|-------------|
| M1 | Training Files (GET) | `src/app/api/training-files/route.ts` | Auth on GET but no user filter | MEDIUM | Add `.eq('created_by', user.id)` or shared-read policy. |
| M2 | Scenarios (GET) | `src/app/api/scenarios/route.ts` | Auth but returns all scenarios | MEDIUM | Decision: shared read or user-scoped? |
| M3 | Edge Cases (GET) | `src/app/api/edge-cases/route.ts` | Auth but returns all edge cases | MEDIUM | Decision: shared read or user-scoped? |
| M4 | Conversation Stats | `src/app/api/conversations/stats/route.ts` | No auth; returns global stats | MEDIUM | Add `requireAuth`. Scope to user stats. |
| M5 | Batch Job Status | `src/app/api/conversations/batch/[id]/status/route.ts` | No auth on status check | MEDIUM | Add `requireAuth` + ownership check. |
| M6 | Cron CRON_SECRET | 5 cron routes | Auth bypassed if `CRON_SECRET` not set | MEDIUM | Fail closed: reject if `CRON_SECRET` not configured. |
| M7 | Training File Service | `src/lib/services/training-file-service.ts` | Security depends on caller-injected client | MEDIUM | Add mandatory `userId` parameter. |
| M8 | Inngest Background Jobs | `src/inngest/functions/process-rag-document.ts` | Trusts event payload userId; no independent verification | MEDIUM | Verify `userId` matches document owner before processing. |
| M9 | RAG Embedding Runs | `rag_embedding_runs` | `user_id` with no FK constraint | MEDIUM | Add FK to `auth.users`. |
| M10 | RAG Test Reports | `rag_test_reports` | `user_id` with no FK constraint | MEDIUM | Add FK to `auth.users`. |
| M11 | Prompt Templates | `prompt_templates` | `created_by` UUID with no FK constraint, no RLS | MEDIUM | Add FK; add RLS or classify as system-global. |
| M12 | Conv Download Raw | `src/app/api/conversations/[id]/download/raw/route.ts` | Auth present but no ownership check | MEDIUM | Add ownership check like the main download route. |
| M13 | Conv Download Enriched | `src/app/api/conversations/[id]/download/enriched/route.ts` | Auth present but no ownership check | MEDIUM | Add ownership check. |

### 5.4 LOW Gaps (Reference Data / Mock Routes)

| # | Resource | Location | Issue Type | Severity | Notes |
|---|----------|----------|-----------|----------|-------|
| L1 | Scaffolding endpoints | `/api/scaffolding/*` | No auth on reference data reads | LOW | Read-only shared reference data. Acceptable if by design. |
| L2 | Template Select/Preview/Resolve | Various | No auth on stateless operations | LOW | Stateless template rendering. |
| L3 | Workflow mock | `/api/workflow/[id]` | No auth on mock data | LOW | Mock data only. |
| L4 | Assessment mock | `/api/assessment` | No auth on mock | LOW | Mock assessment logic. |
| L5 | AI Queue Status | `/api/ai/queue-status` | No auth on internal metrics | LOW | Consider admin-only. |

---

## 6. Resource Classification

### 6.1 Classification Decisions

| Classification | Definition | Resources |
|---------------|------------|-----------|
| **Scoped Resource** | User-owned, must be isolated per-user. All CRUD operations scoped to `user_id`/`created_by`. | Conversations, Training Files, Batch Jobs, Export Logs, Pipeline Jobs, Pipeline Test Results, Datasets, Model Artifacts, Multi-Turn Conversations, RAG Knowledge Bases, RAG Documents, RAG Queries, AI Configurations, Documents (classification), Generation Logs, Cost Records, Notifications, User Preferences, Failed Generations |
| **Derived Resource** | Created from a scoped parent. Inherits scope from parent automatically. No independent ownership column needed (but may have redundant `user_id` for query efficiency). | Batch Items, Conversation Turns, Training File Conversations, RAG Sections, RAG Facts, RAG Expert Questions, RAG Embeddings, RAG Citations, RAG Quality Scores, Pipeline Metrics, Pipeline Evaluation Runs, Pipeline Evaluation Results, Metrics Points |
| **Shared Resource** | User-created but intentionally readable by all authenticated users. Write operations scoped to creator. | Templates, Scenarios, Edge Cases, Evaluation Prompts |
| **System-Global Resource** | Platform-level reference data. No ownership. Read-only for all users. Write-only by admin/seed. | Personas, Emotional Arcs, Training Topics, Base Models, Categories, Tags, Tag Dimensions |

### 6.2 Inheritance Rules for Derived Resources

```
Derived Resource         → Inherits Scope From
──────────────────────────────────────────────
batch_items              → batch_jobs.created_by
conversation_turns       → conversations.created_by (legacy)
                         → multi_turn_conversations.user_id (multi-turn)
training_file_convos     → training_files.created_by
rag_sections             → rag_documents.user_id
rag_facts                → rag_documents.user_id
rag_expert_questions     → rag_documents.user_id
rag_embeddings           → rag_documents.user_id
rag_citations            → rag_queries.user_id
rag_quality_scores       → rag_queries.user_id
pipeline_training_metrics → pipeline_training_jobs.user_id
pipeline_evaluation_runs  → pipeline_training_jobs.user_id
pipeline_evaluation_results → pipeline_evaluation_runs → pipeline_training_jobs.user_id
metrics_points           → training_jobs.user_id
```

### 6.3 Decision: Shared Resources Pattern

For **Templates**, **Scenarios**, and **Edge Cases**:

- **Current behavior**: All authenticated users can see all records (RLS: `SELECT` for any authenticated user, `INSERT/UPDATE/DELETE` restricted to `created_by`)
- **Recommendation**: Maintain shared-read pattern with explicit classification:
  - `visibility = 'shared'` (default for these resource types)
  - Only the creator can edit/delete
  - Future: add `visibility = 'private'` option for user-only templates

---

## 7. Canonical Data & Identity Spine

### 7.1 Canonical Scoped Resource Fields

Every **Scoped Resource** table MUST have these fields:

| Field | Type | Nullable | Default | Purpose |
|-------|------|----------|---------|---------|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | NOT NULL | — | **Primary ownership field**. FK to `auth.users(id)` ON DELETE CASCADE |
| `created_by` | `UUID` | NOT NULL | — | Actor who created the record. FK to `auth.users(id)`. Equals `user_id` unless admin-created. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Creation timestamp |
| `updated_by` | `UUID` | NULL | — | Actor who last updated. FK to `auth.users(id)`. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Last update timestamp |

**Optional fields (add when needed):**

| Field | Type | Purpose |
|-------|------|---------|
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp (if soft-delete pattern is adopted) |
| `visibility` | `TEXT` | Values: `'private'` (default), `'shared'`, `'public'`. Only for resources with sharing. |
| `org_id` | `UUID` | FK to future `organizations` table. Add when org model is implemented. |

### 7.2 Field Applicability Matrix

| Resource Type | `user_id` | `created_by` | `updated_by` | `visibility` | Notes |
|---------------|-----------|-------------|-------------|-------------|-------|
| **Scoped Resources** | ✅ REQUIRED | ✅ REQUIRED | ✅ RECOMMENDED | Optional | Standard pattern |
| **Shared Resources** | ✅ REQUIRED | ✅ REQUIRED | ✅ RECOMMENDED | ✅ REQUIRED (default: `'shared'`) | Templates, Scenarios, Edge Cases |
| **Derived Resources** | Optional (redundant) | Optional | Optional | Inherit from parent | Keep `user_id` on RAG sub-tables for query perf |
| **System-Global** | ❌ EXEMPT | Optional | Optional | N/A | No ownership required |

### 7.3 Naming Standardization

The codebase currently uses **two naming patterns** for the ownership field:

| Current Name | Used By | Proposed Canonical Name |
|-------------|---------|----------------------|
| `user_id` | Pipeline tables, RAG tables, datasets, model_artifacts, notifications, cost_records, user_preferences | `user_id` ✅ (keep) |
| `created_by` | Legacy tables: conversations, training_files, batch_jobs, scenarios, edge_cases, templates, generation_logs | **Migrate to `user_id`** (add column, backfill, deprecate `created_by` for ownership) |
| `author_id` | `documents` table | **Migrate to `user_id`** |

**Decision:** Standardize on `user_id` as the **ownership field** across all tables. Keep `created_by` as the **audit actor field** (who performed the create action — usually the same as `user_id`).

```sql
-- Target state for legacy tables:
ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE conversations SET user_id = created_by;
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
-- created_by remains as audit field
```

### 7.4 RLS Policy Template

Every scoped resource table MUST have these RLS policies:

```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY "{table_name}_select_own"
  ON {table_name} FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own rows
CREATE POLICY "{table_name}_insert_own"
  ON {table_name} FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own rows
CREATE POLICY "{table_name}_update_own"
  ON {table_name} FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own rows
CREATE POLICY "{table_name}_delete_own"
  ON {table_name} FOR DELETE
  USING (user_id = auth.uid());

-- Service role bypass (for background jobs)
CREATE POLICY "{table_name}_service_role_all"
  ON {table_name} FOR ALL
  USING (auth.role() = 'service_role');
```

For **Shared Resources** (templates, scenarios, edge_cases):

```sql
-- All authenticated can read
CREATE POLICY "{table_name}_select_authenticated"
  ON {table_name} FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only creator can modify
CREATE POLICY "{table_name}_modify_own"
  ON {table_name} FOR ALL
  USING (user_id = auth.uid());
```

---

## 8. Authorization Model

### 8.1 Roles (Current + Recommended)

| Role | Current Status | Description | Implementation |
|------|---------------|-------------|----------------|
| **Authenticated User** | ✅ EXISTS | Any logged-in user. Can CRUD own resources. | Supabase `authenticated` role |
| **Resource Owner** | ✅ EXISTS (implicit) | User whose `user_id` matches the resource. Full control. | RLS policies + app-level checks |
| **Admin** | ❌ DOES NOT EXIST | Platform admin. Can manage all resources. | **Future**: Add `role` column to `user_profiles` |
| **Viewer** | ❌ DOES NOT EXIST | Read-only access to shared resources. | **Future**: Part of sharing model |

### 8.2 Authorization Matrix

#### Scoped Resources (Conversations, Datasets, Jobs, RAG KBs, etc.)

| Action | Authenticated User (own) | Authenticated User (other's) | Unauthenticated | Service Role |
|--------|--------------------------|------------------------------|-----------------|-------------|
| `list` | ✅ (own only) | ❌ | ❌ | ✅ |
| `read` | ✅ | ❌ | ❌ | ✅ |
| `create` | ✅ (stamps user_id) | N/A | ❌ | ✅ |
| `update` | ✅ | ❌ | ❌ | ✅ |
| `delete` | ✅ | ❌ | ❌ | ✅ |
| `export/download` | ✅ | ❌ | ❌ | ✅ |
| `run/execute` | ✅ | ❌ | ❌ | ✅ |

#### Shared Resources (Templates, Scenarios, Edge Cases)

| Action | Authenticated User (own) | Authenticated User (other's) | Unauthenticated | Service Role |
|--------|--------------------------|------------------------------|-----------------|-------------|
| `list` | ✅ (all shared) | ✅ (all shared) | ❌ | ✅ |
| `read` | ✅ | ✅ | ❌ | ✅ |
| `create` | ✅ (stamps user_id) | N/A | ❌ | ✅ |
| `update` | ✅ | ❌ | ❌ | ✅ |
| `delete` | ✅ | ❌ | ❌ | ✅ |

#### System-Global Resources (Personas, Arcs, Topics, Base Models)

| Action | Authenticated User | Unauthenticated | Service Role |
|--------|-------------------|-----------------|-------------|
| `list` | ✅ | ❌* | ✅ |
| `read` | ✅ | ❌* | ✅ |
| `create` | ❌ | ❌ | ✅ (admin/seed only) |
| `update` | ❌ | ❌ | ✅ (admin/seed only) |
| `delete` | ❌ | ❌ | ✅ (admin/seed only) |

*Currently some scaffolding endpoints serve reference data without auth. Decision needed: require auth for all reads, or allow public read for reference data.

#### Derived Resources

| Action | Rule |
|--------|------|
| All CRUD | Follows parent resource's authorization. If user owns the parent, they can access derived records. |
| Direct access by ID | Must verify parent ownership. |

### 8.3 Policy Pseudo-Code

```
FUNCTION authorize(user, action, resource):
  IF resource.classification == 'system-global':
    IF action IN ['list', 'read']:
      REQUIRE user.authenticated == true
      RETURN ALLOW
    ELSE:
      REQUIRE user.role == 'admin' OR request.is_service_role
      RETURN ALLOW/DENY

  IF resource.classification == 'shared':
    IF action IN ['list', 'read']:
      REQUIRE user.authenticated == true
      RETURN ALLOW  // all authenticated users see shared resources
    ELSE:
      REQUIRE user.id == resource.user_id
      RETURN ALLOW/DENY

  IF resource.classification == 'scoped':
    REQUIRE user.authenticated == true
    IF action == 'create':
      SET resource.user_id = user.id
      SET resource.created_by = user.id
      SET resource.created_at = now()
      RETURN ALLOW
    ELSE:
      REQUIRE user.id == resource.user_id
      IF action == 'update':
        SET resource.updated_by = user.id
        SET resource.updated_at = now()
      RETURN ALLOW/DENY

  IF resource.classification == 'derived':
    parent = resolve_parent(resource)
    RETURN authorize(user, action, parent)
```

---

## 9. Migration & Backfill Plan

### 9.1 Overview

The migration converts the platform from inconsistent identity enforcement to the canonical spine. It is divided into 5 phases executed sequentially.

### 9.2 Phase 1 — Add Missing Columns (Non-Breaking)

**Goal:** Add `user_id` column to tables that only have `created_by` or `author_id`. All new columns are **nullable** initially.

```sql
-- Legacy tables: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE export_logs ADD COLUMN IF NOT EXISTS user_id_new UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  -- export_logs already has user_id → verify FK exists

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

-- Fix missing FKs
ALTER TABLE rag_embedding_runs
  ADD CONSTRAINT fk_rag_embedding_runs_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE rag_test_reports
  ADD CONSTRAINT fk_rag_test_reports_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Deploy this migration. Verify no errors.**

### 9.3 Phase 2 — Backfill Data

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

-- Quarantine orphans (records with NULL ownership)
-- These need manual review
CREATE TABLE IF NOT EXISTS _orphaned_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  resolution TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Log orphaned conversations (created_by is NULL)
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;

-- Log orphaned batch_jobs
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;
```

**Verify:** Run `SELECT table_name, COUNT(*) FROM _orphaned_records GROUP BY source_table;`

### 9.4 Phase 3 — Deploy Application-Level Enforcement

This is the **code change phase**. For every API route:

1. **Replace `x-user-id` header auth with `requireAuth(request)`**
2. **Add `requireAuth` to all routes lacking auth**
3. **Add ownership checks to admin-client routes**
4. **Standardize service layer to accept `userId` parameter**

**Priority order (based on risk):**

```
BATCH 1 (CRITICAL - do first):
 ├── All /api/conversations/* routes → add requireAuth
 ├── /api/batch-jobs/* routes → add requireAuth
 ├── /api/pipeline/jobs/[jobId]/download → add requireAuth + ownership
 ├── /api/export/* routes → replace x-user-id with requireAuth
 └── /api/import/* routes → add requireAuth

BATCH 2 (HIGH):
 ├── /api/generation-logs → add requireAuth + scoping
 ├── /api/failed-generations → add requireAuth + scoping
 ├── /api/templates (GET) → add requireAuth
 ├── /api/templates/test → add requireAuth
 ├── /api/documents (GET) → add user scoping
 ├── /api/performance → add requireAuth + admin check
 └── Service layer: batch-job-service, conversation-service, rag-retrieval-service

BATCH 3 (MEDIUM):
 ├── /api/training-files (GET) → add user scoping
 ├── /api/conversations/[id]/download/raw → add ownership check
 ├── /api/conversations/[id]/download/enriched → add ownership check
 ├── Cron routes → fail closed when CRON_SECRET unset
 └── Inngest functions → verify userId matches document owner
```

### 9.5 Phase 4 — Add Database Constraints

After code is deployed and backfill verified:

```sql
-- Enforce NOT NULL on ownership columns
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- Add missing RLS policies
-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_service_role" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- cost_records
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_records_select_own" ON cost_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cost_records_service_role" ON cost_records FOR ALL USING (auth.role() = 'service_role');

-- metrics_points (inherit via job)
ALTER TABLE metrics_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_points_select_via_job" ON metrics_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM training_jobs WHERE training_jobs.id = metrics_points.job_id
    AND training_jobs.user_id = auth.uid()
  ));
CREATE POLICY "metrics_points_service_role" ON metrics_points FOR ALL USING (auth.role() = 'service_role');

-- Add performance indexes for scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_files_user_id ON training_files(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
```

### 9.6 Phase 5 — Cleanup & Finalize

1. Remove deprecated `x-user-id` header reads from all route handlers
2. Remove fallback to NIL UUID (`00000000-0000-0000-0000-000000000000`) in all code paths
3. Remove `'test-user'` fallback strings
4. Deprecate `src/lib/supabase.ts` singleton export (replace all usages)
5. Update all client-side hooks to pass authenticated userId (not from state/props)
6. Remove or resolve entries from `_orphaned_records` table
7. Run full test suite
8. Document the spine in developer onboarding docs

### 9.7 Rollout Timeline (Recommended)

| Phase | Duration | Blocking? |
|-------|----------|-----------|
| Phase 1: Add columns | 1 day | No — non-breaking |
| Phase 2: Backfill | 1 day | No — data-only |
| Phase 3: Code enforcement (Batch 1) | 3-4 days | **Yes — blocks soft launch** |
| Phase 3: Code enforcement (Batch 2) | 2-3 days | **Yes — blocks soft launch** |
| Phase 3: Code enforcement (Batch 3) | 1-2 days | Optional for soft launch |
| Phase 4: DB constraints | 1 day | After Phase 2+3 |
| Phase 5: Cleanup | 2 days | Post-launch OK |

**Total estimated effort: 10-14 days**

---

## 10. Endpoint Consistency Checklist

Every API route and background job that touches scoped resources **MUST pass** all applicable checks:

| # | Check | Pass Criteria | Verification Method |
|---|-------|--------------|-------------------|
| 1 | **Auth present** | Identity resolved via `requireAuth()` or equivalent. Returns 401 if not authenticated. | Grep for `requireAuth\|getAuthenticatedUser\|auth\.getUser` in route file |
| 2 | **Scope present** | `user.id` extracted from verified session | No `x-user-id` header, no body userId, no NIL UUID fallback |
| 3 | **List queries scoped** | `.eq('user_id', user.id)` or equivalent RLS filter | Grep for `user_id\|created_by` in SELECT queries |
| 4 | **Read-by-id authorized** | Ownership check post-fetch OR pre-filter with user_id | Must not rely solely on "if record exists" |
| 5 | **Creates stamped** | `user_id`, `created_by`, `created_at` set from authenticated identity | Grep INSERT for ownership fields |
| 6 | **Updates stamped** | `updated_by`, `updated_at` set | Grep UPDATE |
| 7 | **Deletes authorized** | Ownership verified before delete | Consistent soft/hard delete policy |
| 8 | **No bypass paths** | Background jobs use service methods that enforce policy | Inngest functions verify document ownership |
| 9 | **Audit logged** | Sensitive actions logged (permission changes, exports, training runs) | Check for audit table inserts |
| 10 | **Tests exist** | At least one isolation test per critical resource group | Test file exists in `__tests__/` |

### 10.1 Current Compliance Matrix

| Route Group | Check 1 | Check 2 | Check 3 | Check 4 | Check 5 | Check 6 | Check 7 | Check 8 | Check 9 | Check 10 |
|-------------|---------|---------|---------|---------|---------|---------|---------|---------|---------|----------|
| `/api/rag/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ |
| `/api/datasets/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | N/A | ❌ | ❌ |
| `/api/jobs/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | N/A | ❌ | ❌ |
| `/api/models/*` | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | ❌ | ❌ |
| `/api/pipeline/conversations/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | N/A | N/A | ❌ | ❌ |
| `/api/pipeline/jobs/*` | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | N/A | ❌ | ❌ |
| `/api/pipeline/adapters/*` | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | N/A | N/A | ❌ | ❌ |
| `/api/notifications/*` | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | ❌ | ❌ |
| `/api/costs` | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | ❌ | ❌ |
| `/api/conversations/*` | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/batch-jobs/*` | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/export/*` | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | N/A | N/A | ⚠️ | ❌ |
| `/api/generation-logs` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A | N/A | ❌ | ❌ |
| `/api/failed-generations` | ❌ | ❌ | ❌ | ❌ | N/A | N/A | N/A | N/A | ❌ | ❌ |
| `/api/templates/*` | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | N/A | ❌ | ❌ |
| `/api/import/*` | ❌ | ❌ | N/A | N/A | ❌ | N/A | N/A | N/A | ❌ | ❌ |
| `/api/documents/*` | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | N/A | ❌ | ❌ |

Legend: ✅ = Pass | ⚠️ = Partial | ❌ = Fail | N/A = Not applicable

---

## 11. Critical Soft-Launch Tests

### 11.1 Required Tests (Must Pass Before Soft Launch)

| # | Test Name | Layer | Description | Resource Groups |
|---|-----------|-------|-------------|----------------|
| T1 | **Cross-user list isolation** | API | User A's GET /api/conversations returns 0 of User B's conversations. Same for /api/rag/knowledge-bases, /api/jobs, /api/datasets. | Conversations, RAG KBs, Jobs, Datasets |
| T2 | **Cross-user read isolation** | API | User A GET /api/conversations/{userB_id} returns 403 or 404. Same for RAG documents, pipeline jobs. | All scoped resources |
| T3 | **Cross-user mutation isolation** | API | User A PATCH/DELETE /api/conversations/{userB_id} returns 403. Same for batch-jobs, training-files. | All scoped resources |
| T4 | **Create ownership stamping** | API + DB | POST to any create endpoint stamps `user_id = authenticated_user.id` and `created_by = authenticated_user.id`. Verify with direct DB query. | All scoped resources |
| T5 | **Unauthenticated rejection** | API | All scoped resource endpoints return 401 when no auth cookie/token present. No `x-user-id` header fallback. | All routes |
| T6 | **Spoofed header rejection** | API | Sending `x-user-id: {victim_id}` header has NO effect. Response still returns only the authenticated user's data. | Conversations, Exports |
| T7 | **Background job isolation** | Inngest + DB | Inngest `processRAGDocument` only processes documents matching the `userId` in the event payload. Verify userId matches document owner. | RAG processing |
| T8 | **Export/download isolation** | API | GET /api/export/download/{id} returns 403 when authenticated as non-owner. Same for /api/pipeline/jobs/{id}/download, /api/training-files/{id}/download. | Exports, Adapter Downloads |
| T9 | **Orphan prevention** | API + DB | Create a resource through every create endpoint; verify NO records in any table have NULL `user_id` after creation. | All scoped resources |
| T10 | **Admin client scoping** | Service | `batch-job-service.getAllJobs()` with admin client STILL requires userId parameter and returns only that user's jobs. Same for `rag-retrieval-service`. | Batch Jobs, RAG Retrieval |

### 11.2 Test Implementation Approach

```typescript
// Test T1: Cross-user list isolation
describe('Cross-user list isolation', () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createTestUser('user-a@test.com');
    userB = await createTestUser('user-b@test.com');
    
    // UserA creates resources
    await createConversation(userA, { name: 'A-conv-1' });
    await createRAGKnowledgeBase(userA, { name: 'A-kb-1' });
    
    // UserB creates resources
    await createConversation(userB, { name: 'B-conv-1' });
    await createRAGKnowledgeBase(userB, { name: 'B-kb-1' });
  });

  test('UserA lists only own conversations', async () => {
    const res = await authenticatedGet(userA, '/api/conversations');
    const data = res.json();
    expect(data.every(c => c.user_id === userA.id)).toBe(true);
    expect(data.some(c => c.user_id === userB.id)).toBe(false);
  });

  test('UserA lists only own RAG knowledge bases', async () => {
    const res = await authenticatedGet(userA, '/api/rag/knowledge-bases');
    const data = res.json();
    expect(data.every(kb => kb.userId === userA.id)).toBe(true);
  });

  // Repeat for datasets, jobs, training-files, etc.
});

// Test T5: Unauthenticated rejection
describe('Unauthenticated rejection', () => {
  const protectedEndpoints = [
    'GET /api/conversations',
    'POST /api/conversations',
    'GET /api/rag/knowledge-bases',
    'GET /api/datasets',
    'GET /api/jobs',
    'GET /api/batch-jobs',
    'GET /api/export/history',
    'POST /api/conversations/generate',
    'GET /api/generation-logs',
    'GET /api/failed-generations',
    'GET /api/pipeline/jobs/test-id/download',
  ];

  test.each(protectedEndpoints)('%s returns 401 without auth', async (endpoint) => {
    const [method, path] = endpoint.split(' ');
    const res = await unauthenticatedRequest(method, path);
    expect(res.status).toBe(401);
  });
});

// Test T6: Spoofed header rejection
describe('Spoofed x-user-id header has no effect', () => {
  test('x-user-id header is ignored when auth cookie present', async () => {
    const userA = await createTestUser('user-a@test.com');
    const userB = await createTestUser('user-b@test.com');
    await createConversation(userA, { name: 'A-secret' });
    
    // UserB tries to access UserA's data by spoofing header
    const res = await authenticatedGet(userB, '/api/conversations', {
      headers: { 'x-user-id': userA.id }
    });
    const data = res.json();
    expect(data.some(c => c.user_id === userA.id)).toBe(false);
  });
});
```

### 11.3 Test Location

Tests should be placed in: `src/__tests__/identity-spine/`

| File | Tests |
|------|-------|
| `cross-user-isolation.test.ts` | T1, T2, T3 |
| `ownership-stamping.test.ts` | T4, T9 |
| `auth-enforcement.test.ts` | T5, T6 |
| `background-job-isolation.test.ts` | T7 |
| `download-isolation.test.ts` | T8 |
| `admin-client-scoping.test.ts` | T10 |

---

## 12. Risk Summary & Prioritization

### 12.1 Risk Heat Map

```
                        ┌───────────────────────────────────────────────────┐
  CRITICAL              │  C1-C16: No auth / spoofable auth on ~40 routes  │
  (blocks soft launch)  │  H1: batch-job-service admin client no scoping   │
                        │  C11: Adapter download (IP theft risk)           │
                        └───────────────────────────────────────────────────┘
                        ┌───────────────────────────────────────────────────┐
  HIGH                  │  H2-H15: Missing RLS, unscoped reads, service    │
  (must fix before GA)  │  role bypasses, exposed DB internals             │
                        └───────────────────────────────────────────────────┘
                        ┌───────────────────────────────────────────────────┐
  MEDIUM                │  M1-M13: Missing updated_by, optional filters,   │
  (fix in sprint 2)     │  Inngest trust, FK gaps                          │
                        └───────────────────────────────────────────────────┘
                        ┌───────────────────────────────────────────────────┐
  LOW                   │  L1-L5: Reference data reads, mock endpoints     │
  (acceptable risk)     │                                                   │
                        └───────────────────────────────────────────────────┘
```

### 12.2 Top 5 Highest-Impact Fixes (Do These First)

| Priority | Issue | Impact | Effort | Fix |
|----------|-------|--------|--------|-----|
| **P0** | Replace all `x-user-id` header auth with `requireAuth` | Eliminates ~20 spoofable routes | 2 days | Find-and-replace pattern in ~20 route files |
| **P0** | Add `requireAuth` to zero-auth data-modifying routes | Eliminates ~25 unprotected routes | 2 days | Add auth guard to each route |
| **P0** | Fix adapter download auth | Prevents unauthorized model theft | 1 hour | Add `requireAuth` + `user_id` check to 1 route |
| **P1** | Fix `batch-job-service.ts` admin client scoping | Prevents cross-user batch job access | 4 hours | Add mandatory `userId` param; enforce in all methods |
| **P1** | Add RLS to `notifications` and `cost_records` | Prevents data leakage via RLS bypass gap | 1 hour | 4 SQL statements |

### 12.3 Acceptance Criteria (Soft Launch Gate)

The following MUST be true before soft launch:

- [ ] ✅ Zero cross-user data access in automated tests (T1-T3 pass)
- [ ] ✅ No "orphan" records created by any code path (T9 passes)
- [ ] ✅ All list endpoints enforce scoping — verified by grep + tests (T1 passes for all resource types)
- [ ] ✅ Every resource mutation stamps `user_id`/`created_by` and timestamps (T4 passes)
- [ ] ✅ No `x-user-id` header reads remain in any route handler (T6 passes)
- [ ] ✅ All CRITICAL and HIGH gaps from Section 5 are resolved
- [ ] ✅ RLS policies exist on all scoped resource tables (verified by DB query)
- [ ] ✅ No route uses admin client without explicit `user_id` filtering

---

## Appendix — Raw Evidence

### A.1 Files with `x-user-id` Header Pattern (Must Remove)

```
src/app/api/conversations/route.ts
src/app/api/conversations/[id]/status/route.ts
src/app/api/export/conversations/route.ts
src/app/api/export/history/route.ts
src/app/api/export/status/[id]/route.ts
src/app/api/export/download/[id]/route.ts
src/app/api/generation-logs/route.ts
```

### A.2 Files with NIL UUID Fallback (Must Remove)

```
src/app/api/conversations/route.ts — 'test-user'
src/app/api/conversations/[id]/status/route.ts — 'test-user'
src/app/api/conversations/generate/route.ts — '00000000-0000-0000-0000-000000000000'
src/app/api/conversations/generate-batch/route.ts — NIL UUID
src/app/api/export/conversations/route.ts — NIL UUID
src/app/api/export/history/route.ts — NIL UUID
src/app/api/export/status/[id]/route.ts — NIL UUID
src/app/api/export/download/[id]/route.ts — NIL UUID
src/app/api/generation-logs/route.ts — NIL UUID
src/app/api/templates/test/route.ts — 'test_user'
```

### A.3 Files Using `createServerSupabaseAdminClient` (Review for Scoping)

```
src/app/api/conversations/bulk-enrich/route.ts
src/app/api/conversations/batch/[id]/items/route.ts
src/app/api/batch-jobs/[id]/process-next/route.ts
src/app/api/pipeline/jobs/[jobId]/download/route.ts
src/app/api/conversations/[id]/download/route.ts (acceptable — has ownership check)
src/app/api/backup/create/route.ts
src/lib/services/batch-job-service.ts
src/lib/rag/services/rag-ingestion-service.ts
src/lib/rag/services/rag-retrieval-service.ts
src/inngest/functions/process-rag-document.ts
```

### A.4 Model Routes (Gold Standard — Copy This Pattern)

These routes implement the target pattern correctly:

```typescript
// From src/app/api/datasets/route.ts — EXEMPLARY
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (!user) return response;
  
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('user_id', user.id)          // ← Scoped to authenticated user
    .order('created_at', { ascending: false });
  // ...
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (!user) return response;
  
  const { data, error } = await supabase
    .from('datasets')
    .insert({
      user_id: user.id,              // ← Ownership stamped
      created_by: user.id,           // ← Audit actor stamped
      // ... other fields
    });
  // ...
}
```

### A.5 Supabase Client Creation Patterns Reference

| Function | Module | RLS | Use For |
|----------|--------|-----|---------|
| `requireAuth(request)` | `src/lib/supabase-server.ts` | N/A (auth check only) | All API routes — **USE THIS** |
| `createServerSupabaseClient()` | `src/lib/supabase-server.ts` | ✅ Enforced | Server components |
| `createServerSupabaseClientFromRequest(request)` | `src/lib/supabase-server.ts` | ✅ Enforced | API routes needing Supabase client |
| `createServerSupabaseAdminClient()` | `src/lib/supabase-server.ts` | ❌ **BYPASSED** | Background jobs ONLY — must manually scope |
| `getSupabaseClient()` | `src/lib/supabase-client.ts` | ✅ Enforced | Client-side React components |
| `supabase` singleton | `src/lib/supabase.ts` | ⚠️ **DEPRECATED** | **DO NOT USE** — broken server-side |

---

*End of Document*
