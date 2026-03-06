# Supabase Agent Ops Library (SAOL) — Complete Usage Guide

**Version:** 3.0  
**Updated:** March 4, 2026  
**Library Version:** 1.3.0  
**Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

---

## ⚠️ MANDATORY RULE

**You MUST use SAOL for ALL database operations.** Do not use raw `supabase-js`, raw `pg` scripts, or Supabase SQL Editor for any operation that SAOL supports. SAOL provides safe, robust, observable database operations with automatic error mapping, retry logic, and recovery suggestions.

---

## 📋 Table of Contents

1. [Prerequisites — Run After Clone](#prerequisites--run-after-clone)
2. [Environment Variables](#environment-variables)
3. [Quick Start — Copy-Paste Patterns](#quick-start--copy-paste-patterns)
4. [Complete API Reference](#complete-api-reference)
   - [agentQuery](#agentquery) — Read data (SELECT)
   - [agentCount](#agentcount) — Count rows
   - [agentImportTool](#agentimporttool) — Insert/upsert data
   - [agentDelete](#agentdelete) — Delete data (with safety)
   - [agentExportData](#agentexportdata) — Export to JSON/JSONL/CSV/Markdown
   - [agentExecuteDDL](#agentexecuteddl) — Schema changes (CREATE/ALTER/DROP)
   - [agentExecuteSQL](#agentexecutesql) — Raw SQL execution
   - [agentExecuteRPC](#agentexecuterpc) — Call Supabase RPC functions
   - [agentIntrospectSchema](#agentintrospectschema) — Inspect table structure
   - [agentManageIndex](#agentmanageindex) — Create/drop/list indexes
   - [agentVerifyTable](#agentverifytable) — Validate schema against expectations
   - [agentVacuum / agentAnalyze / agentReindex](#maintenance-operations) — DB maintenance
   - [agentAnalyzeIndexUsage / agentAnalyzeTableBloat](#performance-analysis) — Performance
   - [agentPreflight / preflightSchemaOperation](#preflight-checks) — Pre-operation checks
5. [Transport Guide — When to Use pg vs supabase](#transport-guide)
6. [Filter & Query Patterns](#filter--query-patterns)
7. [One-Liner Terminal Commands](#one-liner-terminal-commands)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites — Run After Clone

`node_modules/` and `dist/` are `.gitignored`. **You must install dependencies before SAOL will work:**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
npm install
```

If `dist/` is missing or you've edited source TypeScript files:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
npm run build
```

**Quick check — is SAOL ready?**

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');console.log('SAOL v'+saol.VERSION+' loaded OK');"
```

---

## Environment Variables

SAOL reads from `process.env`. Load `.env.local` before using SAOL in scripts:

```javascript
require('dotenv').config({ path: '../.env.local' });
```

| Variable | Required For | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | `transport: 'supabase'` | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `transport: 'supabase'` | Service role key (admin privileges, bypasses RLS) |
| `DATABASE_URL` | `transport: 'pg'` | PostgreSQL connection string |

**Current `DATABASE_URL` (pooler — session mode, port 5432):**
```
postgresql://postgres.hqhtbxlgzysfbekexwku:Fx4BTNR2mNKsN27Z@aws-1-us-west-1.pooler.supabase.com:5432/postgres
```

> **CRITICAL:** The direct connection URL (`db.<ref>.supabase.co`) no longer has an IPv4 A record. You MUST use the pooler URL above. Port 5432 = Session Mode (required for DDL/transactions). Port 6543 = Transaction Mode (does NOT support DDL).

---

## Quick Start — Copy-Paste Patterns

Every pattern below is a self-contained terminal command. Copy-paste and run directly.

### Query rows

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'conversations',
    select: 'id,conversation_id,enrichment_status,title',
    where: [{column:'enrichment_status', operator:'eq', value:'completed'}],
    orderBy: [{column:'created_at', asc:false}],
    limit: 10
  });
  console.log('Count:', r.data.length);
  r.data.forEach(c => console.log('-', c.conversation_id?.slice(0,8), '/', c.enrichment_status));
})();
"
```

### Count rows

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentCount({
    table: 'conversations',
    where: [{column:'enrichment_status', operator:'eq', value:'completed'}]
  });
  console.log('Total:', r.count);
})();
"
```

### Insert/upsert data

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentImportTool({
    source: [{id:'test-1', name:'Test Record', status:'active'}],
    table: 'my_table',
    mode: 'upsert',
    onConflict: 'id',
    dryRun: true
  });
  console.log('Dry run:', r.success, '|', r.summary);
})();
"
```

### Introspect table schema

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentIntrospectSchema({table:'training_sets', transport:'pg'});
  if(r.success){
    const t=r.tables[0];
    console.log('Table:', t.name, '| Rows:', t.rowCount, '| RLS:', t.rlsEnabled);
    t.columns.forEach(c => console.log(' ', c.name, c.type, c.nullable?'NULL':'NOT NULL', c.isPrimaryKey?'PK':''));
  }
})();
"
```

### Execute DDL (schema changes)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Always dry-run first
  const dry = await saol.agentExecuteDDL({
    sql: 'ALTER TABLE training_sets ADD COLUMN IF NOT EXISTS notes TEXT;',
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Validation:', dry.success ? 'PASS' : 'FAIL', dry.summary);
  if(dry.warnings?.length) console.log('Warnings:', dry.warnings);

  // Then execute
  if(dry.success){
    const r = await saol.agentExecuteDDL({
      sql: 'ALTER TABLE training_sets ADD COLUMN IF NOT EXISTS notes TEXT;',
      transaction: true,
      transport: 'pg'
    });
    console.log('Executed:', r.success, r.summary);
  }
})();
"
```

### Delete rows (with safety)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Always dry-run first to preview
  const dry = await saol.agentDelete({
    table: 'conversations',
    where: [{column:'status', operator:'eq', value:'draft'}],
    dryRun: true
  });
  console.log('Would delete:', dry.previewRecords?.length, 'records');
  dry.previewRecords?.forEach(r => console.log(' -', r.id));

  // Then execute with confirm:true
  // const r = await saol.agentDelete({
  //   table: 'conversations',
  //   where: [{column:'status', operator:'eq', value:'draft'}],
  //   confirm: true
  // });
  // console.log('Deleted:', r.deletedCount);
})();
"
```

### Export data

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExportData({
    table: 'conversations',
    destination: './exports/conversations.jsonl',
    config: {
      format: 'jsonl',
      includeMetadata: false,
      includeTimestamps: true
    },
    filters: [{column:'enrichment_status', operator:'eq', value:'completed'}]
  });
  console.log('Exported:', r.recordCount, 'records |', r.fileSize, 'bytes');
})();
"
```

### Execute raw SQL

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteSQL({
    sql: 'SELECT COUNT(*) as total FROM conversations;',
    transport: 'pg',
    transaction: false
  });
  console.log('Result:', r.rows);
})();
"
```

### Verify table structure

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentVerifyTable({
    table: 'training_sets',
    expectedColumns: [
      {name:'id', type:'uuid', required:true},
      {name:'workbase_id', type:'uuid', required:true},
      {name:'name', type:'text', required:true},
      {name:'status', type:'text'},
      {name:'last_build_error', type:'text'},
      {name:'failed_conversation_ids', type:'ARRAY'}
    ],
    generateFixSQL: true
  });
  console.log('Category:', r.category, '| Can proceed:', r.canProceed);
  r.issues.forEach(i => console.log(' ', i.severity, i.description));
  if(r.fixSQL) console.log('Fix SQL:', r.fixSQL);
})();
"
```

### Manage indexes

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // List indexes
  const r = await saol.agentManageIndex({
    table: 'training_sets',
    action: 'list',
    transport: 'pg'
  });
  console.log('Indexes on training_sets:');
  r.indexes.forEach(i => console.log(' ', i.name, '|', i.columns.join(','), i.isUnique?'UNIQUE':''));
})();
"
```

### Preflight check

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentPreflight({table:'conversations'});
  console.log('Preflight:', r.ok ? 'PASS' : 'FAIL');
  if(!r.ok) r.issues.forEach(i => console.log(' Issue:', i));
  r.recommendations.forEach(rec => console.log(' Rec:', rec.description));
})();
"
```

### Maintenance (VACUUM / ANALYZE / REINDEX)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // VACUUM ANALYZE a specific table
  const r = await saol.agentVacuum({table:'conversations', analyze:true});
  console.log('Vacuum:', r.success, r.summary);

  // ANALYZE specific table
  const a = await saol.agentAnalyze({table:'conversations'});
  console.log('Analyze:', a.success, a.summary);

  // REINDEX a table (use concurrent in production)
  const ri = await saol.agentReindex({target:'table', name:'conversations', concurrent:true});
  console.log('Reindex:', ri.success, ri.summary);
})();
"
```

### Performance analysis

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Find unused indexes
  const r = await saol.agentAnalyzeIndexUsage({minScans:10});
  console.log('Low-usage indexes:', r.indexes.length);
  r.indexes.forEach(i => console.log(' ', i.indexName, 'on', i.tableName, '| scans:', i.scans, i.unused?'UNUSED':''));
  r.recommendations.forEach(rec => console.log(' Rec:', rec));
})();
"
```

---

## Complete API Reference

### `agentQuery`

**Read rows from a table** with filtering, ordering, pagination, and optional aggregation.

```typescript
const result = await saol.agentQuery({
  table: string,                    // Required — table name
  select?: string | string[],      // Default: '*'. Comma-separated string or array
  where?: QueryFilter[],           // Default: []. Filter conditions
  orderBy?: OrderSpec[],           // Default: []. Sort order
  limit?: number,                  // Max rows to return
  offset?: number,                 // Skip rows (for pagination)
  count?: boolean,                 // Default: false. Include total count
  aggregate?: AggregateSpec[]      // Client-side aggregation
});
```

**Returns:** `{ success, summary, data: any[], count?, aggregates?, nextActions }`

**Transport:** Supabase REST client (`transport: 'supabase'` — this is hardcoded).

**Filter type:**
```typescript
{ column: string, operator: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'like'|'in'|'is', value: any }
```

**Backward compatibility:** Also accepts `filters` instead of `where`, and `field` instead of `column`.

**Examples:**

```javascript
// Simple query
const r = await saol.agentQuery({ table: 'conversations', limit: 5 });

// With filters and ordering
const r = await saol.agentQuery({
  table: 'conversations',
  select: ['id', 'title', 'enrichment_status'],
  where: [
    { column: 'enrichment_status', operator: 'eq', value: 'completed' },
    { column: 'workbase_id', operator: 'eq', value: '232bea74-b987-4629-afbc-a21180fe6e84' }
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 20,
  offset: 0
});

// With aggregation (computed client-side)
const r = await saol.agentQuery({
  table: 'training_files',
  select: '*',
  aggregate: [
    { function: 'COUNT', column: 'id', alias: 'total' },
    { function: 'SUM', column: 'total_training_pairs', alias: 'total_pairs' }
  ]
});
console.log(r.aggregates); // { total: 42, total_pairs: 12500 }

// String select format
const r = await saol.agentQuery({
  table: 'conversations',
  select: 'id,title,created_at'
});
```

---

### `agentCount`

**Count rows in a table** (optimized HEAD-only query, no data returned).

```typescript
const result = await saol.agentCount({
  table: string,                    // Required
  where?: QueryFilter[],           // Default: []
  distinct?: string                // Count distinct values in this column
});
```

**Returns:** `{ success, summary, count: number, nextActions }`

**Transport:** Supabase REST client.

**Examples:**

```javascript
// Total conversations
const r = await saol.agentCount({ table: 'conversations' });
console.log(r.count); // 1247

// Filtered count
const r = await saol.agentCount({
  table: 'conversations',
  where: [{ column: 'enrichment_status', operator: 'eq', value: 'completed' }]
});

// Distinct count
const r = await saol.agentCount({
  table: 'conversations',
  distinct: 'workbase_id'
});
```

---

### `agentImportTool`

**Insert or upsert records** into a table from a file or in-memory array.

```typescript
const result = await saol.agentImportTool({
  source: string | Record<string,any>[],  // File path (JSON/NDJSON) or array
  table: string,                          // Required
  mode?: 'insert' | 'upsert',           // Default: 'insert'
  onConflict?: string | string[],        // Conflict column(s) for upsert. Auto-detected if omitted.
  batchSize?: number,                     // Default: 200
  concurrency?: number,                   // Default: 2
  dryRun?: boolean,                       // Default: false. Validate without executing.
  retry?: { maxAttempts?: number, backoffMs?: number },
  validateCharacters?: boolean,           // Default: true
  sanitize?: boolean,                     // Default: true (strips invalid UTF-8, control chars)
  normalization?: 'NFC' | 'NFKC' | 'none',  // Default: 'NFC'
  transport?: 'supabase' | 'pg' | 'auto'    // Default: 'supabase'
});
```

**Returns:** `{ success, summary, totals: { total, success, failed, skipped, durationMs }, reportPaths, nextActions }`

**Behavior:**
1. Runs `agentPreflight` — aborts if preflight fails
2. Auto-detects primary key if `mode: 'upsert'` and no `onConflict`
3. Sanitizes + normalizes each record (Unicode NFC, character validation)
4. Processes in batches with retry + exponential backoff
5. Writes summary/error/success reports to `outputDir`

**Examples:**

```javascript
// Import from file
const r = await saol.agentImportTool({
  source: './data/conversations.ndjson',
  table: 'conversations',
  mode: 'insert'
});

// Upsert in-memory records
const r = await saol.agentImportTool({
  source: [
    { id: 'abc-123', name: 'Updated name', status: 'active' },
    { id: 'def-456', name: 'Another', status: 'active' }
  ],
  table: 'my_table',
  mode: 'upsert',
  onConflict: 'id'
});

// Dry-run validation
const r = await saol.agentImportTool({
  source: records,
  table: 'conversations',
  mode: 'upsert',
  onConflict: 'id',
  dryRun: true
});
console.log(r.totals); // { total: 50, success: 0, failed: 0, skipped: 50 }
```

**Related utilities:**
- `analyzeImportErrors(result)` — parses error report and returns recovery steps
- `generateDollarQuotedInsert(table, record)` — generates `$$`-quoted INSERT SQL for manual execution

---

### `agentDelete`

**Delete rows with mandatory safety checks** (WHERE required, confirmation required).

```typescript
const result = await saol.agentDelete({
  table: string,                    // Required
  where: QueryFilter[],            // REQUIRED — empty array throws error
  cascade?: boolean,               // Default: false
  dryRun?: boolean,                // Default: false
  confirm?: boolean                // Default: false. Must be true to execute.
});
```

**Returns:** `{ success, summary, deletedCount, previewRecords?, nextActions }`

**Transport:** Supabase REST client.

**Safety checks:**
1. **WHERE clause required** — throws if `where` is empty/missing (prevents accidental full-table delete)
2. **Explicit confirmation** — throws if `confirm !== true` and `dryRun !== true`
3. **Dry-run preview** — shows first 10 matching records without deleting

**Always use the two-step pattern:**

```javascript
// Step 1: Dry-run — see what would be deleted
const preview = await saol.agentDelete({
  table: 'conversations',
  where: [{ column: 'status', operator: 'eq', value: 'draft' }],
  dryRun: true
});
console.log(`Would delete ${preview.previewRecords?.length} records`);

// Step 2: Execute with confirmation
const result = await saol.agentDelete({
  table: 'conversations',
  where: [{ column: 'status', operator: 'eq', value: 'draft' }],
  confirm: true
});
console.log(`Deleted: ${result.deletedCount}`);
```

---

### `agentExportData`

**Export table data** to JSON, JSONL, CSV, or Markdown format.

```typescript
const result = await saol.agentExportData({
  table: string,                    // Required
  destination?: string,            // File path. Omit to skip file write.
  config: {
    format: 'json' | 'jsonl' | 'csv' | 'markdown',
    includeMetadata: boolean,       // Include id, created_by, updated_by
    includeTimestamps: boolean,     // Include created_at, updated_at
    filters?: QueryFilter[]
  },
  filters?: QueryFilter[],        // Default: []
  columns?: string[]               // Specific columns to export
});
```

**Returns:** `{ success, summary, recordCount, fileSize, filePath?, nextActions }`

**Transport:** Uses `agentQuery` internally (Supabase REST).

**Format details:**

| Format | Extension | Notes |
|--------|-----------|-------|
| `jsonl` | `.jsonl` | One JSON object per line. OpenAI/Anthropic training compatible. |
| `json` | `.json` | Wrapped in `{ version, export_date, format, count, data }` |
| `csv` | `.csv` | UTF-8 BOM for Excel. Nested objects serialized as JSON strings. |
| `markdown` | `.md` | Table format for ≤5 fields, code block for more. |

**Example — export training data:**

```javascript
const r = await saol.agentExportData({
  table: 'conversations',
  destination: './exports/training-data.jsonl',
  config: {
    format: 'jsonl',
    includeMetadata: false,
    includeTimestamps: false,
    filters: [{ column: 'enrichment_status', operator: 'eq', value: 'completed' }]
  },
  columns: ['conversation_id', 'title', 'persona', 'parameters']
});
```

---

### `agentExecuteDDL`

**Execute DDL statements** (CREATE TABLE, ALTER TABLE, DROP TABLE, etc.) with transaction support and validation.

```typescript
const result = await saol.agentExecuteDDL({
  sql: string,                      // Required — DDL statement(s)
  dryRun?: boolean,                // Default: false. Validates SQL without executing.
  transaction?: boolean,           // Default: true. Wraps in BEGIN/COMMIT with auto-rollback.
  validateOnly?: boolean,          // Default: false
  transport?: 'pg' | 'supabase'   // Default: 'pg'. MUST use 'pg' for DDL.
});
```

**Returns:** `{ success, summary, executed, statements, affectedObjects, warnings?, nextActions }`

**Transport:** Direct pg client. **Always use `transport: 'pg'` for DDL.**

**Safety:** Detects destructive keywords (DROP, TRUNCATE, DELETE FROM) and populates `warnings[]`.

**Best practice — always dry-run first:**

```javascript
// Step 1: Validate
const dry = await saol.agentExecuteDDL({
  sql: `
    CREATE TABLE IF NOT EXISTS my_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  dryRun: true,
  transaction: true,
  transport: 'pg'
});
console.log('Validation:', dry.success ? 'PASS' : 'FAIL');

// Step 2: Execute
if (dry.success) {
  const result = await saol.agentExecuteDDL({
    sql: `
      CREATE TABLE IF NOT EXISTS my_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
    transaction: true,
    transport: 'pg'
  });
  console.log('Created:', result.success);
}
```

**Common DDL operations:**

```javascript
// Add columns
await saol.agentExecuteDDL({
  sql: `ALTER TABLE my_table
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT;`,
  transaction: true,
  transport: 'pg'
});

// Create table with RLS
await saol.agentExecuteDDL({
  sql: `
    CREATE TABLE IF NOT EXISTS my_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own" ON my_table FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own" ON my_table FOR INSERT WITH CHECK (auth.uid() = user_id);
  `,
  transaction: true,
  transport: 'pg'
});

// Drop column (destructive — will generate warning)
await saol.agentExecuteDDL({
  sql: 'ALTER TABLE my_table DROP COLUMN IF EXISTS old_field;',
  transaction: true,
  transport: 'pg'
});
```

---

### `agentExecuteSQL`

**Execute raw SQL** via direct pg connection or Supabase RPC.

```typescript
const result = await saol.agentExecuteSQL({
  sql: string,                      // Required
  transport?: 'pg' | 'rpc',       // Default: 'pg'
  transaction?: boolean,           // Default: false
  dryRun?: boolean,                // Default: false
  timeout?: number                 // Default: 30000 (ms)
});
```

**Returns:** `{ success, summary, rows?, rowCount?, command?, nextActions }`

**Transport options:**
- `'pg'` — Direct PostgreSQL connection. Supports transactions (`BEGIN`/`COMMIT`/`ROLLBACK`). Sets `statement_timeout`.
- `'rpc'` — Calls `supabase.rpc('exec_sql', { sql_script: sql })`. Requires the `exec_sql` RPC function to exist in Supabase.

**Examples:**

```javascript
// Simple query via pg
const r = await saol.agentExecuteSQL({
  sql: 'SELECT id, name FROM training_sets WHERE status = \'ready\';',
  transport: 'pg'
});
console.log(r.rows);

// With transaction
const r = await saol.agentExecuteSQL({
  sql: `
    UPDATE training_sets SET status = 'processing' WHERE id = 'abc-123';
    UPDATE datasets SET status = 'building' WHERE id = 'def-456';
  `,
  transport: 'pg',
  transaction: true
});

// Via RPC (requires exec_sql function)
const r = await saol.agentExecuteSQL({
  sql: 'SELECT COUNT(*) as total FROM conversations;',
  transport: 'rpc',
  timeout: 10000
});
```

**Related utility:**
- `executeWithTransaction(operation, useTransaction)` — wraps an async function in `BEGIN`/`COMMIT`/`ROLLBACK`

---

### `agentExecuteRPC`

**Call a Supabase RPC function** with timeout support.

```typescript
const result = await saol.agentExecuteRPC({
  functionName: string,             // Required — RPC function name
  params?: Record<string, any>,    // Default: {}
  timeout?: number                 // Default: 30000 (ms)
});
```

**Returns:** `{ success, summary, data: any, rowCount?, nextActions }`

**Transport:** Supabase REST client.

**Example:**

```javascript
const r = await saol.agentExecuteRPC({
  functionName: 'exec_sql',
  params: { sql_script: 'SELECT current_timestamp;' },
  timeout: 10000
});
console.log(r.data);
```

---

### `agentIntrospectSchema`

**Inspect table structure** — columns, indexes, constraints, RLS policies, row counts, and sizes.

```typescript
const result = await saol.agentIntrospectSchema({
  table?: string,                   // Omit to introspect ALL public tables
  includeColumns?: boolean,        // Default: true
  includeIndexes?: boolean,        // Default: true
  includeConstraints?: boolean,    // Default: true
  includePolicies?: boolean,       // Default: true
  includeStats?: boolean,          // Default: true (row count, size)
  transport?: 'pg' | 'supabase'   // Default: 'pg'. Use 'pg' for full introspection.
});
```

**Returns:** `{ success, summary, tables: TableSchema[], nextActions }`

**`TableSchema` structure:**
```typescript
{
  name: string,
  exists: boolean,
  rowCount: number,
  sizeBytes?: number,
  columns: ColumnInfo[],    // { name, type, nullable, default, isPrimaryKey, isForeignKey, foreignKeyTable?, foreignKeyColumn? }
  indexes: IndexInfo[],     // { name, table, columns, isUnique, isPrimary, indexDef, sizeBytes? }
  constraints: ConstraintInfo[],  // { name, type, definition, columns? }
  policies: PolicyInfo[],   // { name, command, roles, definition, using?, withCheck? }
  rlsEnabled: boolean
}
```

**Transport:** Direct pg client. Queries `information_schema`, `pg_tables`, `pg_class`, `pg_index`, `pg_policy`, `pg_constraint`.

**Examples:**

```javascript
// Single table
const r = await saol.agentIntrospectSchema({ table: 'conversations', transport: 'pg' });
const t = r.tables[0];
console.log(`${t.name}: ${t.rowCount} rows, ${t.columns.length} columns, RLS: ${t.rlsEnabled}`);
t.columns.forEach(c => console.log(`  ${c.name} ${c.type} ${c.nullable ? 'NULL' : 'NOT NULL'}`));

// All tables
const r = await saol.agentIntrospectSchema({ transport: 'pg' });
r.tables.forEach(t => console.log(`${t.name}: ${t.rowCount} rows`));
```

---

### `agentManageIndex`

**Create, drop, list, or analyze indexes** on a table.

```typescript
const result = await saol.agentManageIndex({
  table: string,                    // Required
  action: 'create' | 'drop' | 'list' | 'analyze',
  indexName?: string,              // Required for create/drop
  columns?: string[],             // Required for create
  indexType?: 'btree' | 'hash' | 'gist' | 'gin' | 'brin',  // Default: 'btree'
  concurrent?: boolean,           // Default: false. Non-blocking for production.
  unique?: boolean,               // Default: false
  where?: string,                 // Partial index condition
  dryRun?: boolean,               // Default: false
  transport?: 'pg' | 'supabase'  // Default: 'pg'
});
```

**Returns:** `{ success, summary, indexes: IndexInfo[], operation?, nextActions }`

**Transport:** Direct pg client.

**Examples:**

```javascript
// List indexes
const r = await saol.agentManageIndex({
  table: 'conversations', action: 'list', transport: 'pg'
});

// Create index (non-blocking)
await saol.agentManageIndex({
  table: 'conversations',
  action: 'create',
  indexName: 'idx_conversations_workbase_id',
  columns: ['workbase_id'],
  concurrent: true,
  transport: 'pg'
});

// Create unique partial index
await saol.agentManageIndex({
  table: 'training_sets',
  action: 'create',
  indexName: 'idx_training_sets_active_name',
  columns: ['workbase_id', 'name'],
  unique: true,
  where: "is_active = true",
  transport: 'pg'
});

// Create GIN index for array/JSONB columns
await saol.agentManageIndex({
  table: 'conversations',
  action: 'create',
  indexName: 'idx_conversations_parameters',
  columns: ['parameters'],
  indexType: 'gin',
  transport: 'pg'
});

// Drop index
await saol.agentManageIndex({
  table: 'conversations',
  action: 'drop',
  indexName: 'idx_conversations_old',
  concurrent: true,
  transport: 'pg'
});
```

---

### `agentVerifyTable`

**Validate a table's structure** against expected schema — checks columns, indexes, constraints. Generates fix SQL.

```typescript
const result = await saol.agentVerifyTable({
  table: string,                    // Required
  expectedColumns?: ColumnSpec[],  // { name, type, required? }
  expectedIndexes?: string[],      // Index names
  expectedConstraints?: ConstraintSpec[],  // { name, type, columns }
  generateFixSQL?: boolean         // Default: false. Generate ALTER TABLE / CREATE INDEX.
});
```

**Returns:**
```typescript
{
  success: boolean,
  exists: boolean,
  issues: VerificationIssue[],     // { type, severity, description, fixSQL? }
  fixSQL?: string,                 // Concatenated fix statements
  category: 1 | 2 | 3 | 4,       // 1=OK, 2=Warning, 3=Critical, 4=Blocking
  canProceed: boolean,             // true if category ≤ 2
  operation: 'verification'
}
```

**Category meanings:**
- **1** — All checks pass
- **2** — Warnings only (missing non-required columns, missing indexes)
- **3** — Critical issues (missing required columns, type mismatches)
- **4** — Blocking (table doesn't exist)

**Transport:** Uses `agentIntrospectSchema` internally (pg client).

**Column type normalization:** `int` → `integer`, `timestamptz` → `timestamp with time zone`, etc.

**Example:**

```javascript
const r = await saol.agentVerifyTable({
  table: 'training_sets',
  expectedColumns: [
    { name: 'id', type: 'uuid', required: true },
    { name: 'workbase_id', type: 'uuid', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'conversation_ids', type: 'ARRAY' },
    { name: 'status', type: 'text' },
    { name: 'last_build_error', type: 'text' },
    { name: 'failed_conversation_ids', type: 'ARRAY' }
  ],
  expectedIndexes: ['training_sets_pkey'],
  generateFixSQL: true
});

if (!r.canProceed) {
  console.log('BLOCKED — issues:', r.issues);
  console.log('Fix SQL:', r.fixSQL);
} else {
  console.log('Table structure valid');
}
```

---

### Maintenance Operations

#### `agentVacuum`

**Reclaim storage occupied by dead tuples.**

```typescript
const result = await saol.agentVacuum({
  table?: string,                   // Omit for all tables
  full?: boolean,                  // Default: false. VACUUM FULL (locks table!)
  analyze?: boolean,               // Default: false. Update planner stats too
  dryRun?: boolean                 // Default: false
});
```

**Returns:** `{ success, summary, tablesProcessed, spaceReclaimed?, operation: 'maintenance' }`

**Transport:** `agentExecuteSQL({ transport: 'pg', transaction: false })` — VACUUM cannot run inside a transaction.

> **Warning:** `full: true` acquires an exclusive lock on the table. Use during maintenance windows only.

#### `agentAnalyze`

**Update query planner statistics.**

```typescript
const result = await saol.agentAnalyze({
  table?: string,                   // Omit for all tables
  columns?: string[]               // Specific columns
});
```

#### `agentReindex`

**Rebuild indexes.**

```typescript
const result = await saol.agentReindex({
  target: 'table' | 'index' | 'schema',
  name: string,                     // Table name, index name, or schema name
  concurrent?: boolean             // Default: false. Non-blocking (PostgreSQL 12+)
});
```

> **Note:** Non-concurrent REINDEX locks the table. Use `concurrent: true` in production.

---

### Performance Analysis

#### `agentAnalyzeIndexUsage`

**Find unused or low-usage indexes.**

```typescript
const result = await saol.agentAnalyzeIndexUsage({
  table?: string,                   // Omit for all tables
  minScans?: number                // Default: 100. Show indexes with scans below this.
});
```

**Returns:** `{ indexes: IndexUsageInfo[], recommendations: string[], operation: 'performance' }`

**`IndexUsageInfo`:** `{ tableName, indexName, scans, tuplesRead, tuplesReturned, sizeBytes, unused }`

**Behavior:** Queries `pg_stat_user_indexes`. Flags `unused: true` when scans = 0. Detects low-selectivity indexes. Recommends dropping unused indexes > 1MB.

#### `agentAnalyzeTableBloat`

**Analyze table size and bloat.**

```typescript
const result = await saol.agentAnalyzeTableBloat(table: string);
```

**Returns:** Table size, percentage of database. Warns if > 1GB or > 50%.

---

### Preflight Checks

#### `agentPreflight`

**Pre-operation validation** for import/query operations.

```typescript
const result = await saol.agentPreflight({
  table: string,                    // Required
  mode?: 'insert' | 'upsert',     // Default: 'insert'
  onConflict?: string | string[],
  transport?: 'supabase' | 'pg' | 'auto'  // Default: 'supabase'
});
```

**Returns:** `{ ok: boolean, issues: string[], recommendations: Recommendation[] }`

**Runs 4 checks:**
1. Environment variables present
2. Service role key (not anon key)
3. Table exists
4. Upsert readiness (if `mode: 'upsert'` — checks `onConflict` column uniqueness)

#### `preflightSchemaOperation`

**Pre-operation validation** for schema/DDL operations.

```typescript
const result = await saol.preflightSchemaOperation({
  operation: 'introspect' | 'ddl' | 'index_create' | 'index_drop',
  table?: string,
  transport?: 'supabase' | 'pg' | 'auto'  // Default: 'pg'
});
```

**Runs 5 checks:**
1. Environment variables
2. Service role key
3. RPC `exec_sql` function exists (recommendation only)
4. Schema `CREATE` permission (for DDL/index ops)
5. Table exists (if specified)

#### `detectPrimaryKey`

**Detect the primary key column(s) for a table.**

```typescript
const pk = await saol.detectPrimaryKey('conversations');
// Returns: 'id' (string) or ['col1', 'col2'] (array for composite) or null
```

---

## Transport Guide

| Transport | Connection | Used For | Supports DDL | Supports Transactions |
|-----------|-----------|----------|-------------|----------------------|
| `'supabase'` | REST API via `@supabase/supabase-js` | Query, count, import, delete, export, RPC | ❌ No | ❌ No |
| `'pg'` | Direct PostgreSQL via `pg` module | DDL, schema introspection, indexes, raw SQL, maintenance | ✅ Yes | ✅ Yes |
| `'rpc'` | REST API calling `exec_sql` function | Raw SQL (alternative to pg) | ⚠️ Limited | ❌ No |

**Rules:**
1. **Use `transport: 'pg'` for ALL schema operations** — DDL, introspection, indexes, maintenance, verification
2. **Query/count/import/delete/export all use Supabase REST** — no transport parameter needed (or it's ignored)
3. **`agentExecuteSQL` accepts `'pg'` or `'rpc'`** — prefer `'pg'` for reliability
4. **Port 5432** (session mode) is required for pg transport with the pooler URL

---

## Filter & Query Patterns

### Available operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `{ column: 'status', operator: 'eq', value: 'active' }` |
| `neq` | Not equals | `{ column: 'status', operator: 'neq', value: 'deleted' }` |
| `gt` | Greater than | `{ column: 'created_at', operator: 'gt', value: '2026-01-01' }` |
| `gte` | Greater or equal | `{ column: 'count', operator: 'gte', value: 10 }` |
| `lt` | Less than | `{ column: 'count', operator: 'lt', value: 100 }` |
| `lte` | Less or equal | `{ column: 'count', operator: 'lte', value: 50 }` |
| `like` | Pattern match | `{ column: 'name', operator: 'like', value: '%training%' }` |
| `in` | In array | `{ column: 'status', operator: 'in', value: ['active', 'ready'] }` |
| `is` | IS NULL/NOT NULL | `{ column: 'deleted_at', operator: 'is', value: null }` |

### Multiple filters (AND logic)

All filters in the `where` array are combined with AND:

```javascript
where: [
  { column: 'workbase_id', operator: 'eq', value: '232bea74-...' },
  { column: 'status', operator: 'in', value: ['ready', 'processing'] },
  { column: 'created_at', operator: 'gte', value: '2026-01-01' }
]
```

### Ordering

```javascript
orderBy: [
  { column: 'created_at', asc: false },   // Newest first
  { column: 'name', asc: true }           // Then alphabetical
]
```

### Pagination

```javascript
{
  table: 'conversations',
  limit: 20,          // Page size
  offset: 40,         // Skip first 2 pages (page 3)
  count: true         // Include total for pagination UI
}
```

---

## One-Liner Terminal Commands

All commands use this base pattern:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{ /* YOUR CODE */ })();"
```

### Query shortcuts

```bash
# All conversations (first 5)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',limit:5});console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Training sets for a workbase
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_sets',select:'id,name,status,conversation_count,last_build_error',where:[{column:'workbase_id',operator:'eq',value:'232bea74-b987-4629-afbc-a21180fe6e84'}],orderBy:[{column:'created_at',asc:false}]});r.data.forEach(ts=>console.log(ts.name,'/',ts.status,'/',ts.conversation_count,'convs'));})();"

# Pipeline training jobs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_training_jobs',select:'id,status,preset_id,progress,total_steps,estimated_total_cost',orderBy:[{column:'created_at',asc:false}],limit:5});r.data.forEach(j=>console.log(j.id.slice(0,8),'/',j.status,'/',j.preset_id));})();"

# Datasets
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,total_training_pairs',orderBy:[{column:'created_at',asc:false}],limit:10});r.data.forEach(d=>console.log(d.name,'/',d.status));})();"

# Training files
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_files',select:'id,name,conversation_count,total_training_pairs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});r.data.forEach(f=>console.log(f.name,'(',f.conversation_count,'convs)'));})();"

# Prompt templates by tier
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'prompt_templates',select:'template_name,tier,emotional_arc_type',where:[{column:'tier',operator:'eq',value:'edge_case'}]});r.data.forEach(t=>console.log(t.template_name));})();"

# Notifications
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'notifications',select:'type,title,message,created_at',orderBy:[{column:'created_at',asc:false}],limit:10});r.data.forEach(n=>console.log(n.type,'-',n.title));})();"

# Workbases
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'workbases',select:'id,name,created_at',orderBy:[{column:'created_at',asc:false}]});r.data.forEach(w=>console.log(w.id.slice(0,8),w.name));})();"
```

### Schema shortcuts

```bash
# Introspect any table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversations',transport:'pg'});if(r.success){const t=r.tables[0];console.log(t.name,': rows='+t.rowCount+', cols='+t.columns.length+', RLS='+t.rlsEnabled);t.columns.forEach(c=>console.log(' ',c.name,c.type,c.nullable?'NULL':'NOT NULL',c.isPrimaryKey?'PK':''));}})();"

# List ALL public tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({transport:'pg',includeColumns:false,includeIndexes:false,includeConstraints:false,includePolicies:false});r.tables.forEach(t=>console.log(t.name,': rows='+t.rowCount+', size='+(t.sizeBytes/1024).toFixed(0)+'KB'));})();"

# DDL one-liner (add column)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'ALTER TABLE training_sets ADD COLUMN IF NOT EXISTS notes TEXT;',transaction:true,transport:'pg'});console.log('Success:',r.success,r.summary);})();"

# List indexes on a table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentManageIndex({table:'conversations',action:'list',transport:'pg'});r.indexes.forEach(i=>console.log(i.name,'|',i.columns.join(','),i.isUnique?'UNIQUE':''));})();"
```

### Health check

```bash
# Full SAOL health check — tests both transports
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  console.log('SAOL v'+saol.VERSION);
  const q=await saol.agentQuery({table:'training_sets',limit:1});
  console.log('1. REST query:',q.success?'PASS':'FAIL');
  const s=await saol.agentIntrospectSchema({table:'training_sets',transport:'pg'});
  console.log('2. PG introspect:',s.success?'PASS':'FAIL');
  const d=await saol.agentExecuteDDL({sql:'SELECT 1;',transaction:true,transport:'pg'});
  console.log('3. PG DDL:',d.success?'PASS':'FAIL');
  console.log(q.success&&s.success&&d.success?'ALL PASS':'SOME FAILED');
})();
"
```

---

## Error Handling & Recovery

### How SAOL errors work

Every SAOL function returns `{ success: boolean, summary: string, nextActions: NextAction[] }`. On failure:
- `success` is `false`
- `summary` contains a human-readable error description
- `nextActions` contains remediation steps with priority and examples

Under the hood, database errors are mapped through `mapDatabaseError()` which translates raw PostgreSQL and connection errors into actionable SAOL error codes.

### Error categories

| Category | Codes | Description |
|----------|-------|-------------|
| `CONNECTION` | `ERR_CONNECTION_DNS`, `ERR_CONNECTION_REFUSED`, `ERR_CONNECTION_TIMEOUT` | Network/DNS errors |
| `DB` | `ERR_DB_UNIQUE_VIOLATION`, `ERR_DB_FK_VIOLATION`, `ERR_DB_NOT_NULL_VIOLATION`, `ERR_DB_CHECK_VIOLATION`, `ERR_DB_TABLE_NOT_FOUND`, `ERR_DB_COLUMN_NOT_FOUND` | PostgreSQL constraint/schema errors |
| `AUTH` | `ERR_AUTH_RLS_DENIED`, `ERR_AUTH_INVALID_KEY`, `ERR_SCHEMA_ACCESS_DENIED` | Permission/authentication errors |
| `CAST` | `ERR_CAST_INVALID_INPUT`, `ERR_CAST_JSONB` | Type casting failures |
| `CHAR` | `ERR_CHAR_INVALID_UTF8`, `ERR_CHAR_CONTROL` | Character encoding issues |
| `VALIDATION` | `ERR_VALIDATION_SCHEMA`, `ERR_VALIDATION_REQUIRED`, `ERR_DDL_SYNTAX` | Input validation errors |
| `FATAL` | `ERR_FATAL` | Unmapped errors (check raw error message) |

### Common error patterns and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `DNS resolution failed` | Supabase removed IPv4 for direct DB | Use pooler URL in `DATABASE_URL` |
| `duplicate key violates unique constraint` | Record already exists | Use `mode: 'upsert'` with `onConflict` |
| `violates foreign key constraint` | Referenced record missing | Import parent table first |
| `null value in column` | Required field missing | Ensure all NOT NULL fields have values |
| `permission denied` | Wrong key or RLS blocking | Use `SUPABASE_SERVICE_ROLE_KEY` |
| `relation does not exist` | Table name typo or table not created | Verify with `agentIntrospectSchema` |
| `Unknown error` | Unmapped error — check raw output | Enable verbose logging or check `nextActions` |

### Using `nextActions` for automated recovery

```javascript
const result = await saol.agentImportTool({
  source: records,
  table: 'conversations',
  mode: 'insert'
});

if (!result.success) {
  console.log('Failed:', result.summary);
  result.nextActions
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.priority] - order[b.priority];
    })
    .forEach(action => {
      console.log(`[${action.priority}] ${action.action}: ${action.description}`);
      if (action.example) console.log(`  Example: ${action.example}`);
    });
}
```

### Using `analyzeImportErrors` for bulk import recovery

```javascript
const result = await saol.agentImportTool({ source: './data.ndjson', table: 'conversations' });

if (!result.success) {
  const analysis = await saol.analyzeImportErrors(result);
  analysis.recoverySteps.forEach(step => {
    console.log(`[${step.priority}] ${step.errorCode} (${step.affectedCount} records)`);
    console.log(`  Action: ${step.action}`);
    console.log(`  Fix: ${step.description}`);
    if (step.automatable) console.log('  → Can be auto-fixed');
  });
}
```

### Checking if an error is retryable

```javascript
const { isTransientError } = require('supa-agent-ops');

try {
  // ... some operation
} catch (error) {
  if (isTransientError(error)) {
    console.log('Transient error — safe to retry');
    // Retry logic here
  } else {
    console.log('Permanent error — fix the root cause');
  }
}
```

---

## Troubleshooting

### SAOL won't load / `Cannot find module`
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && npm install
```

### `dist/` is missing or stale
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && npm run build
```

### All pg transport ops fail with "Unknown error" or "DNS resolution failed"
Check `DATABASE_URL` in `.env.local`. Must use the pooler URL:
```
DATABASE_URL="postgresql://postgres.hqhtbxlgzysfbekexwku:Fx4BTNR2mNKsN27Z@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
```

### `select.join is not a function`
SAOL accepts both string and array for `select`. Both work:
```javascript
select: '*'                          // string
select: 'id,name,status'            // comma-separated string
select: ['id', 'name', 'status']   // array
```

### `filters` vs `where` confusion
Both work (backward compatible):
```javascript
where: [{ column: 'status', operator: 'eq', value: 'active' }]    // preferred
filters: [{ field: 'status', operator: 'eq', value: 'active' }]   // also works
```

### DDL fails with "transport 'supabase' not supported for DDL"
Always use `transport: 'pg'` for DDL:
```javascript
await saol.agentExecuteDDL({ sql: '...', transport: 'pg' });
```

### Port 6543 fails for DDL
Port 6543 is Transaction Mode (no DDL). Use port 5432 (Session Mode):
```
postgresql://postgres.<ref>:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres
```

### Import fails with "preflight check failed"
Run preflight manually to see specific issues:
```javascript
const pf = await saol.agentPreflight({ table: 'my_table' });
console.log(pf.ok, pf.issues, pf.recommendations);
```

### Need to generate INSERT SQL for manual execution
Use `generateDollarQuotedInsert` to avoid escaping issues:
```javascript
const sql = saol.generateDollarQuotedInsert('my_table', {
  id: 'abc-123',
  name: "It's a test with 'quotes'",
  data: { nested: { json: true } }
});
// Produces: INSERT INTO my_table (id, name, data) VALUES ($$abc-123$$, $$It's a test with 'quotes'$$, $${"nested":{"json":true}}$$::jsonb);
```

---

## Utility Exports (Advanced)

SAOL also exports these utilities for advanced use cases:

| Export | Module | Description |
|--------|--------|-------------|
| `sanitizeRecord(record)` | `validation/sanitize` | Strips invalid UTF-8, control characters |
| `validateAndSanitize(value, config)` | `validation/sanitize` | Validates + sanitizes a single value |
| `detectProblematicCharacters(text)` | `validation/sanitize` | Detects characters that may cause issues |
| `normalizeRecord(record, schema)` | `validation/normalize` | Unicode NFC normalization |
| `validateRequiredFields(record, schema)` | `validation/normalize` | Checks required fields |
| `coerceTypes(record, schema)` | `validation/normalize` | Type coercion (string → number, etc.) |
| `createValidator(schema)` | `validation/schema` | Creates a reusable validator function |
| `validateRecords(records, schema)` | `validation/schema` | Validates array of records |
| `mapDatabaseError(error)` | `errors/codes` | Maps raw errors to SAOL error codes |
| `isTransientError(error)` | `errors/codes` | Checks if error is retryable |
| `ERROR_MAPPINGS` | `errors/codes` | Full array of error mapping definitions |
| `generateRecoverySteps(errors)` | `errors/handlers` | Generates prioritized recovery steps |
| `suggestNextActions(result)` | `errors/handlers` | Suggests next actions based on operation result |
| `logger` | `utils/logger` | SAOL's internal logger instance |
| `VERSION` | index | Library version string (currently `'1.3.0'`) |

---

## Additional Documentation

| Document | Path |
|----------|------|
| Quick Start | `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\QUICK_START.md` |
| Troubleshooting | `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\TROUBLESHOOTING.md` |
| Error Codes | `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\ERROR_CODES.md` |
| Schema Operations Guide | `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\SCHEMA_OPERATIONS_GUIDE.md` |
| Agent Manual | `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\saol-agent-manual_v2.md` |
| SAOL Fix (DNS issue) | `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\iteration-10-saol-fix_v1.md` |
