# Data & Identity Spine — Execution Prompt E04: Database Constraints, RLS, Cleanup & Testing

**Version:** 1.0
**Date:** 2026-02-22
**Section:** E04 — Database Constraints (Phase 7), Cleanup (Phase 8), Integration Testing
**Prerequisites:** E01 (DB migration + backfill) + E02 (CRITICAL routes) + E03 (HIGH/MEDIUM routes + RLS) must ALL be complete
**Builds Upon:** E01 + E02 + E03 artifacts
**Specification Source:** `02-data-and-identity-spine-detailed-specification_v6.md`

---

## Division of Work Across All 4 Prompts

| Prompt | Phases | Description |
|--------|--------|-------------|
| **E01** (complete) | 0, 1, 2, 3 | Preflight verification, auth infrastructure, DB schema migration, data backfill |
| **E02** (complete) | 4 + service layer | CRITICAL route security fixes (C1–C16), batch-job-service & conversation-service refactoring |
| **E03** (complete) | 5, 6 | HIGH route/service fixes (H1–H15), MEDIUM fixes (M1–M13), RAG gap fixes |
| **E04 (this file)** | 7, 8 + tests | Database constraints & RLS, cleanup, deprecated code removal, testing |

---

========================


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified
4. **Verify ALL previous prompt artifacts exist** before proceeding (see Preflight section below)

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application.

### Key Codebase Paths

```
v4-show/src/
├── app/api/                          # All route files (secured in E02 + E03)
│   ├── categories/route.ts           # Module-scope singleton cleanup
│   ├── documents/                    # Module-scope singleton cleanup
│   │   ├── process/route.ts
│   │   ├── status/route.ts
│   │   └── upload/route.ts
│   ├── tags/route.ts                 # Module-scope singleton cleanup
│   └── workflow/session/route.ts     # Module-scope singleton cleanup
├── lib/
│   ├── supabase-server.ts            # Auth helpers (from E01)
│   ├── supabase.ts                   # DEPRECATED singleton — Phase 8 deprecation target
│   ├── rag/services/                 # RAG services (gaps closed in E03)
│   └── services/                     # Business services (updated in E02/E03)
├── __tests__/identity-spine/         # Tests to create in this prompt
└── scripts/migrations/               # Migration scripts (from E01)
    ├── identity-spine-phase2-add-columns.ts
    ├── identity-spine-phase3-backfill.ts
    ├── identity-spine-phase7-constraints.ts    # CREATE in this prompt
    └── identity-spine-phase7-rls.ts            # CREATE in this prompt
```

---

## SAOL — Mandatory for All Database Operations

**SAOL is a CLI tool, NOT imported into the codebase.** Use for SQL DDL/DML:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`YOUR_SQL\`,dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

**Rules:**
1. **Dry-run first** — always `dryRun: true`, verify, then `dryRun: false`
2. **Transport: 'pg'** — always use pg transport for DDL
3. **Transaction: true** — except for `CREATE INDEX CONCURRENTLY` which CANNOT be in a transaction
4. **Do NOT import SAOL into the codebase**

---

## E01 + E02 + E03 Artifact Verification (Preflight)

**⚠️ CRITICAL: Phase 7 MUST NOT run if Phase 3 backfill has not fully completed. NULL user_id rows + NOT NULL constraints = table lock failure.**

```bash
# 1. CRITICAL — Verify ZERO null user_id values across ALL tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT 'conversations' AS t, COUNT(*) FILTER (WHERE user_id IS NULL) AS nulls, COUNT(*) AS total FROM conversations
UNION ALL SELECT 'batch_jobs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM batch_jobs
UNION ALL SELECT 'training_files', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM training_files
UNION ALL SELECT 'generation_logs', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM generation_logs
UNION ALL SELECT 'failed_generations', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM failed_generations
UNION ALL SELECT 'documents', COUNT(*) FILTER (WHERE user_id IS NULL), COUNT(*) FROM documents;
\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"
```
**Expected:** ALL tables show `nulls: 0`. If ANY table has nulls > 0, **STOP — DO NOT PROCEED WITH PHASE 7.** Resolve orphans first.

```bash
# 2. Verify RLS is enabled on notifications, cost_records, metrics_points (from E03)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('notifications','cost_records','metrics_points');
\`,transport:'pg'});console.log(JSON.stringify(r.rows));})();"
```
**Expected:** All three show `rowsecurity: true`.

```bash
# 3. Verify requireAuth is in all CRITICAL routes (from E02)
grep -rn "requireAuth" src/app/api/conversations/route.ts src/app/api/batch-jobs/route.ts --include="*.ts" | wc -l

# 4. Verify cron routes use requireAuthOrCron (from E03)
grep -rn "requireAuthOrCron" src/app/api/cron/ --include="*.ts" | wc -l

# 5. Verify getDocument requires userId (from E03)
grep -n "export async function getDocument" src/lib/rag/services/rag-ingestion-service.ts

# 6. Verify no orphaned records remain
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentQuery({table:'_orphaned_records',limit:100});
console.log('Orphaned records:', r.data?.length || 0);
if(r.data?.length > 0) console.log('WARNING: Resolve these before Phase 7!', r.data);})();"
```

---

## What This Prompt Implements

### Phase 7 — Database Constraints & RLS

| Change | Description |
|--------|-------------|
| 7.1 | Add NOT NULL constraints to `user_id` columns |
| 7.2 | Add performance indexes |
| 7.3 | Enable RLS on `documents` table |
| 7.4 | Clean up duplicate conversation RLS policies |

### Phase 8 — Cleanup & Deprecated Code Removal

| Change | Description |
|--------|-------------|
| 8.1 | Remove all `x-user-id` header reads |
| 8.2 | Remove all NIL UUID and test-user fallbacks |
| 8.3 | Remove module-scope `createClient()` singletons |
| 8.4 | Deprecate `src/lib/supabase.ts` singleton |
| 8.5 | Clean up duplicate conversation RLS policies |

### Integration Tests

| Test | Description |
|------|-------------|
| T1–T3 | Cross-user isolation tests |
| T4, T9 | Ownership stamping tests |
| T5, T6 | Auth enforcement tests |
| T7 | Background job isolation test |
| T8 | Download isolation test |
| T10 | Admin client scoping test |

---

## Phase 7 — Database Constraints & RLS

### ⚠️ PREREQUISITE CHECK — This Must Pass Before ANY Phase 7 Work

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM conversations WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'conversations has NULL user_id — STOP';
  END IF;
  IF EXISTS (SELECT 1 FROM training_files WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'training_files has NULL user_id — STOP';
  END IF;
  IF EXISTS (SELECT 1 FROM batch_jobs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'batch_jobs has NULL user_id — STOP';
  END IF;
  IF EXISTS (SELECT 1 FROM generation_logs WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'generation_logs has NULL user_id — STOP';
  END IF;
  IF EXISTS (SELECT 1 FROM documents WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'documents has NULL user_id — STOP';
  END IF;
  RAISE NOTICE 'All tables clean — safe to proceed';
END \$\$;
\`,transport:'pg'});console.log('Pre-check:', r.success ? 'PASS' : 'FAIL', r.summary);})();"
```

**If this returns FAIL, DO NOT PROCEED.** Fix the data first.

---

### Change 7.1: Add NOT NULL Constraints

**File to create:** `src/scripts/migrations/identity-spine-phase7-constraints.ts`

```typescript
/**
 * Identity Spine — Phase 7: NOT NULL constraints on user_id columns
 * 
 * MUST run AFTER Phase 3 backfill is complete AND verified.
 * MUST run AFTER Phase 4-6 code changes are deployed (so new writes include user_id).
 */

const PHASE7_CONSTRAINTS_SQL = `
-- Enforce NOT NULL on user_id columns
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
`;

export default PHASE7_CONSTRAINTS_SQL;
```

**Execute via SAOL — dry-run first:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:', r.success, r.summary);}
})();"
```

**Verification:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name IN ('conversations','training_files','batch_jobs','generation_logs','documents')
AND column_name = 'user_id';
\`,transport:'pg'});console.log('NOT NULL checks:', JSON.stringify(r.rows));})();"
```
**Expected:** All 5 columns show `is_nullable: 'NO'`.

---

### Change 7.2: Add Performance Indexes

**⚠️ IMPORTANT:** `CREATE INDEX CONCURRENTLY` **CANNOT** be inside a transaction. Use `transaction: false`.

Execute each index individually via SAOL:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const indexes = [
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id_created_at ON conversations(user_id, created_at DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_files_user_id ON training_files(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_id ON documents(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_failed_generations_user_id ON failed_generations(user_id);',
  ];
  for (const sql of indexes) {
    const r=await saol.agentExecuteDDL({sql,transaction:false,transport:'pg'});
    console.log(sql.match(/idx_\\w+/)?.[0] || 'unknown', ':', r.success ? 'OK' : 'FAIL', r.summary);
  }
})();"
```

**Verification:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT indexname FROM pg_indexes WHERE schemaname='public'
AND indexname LIKE 'idx_%user_id%';
\`,transport:'pg'});console.log('User indexes:', r.rows?.length || 0, r.rows?.map(r=>r.indexname));})();"
```
**Expected:** 8 indexes created.

---

### Change 7.3: Enable RLS on `documents` Table

**Current state (verified 2026-02-22):** RLS **disabled**, 0 policies. The **only** production table without RLS.

**Execute via SAOL:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY \"documents_select_own\" ON documents FOR SELECT USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY \"documents_insert_own\" ON documents FOR INSERT WITH CHECK (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY \"documents_update_own\" ON documents FOR UPDATE USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY \"documents_delete_own\" ON documents FOR DELETE USING (
  COALESCE(user_id, author_id) = auth.uid()
);
CREATE POLICY \"documents_service_all\" ON documents FOR ALL USING (auth.role() = 'service_role');
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:', r.success, r.summary);}
})();"
```

**Note:** `COALESCE(user_id, author_id)` handles the transition period. After all documents have `user_id` (Phase 3 backfill ensures this), the `author_id` fallback is just defense-in-depth.

**Create migration script:** `src/scripts/migrations/identity-spine-phase7-rls.ts`

```typescript
/**
 * Identity Spine — Phase 7: RLS for documents table
 * 
 * Note: RLS for notifications, cost_records, metrics_points was already applied in E03 (Phase 5).
 */

const PHASE7_RLS_SQL = `
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_own" ON documents FOR SELECT
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_insert_own" ON documents FOR INSERT
  WITH CHECK (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_update_own" ON documents FOR UPDATE
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_delete_own" ON documents FOR DELETE
  USING (COALESCE(user_id, author_id) = auth.uid());

CREATE POLICY "documents_service_all" ON documents FOR ALL
  USING (auth.role() = 'service_role');
`;

export default PHASE7_RLS_SQL;
```

---

### Change 7.4: Clean Up Duplicate Conversation RLS Policies (from Phase 8.5)

**Current state:** `conversations` has 8 RLS policies with DUPLICATES:

| Policy Name | Action |
|-------------|--------|
| "Users can create own conversations" | ← **KEEP** |
| "Users can delete own conversations" | ← **KEEP** |
| "Users can delete their own conversations" | ← **DROP** (duplicate) |
| "Users can insert their own conversations" | ← **DROP** (duplicate of create) |
| "Users can update own conversations" | ← **KEEP** |
| "Users can update their own conversations" | ← **DROP** (duplicate) |
| "Users can view own conversations" | ← **KEEP** |
| "Users can view their own conversations" | ← **DROP** (duplicate) |

**Step 1: Verify exact policy names first:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'conversations' ORDER BY policyname;
\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"
```

**Step 2: Drop duplicates (confirm names match Step 1 output first):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
DROP POLICY IF EXISTS \"Users can delete their own conversations\" ON conversations;
DROP POLICY IF EXISTS \"Users can insert their own conversations\" ON conversations;
DROP POLICY IF EXISTS \"Users can update their own conversations\" ON conversations;
DROP POLICY IF EXISTS \"Users can view their own conversations\" ON conversations;
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Execute:', r.success, r.summary);}
})();"
```

**Verification:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT policyname FROM pg_policies WHERE tablename = 'conversations';
\`,transport:'pg'});console.log('Remaining policies:', r.rows?.length, r.rows?.map(r=>r.policyname));})();"
```
**Expected:** 4 policies remain (one for each CRUD operation).

---

## Phase 8 — Cleanup & Deprecated Code Removal

### Change 8.1: Remove All `x-user-id` Header Reads

**Verify first:**
```bash
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules"
```

**Expected:** ZERO results. If any remain, they are routes that E02 or E03 missed. Fix them using the same `requireAuth` pattern.

For each remaining instance:
1. Replace `request.headers.get('x-user-id')` with `user.id` from `requireAuth`
2. Remove the header read entirely

---

### Change 8.2: Remove All NIL UUID and Test-User Fallbacks

**Verify:**
```bash
# NIL UUID fallbacks
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"

# Test user fallbacks
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts" | grep -v "__tests__"
```

**Expected:** ZERO results both. If any remain, fix using the same pattern as E02/E03.

---

### Change 8.3: Remove Module-Scope `createClient()` Singletons

**Files with module-scope singletons (verified 2026-02-22):**

| File | Current Pattern |
|------|----------------|
| `src/app/api/categories/route.ts` (~L5) | `const supabase = createClient(...)` at module scope |
| `src/app/api/documents/process/route.ts` (~L7) | Same |
| `src/app/api/documents/route.ts` (~L5) | Same (E03 may have fixed this in Change 5.7) |
| `src/app/api/documents/status/route.ts` (~L5) | Same |
| `src/app/api/documents/upload/route.ts` (~L10) | Same |
| `src/app/api/documents/[id]/route.ts` (~L5) | Same (E03 may have fixed this in Change 5.8) |
| `src/app/api/tags/route.ts` (~L5) | Same |
| `src/app/api/workflow/session/route.ts` (~L6) | Same |

**For each file:**

1. **REMOVE** the module-level `const supabase = createClient(...)` (or similar singleton).
2. **INSIDE** each handler function, create the client per-request:
   ```typescript
   import { createServerSupabaseAdminClient, requireAuth } from '@/lib/supabase-server';
   
   export async function GET(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;
     
     const supabase = createServerSupabaseAdminClient();
     // ... rest of handler
   }
   ```
   
   OR use the request-scoped client (preferred when RLS should apply):
   ```typescript
   import { createServerSupabaseClientFromRequest, requireAuth } from '@/lib/supabase-server';
   
   export async function GET(request: NextRequest) {
     const { user, response } = await requireAuth(request);
     if (response) return response;
     
     const { supabase } = createServerSupabaseClientFromRequest(request);
     // ... rest of handler
   }
   ```

**⚠️ Check first:** Some of these files may have already been fixed in E03 (particularly `documents/route.ts` and `documents/[id]/route.ts`). Only fix files that still have the singleton pattern.

**Verification:**
```bash
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"
# Expected: ZERO results
```

---

### Change 8.4: Deprecate `src/lib/supabase.ts` Singleton

**File:** `src/lib/supabase.ts`

**Action:** Add deprecation notice and verify no service files still import it.

1. Add deprecation comment at top of file:
   ```typescript
   /**
    * @deprecated This module provides a client-side singleton that is null on the server.
    * 
    * USE INSTEAD:
    * - API routes: createServerSupabaseClientFromRequest(request) from '@/lib/supabase-server'
    * - Server components: createServerSupabaseClient() from '@/lib/supabase-server'
    * - Background jobs: createServerSupabaseAdminClient() from '@/lib/supabase-server'
    * - Client components: getSupabaseClient() from '@/lib/supabase-client'
    */
   ```

2. Verify no service files still import it:
   ```bash
   grep -rn "from.*['\"].*supabase['\"]" src/lib/services/ --include="*.ts" | grep -v "supabase-server\|supabase-client\|@supabase\|node_modules"
   ```
   
   **Expected outcome:** After E02's Change 5.18 (conversation-service migration), there should be zero service imports of the deprecated singleton. If any remain, update them to use the appropriate server-side client.

---

### Change 8.5: Additional Cleanup Verification

Run comprehensive verification that all identity spine cleanup is complete:

```bash
# 1. No x-user-id reads remain
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules"

# 2. No NIL UUID fallbacks remain  
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"

# 3. No test-user fallbacks remain
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts"

# 4. No module-scope createClient singletons remain
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"

# 5. TypeScript compilation clean
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit

# ALL expected: ZERO results / ZERO errors
```

---

## Integration Tests

Create the following test files. These are the comprehensive identity spine tests that verify all phases work together.

### Test File 1: `src/__tests__/identity-spine/cross-user-isolation.test.ts`

```typescript
/**
 * Identity Spine Tests T1–T3: Cross-User Isolation
 * 
 * Verifies that:
 * T1: User A's resources are invisible to User B in list endpoints
 * T2: User B cannot access User A's resources by ID
 * T3: User B cannot mutate User A's resources
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Cross-User Isolation', () => {
  // These tests require two authenticated test users.
  // Configure TEST_USER_A_TOKEN and TEST_USER_B_TOKEN in environment.
  
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  
  describe('T1 — List Isolation', () => {
    it('User B cannot see User A conversations in list', async () => {
      // 1. User A creates a conversation
      const createRes = await fetch(`${BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // ... with User A's auth
        body: JSON.stringify({ /* minimal conversation data */ }),
      });
      expect(createRes.status).toBe(200);
      
      // 2. User B lists conversations
      const listRes = await fetch(`${BASE_URL}/api/conversations`, {
        credentials: 'include',
        // ... with User B's auth
      });
      const data = await listRes.json();
      
      // 3. Verify User A's conversation is NOT in User B's list
      // (specific implementation depends on test framework setup)
      expect(data.data?.length || 0).toBe(0); // or filter by known ID
    });
    
    it('User B cannot see User A batch jobs in list', async () => {
      const listRes = await fetch(`${BASE_URL}/api/batch-jobs`, {
        credentials: 'include',
        // ... with User B's auth
      });
      expect(listRes.status).toBe(200);
      // Verify no User A jobs visible
    });
  });
  
  describe('T2 — Single Resource Isolation', () => {
    it('User B gets 404 for User A conversation', async () => {
      // Assumes conversationId from User A is known
      const res = await fetch(`${BASE_URL}/api/conversations/${/* userA_conversationId */}`, {
        credentials: 'include',
        // ... with User B's auth
      });
      expect(res.status).toBe(404);
    });
  });
  
  describe('T3 — Mutation Isolation', () => {
    it('User B cannot PATCH User A conversation', async () => {
      const res = await fetch(`${BASE_URL}/api/conversations/${/* userA_conversationId */}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // ... with User B's auth
        body: JSON.stringify({ status: 'reviewed' }),
      });
      expect(res.status).toBe(404);
    });
    
    it('User B cannot DELETE User A conversation', async () => {
      const res = await fetch(`${BASE_URL}/api/conversations/${/* userA_conversationId */}`, {
        method: 'DELETE',
        credentials: 'include',
        // ... with User B's auth
      });
      expect(res.status).toBe(404);
    });
  });
});
```

### Test File 2: `src/__tests__/identity-spine/auth-enforcement.test.ts`

```typescript
/**
 * Identity Spine Tests T5, T6: Auth Enforcement
 * 
 * T5: Unauthenticated requests return 401
 * T6: Spoofed x-user-id headers are ignored
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Auth Enforcement', () => {
  describe('T5 — Unauthenticated Rejection', () => {
    const endpoints = [
      { method: 'GET', path: '/api/conversations' },
      { method: 'POST', path: '/api/conversations' },
      { method: 'GET', path: '/api/batch-jobs' },
      { method: 'GET', path: '/api/generation-logs' },
      { method: 'GET', path: '/api/failed-generations' },
      { method: 'GET', path: '/api/templates' },
      { method: 'GET', path: '/api/performance' },
      { method: 'GET', path: '/api/training-files' },
      { method: 'GET', path: '/api/export/history' },
    ];
    
    endpoints.forEach(({ method, path }) => {
      it(`${method} ${path} returns 401 without auth`, async () => {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
          body: method === 'POST' ? JSON.stringify({}) : undefined,
        });
        expect(res.status).toBe(401);
      });
    });
  });
  
  describe('T6 — Spoofed Header Ignored', () => {
    it('x-user-id header is ignored when authenticated', async () => {
      const spoofedUserId = '00000000-0000-0000-0000-000000000001';
      
      const res = await fetch(`${BASE_URL}/api/conversations`, {
        headers: {
          'x-user-id': spoofedUserId,
        },
        credentials: 'include',
        // ... with User A's auth
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      // Verify returned data belongs to authenticated user, NOT spoofed user
    });
  });
});
```

### Test File 3: `src/__tests__/identity-spine/background-job-isolation.test.ts`

```typescript
/**
 * Identity Spine Test T7: Background Job Isolation
 * 
 * Verifies Inngest process-rag-document rejects mismatched userId
 */

import { describe, it, expect } from 'vitest';

describe('Background Job Isolation', () => {
  it('T7 — Inngest rejects document not owned by event userId', async () => {
    // This test verifies the ownership check added in E03 Change 6.6
    // Test by attempting to invoke the Inngest function with a mismatched userId
    
    // Note: Full integration test requires Inngest dev server
    // Unit test approach: import the ownership check logic and verify it
    
    // The check should be:
    // if (!ownerCheck || ownerCheck.user_id !== userId) throw Error
  });
});
```

### Test File 4: `src/__tests__/identity-spine/download-isolation.test.ts`

```typescript
/**
 * Identity Spine Test T8: Download Isolation
 * 
 * Verifies users cannot download other users' resources
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Download Isolation', () => {
  it('T8 — User B cannot download User A training file', async () => {
    const res = await fetch(`${BASE_URL}/api/training-files/${/* userA_fileId */}/download`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });
  
  it('T8 — User B cannot download User A pipeline adapter', async () => {
    const res = await fetch(`${BASE_URL}/api/pipeline/jobs/${/* userA_jobId */}/download`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });
  
  it('T8 — User B cannot download User A export', async () => {
    const res = await fetch(`${BASE_URL}/api/export/download/${/* userA_exportId */}`, {
      credentials: 'include',
      // ... with User B's auth
    });
    expect(res.status).toBe(404);
  });
});
```

### Test File 5: `src/__tests__/identity-spine/admin-client-scoping.test.ts`

```typescript
/**
 * Identity Spine Test T10: Admin Client Scoping
 * 
 * Verifies that service functions using admin client still scope to user
 */

import { describe, it, expect } from 'vitest';

describe('Admin Client Scoping', () => {
  it('T10 — getDocument requires userId and rejects wrong user', async () => {
    // Import the function
    // const { getDocument } = require('@/lib/rag/services/rag-ingestion-service');
    
    // Call with wrong userId
    // const result = await getDocument(docId, wrongUserId);
    // expect(result.success).toBe(false);
    // expect(result.error).toBe('Document not found');
  });
  
  it('T10 — RLS on notifications restricts to own user', async () => {
    // Use a non-admin client to query notifications
    // Verify only owns user's notifications are returned
  });
  
  it('T10 — RLS on cost_records restricts to own user', async () => {
    // Same pattern as notifications
  });
});
```

### Test File 6: `src/__tests__/identity-spine/ownership-stamping.test.ts`

```typescript
/**
 * Identity Spine Tests T4, T9: Ownership Stamping
 * 
 * T4: New records get user_id stamped
 * T9: Batch operations only affect owned records
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Ownership Stamping', () => {
  it('T4 — New conversation gets user_id set', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      // ... with User A's auth
      body: JSON.stringify({ /* minimal conversation data */ }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Verify the record in DB has user_id set to User A's ID
  });
  
  it('T9 — Bulk action only affects owned conversations', async () => {
    // 1. Create conversation as User A
    // 2. Try bulk-action as User B with User A's conversation ID
    // 3. Verify User A's conversation is unchanged
    // 4. Verify skippedCount > 0 in response
  });
});
```

---

## Final Checkpoint — Complete Identity Spine Verification

### Database Verification

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  // 1. NOT NULL constraints
  const r1=await saol.agentExecuteDDL({sql:\`
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name IN ('conversations','training_files','batch_jobs','generation_logs','documents')
AND column_name = 'user_id';\`,transport:'pg'});
  console.log('NOT NULL checks:', JSON.stringify(r1.rows));

  // 2. RLS enabled on all target tables
  const r2=await saol.agentExecuteDDL({sql:\`
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('documents','notifications','cost_records','metrics_points');
\`,transport:'pg'});
  console.log('RLS enabled:', JSON.stringify(r2.rows));

  // 3. User indexes
  const r3=await saol.agentExecuteDDL({sql:\`
SELECT indexname FROM pg_indexes WHERE schemaname='public'
AND indexname LIKE 'idx_%user_id%';
\`,transport:'pg'});
  console.log('User indexes:', r3.rows?.length||0);

  // 4. Conversation policies (should be 4, not 8)
  const r4=await saol.agentExecuteDDL({sql:\`
SELECT COUNT(*) as count FROM pg_policies WHERE tablename = 'conversations';
\`,transport:'pg'});
  console.log('Conversation policies:', r4.rows?.[0]?.count);
})();"
```

**Expected:**
- All 5 `user_id` columns: `is_nullable: 'NO'`
- All 4 tables: `rowsecurity: true`
- 8 user indexes
- 4 conversation policies (duplicates removed)

### Codebase Verification

```bash
# No x-user-id reads remain
grep -rn "x-user-id" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules"

# No NIL UUID fallbacks remain
grep -rn "00000000-0000-0000-0000-000000000000" src/app/api/ --include="*.ts" | grep -v "__tests__"

# No test-user fallbacks remain
grep -rn "'test-user'\|'test_user'" src/app/api/ --include="*.ts"

# No module-scope createClient singletons remain
grep -rn "^const supabase = createClient" src/app/api/ --include="*.ts"

# TypeScript compilation clean
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit
# ALL expected: ZERO results / ZERO errors
```

---

## Summary of Files Created/Modified

### Files Created:
| File | Purpose |
|------|---------|
| `src/scripts/migrations/identity-spine-phase7-constraints.ts` | NOT NULL constraint SQL |
| `src/scripts/migrations/identity-spine-phase7-rls.ts` | Documents table RLS SQL |
| `src/__tests__/identity-spine/cross-user-isolation.test.ts` | Tests T1–T3 |
| `src/__tests__/identity-spine/auth-enforcement.test.ts` | Tests T5, T6 |
| `src/__tests__/identity-spine/background-job-isolation.test.ts` | Test T7 |
| `src/__tests__/identity-spine/download-isolation.test.ts` | Test T8 |
| `src/__tests__/identity-spine/ownership-stamping.test.ts` | Tests T4, T9 |
| `src/__tests__/identity-spine/admin-client-scoping.test.ts` | Test T10 |

### Files Modified:
| File | Change |
|------|--------|
| `src/lib/supabase.ts` | Deprecation notice added |
| `src/app/api/categories/route.ts` | Remove module-scope singleton |
| `src/app/api/documents/process/route.ts` | Remove module-scope singleton |
| `src/app/api/documents/status/route.ts` | Remove module-scope singleton |
| `src/app/api/documents/upload/route.ts` | Remove module-scope singleton |
| `src/app/api/tags/route.ts` | Remove module-scope singleton |
| `src/app/api/workflow/session/route.ts` | Remove module-scope singleton |
| Any remaining files with `x-user-id`, NIL UUID, or `test-user` patterns | Final cleanup |

### Database Changes (via SAOL):
| Change | Description |
|--------|-------------|
| NOT NULL constraints | `user_id` on 5 tables |
| Performance indexes | 8 indexes on `user_id` columns |
| Documents RLS | 5 policies (COALESCE pattern) |
| Conversation policy cleanup | Drop 4 duplicate policies |

---

## Warnings

### W3: Migration Ordering Is Critical
Phase 7 (NOT NULL constraints) MUST NOT run if Phase 3 backfill was incomplete. The preflight check above enforces this.

### W5: Large Table Index Creation Lock Contention
`CREATE INDEX CONCURRENTLY` runs outside transactions to avoid locks. Individual index creation may take time on large tables.

### W8: DO NOT Deploy Phase 7 Before Phase 3 Verification
NULL rows + NOT NULL constraint = table lock failure during migration. This is the single most dangerous operation in the entire identity spine.

### W9: DO NOT Remove `created_by` Columns
`created_by` is the **audit actor field** (who performed the action). `user_id` is the **canonical ownership field** (who owns the record). Both coexist permanently.

---

## Complete Identity Spine Summary

After all 4 execution prompts complete, the platform achieves:

| Metric | Before | After |
|--------|--------|-------|
| Routes with `requireAuth` | ~10 (RAG only) | ALL routes |
| Routes with spoofable auth (`x-user-id`) | 13 | 0 |
| Routes with NIL UUID fallback | 8 | 0 |
| Routes with `test-user` fallback | 2 | 0 |
| Tables with `user_id NOT NULL` | 7 (RAG + datasets + PTJ) | 12 (all) |
| Tables with RLS enabled | 9 | 13 |
| Module-scope singletons | 8 | 0 |
| Service methods with mandatory `userId` | ~3 | ALL query methods |
| RAG service identity gaps | 3 (GAP-R1, R2, R3) | 0 |
| Cron routes fail-closed | 0 | 5 |

**Minimum for soft launch:** E01–E03 (all CRITICAL and HIGH gaps closed)
**Required for GA:** E01–E04 (all phases complete)


++++++++++++++++++



