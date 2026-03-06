# Adapter Auto-Deployment — Execution Prompt E01
# Foundation: Database Migration + Dependencies

**Version:** 1.0  
**Date:** 2026-02-24  
**Section:** E01 — Database Migration and Dependency Setup  
**Prerequisite for:** E02 and E03  
**What this builds:** Adds the `hf_adapter_path` column to `pipeline_training_jobs`, installs `tar-stream`, and documents env var requirements

---

## Overview

E01 is infrastructure-only. No application code is written in this step.

**E01 creates:**
- New column `hf_adapter_path TEXT` on `pipeline_training_jobs` (via SAOL)
- `tar-stream` npm dependency in `package.json`
- A verified, clean foundation for E02 and E03

**E01 does NOT create:**
- Any TypeScript files
- Any API routes
- Any Inngest functions

---

========================


## Context and Purpose

You are implementing the first step of a three-part feature: **Automated Adapter Deployment**.

When a LoRA training job completes on RunPod, the adapter (tar.gz) is stored in Supabase Storage. Currently, a human must manually:
1. Download the tar.gz
2. Extract it and push to HuggingFace Hub
3. Update the RunPod inference endpoint `LORA_MODULES` env var

This three-part implementation automates all of that. Your job in **E01** is to prepare the database and npm dependencies.

**Target codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`  
**SAOL tool:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`  
**Environment file:** `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`

---

## Critical Rules

1. **Use SAOL for ALL database operations.** Do not use raw SQL scripts, Supabase Dashboard SQL editor, or any other method. SAOL is the mandatory tool.
2. **Always run `dryRun: true` before executing any DDL.** Validate first, execute second.
3. **Do not modify any TypeScript files in this step.** E01 is infrastructure-only.
4. **Read files before editing.** Before adding to `.env.local`, read it first to avoid duplicates.

---

## Step 1: Pre-Flight — Inspect Current DB Schema

Run this SAOL command to inspect the current `pipeline_training_jobs` schema. Read the output carefully to confirm the column does NOT already exist.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentIntrospectSchema({
    table: 'pipeline_training_jobs',
    includeColumns: true,
    transport: 'pg'
  });
  if (!r.success) { console.error('Schema introspection failed:', r); return; }
  const cols = r.tables[0]?.columns || [];
  console.log('=== pipeline_training_jobs columns ===');
  cols.forEach(c => console.log(c.name, '|', c.type, '| nullable:', c.nullable));
  const exists = cols.some(c => c.name === 'hf_adapter_path');
  console.log('\\nhf_adapter_path column exists:', exists ? '✓ YES (skip migration)' : '✗ NO (migration needed)');
})();"
```

**Expected output:** The column `hf_adapter_path` should NOT be present. If it already exists, skip Step 2 entirely.

---

## Step 2: Database Migration — Add `hf_adapter_path` Column

This column stores the HuggingFace Hub path for the deployed adapter (e.g. `BrightHub2/lora-emotional-intelligence-608fbb9b`). It also serves as the idempotency signal — if it is non-null, the auto-deploy function will skip re-deploying.

### Step 2a: Dry Run (validate SQL syntax)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: \`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;\`,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });
  console.log('Dry run success:', r.success);
  console.log('Summary:', r.summary);
  if (!r.success) console.error('ERRORS:', r.errors);
  if (r.warnings && r.warnings.length > 0) console.warn('Warnings:', r.warnings);
})();"
```

**Expected output:**
```
Dry run success: true
Summary: ...
```

**If the dry run fails:** Do NOT proceed. Read the error, fix the SQL, and re-run the dry run.

### Step 2b: Execute Migration

Only run this after the dry run succeeds.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentExecuteDDL({
    sql: \`ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS hf_adapter_path TEXT;\`,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });
  console.log('Execute success:', r.success);
  console.log('Summary:', r.summary);
  if (!r.success) console.error('ERRORS:', r.errors);
})();"
```

**Expected output:**
```
Execute success: true
Summary: ...
```

### Step 2c: Verify the Column Exists

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentIntrospectSchema({
    table: 'pipeline_training_jobs',
    includeColumns: true,
    transport: 'pg'
  });
  const cols = r.tables[0]?.columns || [];
  const col = cols.find(c => c.name === 'hf_adapter_path');
  if (col) {
    console.log('✓ hf_adapter_path column confirmed:', JSON.stringify(col, null, 2));
  } else {
    console.error('✗ hf_adapter_path column NOT FOUND — migration may have failed');
    console.log('All columns:', cols.map(c => c.name).join(', '));
  }
})();"
```

**Expected output:**
```
✓ hf_adapter_path column confirmed: { "name": "hf_adapter_path", "type": "text", "nullable": true, ... }
```

---

## Step 3: Install npm Dependency — `tar-stream`

The auto-deploy Inngest function (E02) uses `tar-stream` to extract the adapter tar.gz entirely in-memory without writing temp files to disk. This avoids Vercel `/tmp` size concerns and filesystem cleanup issues.

### Step 3a: Check if already installed

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node -e "
try {
  require('tar-stream');
  console.log('✓ tar-stream is already installed');
} catch(e) {
  console.log('✗ tar-stream NOT installed — proceed with npm install');
}"
```

### Step 3b: Install if not already present

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm install tar-stream && npm install --save-dev @types/tar-stream
```

### Step 3c: Verify installation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node -e "
const pkg = require('./package.json');
console.log('tar-stream in dependencies:', pkg.dependencies['tar-stream'] || 'NOT FOUND');
console.log('@types/tar-stream in devDependencies:', pkg.devDependencies?.['@types/tar-stream'] || 'NOT FOUND');
"
```

**Expected output:**
```
tar-stream in dependencies: ^3.x.x (or similar version)
@types/tar-stream in devDependencies: ^3.x.x (or similar version)
```

---

## Step 4: Document Required Environment Variables

Read `.env.local` first to understand what is already there, then add the missing variables.

### Step 4a: Read current `.env.local`

Use the Read tool to read: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`

Look for these variables. Note whether each is present or absent:
- `HF_TOKEN` — HuggingFace API token with write access to the `BrightHub2` org
- `HF_ORG` — The HuggingFace organization name
- `HF_ADAPTER_REPO_PREFIX` — Adapter repository name prefix
- `RUNPOD_INFERENCE_ENDPOINT_ID` — The RunPod inference serverless endpoint ID
- `WEBHOOK_SECRET` — Shared secret for the Supabase-to-Next.js webhook call

### Step 4b: Add missing variables to `.env.local`

For each variable that is **absent**, append the placeholder line to `.env.local`. For each variable that is **already present**, leave it unchanged.

The variables to add if missing (with their confirmed values):

```
# Adapter Auto-Deployment (added E01 2026-02-24)
HF_TOKEN=REPLACE_WITH_HUGGINGFACE_WRITE_TOKEN
HF_ORG=BrightHub2
HF_ADAPTER_REPO_PREFIX=lora-emotional-intelligence
RUNPOD_INFERENCE_ENDPOINT_ID=ei82ickpenoqlp
WEBHOOK_SECRET=REPLACE_WITH_GENERATED_SECRET
```

**To generate a secure WEBHOOK_SECRET value:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as the `WEBHOOK_SECRET` value in `.env.local`.

**Important:** `HF_TOKEN` and `WEBHOOK_SECRET` require real values before the feature can be tested end-to-end. The other three have concrete values provided above.

**Note for Vercel deployment:** These same five variables must also be added to the Vercel Dashboard under Settings → Environment Variables before pushing. This is documented in E03 as a human action.

---

## Step 5: Verify SAOL Connection

Run this final verification to confirm SAOL and the database connection are healthy before E02 begins.

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  // Check recent completed jobs — confirms DB is accessible
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'status', operator:'eq', value:'completed'}],
    select: 'id, job_name, adapter_file_path, hf_adapter_path, completed_at',
    orderBy: [{column:'completed_at', asc:false}],
    limit: 3
  });
  console.log('DB connection: ✓ OK');
  console.log('Completed jobs found:', r.data.length);
  r.data.forEach(j => {
    console.log('-', j.id?.slice(0,8), '|', j.job_name?.slice(0,30));
    console.log('  adapter_file_path:', j.adapter_file_path || '(null)');
    console.log('  hf_adapter_path:', j.hf_adapter_path || '(null — expected for now)');
  });
})();"
```

**Expected output:** 1–3 completed jobs listed, `hf_adapter_path` will be `null` on all (the column was just added and is empty — this is correct).

---

## E01 Success Criteria

Before proceeding to E02, confirm ALL of the following:

- [ ] `hf_adapter_path TEXT` column confirmed present on `pipeline_training_jobs` via SAOL introspection
- [ ] `tar-stream` listed in `package.json` under `dependencies`
- [ ] `@types/tar-stream` listed in `package.json` under `devDependencies`
- [ ] `.env.local` contains placeholder entries for `HF_TOKEN`, `HF_ORG`, `HF_ADAPTER_REPO_PREFIX`, `RUNPOD_INFERENCE_ENDPOINT_ID`, `WEBHOOK_SECRET`
- [ ] SAOL final verification query returns completed jobs without error

**Once all criteria are met, proceed to E02.**

---

## Files Modified in E01

| File | Change |
|------|--------|
| `pipeline_training_jobs` (Supabase) | Added `hf_adapter_path TEXT` column |
| `package.json` | Added `tar-stream` dependency |
| `package-lock.json` | Updated by npm |
| `.env.local` | Added 5 new env var placeholder entries |

**No TypeScript source files were modified in E01.**

+++++++++++++++++
