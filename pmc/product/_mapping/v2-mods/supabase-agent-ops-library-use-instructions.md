## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)  
**Updated:** January 27, 2026 - Added comprehensive table creation instructions

---

## 📋 Table of Contents

1. [Setup & Usage](#setup--usage)
2. [Key Rules](#key-rules)
3. [Quick Reference: One-Liner Commands](#quick-reference-one-liner-commands)
4. [Common Queries](#common-queries)
5. [SAOL Parameter Formats](#saol-parameter-formats-both-work)
6. **[🏗️ Creating Tables with SAOL](#️-creating-tables-with-saol)** ⭐ NEW
   - [Method 1: SAOL DDL Execution (Recommended)](#method-1-saol-ddl-execution-recommended-for-agents)
   - [Method 2: SAOL Raw SQL Execution](#method-2-saol-raw-sql-execution)
   - [Method 3: Manual SQL Paste](#method-3-manual-sql-paste-simplest-for-complex-migrations)
   - [Method 4: Complete Workflow](#method-4-complete-table-creation-workflow-recommended)
   - [Common DDL Operations](#common-ddl-operations)
   - [Troubleshooting](#troubleshooting-table-creation)

---

## 🎯 Quick Summary: Creating Tables

**SAOL provides THREE methods for creating tables:**

1. **`agentExecuteDDL()`** - Recommended for agents. Supports dry-run, transactions, validation.
2. **`agentExecuteSQL()`** - Execute raw SQL with transaction support.
3. **Manual SQL Paste** - Paste SQL directly into Supabase SQL Editor (simplest for complex migrations).

**Key Points:**
- ✅ Always use `transport: 'pg'` for DDL operations
- ✅ Always test with `dryRun: true` first
- ✅ Always use `transaction: true` for auto-rollback on errors
- ✅ Always verify with `agentIntrospectSchema()` after creation
- ✅ Use `CREATE TABLE IF NOT EXISTS` to prevent duplicate errors

**Jump to:** [Creating Tables Section](#️-creating-tables-with-saol)

---

## ⚡ Quick Start: Create a Table in 30 Seconds

**Want to create a table right now? Copy and paste this:**

```javascript
// Load SAOL
require('dotenv').config({ path: '../.env.local' });
const saol = require('supa-agent-ops');

// Create table with validation
(async () => {
  // Step 1: Dry-run to validate SQL
  const dryRun = await saol.agentExecuteDDL({
    sql: `
      CREATE TABLE IF NOT EXISTS my_new_table (
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
  
  console.log('Validation:', dryRun.success ? '✓ PASS' : '✗ FAIL');
  
  // Step 2: Execute if validation passed
  if (dryRun.success) {
    const result = await saol.agentExecuteDDL({
      sql: `
        CREATE TABLE IF NOT EXISTS my_new_table (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
      transaction: true,
      transport: 'pg'
    });
    
    console.log('Created:', result.success ? '✓ YES' : '✗ NO');
    console.log('Summary:', result.summary);
  }
})();
```

**One-liner for terminal:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'CREATE TABLE IF NOT EXISTS my_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL);',transaction:true,transport:'pg'});console.log('✓ Created:',r.success);})();"
```

**That's it!** Your table is created. Read on for more advanced options.

---

### Setup & Usage

**Installation**: Already available in project
```bash
# SAOL is installed and configured
# Located in supa-agent-ops/ directory
```

**CRITICAL: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path:** supa-agent-ops
**Quick Start:** QUICK_START.md (READ THIS FIRST)
**Troubleshooting:** TROUBLESHOOTING.md

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

```bash
# Query conversations (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check schema (Deep Introspection)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversations',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Verify datasets table (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);console.log('Policies:',r.tables[0].policies.length);}})();"

# Query datasets (Section E02)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,total_training_pairs',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Verify training_jobs table (Section E03)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,preset_id,progress,total_steps,estimated_total_cost',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.preset_id));})();"

# Verify notifications table (Section E03)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'notifications',select:'type,title,message,created_at',where:[{column:'type',operator:'eq',value:'job_queued'}],orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Job queued notifications:',r.data.length);r.data.forEach(n=>console.log('-',n.title));})();"
```

### Common Queries

**Check conversations (specific columns, with filtering)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversations',select:'id,conversation_id,enrichment_status,title',where:[{column:'enrichment_status',operator:'eq',value:'completed'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Success:',r.success,'Count:',r.data.length);r.data.forEach(c=>console.log('-',c.conversation_id.slice(0,8),'/',c.enrichment_status));})();"
```

**Check training files**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_files',select:'id,name,conversation_count,total_training_pairs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Files:',r.data.length);r.data.forEach(f=>console.log('-',f.name,'(',f.conversation_count,'convs)'));})();"
```

**Check prompt templates (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'prompt_templates',select:'template_name,tier,emotional_arc_type',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case templates:',r.data.length);r.data.forEach(t=>console.log('-',t.template_name));})();"
```

**Check emotional arcs (edge case tier)**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'emotional_arcs',select:'arc_key,name,tier',where:[{column:'tier',operator:'eq',value:'edge_case'}]});console.log('Edge case arcs:',r.data.length);r.data.forEach(a=>console.log('-',a.arc_key,'→',a.name));})();"
```

### SAOL Parameter Formats (Both Work)

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: ['template_name', 'tier', 'emotional_arc_type'],  // Array
  where: [{ column: 'tier', operator: 'eq', value: 'edge_case' }],  // where + column
  orderBy: [{ column: 'created_at', asc: false }]
});
```

**Backward Compatible Format**:
```javascript
const result = await saol.agentQuery({
  table: 'prompt_templates',
  select: 'template_name,tier,emotional_arc_type',  // String
  filters: [{ field: 'tier', operator: 'eq', value: 'edge_case' }],  // filters + field
  orderBy: [{ column: 'created_at', asc: false }]
});
```

---

## 🏗️ Creating Tables with SAOL

SAOL provides **multiple methods** for creating database tables. Choose the method that best fits your workflow.

### Method 1: SAOL DDL Execution (Recommended for Agents)

**Function:** `agentExecuteDDL()` - Execute DDL statements with transaction support and validation.

**Best Practice: Always use dry-run first!**

```javascript
const saol = require('supa-agent-ops');

// Step 1: Test with dry-run
const dryRun = await saol.agentExecuteDDL({
  sql: `
    CREATE TABLE IF NOT EXISTS my_new_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,
  dryRun: true,
  transaction: true,
  transport: 'pg'
});

console.log('Dry run result:', dryRun.summary);
console.log('Would affect:', dryRun.affectedObjects);

// Step 2: Execute for real if validation passes
if (dryRun.success && dryRun.warnings.length === 0) {
  const result = await saol.agentExecuteDDL({
    sql: `
      CREATE TABLE IF NOT EXISTS my_new_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });
  
  console.log('Table created:', result.success);
  console.log('Summary:', result.summary);
}
```

**One-liner version (for quick testing):**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'CREATE TABLE IF NOT EXISTS test_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL);',transaction:true,transport:'pg'});console.log('Success:',r.success);console.log('Summary:',r.summary);})();"
```

### Method 2: SAOL Raw SQL Execution

**Function:** `agentExecuteSQL()` - Execute raw SQL with transaction support.

```javascript
const result = await saol.agentExecuteSQL({
  sql: `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      price NUMERIC(10,2),
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes immediately
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
  `,
  transport: 'pg',
  transaction: true  // Auto-rollback on error
});

console.log('Execution result:', result.success);
console.log('Rows affected:', result.rowCount);
```

### Method 3: Manual SQL Paste (Simplest for Complex Migrations)

**Best for:** Complex migrations with multiple tables, RLS policies, and storage buckets.

1. Create a `.sql` file with your DDL statements
2. Go to Supabase Dashboard → SQL Editor
3. Click "New Query"
4. Copy and paste your SQL
5. Click "Run"
6. Verify with SAOL introspection

**Example SQL file:**
```sql
-- 01-create-my-tables.sql

CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_my_table_status ON my_table(status);
CREATE INDEX IF NOT EXISTS idx_my_table_created_at ON my_table(created_at DESC);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all records"
  ON my_table FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own records"
  ON my_table FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Verify after manual paste:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'my_table',includeColumns:true,includeIndexes:true,includePolicies:true,transport:'pg'});console.log('Table exists:',r.tables[0]?.exists);console.log('Columns:',r.tables[0]?.columns.length);console.log('Indexes:',r.tables[0]?.indexes.length);console.log('RLS enabled:',r.tables[0]?.rlsEnabled);})();"
```

### Method 4: Complete Table Creation Workflow (Recommended)

**Full workflow with verification:**

```javascript
const saol = require('supa-agent-ops');

async function createTableSafely(tableName, ddlSql) {
  // 1. Check if table already exists
  const check = await saol.agentIntrospectSchema({
    table: tableName,
    transport: 'pg'
  });
  
  if (check.tables[0]?.exists) {
    console.log(`Table "${tableName}" already exists`);
    return { success: true, existed: true };
  }
  
  // 2. Validate SQL with dry-run
  const dryRun = await saol.agentExecuteDDL({
    sql: ddlSql,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  
  if (!dryRun.success) {
    console.error('Validation failed:', dryRun.summary);
    return dryRun;
  }
  
  if (dryRun.warnings && dryRun.warnings.length > 0) {
    console.warn('Warnings detected:', dryRun.warnings);
  }
  
  // 3. Execute DDL
  const result = await saol.agentExecuteDDL({
    sql: ddlSql,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });
  
  if (!result.success) {
    console.error('Creation failed:', result.summary);
    return result;
  }
  
  // 4. Verify table was created
  const verify = await saol.agentIntrospectSchema({
    table: tableName,
    includeColumns: true,
    includeIndexes: true,
    transport: 'pg'
  });
  
  console.log(`✓ Table "${tableName}" created successfully`);
  console.log(`  Columns: ${verify.tables[0]?.columns.length}`);
  console.log(`  Indexes: ${verify.tables[0]?.indexes.length}`);
  
  return { success: true, created: true, schema: verify.tables[0] };
}

// Usage
const ddl = `
  CREATE TABLE IF NOT EXISTS training_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_training_jobs_dataset_id ON training_jobs(dataset_id);
`;

createTableSafely('training_jobs', ddl);
```

### Common DDL Operations

**Add columns to existing table:**
```javascript
await saol.agentExecuteDDL({
  sql: `
    ALTER TABLE my_table 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT;
  `,
  transaction: true,
  transport: 'pg'
});
```

**Create indexes:**
```javascript
// Option A: Using agentManageIndex (recommended)
await saol.agentManageIndex({
  table: 'my_table',
  action: 'create',
  indexName: 'idx_my_table_email',
  columns: ['email'],
  concurrent: true,  // Non-blocking for production
  transport: 'pg'
});

// Option B: Using agentExecuteDDL
await saol.agentExecuteDDL({
  sql: 'CREATE INDEX CONCURRENTLY idx_my_table_email ON my_table(email);',
  transport: 'pg'
});
```

**Enable RLS:**
```javascript
await saol.agentExecuteDDL({
  sql: `
    ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view all"
      ON my_table FOR SELECT
      USING (true);
      
    CREATE POLICY "Users can insert own"
      ON my_table FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  `,
  transaction: true,
  transport: 'pg'
});
```

### DDL Parameters Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sql` | `string` | **Required** | DDL statement(s) to execute |
| `dryRun` | `boolean` | `false` | Validate without executing |
| `transaction` | `boolean` | `true` | Wrap in BEGIN/COMMIT (auto-rollback on error) |
| `transport` | `'pg' \| 'supabase'` | `'pg'` | Transport method (use 'pg' for DDL) |

### Important Notes

1. **Always use `transport: 'pg'` for DDL operations** - The PostgreSQL transport is required for schema operations
2. **Use `CREATE TABLE IF NOT EXISTS`** - Prevents errors if table already exists
3. **Always use transactions** - Set `transaction: true` for automatic rollback on errors
4. **Test with dry-run first** - Validates SQL syntax without executing
5. **Verify after creation** - Use `agentIntrospectSchema()` to confirm table structure
6. **Use `CONCURRENTLY` for production indexes** - Prevents table locking during index creation

### Troubleshooting Table Creation

**Error: "permission denied for schema public"**
- Solution: Ensure you're using `SUPABASE_SERVICE_ROLE_KEY`, not anon key

**Error: "relation already exists"**
- Solution: Use `CREATE TABLE IF NOT EXISTS` or check with `agentIntrospectSchema()` first

**Error: "syntax error at or near..."**
- Solution: Run with `dryRun: true` first to validate SQL syntax

**Error: "transport 'supabase' not supported for DDL"**
- Solution: Use `transport: 'pg'` for all DDL operations

### Complete Example: Creating Training Jobs Table

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Check if exists
  const check = await saol.agentIntrospectSchema({table:'training_jobs',transport:'pg'});
  if(check.tables[0]?.exists) {
    console.log('Table already exists');
    return;
  }
  
  // Create table
  const result = await saol.agentExecuteDDL({
    sql: \`
      CREATE TABLE IF NOT EXISTS training_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dataset_id UUID NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_training_jobs_dataset_id ON training_jobs(dataset_id);
    \`,
    transaction: true,
    transport: 'pg'
  });
  
  console.log('Success:', result.success);
  console.log('Summary:', result.summary);
  
  // Verify
  const verify = await saol.agentIntrospectSchema({table:'training_jobs',includeColumns:true,transport:'pg'});
  console.log('Columns created:', verify.tables[0]?.columns.length);
})();
"
```

---

## 🔄 SAOL vs Supabase Migrations: When to Use Each

### Use SAOL (`agentExecuteDDL`) When:
- ✅ You need programmatic table creation in scripts or automation
- ✅ You want dry-run validation before executing
- ✅ You need transaction safety with auto-rollback
- ✅ You want to verify table creation immediately after
- ✅ You're building dynamic schema operations
- ✅ You need detailed error reporting with remediation steps

### Use Supabase Migrations (Manual SQL Paste) When:
- ✅ Creating complex migrations with multiple tables, RLS policies, and storage buckets
- ✅ You want version-controlled migration files in `supabase/migrations/`
- ✅ You need to share migrations with team members
- ✅ You're setting up initial database schema
- ✅ You want Supabase's built-in migration tracking

### Hybrid Approach (Best of Both Worlds):
1. **Write SQL in migration file** - Create `.sql` file in `supabase/migrations/`
2. **Test with SAOL dry-run** - Validate SQL syntax before committing
3. **Execute via Supabase Dashboard** - Paste SQL into SQL Editor
4. **Verify with SAOL** - Use `agentIntrospectSchema()` to confirm structure

**Example:**
```javascript
// Test migration file before applying
const fs = require('fs');
const saol = require('supa-agent-ops');

const migrationSQL = fs.readFileSync('./supabase/migrations/20260127_create_my_table.sql', 'utf8');

// Validate with SAOL
const dryRun = await saol.agentExecuteDDL({
  sql: migrationSQL,
  dryRun: true,
  transport: 'pg'
});

if (dryRun.success) {
  console.log('✓ Migration SQL is valid');
  console.log('→ Ready to paste into Supabase SQL Editor');
} else {
  console.error('✗ Migration has errors:', dryRun.summary);
}
```

---

## 📚 Additional Resources

**SAOL Documentation:**
- `supa-agent-ops/QUICK_START.md` - Quick start guide
- `supa-agent-ops/SCHEMA_OPERATIONS_GUIDE.md` - Comprehensive schema operations guide
- `supa-agent-ops/saol-agent-manual_v2.md` - Complete agent manual
- `supa-agent-ops/TROUBLESHOOTING.md` - Common issues and solutions
- `supa-agent-ops/ERROR_CODES.md` - Error code reference

**Example Files:**
- `supa-agent-ops/example-schema-operations.js` - Schema operations examples
- `supa-agent-ops/migrations/01-create-training-files-tables.sql` - Migration example
- `supa-agent-ops/migrations/README.md` - Migration workflow guide

**Test Your Setup:**
```bash
# Verify SAOL is working
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
node example-schema-operations.js
```
