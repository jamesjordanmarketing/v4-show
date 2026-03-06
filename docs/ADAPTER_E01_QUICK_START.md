# Adapter Module E01 - Quick Start Guide

**Version:** 1.0  
**Date:** January 17, 2026  
**Estimated Time:** 5 minutes

---

## What This Guide Does

This guide walks you through executing the E01 database migration and verifying that everything is set up correctly.

---

## Prerequisites

- [x] Supabase project configured
- [x] `.env.local` file with Supabase credentials
- [x] SAOL (Supabase Agent Ops Library) installed

---

## Step-by-Step Instructions

### Step 1: Execute the Database Migration

1. **Open Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku
   - Go to: SQL Editor

2. **Load the Migration File:**
   - Open: `supabase/migrations/20260117_create_adapter_testing_tables.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor

3. **Execute the Migration:**
   - Click "Run" button
   - Wait for confirmation: "Success. No rows returned"

**Expected Result:**
```
Success. No rows returned
```

If you see any errors, STOP and review the error message.

---

### Step 2: Run the Verification Script

Open a terminal and run:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
node scripts/verify-adapter-schema.js
```

**Expected Output:**

```
🔍 Verifying Adapter Testing Infrastructure...

1️⃣  Checking pipeline_inference_endpoints table...
   ✅ Table exists with 17 columns
   ✅ RLS Enabled: true
   ✅ Policies: 3
   ✅ All required columns present

2️⃣  Checking pipeline_test_results table...
   ✅ Table exists with 19 columns
   ✅ RLS Enabled: true
   ✅ Policies: 3
   ✅ All required columns present

3️⃣  Checking pipeline_base_models table...
   ✅ Table exists with 13 columns
   ✅ All required columns present

4️⃣  Checking seed data in pipeline_base_models...
   ✅ Found 4 base models:
      ✅ Mistral 7B Instruct v0.2 (7B)
      ✅ DeepSeek R1 Distill Qwen 32B (32B)
      ✅ Llama 3 8B Instruct (8B)
      ✅ Llama 3 70B Instruct (70B)
   ✅ All expected models present

============================================================
✅ ALL VERIFICATIONS PASSED!

Adapter Testing Infrastructure (E01) is correctly installed.

Next steps:
  - E02: Implement Service Layer
  - E03: Create API Routes
  - E04: Build React Query Hooks
  - E05: Develop UI Components
============================================================
```

If you see any ❌ marks, review the error messages and ensure the migration executed successfully.

---

### Step 3: Verify TypeScript Compilation

Ensure all TypeScript types are valid:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit
```

**Expected Output:**
```
(no output - silence means success)
```

If you see TypeScript errors, review the error messages.

---

## Quick Verification Commands

If you want to manually check specific aspects:

### Check Endpoints Table Exists
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_inference_endpoints',transport:'pg'});console.log('Exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);console.log('Policies:',r.tables[0].policies.length);}})();"
```

### Check Test Results Table Exists
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'pipeline_test_results',transport:'pg'});console.log('Exists:',r.success);if(r.success){console.log('Columns:',r.tables[0].columns.length);console.log('RLS Enabled:',r.tables[0].rlsEnabled);}})();"
```

### Check Base Models & Seed Data
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_base_models',select:'model_id,display_name,parameter_count'});console.log('Models seeded:',r.data.length);r.data.forEach(m=>console.log('-',m.display_name,'(',m.parameter_count,')'));})();"
```

---

## What Was Created

### Database Tables (3)
1. **`pipeline_inference_endpoints`** - Tracks deployed endpoints
2. **`pipeline_test_results`** - Stores A/B test results
3. **`pipeline_base_models`** - Base model registry (seeded with 4 models)

### TypeScript Files (3)
1. **`src/types/pipeline-adapter.ts`** - Complete type system
2. **`src/lib/pipeline/adapter-db-utils.ts`** - Database mapping utilities
3. **`src/types/index.ts`** - Central type exports

### Support Files (3)
1. **`supabase/migrations/20260117_create_adapter_testing_tables.sql`** - Migration
2. **`scripts/verify-adapter-schema.js`** - Automated verification
3. **`docs/ADAPTER_E01_IMPLEMENTATION_SUMMARY.md`** - Full documentation

---

## Troubleshooting

### Migration Fails with "relation already exists"

**Solution:** Tables already exist. This is fine - the migration uses `IF NOT EXISTS`.

If you need to start fresh:
```sql
DROP TABLE IF EXISTS pipeline_test_results CASCADE;
DROP TABLE IF EXISTS pipeline_inference_endpoints CASCADE;
DROP TABLE IF EXISTS pipeline_base_models CASCADE;
```

Then re-run the migration.

### Verification Script Shows Missing Columns

**Solution:** Ensure the migration executed completely. Check for partial execution in Supabase SQL Editor logs.

### TypeScript Compilation Errors

**Solution:** Ensure you're running from the `src/` directory:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit
```

### Seed Data Missing

**Solution:** The seed data uses `ON CONFLICT DO NOTHING`. If models already exist, they won't be re-inserted. Check manually:
```bash
cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_base_models',select:'*'});console.log(JSON.stringify(r.data,null,2))})();"
```

---

## Next Steps

After E01 is complete:

### E02: Service Layer (Next)
Implement the business logic for:
- Deploying endpoints to RunPod
- Running A/B tests
- Evaluating with Claude-as-Judge

Files to create:
- `src/lib/pipeline/inference-service.ts`
- `src/lib/pipeline/test-service.ts`
- `src/lib/pipeline/evaluation-adapter-service.ts`

### E03: API Routes
Create RESTful endpoints:
- `POST /api/pipeline/adapter/deploy`
- `POST /api/pipeline/adapter/test`
- `GET /api/pipeline/adapter/status`
- `POST /api/pipeline/adapter/rate`
- `POST /api/pipeline/adapter/terminate`

### E04: React Query Hooks
Build data fetching hooks:
- `useDeployAdapter()`
- `useRunTest()`
- `useTestResults()`
- `useEndpointStatus()`

### E05: UI Components
Create user interface:
- Adapter Dashboard
- Test Interface
- Results Comparison
- Evaluation Display

---

## Success Criteria Checklist

Before moving to E02, ensure:

- [ ] Migration executed without errors
- [ ] Verification script shows all green checkmarks (✅)
- [ ] TypeScript compiles without errors
- [ ] All three tables exist in Supabase
- [ ] RLS policies enabled on all tables
- [ ] Seed data present (4 base models)
- [ ] Database mapping utilities created
- [ ] Type exports working

---

## Support

If you encounter issues:

1. **Check Supabase Logs:**
   - Dashboard → Database → Logs

2. **Run Manual SAOL Query:**
   ```bash
   cd supa-agent-ops
   node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{console.log(await saol.agentIntrospectSchema({table:'pipeline_inference_endpoints',transport:'pg'}))})();"
   ```

3. **Review Migration File:**
   - Ensure SQL syntax is correct
   - Check foreign key references exist

4. **Verify Environment:**
   - Confirm `.env.local` has correct Supabase credentials
   - Test SAOL connection:
     ```bash
     cd supa-agent-ops
     node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{console.log('SAOL Connected:',await saol.agentQuery({table:'pipeline_training_jobs',select:'id',limit:1}))})();"
     ```

---

**E01 Quick Start Complete!** 🎉

Once all verification steps pass, you're ready to proceed to E02 (Service Layer).

---

**Last Updated:** January 17, 2026  
**For:** Adapter Application Module - Foundation Layer (E01)
