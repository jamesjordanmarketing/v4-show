# Frontier RAG Module - Execution Prompt E01: Database Foundation

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E01 - Database Foundation
**Prerequisites:** None -- this is the first execution prompt
**Status:** Ready for Execution

---

## Overview

This prompt sets up the entire data layer for the Frontier RAG module: enables pgvector, creates 8 database tables with RLS policies, indexes, and triggers, creates a Supabase Storage bucket, and verifies everything works.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-1.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`
- **Project Overview:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

---

## HUMAN ACTIONS REQUIRED BEFORE RUNNING THIS PROMPT

Complete ALL of these steps manually before pasting the execution prompt below into Cursor:

### Human Action 1: Enable pgvector Extension
- **Where:** Supabase Dashboard -> Database -> Extensions -> Search "vector" -> Enable
- **Why:** The migration SQL creates a `vector(1536)` column that requires this extension

### Human Action 2: Add DATABASE_URL to .env.local
- **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
- **Value:** `DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
- **Why:** SAOL needs this for `agentExecuteDDL` and `agentIntrospectSchema` operations
- **How to find it:** Supabase Dashboard -> Settings -> Database -> Connection string -> URI (use the "Transaction" pooler mode with port 6543)

### Human Action 3: Add OPENAI_API_KEY to .env.local
- **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
- **Value:** `OPENAI_API_KEY=sk-...` (obtain from platform.openai.com -> API Keys)
- **Why:** Required for embedding generation in later prompts (E03+)

### Human Action 4: Install openai npm package
- **Where:** Terminal in `C:\Users\james\Master\BrightHub\brun\v4-show\src`
- **Command:** `npm install openai`
- **Why:** Required for the OpenAI embedding provider in later prompts (E02+)

### Human Action 5: Create rag-documents Storage Bucket
- **Where:** Supabase Dashboard -> Storage -> New Bucket
- **Values:**
  - Bucket name: `rag-documents`
  - Public bucket: **No** (unchecked)
  - File size limit: `104857600` (100MB)
  - Allowed MIME types: `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown`

### Verification: Confirm Human Actions
After completing all 5 steps:
1. Check `.env.local` has both `DATABASE_URL` and `OPENAI_API_KEY`
2. Check `node_modules/openai` exists in `src/`
3. Check Supabase Dashboard shows pgvector extension enabled
4. Check Supabase Dashboard shows `rag-documents` bucket exists

---

========================


# EXECUTION PROMPT E01: Database Foundation - Migration, RLS, Storage

## Your Mission

You are setting up the complete database foundation for a new Frontier RAG module in an existing Next.js 14 + Supabase application. You will:
1. Run a database migration that creates 8 new tables with RLS policies, indexes, and triggers
2. Create a PostgreSQL function for vector similarity search
3. Set up storage RLS policies for the `rag-documents` bucket
4. Verify everything is correctly configured

The pgvector extension, DATABASE_URL, OPENAI_API_KEY, the openai npm package, and the storage bucket have already been set up manually. Your job is the migration and verification.

---

## Step 0: Read the Specification

Read this file completely. It contains the full migration SQL, all table definitions, RLS policies, indexes, triggers, and storage policies:

`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-1.md`

Also read the SAOL quick start to understand how to use it:

`C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

And read the project overview for full context:

`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

---

## Step 1: Verify Prerequisites

Before running the migration, confirm the prerequisites are in place.

### 1a. Verify SAOL can connect to the database

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversations',includeColumns:false,transport:'pg'});console.log('Connection OK:', r.tables[0]?.exists);})();"
```

**Expected:** `Connection OK: true`

If this fails with a connection error, STOP and inform the user that DATABASE_URL is not configured correctly.

### 1b. Verify pgvector extension is enabled

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';\",transport:'pg'});console.log('pgvector:', r.data?.length > 0 ? 'ENABLED' : 'NOT ENABLED');if(r.data?.length>0)console.log('Version:',r.data[0].extversion);})();"
```

**Expected:** `pgvector: ENABLED` with a version number.

If this shows `NOT ENABLED`, STOP and inform the user to enable pgvector via the Supabase Dashboard.

### 1c. Verify no RAG tables exist yet

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,includeColumns:false,transport:'pg'});console.log(t+':',r.tables[0]?.exists?'EXISTS':'does not exist');}})();"
```

**Expected:** All 8 tables should show `does not exist`. If any already exist, note which ones and proceed (the migration uses `CREATE TABLE IF NOT EXISTS`).

---

## Step 2: Run the Database Migration

The complete migration SQL is in the specification file (Section 1, FR-1.1). Extract the full SQL from the code block under `**File**: supabase/migrations/20260209_create_rag_tables.sql` and execute it.

### 2a. Dry Run

Run the migration with `dryRun: true` first to validate:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
const fs=require('fs');
(async()=>{
  // Read the migration SQL from the spec file
  const specContent = fs.readFileSync('C:/Users/james/Master/BrightHub/brun/v4-show/pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-1.md', 'utf-8');

  // Extract SQL between the first ```sql and ``` markers after the migration file path
  const sqlMatch = specContent.match(/\`\`\`sql\n([\s\S]*?)\n\`\`\`/);
  if (!sqlMatch) { console.error('Could not extract SQL from spec'); return; }
  const sql = sqlMatch[1];

  console.log('SQL length:', sql.length, 'characters');
  console.log('First 200 chars:', sql.substring(0, 200));

  const r = await saol.agentExecuteDDL({
    sql: sql,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run result:', r.success ? 'PASS' : 'FAIL');
  console.log('Summary:', r.summary);
  if (!r.success) console.error('Error:', r.error);
})();
"
```

**Expected:** `Dry-run result: PASS`

If the dry run fails, read the error message carefully. Common issues:
- pgvector not enabled -> Ask user to enable it
- Permission denied -> Check that DATABASE_URL uses the correct credentials
- Syntax error -> Check the SQL extraction regex worked correctly

### 2b. Execute Migration

If the dry run passed, execute for real:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
const fs=require('fs');
(async()=>{
  const specContent = fs.readFileSync('C:/Users/james/Master/BrightHub/brun/v4-show/pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-1.md', 'utf-8');
  const sqlMatch = specContent.match(/\`\`\`sql\n([\s\S]*?)\n\`\`\`/);
  if (!sqlMatch) { console.error('Could not extract SQL from spec'); return; }
  const sql = sqlMatch[1];

  const r = await saol.agentExecuteDDL({
    sql: sql,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration result:', r.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', r.summary);
  if (!r.success) console.error('Error:', r.error);
})();
"
```

**Expected:** `Migration result: SUCCESS`

**IMPORTANT:** If the SQL extraction via regex fails (common with complex markdown), fall back to manually copying the SQL from the spec file and running it in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Paste -> Run).

---

## Step 3: Create the Vector Similarity Search Function

The specification (Section 5, FR-5.5) defines a `match_rag_embeddings` PostgreSQL function needed for vector similarity search. Create it now:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const sql = \`
    CREATE OR REPLACE FUNCTION match_rag_embeddings(
      query_embedding vector(1536),
      match_threshold float DEFAULT 0.5,
      match_count int DEFAULT 10,
      filter_document_id uuid DEFAULT NULL,
      filter_user_id uuid DEFAULT NULL,
      filter_tier text DEFAULT NULL
    )
    RETURNS TABLE (
      id uuid,
      document_id uuid,
      source_id uuid,
      source_type text,
      tier text,
      content_text text,
      similarity float
    )
    LANGUAGE plpgsql
    AS \\\$\\\$
    BEGIN
      RETURN QUERY
      SELECT
        e.id,
        e.document_id,
        e.source_id,
        e.source_type,
        e.tier,
        e.content_text,
        1 - (e.embedding <=> query_embedding) AS similarity
      FROM rag_embeddings e
      WHERE
        (filter_document_id IS NULL OR e.document_id = filter_document_id)
        AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
        AND (filter_tier IS NULL OR e.tier = filter_tier)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count;
    END;
    \\\$\\\$;

    GRANT EXECUTE ON FUNCTION match_rag_embeddings TO authenticated;
    GRANT EXECUTE ON FUNCTION match_rag_embeddings TO service_role;
  \`;

  const r = await saol.agentExecuteDDL({
    sql: sql,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Function creation:', r.success ? 'SUCCESS' : 'FAILED');
  if (!r.success) console.error('Error:', r.error);
})();
"
```

**Note:** If the escaped dollar-quoting causes issues in the SAOL command, copy the SQL manually into the Supabase SQL Editor instead. The function SQL is documented in the Section 5 specification file at:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-5.md`

Look for **FR-5.5: Database Function for Vector Similarity Search**.

---

## Step 4: Create Storage RLS Policies

Run the storage RLS policies for the `rag-documents` bucket:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const sql = \`
    CREATE POLICY \"Users can upload to own folder\"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'rag-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY \"Users can read own files\"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'rag-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY \"Users can update own files\"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'rag-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY \"Users can delete own files\"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'rag-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  \`;

  const r = await saol.agentExecuteDDL({
    sql: sql,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Storage RLS:', r.success ? 'SUCCESS' : 'FAILED');
  if (!r.success) console.error('Error:', r.error);
})();
"
```

---

## Step 5: Save the Migration File

Save the migration SQL to the project's migrations directory for version control:

**File:** `src/supabase/migrations/20260209_create_rag_tables.sql`

Copy the complete migration SQL from the specification file (Section 1, FR-1.1) into this file. This is for documentation and reproducibility only -- the migration has already been executed in Step 2.

---

## Step 6: Comprehensive Verification

### 6a. Verify all 8 tables exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let allOk=true;for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,includeColumns:true,transport:'pg'});const exists=r.tables[0]?.exists;const colCount=r.tables[0]?.columns?.length||0;console.log(t+':',exists?'EXISTS ('+colCount+' columns)':'MISSING');if(!exists)allOk=false;}console.log('\nAll tables present:',allOk?'YES':'NO');})();"
```

**Expected:** All 8 tables show `EXISTS` with column counts. `rag_documents` should have ~25+ columns, `rag_embeddings` should have ~10 columns.

### 6b. Verify RLS is enabled on all tables

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'rag_%' AND relkind = 'r' ORDER BY relname;\",transport:'pg'});r.data.forEach(row=>console.log(row.relname+': RLS',row.relrowsecurity?'ENABLED':'DISABLED'));})();"
```

**Expected:** All 8 tables show `RLS ENABLED`.

### 6c. Verify HNSW vector index exists

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT indexname FROM pg_indexes WHERE tablename = 'rag_embeddings' AND indexname LIKE '%hnsw%';\",transport:'pg'});console.log('HNSW index:',r.data?.length>0?r.data[0].indexname:'NOT FOUND');})();"
```

**Expected:** `HNSW index: idx_rag_embeddings_vector_hnsw`

### 6d. Verify match_rag_embeddings function exists

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT proname FROM pg_proc WHERE proname = 'match_rag_embeddings';\",transport:'pg'});console.log('Function:',r.data?.length>0?'EXISTS':'NOT FOUND');})();"
```

**Expected:** `Function: EXISTS`

### 6e. Verify triggers exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE 'update_rag_%' ORDER BY event_object_table;\",transport:'pg'});console.log('Triggers found:',r.data?.length);r.data?.forEach(row=>console.log(' -',row.event_object_table+':',row.trigger_name));})();"
```

**Expected:** 5 triggers on: `rag_documents`, `rag_expert_questions`, `rag_facts`, `rag_knowledge_bases`, `rag_sections`

---

## Success Criteria

- [ ] All 8 `rag_*` tables exist in the database
- [ ] RLS is enabled on all 8 tables (32 policies total)
- [ ] HNSW vector index exists on `rag_embeddings.embedding`
- [ ] `match_rag_embeddings` function exists and is granted to `authenticated` and `service_role`
- [ ] 5 `updated_at` triggers exist on mutable tables
- [ ] `rag-documents` storage bucket exists with correct configuration
- [ ] Storage RLS policies enforce user-folder isolation
- [ ] Migration SQL saved to `src/supabase/migrations/20260209_create_rag_tables.sql`

---

## If Something Goes Wrong

### SAOL Connection Fails
- Verify `DATABASE_URL` in `.env.local` is correct
- Try the Supabase Dashboard connection string with port `6543` (transaction pooler)
- If `pg` transport fails, try `rest` transport (but note: DDL operations require `pg`)

### Migration SQL Extraction Fails
- The regex may not parse the markdown correctly
- **Fallback:** Open the Section 1 spec file manually, copy the SQL between the ` ```sql ` and ` ``` ` markers, paste into Supabase SQL Editor, and run it there

### pgvector Not Found Error
- The `CREATE EXTENSION IF NOT EXISTS vector;` line in the migration will fail if pgvector wasn't enabled via Dashboard
- Go to Supabase Dashboard -> Database -> Extensions -> Enable "vector"
- Then re-run the migration

### Storage Bucket Doesn't Exist
- Storage bucket creation must be done manually via Dashboard
- Go to Supabase Dashboard -> Storage -> New Bucket -> Name: `rag-documents` -> Private

### Policy Already Exists Error
- If storage policies already exist (from a previous attempt), drop them first:
  ```sql
  DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
  ```
- Then re-run Step 4

---

## What's Next

**E02** will create all TypeScript types and provider abstraction files. It depends on the database tables created in this prompt being present (for type alignment).

---

**End of E01 Prompt**


+++++++++++++++++
