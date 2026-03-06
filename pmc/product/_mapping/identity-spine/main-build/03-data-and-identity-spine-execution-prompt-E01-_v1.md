# Data & Identity Spine — Execution Prompt E01: Foundation, Auth Infrastructure & Database Migration

**Version:** 1.0
**Date:** 2026-02-22
**Section:** E01 — Preflight, Auth Infrastructure, Schema Migration & Data Backfill
**Prerequisites:** None — this is the first execution prompt
**Builds Upon:** Nothing — fresh context window
**Specification Source:** `02-data-and-identity-spine-detailed-specification_v6.md`

---

## Division of Work Across All 4 Prompts

| Prompt | Phases | Description |
|--------|--------|-------------|
| **E01 (this file)** | 0, 1, 2, 3 | Preflight verification, auth infrastructure, DB schema migration, data backfill |
| **E02** | 4 + service layer | CRITICAL route security fixes (C1–C16), batch-job-service & conversation-service refactoring |
| **E03** | 5, 6 | HIGH route/service fixes (H1–H15), MEDIUM fixes (M1–M13), RAG gap fixes |
| **E04** | 7, 8 + tests | Database constraints & RLS, cleanup, deprecated code removal, testing |

---

========================


## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | Status | Flow |
|------|--------|------|
| **LoRA Training** | Complete | Generate Conversations → Enrich → Training Files → Train LoRA → Deploy → Test & Evaluate |
| **RAG Frontier** | Active development | Upload Document → 6-Pass Ingestion (Inngest) → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage |
| AI — Ingestion | Claude Sonnet 4.5 × 4 passes, Haiku 4.5 × 1 pass, Opus 4.6 × 1 pass |
| AI — Retrieval | Claude Haiku 4.5 for HyDE, response gen, self-eval, reranking |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) |
| Background Jobs | Inngest |
| Deployment | Vercel (frontend + API routes) |

### Codebase Structure

```
v4-show/
├── src/
│   ├── app/                          # App Router pages + API routes
│   │   ├── (dashboard)/              # Dashboard pages
│   │   └── api/                      # API routes
│   ├── components/                   # React components
│   ├── hooks/                        # Custom React hooks
│   ├── lib/
│   │   ├── rag/                      # RAG services, providers, config
│   │   ├── services/                 # Business logic services
│   │   ├── file-processing/          # Text extraction
│   │   └── supabase/                 # Supabase client
│   ├── inngest/functions/            # Background job pipelines
│   └── types/                        # TypeScript type definitions
├── supa-agent-ops/                   # SAOL library (CLI only, NOT for codebase imports)
├── scripts/                          # Utility & migration scripts
└── supabase/                         # Supabase config
```

---

## SAOL — Mandatory for All Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database DDL/DML operations.**

SAOL is a CLI-focused tool used during local development. It is NOT imported into the codebase. You run it from the terminal.

**Key SAOL patterns:**

```javascript
// Schema changes (DDL) — always dry-run first
await agentExecuteDDL({
  sql: 'ALTER TABLE ... ;',
  transport: 'pg',
  transaction: true,
  dryRun: true,  // ALWAYS dry-run first, then set false to apply
});
```

**One-liner template for SAOL commands:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\`YOUR_SQL_HERE\`,dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

**Rules:**
1. **Service Role Key** — all operations require `SUPABASE_SERVICE_ROLE_KEY` (configured in `.env.local`)
2. **Dry-run first** — always `dryRun: true` then `dryRun: false`
3. **Transport: 'pg'** — always use pg transport for DDL
4. **Transaction: true** — wrap schema changes in transactions
5. **Do NOT import SAOL into the codebase** — it is a CLI tool only

---

## Operating Principles

- **Do not re-investigate pre-verified facts** — this prompt contains verified codebase state
- **Do not make assumptions** — if something is ambiguous, ask
- **All code changes must include exact file paths**
- **Human action steps** must be clearly delineated and copy-paste ready
- **The codebase may have evolved** since the specifications were written — confirm file locations exist before editing

---

## What This Prompt Implements

This prompt implements **Phases 0–3** of the Identity Spine specification:

| Phase | Description | Changes |
|-------|-------------|---------|
| **Phase 0** | Preflight verification (READ-ONLY) | 0.1–0.6 |
| **Phase 1** | Auth infrastructure — add `requireAuthOrCron` helper | 1.1 |
| **Phase 2** | Database schema migration — add `user_id` and audit columns | 2.1 |
| **Phase 3** | Data backfill & orphan quarantine | 3.1–3.2 |

**Build Artifacts Produced for E02:**
- `requireAuthOrCron` function in `src/lib/supabase-server.ts` (E02 will use it for cron routes)
- New `user_id` columns on legacy tables (E02 will write to these columns)
- Backfilled data ensuring no NULL `user_id` values on existing records
- Migration script files in `src/scripts/migrations/`

---

## Phase 0 — Preflight Verification

**All Phase 0 changes are READ-ONLY. Do not modify any files.**

### Change 0.1: Verify `requireAuth` Function Signature

**File:** `src/lib/supabase-server.ts` (~168 lines)
**Action:** READ-ONLY — no changes needed.

Verify `requireAuth(request: NextRequest)` exists at approximately line 136 and returns `{ user: User | null, response: NextResponse | null }`.

**Expected behavior:**
- **GIVEN** `requireAuth` is called with valid auth cookies **THEN** returns `{ user: <User object with .id UUID>, response: null }`
- **GIVEN** `requireAuth` is called with no or expired cookies **THEN** returns `{ user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }`

**Verify with:**
```bash
grep -n "export async function requireAuth" src/lib/supabase-server.ts
```

### Change 0.2: Verify SAOL Availability

Run this command to confirm SAOL is operational:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const s=require('.');console.log('SAOL exports:', Object.keys(s).filter(k=>k.startsWith('agent')))"
```
**Expected:** `agentQuery`, `agentCount`, `agentExecuteDDL`, `agentIntrospectSchema`, etc.

### Change 0.3: Verify `generate-with-scaffolding` Is Already Secure

**File:** `src/app/api/conversations/generate-with-scaffolding/route.ts`
**Action:** READ-ONLY — Already uses `requireAuth`. This route is EXCLUDED from Phase 4.

```bash
grep -n "requireAuth" src/app/api/conversations/generate-with-scaffolding/route.ts
```
**Expected:** Match found (was at L45, may have shifted).

### Change 0.4: Verify RAG Route Security

**Action:** READ-ONLY — Confirm all `/api/rag/*` routes use `requireAuth`.
```bash
grep -rn "requireAuth" src/app/api/rag/ --include="*.ts" | wc -l
```
**Expected:** ≥30 occurrences. All RAG routes are already secured — no identity spine changes needed for RAG routes.

### Change 0.5: Verify `requireAuthOrCron` Does NOT Exist Yet

**File:** `src/lib/supabase-server.ts`
**Action:** READ-ONLY — Confirm `requireAuthOrCron` is NOT yet defined. Phase 1 will add it.
```bash
grep -n "requireAuthOrCron" src/lib/supabase-server.ts
```
**Expected:** No matches found.

### Change 0.6: Verify RAG Retrieval Service Function Positions

**Action:** READ-ONLY — Confirm current function positions.
```bash
grep -n "^export async function\|^export function\|^async function\|^function " \
  src/lib/rag/services/rag-retrieval-service.ts
```
**Expected key positions:** `generateLoRAResponse` at ~L730, `selfEvaluate` at ~L879, `queryRAG` at ~L1162, `getQueryHistory` at ~L1659.

---

## Phase 1 — Auth Infrastructure

### Change 1.1: Add `requireAuthOrCron` Helper

**File:** `src/lib/supabase-server.ts` (~168 lines)
**Action:** MODIFY — Add new exported function at the END of the file (after the last export)

**Why:** All 5 cron routes currently fail-open when `CRON_SECRET` is not configured. This helper centralizes the fail-closed pattern. E03 will use this helper when securing cron routes.

**Current state (verified 2026-02-22):**
- `requireAuth` exists at ~L136
- `requireAuthOrCron` does NOT exist yet
- The file ends at ~L168 with `createServerSupabaseClientWithAuth` (deprecated alias)

**Implementation — Add this AFTER the last function in the file:**

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

**Ensure the types `User` and `NextResponse` are already imported at the top of the file.** They should be — verify with:
```bash
grep -n "import.*NextResponse\|import.*User" src/lib/supabase-server.ts
```

**Acceptance Criteria:**
- **GIVEN** a request with valid `Bearer {CRON_SECRET}` AND `CRON_SECRET` is set **THEN** returns `{ isCron: true, user: null, response: null }`
- **GIVEN** an invalid Bearer token AND `CRON_SECRET` is set **THEN** returns 401
- **GIVEN** any Bearer token AND `CRON_SECRET` is NOT set **THEN** returns 500 (fail-closed)
- **GIVEN** no Bearer header but valid auth cookies **THEN** falls through to `requireAuth`
- **GIVEN** no Bearer header and no auth cookies **THEN** returns 401

**Verify after:**
```bash
grep -n "export async function requireAuthOrCron" src/lib/supabase-server.ts
```

---

## Phase 2 — Database Schema Migration

### Change 2.1: Add `user_id` and Audit Columns to Legacy Tables

**Action:** Create migration script file AND execute it via SAOL.

**File to create:** `src/scripts/migrations/identity-spine-phase2-add-columns.ts`

**Current database state (verified 2026-02-22 via SAOL):**
| Table | Has `created_by` | Has `user_id` | Has `updated_by` |
|-------|-----------------|---------------|------------------|
| `conversations` | ✅ `UUID NULL` | ❌ MISSING | ❌ MISSING |
| `training_files` | ✅ `UUID NOT NULL` | ❌ MISSING | ❌ MISSING |
| `batch_jobs` | ✅ `UUID NOT NULL` | ❌ MISSING | ❌ MISSING |
| `generation_logs` | ✅ `UUID NOT NULL` | ❌ MISSING | N/A |
| `failed_generations` | ✅ `UUID NOT NULL` | ❌ MISSING | N/A |
| `documents` | ❌ (has `author_id UUID NULL`) | ❌ MISSING | N/A |
| `datasets` | ❌ MISSING | ✅ `UUID NOT NULL` | ❌ MISSING |
| `pipeline_training_jobs` | ❌ MISSING | ✅ `UUID NOT NULL` | ❌ MISSING |
| `rag_knowledge_bases` | N/A | ✅ `UUID NOT NULL` | ❌ MISSING |
| `rag_documents` | N/A | ✅ `UUID NOT NULL` | ❌ MISSING |

**Migration script content (`src/scripts/migrations/identity-spine-phase2-add-columns.ts`):**

```typescript
/**
 * Identity Spine — Phase 2: Add user_id and audit columns to legacy tables
 * 
 * Run via SAOL from terminal:
 * cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});... "
 * 
 * Columns added are NULLABLE initially — Phase 3 backfills, Phase 7 adds NOT NULL.
 * All use IF NOT EXISTS for idempotency.
 */

const PHASE2_SQL = `
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
`;

export default PHASE2_SQL;
```

**Execute via SAOL — Step 1: Dry-run:**
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
  console.log('Dry-run result:', dry.success, dry.summary);
})();"
```

**If dry-run succeeds, execute — Step 2: Apply:**
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
  const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});
  console.log('Execute result:', r.success, r.summary);
})();"
```

**Verification — confirm columns exist:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteDDL({sql:\`
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name IN ('user_id', 'created_by', 'updated_by')
AND table_name IN ('conversations','training_files','batch_jobs','generation_logs','failed_generations','documents','datasets','pipeline_training_jobs','rag_knowledge_bases','rag_documents')
ORDER BY table_name, column_name;
\`,transport:'pg'});console.log(JSON.stringify(r.rows,null,2));})();"
```

**Acceptance Criteria:**
- **GIVEN** the `conversations` table exists without a `user_id` column **WHEN** the migration executes **THEN** `conversations` has a nullable `user_id UUID` column with FK to `auth.users(id)` ON DELETE CASCADE
- **GIVEN** the migration is executed a second time **THEN** no errors (idempotent via `IF NOT EXISTS`)
- All 10 tables listed above have the new columns

---

## Phase 3 — Data Backfill & Orphan Quarantine

### Change 3.1: Backfill `user_id` from Existing Ownership Columns

**Action:** Create migration script AND execute via SAOL.

**File to create:** `src/scripts/migrations/identity-spine-phase3-backfill.ts`

**Logic:**
- Tables with `created_by` → copy into `user_id`
- `documents` table → copy `author_id` into `user_id`
- Tables with `user_id` but no `created_by` → copy `user_id` into `created_by`
- Records with BOTH `created_by IS NULL AND user_id IS NULL` → log as orphans

**Migration script content (`src/scripts/migrations/identity-spine-phase3-backfill.ts`):**

```typescript
/**
 * Identity Spine — Phase 3: Backfill user_id and quarantine orphans
 * 
 * MUST run AFTER Phase 2 (columns exist).
 * MUST complete BEFORE Phase 7 (NOT NULL constraints).
 */

const PHASE3_BACKFILL_SQL = `
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
`;

const PHASE3_QUARANTINE_SQL = `
-- Drop existing empty shell of _orphaned_records (shows 0 columns in introspection)
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
`;

export { PHASE3_BACKFILL_SQL, PHASE3_QUARANTINE_SQL };
```

**Execute via SAOL — Step 1: Backfill (dry-run then apply):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
UPDATE conversations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE training_files SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE batch_jobs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE generation_logs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE failed_generations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
UPDATE documents SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;
UPDATE datasets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
UPDATE pipeline_training_jobs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL;
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Backfill dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Backfill execute:', r.success, r.summary);}
})();"
```

**Execute via SAOL — Step 2: Orphan quarantine (dry-run then apply):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
DROP TABLE IF EXISTS _orphaned_records;
CREATE TABLE IF NOT EXISTS _orphaned_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  resolution TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT
);
INSERT INTO _orphaned_records (source_table, source_id) SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;
INSERT INTO _orphaned_records (source_table, source_id) SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;
INSERT INTO _orphaned_records (source_table, source_id) SELECT 'training_files', id FROM training_files WHERE created_by IS NULL AND user_id IS NULL;
INSERT INTO _orphaned_records (source_table, source_id) SELECT 'generation_logs', id FROM generation_logs WHERE created_by IS NULL AND user_id IS NULL;
INSERT INTO _orphaned_records (source_table, source_id) SELECT 'documents', id FROM documents WHERE author_id IS NULL AND user_id IS NULL;
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Quarantine dry-run:', dry.success, dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Quarantine execute:', r.success, r.summary);}
})();"
```

**Acceptance Criteria:**
- **GIVEN** `conversations` rows have `created_by` set but `user_id IS NULL` **WHEN** the backfill runs **THEN** `user_id = created_by` for all such rows
- **GIVEN** `documents` rows have `author_id` set but `user_id IS NULL` **WHEN** the backfill runs **THEN** `user_id = author_id`
- **GIVEN** orphaned records exist (both `created_by IS NULL AND user_id IS NULL`) **WHEN** the backfill runs **THEN** they are logged in `_orphaned_records` for manual resolution

---

## Checkpoint Verification — After Phase 3

**This checkpoint MUST pass before proceeding to E02.**

### Verify zero NULL user_id values:
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
**Expected:** orphans = 0 for all tables. If any orphans remain, they have been logged to `_orphaned_records` and must be manually resolved before E04 deploys NOT NULL constraints.

### Verify orphan log:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentQuery({table:'_orphaned_records',limit:100});console.log('Orphaned records:', r.data?.length || 0, r.data);})();"
```

### Verify requireAuthOrCron was added:
```bash
grep -n "export async function requireAuthOrCron" src/lib/supabase-server.ts
```
**Expected:** One match found. 

### Verify TypeScript compilation:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No new errors introduced by Phase 1 changes.

---

## Summary of Files Created/Modified

### Files Created:
| File | Purpose |
|------|---------|
| `src/scripts/migrations/identity-spine-phase2-add-columns.ts` | Phase 2 migration SQL (add columns) |
| `src/scripts/migrations/identity-spine-phase3-backfill.ts` | Phase 3 backfill + quarantine SQL |

### Files Modified:
| File | Change |
|------|--------|
| `src/lib/supabase-server.ts` | Added `requireAuthOrCron` function at end of file |

### Database Changes:
| Table | Columns Added |
|-------|--------------|
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

### Tables Created:
| Table | Purpose |
|-------|---------|
| `_orphaned_records` | Quarantine table for records with no ownership |

---

## Warnings

### W3: Migration Ordering Is Critical
Phase 2 (add columns) MUST complete before Phase 3 (backfill). Phase 3 MUST complete before E04's Phase 7 (NOT NULL constraints). If Phase 7 runs while NULL values remain, the ALTER TABLE will FAIL and lock the table.

### W9: DO NOT Remove `created_by` Columns
`created_by` is the **audit actor field** (who performed the action). `user_id` is the **canonical ownership field** (who owns the record). Both coexist after migration.

### W10: DO NOT Change Supabase Auth Infrastructure
The existing auth infrastructure (`requireAuth`, `createServerSupabaseClient`, etc.) is correct. Only route-level enforcement changes are needed (in E02–E03).

---

## What E02 Expects From E01

E02 will begin by verifying these artifacts exist:
1. `requireAuthOrCron` function exported from `src/lib/supabase-server.ts`
2. `user_id` column on `conversations`, `training_files`, `batch_jobs`, `generation_logs`, `failed_generations`, `documents`
3. `created_by` column on `datasets`, `pipeline_training_jobs`
4. `updated_by` column on all 10 tables listed above
5. Zero orphan records (or orphans logged in `_orphaned_records`)
6. Migration scripts in `src/scripts/migrations/`


++++++++++++++++++



