# Data & Identity Spine — Execution Prompt E03.5: Post-Identity-Spine Cleanup

**Version:** 1.0
**Date:** 2026-02-22
**Section:** E03.5 — kv_store Drop, Global Data Reset, Chunks Module Removal
**Prerequisites:** E01, E02, E03 must all be complete
**Execution Window:** After E03, before E04
**Specification Source:** `03-data-and-identity-spine-execution-prompt-E01-_v1-cleanup-spec_v2.md`

---

## Division of Work

| Prompt | Description |
|--------|-------------|
| **E01** (complete) | Auth infrastructure, DB schema migration, data backfill |
| **E02** (complete) | CRITICAL route security fixes, service layer refactoring |
| **E03** (complete) | HIGH/MEDIUM route fixes, RAG gap fixes |
| **E03.5 (this file)** | Drop kv_store tables, global data reset, Chunks Module code + DB removal |
| **E04** | NOT NULL constraints + RLS (runs cleanly because data is now clean) |

---

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire prompt** — do not skip ahead to execute before reading all phases
2. **Verify each file path exists** before deleting or editing it — confirm with directory listing or read tools
3. **Execute all database operations via SAOL only** — never use raw `supabase-js` or `psql`
4. **Use the recommended reset: E-Script-2 (Selective)** — preserves the three designated test artifacts
5. **Follow the phase order exactly** — phases have dependencies; out-of-order execution will break things

### Human vs Agent Work

Steps marked **[HUMAN]** require James to take action manually. Steps marked **[AGENT]** are executed by this agent. Steps not marked are agent-executed.

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 App Router application.

```
v4-show/
├── src/
│   ├── app/                      # Pages + API routes
│   ├── components/               # React components
│   ├── lib/                      # Services and utilities
│   ├── stores/                   # Zustand state stores
│   └── types/                    # TypeScript types
├── supa-agent-ops/               # SAOL (CLI tool — NOT imported into codebase)
└── scripts/cleanup/              # Will contain the reset scripts created below
```

---

## SAOL Setup

All database operations use SAOL (Supabase Agent Ops Library).

```bash
# Template for all SAOL operations:
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{ /* ... */ })();"
```

SAOL reads credentials from `c:/Users/james/Master/BrightHub/BRun/v4-show/.env.local`.
The `supa-agent-ops/` directory must be the working directory for all SAOL calls.

---

## Preserved Record IDs (Reference — do not modify)

These three records and their linked data must survive the selective reset:

| Record | Table | ID |
|--------|-------|----|
| Training File "Batch 6- 12 conversations #1" | `training_files` | `e57e3266-3acc-4252-8b92-b165993076fb` |
| Dataset "Batch 6- 12 conversations #1" | `datasets` | `8ec1aba1-6618-45ad-b10c-1970ee95b9ec` |
| Pipeline Job "Batch-6-thru-12_v1" | `pipeline_training_jobs` | `6fd5ac79-c54b-4927-8138-ca159108bcae` |
| 242 linked conversations | `training_file_conversations` | FK to training file above |
| Adapter file (storage — do not delete) | `lora-models` bucket | `adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz` |

---

## Phase 0 — Preflight Verification

**All checks are READ-ONLY. Confirm before proceeding.**

```bash
# 0.1 — Verify requireAuthOrCron exists (E01 artifact)
grep -n "export async function requireAuthOrCron" src/lib/supabase-server.ts
# Expected: line 180

# 0.2 — Verify kv_store tables exist (will be dropped in Phase A)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT COUNT(*) AS kv_count FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'kv_store%'
\`,transport:'pg'});console.log('kv_store tables found:',r.rows[0].kv_count);})();"
# Expected: 35

# 0.3 — Verify preserved records exist before reset
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT 'training_file' AS type, name AS label FROM training_files WHERE id='e57e3266-3acc-4252-8b92-b165993076fb'
UNION ALL SELECT 'dataset', name FROM datasets WHERE id='8ec1aba1-6618-45ad-b10c-1970ee95b9ec'
UNION ALL SELECT 'pipeline_job', job_name FROM pipeline_training_jobs WHERE id='6fd5ac79-c54b-4927-8138-ca159108bcae'
\`,transport:'pg'});console.log('Preserved records:',JSON.stringify(r.rows));})();"
# Expected: 3 rows — all three named records found

# 0.4 — Verify Identity Spine: preserved records have valid user_id
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT COUNT(*) FILTER (WHERE user_id IS NULL) AS null_uid FROM training_files WHERE id='e57e3266-3acc-4252-8b92-b165993076fb'
\`,transport:'pg'});console.log('Null user_id on preserved training_file:',r.rows[0].null_uid);})();"
# Expected: 0

# 0.5 — Verify chunks workflow pages still exist (will be deleted in Phase C)
# Just confirm current state:
ls src/app/\(workflow\)/ 2>/dev/null && echo "workflow folder exists" || echo "workflow folder already gone"
ls src/app/\(dashboard\)/upload/page.tsx 2>/dev/null && echo "upload page exists" || echo "upload page already gone"
```

If any preflight check fails unexpectedly, stop and investigate before proceeding.

---

## Phase A — Drop 35 `kv_store_*` Tables

**What they are:** Auto-generated Figma Make key-value tables from early UI prototyping. Zero connections to the Next.js application. Safe to drop.

**Create the script file first, then execute:**

```bash
mkdir -p "c:/Users/james/Master/BrightHub/BRun/v4-show/scripts/cleanup"
```

Create file `c:/Users/james/Master/BrightHub/BRun/v4-show/scripts/cleanup/A-drop-kv-store-tables.js`:

```javascript
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const KV_TABLES = [
  'kv_store_03a1393c', 'kv_store_07318469', 'kv_store_09344eeb',
  'kv_store_0b28297d', 'kv_store_145397cd', 'kv_store_2817f326',
  'kv_store_302d9cc9', 'kv_store_343e9cfc', 'kv_store_37208a88',
  'kv_store_390564ab', 'kv_store_441d0b93', 'kv_store_4f4f426a',
  'kv_store_59ff7219', 'kv_store_5e95744b', 'kv_store_6256688b',
  'kv_store_756e3c41', 'kv_store_7699b7f5', 'kv_store_87edc922',
  'kv_store_980c69a1', 'kv_store_9e3c16a7', 'kv_store_a7a27b87',
  'kv_store_a9be6573', 'kv_store_a9d7c19e', 'kv_store_adc245e5',
  'kv_store_ae300d0d', 'kv_store_b4534e71', 'kv_store_ba171cb4',
  'kv_store_c0b8a04e', 'kv_store_c54d9cb7', 'kv_store_ca5609f4',
  'kv_store_d138e5d5', 'kv_store_e2a43e9f', 'kv_store_e3a9c0cc',
  'kv_store_eefe95f0', 'kv_store_f681842d',
];

const dropSQL = KV_TABLES.map(t => `DROP TABLE IF EXISTS ${t};`).join('\n');

(async () => {
  console.log(`Dropping ${KV_TABLES.length} kv_store tables...`);
  const dry = await saol.agentExecuteDDL({ sql: dropSQL, dryRun: true, transaction: true, transport: 'pg' });
  console.log('Dry-run:', dry.success, dry.summary);
  if (!dry.success) { console.error('Dry-run failed. Abort.'); process.exit(1); }
  const result = await saol.agentExecuteDDL({ sql: dropSQL, transaction: true, transport: 'pg' });
  console.log('Applied:', result.success, result.summary);
})();
```

**Execute from `supa-agent-ops/`:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node "../scripts/cleanup/A-drop-kv-store-tables.js"
```

**Verify:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`SELECT COUNT(*) AS remaining FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'kv_store%'\`,transport:'pg'});console.log('kv_store tables remaining:',r.rows[0].remaining);})();"
```
**Expected:** `remaining: 0`

**Acceptance Criteria:**
- **GIVEN** 35 kv_store tables exist **WHEN** script runs **THEN** all 35 are dropped
- **GIVEN** script runs a second time **THEN** no error (IF NOT EXISTS makes it idempotent)

---

## Phase E — Global Data Reset (RECOMMENDED: Selective)

**Run E-Script-2 (Selective).** This preserves the three designated test artifacts and their 242 linked conversations. Use E-Script-1 only if you want a completely bare database.

**Create the script file:**

Create file `c:/Users/james/Master/BrightHub/BRun/v4-show/scripts/cleanup/E2-global-reset-selective.js`:

```javascript
require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const PRESERVE_TF_ID  = 'e57e3266-3acc-4252-8b92-b165993076fb';
const PRESERVE_DS_ID  = '8ec1aba1-6618-45ad-b10c-1970ee95b9ec';
const PRESERVE_JOB_ID = '6fd5ac79-c54b-4927-8138-ca159108bcae';

(async () => {
  // --- Preview preserved records ---
  console.log('\n=== VERIFYING PRESERVED RECORDS EXIST ===');
  const check = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_file' AS type, name AS label FROM training_files WHERE id = '${PRESERVE_TF_ID}'
    UNION ALL SELECT 'dataset', name FROM datasets WHERE id = '${PRESERVE_DS_ID}'
    UNION ALL SELECT 'pipeline_job', job_name FROM pipeline_training_jobs WHERE id = '${PRESERVE_JOB_ID}'
  `, transport: 'pg' });
  if (check.rows.length < 3) {
    console.error('ERROR: One or more preserved records not found. Aborting.');
    process.exit(1);
  }
  check.rows.forEach(r => console.log(` ${r.type}: ${r.label} (ID verified)`));

  const linkedConvCount = await saol.agentExecuteSQL({ sql: `
    SELECT COUNT(*) AS cnt FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}'
  `, transport: 'pg' });
  console.log(` conversations to preserve: ${linkedConvCount.rows[0].cnt}`);

  // --- Identity Spine check ---
  const idCheck = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_file' AS type, COUNT(*) FILTER (WHERE user_id IS NULL) AS null_user_id
    FROM training_files WHERE id = '${PRESERVE_TF_ID}'
    UNION ALL
    SELECT 'dataset', COUNT(*) FILTER (WHERE user_id IS NULL)
    FROM datasets WHERE id = '${PRESERVE_DS_ID}'
    UNION ALL
    SELECT 'pipeline_job', COUNT(*) FILTER (WHERE user_id IS NULL)
    FROM pipeline_training_jobs WHERE id = '${PRESERVE_JOB_ID}'
    UNION ALL
    SELECT 'linked_conversations', COUNT(*) FILTER (WHERE c.user_id IS NULL)
    FROM conversations c
    INNER JOIN training_file_conversations tfc ON tfc.conversation_id = c.id
    WHERE tfc.training_file_id = '${PRESERVE_TF_ID}'
  `, transport: 'pg' });

  console.log('\n=== IDENTITY SPINE CHECK (null_user_id must be 0 for all) ===');
  idCheck.rows.forEach(r => console.log(` ${r.type}: null_user_id = ${r.null_user_id}`));

  const hasNullUserId = idCheck.rows.some(r => parseInt(r.null_user_id) > 0);
  if (hasNullUserId) {
    console.error('\nWARNING: Some preserved records have null user_id. E04 NOT NULL constraint will fail for these rows.');
    console.error('Resolve by setting user_id on the affected rows before running E04.');
    console.error('Proceeding with reset — but fix user_id before E04.');
  } else {
    console.log('\n✓ All preserved records have valid user_id — Identity Spine safe.');
  }

  console.log('\n10 second abort window — CTRL+C to cancel...');
  await new Promise(r => setTimeout(r, 10000));

  // --- Execute selective reset ---
  const sql = `
    TRUNCATE _orphaned_records;

    DELETE FROM pipeline_test_results WHERE job_id != '${PRESERVE_JOB_ID}';
    DELETE FROM pipeline_evaluation_results
      WHERE run_id NOT IN (SELECT id FROM pipeline_evaluation_runs WHERE job_id = '${PRESERVE_JOB_ID}');
    DELETE FROM pipeline_evaluation_runs WHERE job_id != '${PRESERVE_JOB_ID}';
    DELETE FROM pipeline_training_metrics WHERE job_id != '${PRESERVE_JOB_ID}';
    DELETE FROM model_artifacts;
    DELETE FROM training_jobs;
    DELETE FROM pipeline_training_jobs WHERE id != '${PRESERVE_JOB_ID}';
    DELETE FROM pipeline_inference_endpoints WHERE job_id != '${PRESERVE_JOB_ID}';

    DELETE FROM training_file_conversations WHERE training_file_id != '${PRESERVE_TF_ID}';
    DELETE FROM datasets WHERE id != '${PRESERVE_DS_ID}';
    DELETE FROM training_files WHERE id != '${PRESERVE_TF_ID}';

    DELETE FROM batch_checkpoints;
    DELETE FROM batch_items;
    DELETE FROM batch_jobs;
    DELETE FROM generation_logs;
    DELETE FROM failed_generations;
    DELETE FROM conversation_turns
      WHERE conversation_id NOT IN (
        SELECT conversation_id FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}'
      );
    DELETE FROM legacy_conversation_turns;
    DELETE FROM multi_turn_conversations;
    DELETE FROM conversations
      WHERE id NOT IN (
        SELECT conversation_id FROM training_file_conversations WHERE training_file_id = '${PRESERVE_TF_ID}'
      );

    DELETE FROM api_response_logs;
    DELETE FROM notifications;
    DELETE FROM edge_cases;
    DELETE FROM scenarios;
    DELETE FROM error_logs;
    DELETE FROM query_performance_logs;
    DELETE FROM index_usage_snapshots;
    DELETE FROM table_bloat_snapshots;
    DELETE FROM performance_alerts;
    DELETE FROM maintenance_operations;
    DELETE FROM metrics_points;
    DELETE FROM schema_migrations;
    DELETE FROM orphaned_conversations;
    DELETE FROM backup_exports;
    DELETE FROM cost_records;
    DELETE FROM export_logs;
    DELETE FROM template_analytics;
  `;

  const result = await saol.agentExecuteDDL({ sql, transaction: true, transport: 'pg' });
  console.log('\nResult:', result.success, result.summary);

  if (!result.success) {
    console.error('Reset failed. No data was changed (transaction rolled back).');
    process.exit(1);
  }

  // --- Final verification ---
  console.log('\n=== POST-RESET VERIFICATION ===');
  const verify = await saol.agentExecuteSQL({ sql: `
    SELECT 'training_files'           AS t, COUNT(*) AS rows FROM training_files
    UNION ALL SELECT 'datasets',              COUNT(*) FROM datasets
    UNION ALL SELECT 'pipeline_training_jobs', COUNT(*) FROM pipeline_training_jobs
    UNION ALL SELECT 'conversations (total)', COUNT(*) FROM conversations
    UNION ALL SELECT 'training_file_conversations', COUNT(*) FROM training_file_conversations
  `, transport: 'pg' });
  verify.rows.forEach(r => console.log(` ${r.t}: ${r.rows} rows`));
  console.log('\nExpected: training_files=1, datasets=1, pipeline_training_jobs=1, conversations=242, training_file_conversations=242');
})();
```

**Execute from `supa-agent-ops/`:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node "../scripts/cleanup/E2-global-reset-selective.js"
```

**Acceptance Criteria (post-reset):**
- `training_files`: 1 row (the preserved one)
- `datasets`: 1 row (the preserved one)
- `pipeline_training_jobs`: 1 row (the preserved one)
- `conversations`: 242 rows (the 242 linked conversations)
- `training_file_conversations`: 242 rows
- `_orphaned_records`: 0 rows
- `batch_jobs`, `generation_logs`, `failed_generations`: 0 rows
- System config tables (`prompt_templates`, `templates`, `personas`, `emotional_arcs`, `training_topics`, `evaluation_prompts`, `pipeline_base_models`): unchanged
- RAG tables (`rag_*`): unchanged

---

## Phase C — Chunks Module Removal

**Background:** The Chunks Module is the v1 document processing pipeline. Completely separate from the RAG Frontier pipeline. Never connected to production — zero `conversations` rows have `chunk_id` set. Safe to remove entirely.

**`/dashboard` and "Document Categorization" are the same page.** The dashboard IS the hub — there is no separate categorization page.

Execute the phases below in strict order. Each phase depends on the one before it.

---

### Phase C1 — Remove `chunk_id` from `conversations` + Delete 3 API Routes

**Step C1.1 — Check the FK constraint:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid='conversations'::regclass AND contype='f'
AND pg_get_constraintdef(oid) LIKE '%chunk%'
\`,transport:'pg'});console.log('chunk FK on conversations:',JSON.stringify(r.rows));})();"
```

**Step C1.2 — Drop the `chunk_id` column (dry-run then apply):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql='ALTER TABLE conversations DROP COLUMN IF EXISTS chunk_id;';
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Dry-run:',dry.success,dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Applied:',r.success,r.summary);}
})();"
```

**Step C1.3 — Delete 3 chunk-related API route files:**

Verify each file exists, then delete:
- `src/app/api/conversations/by-chunk/[chunkId]/route.ts` — then delete the empty `by-chunk/` folder
- `src/app/api/conversations/[id]/link-chunk/route.ts` — then delete the empty `link-chunk/` folder
- `src/app/api/conversations/[id]/unlink-chunk/route.ts` — then delete the empty `unlink-chunk/` folder

**Acceptance Criteria:**
- `conversations` table has no `chunk_id` column
- The 3 deleted route files no longer exist

---

### Phase C2 — Update the Dashboard Page

**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Step C2.1 — Read the file first** to understand the current imports and component structure.

**Step C2.2 — Make these changes:**

1. Remove the import of `DocumentSelectorServer` or `DocumentSelectorClient` (whichever is used)
2. Remove the `router.push('/upload')` "Upload Documents" button from the page header
3. Replace the main content body (the document selector / categorization UI) with a simple module navigation grid of 6 cards:

```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
  <ModuleCard title="Conversations" href="/conversations" description="Generate and manage training conversations" />
  <ModuleCard title="Datasets" href="/datasets" description="Compile conversations into training datasets" />
  <ModuleCard title="Training Files" href="/training-files" description="Export JSONL files for fine-tuning" />
  <ModuleCard title="Pipeline" href="/pipeline/jobs" description="Train and evaluate LoRA adapters" />
  <ModuleCard title="RAG Frontier" href="/rag" description="Document ingestion and expert Q&A" />
  <ModuleCard title="Batch Jobs" href="/batch-jobs" description="Monitor batch conversation generation" />
</div>
```

Add a simple `ModuleCard` component inline in the file (or as a local component in the same file) using shadcn `Card` components:

```tsx
function ModuleCard({ title, href, description }: { title: string; href: string; description: string }) {
  return (
    <a href={href} className="block rounded-lg border bg-card p-6 hover:border-primary transition-colors">
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </a>
  );
}
```

4. Remove any other imports that only existed for the removed components.

**Acceptance Criteria:**
- `/dashboard` page compiles without errors
- No imports of `DocumentSelectorServer`, `DocumentSelectorClient`, or upload-related components remain in `dashboard/page.tsx`
- Page renders 6 navigation cards

---

### Phase C3 — Delete Workflow + Upload Pages

**Verify each file exists before deleting:**

```bash
ls "src/app/(dashboard)/upload/page.tsx" 2>/dev/null && echo exists || echo missing
ls "src/app/(workflow)/" 2>/dev/null && echo exists || echo missing
```

**Delete these 5 page files:**
- `src/app/(dashboard)/upload/page.tsx`
- `src/app/(workflow)/workflow/[documentId]/stage1/page.tsx`
- `src/app/(workflow)/workflow/[documentId]/stage2/page.tsx`
- `src/app/(workflow)/workflow/[documentId]/stage3/page.tsx`
- `src/app/(workflow)/workflow/[documentId]/complete/page.tsx`

**After deleting the 5 page files**, check if the `(workflow)` layout group folder is now empty:
```bash
ls "src/app/(workflow)/" 2>/dev/null
```

If the folder only contains the 5 deleted pages (and any `layout.tsx` that served only those pages), delete the entire `src/app/(workflow)/` directory.

**Acceptance Criteria:**
- None of the 5 page files exist
- `/upload` route 404s
- `/workflow/...` routes 404

---

### Phase C4 — Delete 8 Remaining API Route Files

**Verify each file exists, then delete:**

Documents API routes:
- `src/app/api/documents/upload/route.ts`
- `src/app/api/documents/process/route.ts`
- `src/app/api/documents/route.ts`
- `src/app/api/documents/status/route.ts`
- `src/app/api/documents/[id]/route.ts`

After deleting all 5 documents route files, delete the now-empty `src/app/api/documents/` directory.

Workflow API routes:
- `src/app/api/workflow/route.ts`
- `src/app/api/workflow/[id]/route.ts`
- `src/app/api/workflow/session/route.ts`

After deleting the 3 workflow route files, delete the now-empty `src/app/api/workflow/` directory.

**Acceptance Criteria:**
- `src/app/api/documents/` directory does not exist
- `src/app/api/workflow/` directory does not exist

---

### Phase C5 — Delete Library Files, Components, and Types

#### Library Files

For each file, verify it exists, then delete:

| File | Action |
|------|--------|
| `src/lib/chunk-service.ts` | Delete |
| `src/lib/chunk-extraction/extractor.ts` | Delete; then delete empty `chunk-extraction/` folder |
| `src/lib/dimension-service.ts` | Delete |
| `src/lib/dimension-metadata.ts` | Delete |
| `src/lib/workflow-navigation.ts` | Delete |
| `src/stores/workflow-store.ts` | Delete |
| `src/supabase/functions/server/kv_store.tsx` | Delete |

**`src/lib/database.ts` — verify before acting:**

```bash
grep -n "import" src/lib/database.ts | head -20
grep -rn "from.*['\"].*database['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -20
```

- If nothing else imports from `src/lib/database.ts`: delete the file.
- If other files import from it: read the file, remove only the exports for `documentService` and `chunkService`, leave any other exports intact.

#### Components

Delete these files (verify each exists first):

| File | Action |
|------|--------|
| `src/components/upload/upload-dropzone.tsx` | Delete |
| `src/components/upload/upload-queue.tsx` | Delete |
| `src/components/upload/upload-stats.tsx` | Delete |
| `src/components/client/DocumentSelectorClient.tsx` | Delete |
| `src/components/server/DocumentSelectorServer.tsx` | Delete |
| `src/components/client/StepAClient.tsx` | Delete |
| `src/components/server/StepAServer.tsx` | Delete |
| `src/components/client/StepBClient.tsx` | Delete |
| `src/components/server/StepBServer.tsx` | Delete |
| `src/components/client/StepCClient.tsx` | Delete |
| `src/components/server/StepCServer.tsx` | Delete |

After deleting the 3 upload components, if `src/components/upload/` is now empty, delete the folder.

**⚠️ Partial edit — do NOT delete this file:**

`src/components/conversations/ConversationMetadataPanel.tsx`

Read this file and find the section that renders a button/link to `/chunks/${conversation.chunkId}` (look for the string `chunkId` or `/chunks/`). Remove only that button/section. Leave the rest of the component completely intact.

#### Types

| File | Action |
|------|--------|
| `src/types/chunks.ts` | Delete entire file |
| `src/types/index.ts` | **Partial edit** — remove only these 5 exports: `Chunk`, `ChunkDimensions`, `ChunkRun`, `ChunkExtractionJob`, `ChunkType`. Leave all other exports. |

**Acceptance Criteria:**
- All deleted files are gone
- `ConversationMetadataPanel.tsx` still exists and renders correctly without the chunk link
- `src/types/index.ts` still exists; only the 5 chunk type exports are removed

---

### Phase C6 — Drop 15 Database Tables

**This MUST run after Phase E (data cleared) and after Phase C1 (`chunk_id` column dropped from `conversations`).**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{
  const sql=\`
DROP TABLE IF EXISTS chunk_dimensions CASCADE;
DROP TABLE IF EXISTS chunk_extraction_jobs CASCADE;
DROP TABLE IF EXISTS chunk_runs CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS workflow_sessions CASCADE;
DROP TABLE IF EXISTS workflow_metadata CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tag_dimensions CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS custom_tags CASCADE;
DROP TABLE IF EXISTS dimension_metadata CASCADE;
\`;
  const dry=await saol.agentExecuteDDL({sql,dryRun:true,transaction:true,transport:'pg'});
  console.log('Chunks module table drop dry-run:',dry.success,dry.summary);
  if(dry.success){const r=await saol.agentExecuteDDL({sql,transaction:true,transport:'pg'});console.log('Applied:',r.success,r.summary);}
})();"
```

**Verify tables are gone:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
AND table_name IN ('chunks','documents','chunk_dimensions','chunk_runs','chunk_extraction_jobs','workflow_sessions','workflow_metadata','processing_jobs','categories','tags','document_tags','document_categories','tag_dimensions','custom_tags','dimension_metadata')
ORDER BY table_name
\`,transport:'pg'});
if(r.rows.length===0){console.log('All 15 chunks module tables dropped successfully.');}
else{console.log('Tables still present:',r.rows.map(r=>r.table_name));}
})();"
```

**Expected:** `All 15 chunks module tables dropped successfully.`

**Tables NOT dropped (preserve these):**
- `prompt_templates` — system meta (Policy 2), used by Conversations module
- `orphaned_conversations` — 0 rows, migration artifact (Policy 1)

**Acceptance Criteria:**
- 0 of the 15 listed tables remain in the database
- `prompt_templates` and `orphaned_conversations` still exist

---

### Phase C7 — TypeScript Compilation Check

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit 2>&1 | head -30
```

**Expected:** The only pre-existing error is in `lib/file-processing/text-extractor.ts` (pdf-parse type — pre-existing, not introduced by this cleanup). No new errors from the Chunks Module removal.

If new errors appear, fix them before declaring Phase C complete. Common sources:
- Any file that still imports from a deleted file (find with `grep -rn "chunk-service\|chunk-extraction\|dimension-service\|workflow-store" src/ --include="*.ts" --include="*.tsx"`)
- `src/types/index.ts` missing a type that something still imports (find and remove the import in the importing file)

---

## Phase V — Final Verification

Run these checks to confirm the full cleanup is complete.

```bash
# V1 — kv_store tables gone
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'kv_store%'\`,transport:'pg'});console.log('kv_store remaining:',r.rows[0].c);})();"
# Expected: 0

# V2 — Chunks tables gone
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('chunks','documents','chunk_dimensions','chunk_runs','chunk_extraction_jobs')\`,transport:'pg'});console.log('Chunk tables remaining:',r.rows[0].c);})();"
# Expected: 0

# V3 — Preserved records intact
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT 'training_files' AS t, COUNT(*) AS rows FROM training_files
UNION ALL SELECT 'datasets', COUNT(*) FROM datasets
UNION ALL SELECT 'pipeline_training_jobs', COUNT(*) FROM pipeline_training_jobs
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
\`,transport:'pg'});r.rows.forEach(x=>console.log(x.t+': '+x.rows+' rows'));})();"
# Expected: training_files=1, datasets=1, pipeline_training_jobs=1, conversations=242

# V4 — System config tables intact
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT 'prompt_templates' AS t, COUNT(*) AS rows FROM prompt_templates
UNION ALL SELECT 'personas', COUNT(*) FROM personas
UNION ALL SELECT 'emotional_arcs', COUNT(*) FROM emotional_arcs
UNION ALL SELECT 'pipeline_base_models', COUNT(*) FROM pipeline_base_models
\`,transport:'pg'});r.rows.forEach(x=>console.log(x.t+': '+x.rows+' rows'));})();"
# Expected: prompt_templates=10, personas=3, emotional_arcs=10, pipeline_base_models=4

# V5 — RAG data intact
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});const saol=require('.');
(async()=>{const r=await saol.agentExecuteSQL({sql:\`
SELECT 'rag_documents' AS t, COUNT(*) AS rows FROM rag_documents
UNION ALL SELECT 'rag_embeddings', COUNT(*) FROM rag_embeddings
UNION ALL SELECT 'rag_facts', COUNT(*) FROM rag_facts
\`,transport:'pg'});r.rows.forEach(x=>console.log(x.t+': '+x.rows+' rows'));})();"
# Expected: rag_documents=2, rag_embeddings=1851, rag_facts=1793

# V6 — TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc --noEmit 2>&1 | grep -v "text-extractor.ts" | head -20
# Expected: no output (the text-extractor.ts error is pre-existing and filtered out)

# V7 — No remaining chunk references in src (should be zero)
grep -rn "chunk-service\|chunkService\|DocumentSelector\|workflow-store\|workflowStore\|chunk-extraction\|dimension-service\|dimension-metadata\|workflow-navigation\|StepAClient\|StepAServer\|StepBClient\|StepBServer\|StepCClient\|StepCServer" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | head -20
# Expected: zero matches (or only in files that were themselves deleted)
```

---

## Human Actions Required **[HUMAN]**

The following items cannot be done by the agent — they require James to take action manually after the agent completes all phases above:

**[HUMAN] H1 — Empty the `documents` Supabase Storage bucket (future iteration):**
> After Section C is complete and the chunks module is removed, the `documents` storage bucket can be emptied. Go to: Supabase Dashboard → Storage → `documents` → Select All → Delete.
> This is deferred — the files are inaccessible from the UI once the upload page and workflow routes are gone, but they still occupy storage space.

**[HUMAN] H2 — Do NOT delete the `lora-models` adapter file:**
> `lora-models/adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz` must NOT be deleted. It is the trained adapter for "Batch-6-thru-12_v1".

---

## Summary of Changes

### Database Tables Dropped:
| Category | Tables |
|----------|--------|
| kv_store (35) | `kv_store_03a1393c` through `kv_store_f681842d` |
| Chunks Module (15) | `chunk_dimensions`, `chunk_extraction_jobs`, `chunk_runs`, `chunks`, `document_tags`, `document_categories`, `workflow_sessions`, `workflow_metadata`, `processing_jobs`, `documents`, `categories`, `tag_dimensions`, `tags`, `custom_tags`, `dimension_metadata` |

### Database Columns Dropped:
- `conversations.chunk_id`

### Tables Cleared (data only, table structure kept):
- All user-generated data tables (see E-Script-2 for full list)
- `_orphaned_records` (truncated)

### Files Deleted:
| Category | Files |
|----------|-------|
| Pages (5) | `/upload`, `/workflow/*/stage1–3`, `/workflow/*/complete` |
| API Routes (11) | `documents/*`, `workflow/*`, `conversations/by-chunk/*`, `conversations/[id]/link-chunk`, `conversations/[id]/unlink-chunk` |
| Library (7) | `chunk-service.ts`, `chunk-extraction/extractor.ts`, `dimension-service.ts`, `dimension-metadata.ts`, `workflow-navigation.ts`, `workflow-store.ts`, `kv_store.tsx` |
| Components (11) | `upload-dropzone.tsx`, `upload-queue.tsx`, `upload-stats.tsx`, `DocumentSelectorClient.tsx`, `DocumentSelectorServer.tsx`, `StepA/B/CClient.tsx`, `StepA/B/CServer.tsx` |
| Types (1) | `types/chunks.ts` |

### Files Modified (partial edits only):
| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/page.tsx` | Replace document categorization body with 6-card module navigation; remove Upload Documents button |
| `src/components/conversations/ConversationMetadataPanel.tsx` | Remove chunk link button only |
| `src/types/index.ts` | Remove 5 chunk type exports only |
| `src/lib/database.ts` | Remove chunk/document exports if file is still imported elsewhere; delete entirely if nothing imports it |

### Scripts Created:
| File | Purpose |
|------|---------|
| `scripts/cleanup/A-drop-kv-store-tables.js` | Drop 35 kv_store tables |
| `scripts/cleanup/E2-global-reset-selective.js` | Selective global data reset (preserves 3 test artifacts) |

---

## What E04 Expects From E03.5

E04 will apply NOT NULL constraints to `user_id` columns. It expects:

1. `conversations` table is either empty (E-Script-1 path) OR contains only rows with valid `user_id` (E-Script-2 verified this)
2. `batch_jobs`, `training_files`, `generation_logs`, `failed_generations` tables are empty (all cleared by reset)
3. `_orphaned_records` table is empty (truncated by E-Script-2)
4. `documents` table no longer exists (dropped in Phase C6)
5. Chunks Module code has been removed (no compile errors)
6. TypeScript compiles cleanly (only the pre-existing pdf-parse error remains)

++++++++++++++++++
