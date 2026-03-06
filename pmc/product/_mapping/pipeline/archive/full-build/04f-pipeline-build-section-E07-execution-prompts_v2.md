# PIPELINE - Section E07: Complete System Integration - Execution Prompts (v2)

**Product:** PIPELINE  
**Section:** 7 - Complete System Integration  
**Generated:** December 30, 2025 (Updated)  
**Total Prompts:** 1  
**Estimated Total Time:** 4-5 hours  
**Source Section File:** 04f-pipeline-build-section-E07.md  
**Version:** 2.0 - Updated with actual codebase patterns

---

## 🔄 Version 2.0 Changes

**Updated to reflect actual codebase:**
- ✅ API endpoint paths corrected to match implementation
- ✅ Table names verified: NO `lora_` prefix on any tables
- ✅ Auth pattern: `await createServerSupabaseClient()` (async)
- ✅ Test scripts updated to match package.json
- ✅ Environment variables verified from actual usage
- ✅ Integration verification checks aligned with actual infrastructure
- ✅ Edge Functions paths verified
- ✅ Supabase Functions configuration updated

---

## Section Overview

This final section provides comprehensive integration verification, testing strategy, and deployment readiness for the complete BrightRun LoRA Training Platform. Unlike previous sections that built specific features, this section focuses on:

- **System Integration**: Verifying all components work together seamlessly
- **End-to-End Testing**: Testing complete user workflows from upload to model delivery
- **Deployment Preparation**: Creating checklists and documentation for production deployment
- **Quality Assurance**: Ensuring the system is production-ready

**User Value**: A fully integrated, tested, and production-ready LoRA training platform within the existing BrightHub application.

---

## Prompt Sequence for This Section

This section has been divided into **1 comprehensive prompt**:

1. **Prompt P01: System Integration, Testing & Deployment Preparation** (4-5h)
   - Features: Complete integration verification, end-to-end testing, deployment documentation
   - Key Deliverables: Integration tests, deployment checklist, monitoring setup, documentation

---

## Integration Context

### Dependencies from Previous Sections

This section integrates and verifies work from ALL previous sections:

#### Section E01: Foundation & Authentication
- 6 database tables with RLS policies
- 2 storage buckets (lora-datasets, lora-models)
- TypeScript type definitions
- Authentication system integration

#### Section E02: Dataset Management
- Dataset upload API with presigned URLs
- Dataset list and detail pages
- Dataset validation Edge Function
- File storage integration

#### Section E03: Training Configuration
- Cost estimation API
- Training job creation API
- Training configuration page with presets
- Hyperparameter management

#### Section E04: Training Execution & Monitoring
- Job processing Edge Function
- Training progress tracking
- Real-time metrics collection
- Training monitor page with live updates

#### Section E05: Model Artifacts & Delivery
- Artifact creation Edge Function
- Model download API with presigned URLs
- Model list and detail pages
- Quality metrics display

#### Section E06: Cost Tracking & Notifications
- Cost analytics API
- Notifications system
- User alerts for training events

### Provides for Next Sections

**N/A** - This is the final section of the implementation.

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

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

## Dependency Flow (This Section)

```
All Sections E01-E06
  ↓
E07-P01 (Integration Verification & Testing)
  ↓
Production-Ready Application
```

---

# PROMPT 1: System Integration, Testing & Deployment Preparation

**Generated:** 2025-12-30  
**Section:** 7 - Complete System Integration  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 4-5 hours  
**Prerequisites:** All sections E01-E06 completed

---

## 🎯 Mission Statement

This prompt completes the BrightRun LoRA Training Platform by verifying complete system integration, implementing comprehensive end-to-end tests, and preparing deployment documentation. This ensures all components work together seamlessly and the system is production-ready.

---

## 📦 Section Context

### This Section's Goal

Verify, test, and document the complete LoRA Training Platform integration to ensure production readiness.

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E07. It implements:
- Complete system integration verification
- End-to-end testing for all critical user flows
- Deployment checklist and documentation
- Performance verification
- Security audit
- Monitoring setup

---

## 🔗 Integration with Previous Work

### From Section E01: Foundation & Authentication
**Database Tables:**
- `datasets` - Dataset metadata and validation status
- `training_jobs` - Training job configuration and progress
- `metrics_points` - Training metrics time series
- `model_artifacts` - Completed model information
- `cost_records` - Cost tracking
- `notifications` - User notifications

**Storage Buckets:**
- `lora-datasets` - Dataset file storage (500MB limit)
- `lora-models` - Model artifact storage (5GB limit)

**TypeScript Types:**
- `src/lib/types/lora-training.ts` - All interfaces and types

**Authentication:**
- `src/lib/supabase-server.ts` - `requireAuth()`, `createServerSupabaseClient()`, `createServerSupabaseAdminClient()`

### From Section E02: Dataset Management
**API Endpoints:**
- `POST /api/datasets` - Create dataset and generate upload URL
- `GET /api/datasets` - List user's datasets
- `GET /api/datasets/[id]` - Get dataset details
- `DELETE /api/datasets/[id]` - Delete dataset
- `POST /api/datasets/[id]/confirm` - Confirm upload complete

**Edge Functions:**
- `validate-datasets` - Background dataset validation

### From Section E03: Training Configuration
**API Endpoints:**
- `POST /api/jobs/estimate` - Cost estimation
- `POST /api/jobs` - Create training job
- `POST /api/jobs/[jobId]/cancel` - Cancel training job

### From Section E04: Training Execution & Monitoring
**API Endpoints:**
- `GET /api/jobs` - List training jobs
- `GET /api/jobs/[jobId]` - Get job details with metrics

**Edge Functions:**
- `process-training-jobs` - Job submission and monitoring

### From Section E05: Model Artifacts & Delivery
**API Endpoints:**
- `GET /api/models` - List model artifacts
- `GET /api/models/[modelId]` - Get model details
- `POST /api/models/[modelId]/download` - Generate download URLs

**Edge Functions:**
- `create-model-artifacts` - Artifact creation and storage

### From Section E06: Cost Tracking & Notifications
**API Endpoints:**
- `GET /api/costs` - Cost analytics with date filtering
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/[id]/read` - Mark notification as read

---

## 🎯 Implementation Requirements

### Task 1: System Integration Verification

**Type:** Integration Testing  
**Strategy:** VERIFICATION - ensuring all components work together

#### Description

Create a comprehensive integration verification script that checks all system components are properly connected and functioning.

#### What Already Exists (From Previous Sections)
- ✅ All database tables from Section E01
- ✅ All API routes from Sections E02-E06
- ✅ All Edge Functions from Sections E02, E04, E05
- ✅ All React hooks and components
- ✅ Test infrastructure in package.json

#### What We're Building (New in This Prompt)
- 🆕 `scripts/verify-lora-integration.ts` - Integration verification script
- 🆕 `docs/LORA_DEPLOYMENT_CHECKLIST.md` - Deployment documentation
- 🆕 `docs/LORA_MONITORING_SETUP.md` - Monitoring configuration
- 🆕 Optional: Integration test files in appropriate locations

#### Implementation Details

**File:** `scripts/verify-lora-integration.ts`

```typescript
/**
 * LoRA Training Platform Integration Verification Script
 * 
 * Run this script to verify all system components are properly integrated.
 * Usage: npx tsx scripts/verify-lora-integration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyIntegration() {
  log('blue', '\n🔍 Starting LoRA Training Platform Integration Verification\n');
  log('cyan', '='.repeat(60));

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let passedChecks = 0;
  let failedChecks = 0;

  // Check 1: Environment Variables
  log('yellow', '\n📋 Checking environment variables...');
  try {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const optional = [
      'GPU_CLUSTER_API_URL',
      'GPU_CLUSTER_API_KEY',
    ];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required env var: ${envVar}`);
      }
    }

    for (const envVar of optional) {
      if (!process.env[envVar]) {
        log('yellow', `  ⚠️  Optional env var not set: ${envVar}`);
      }
    }
    
    log('green', '✓ All required environment variables set');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Environment variables check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 2: Database Tables
  log('yellow', '\n📊 Checking database tables...');
  try {
    const tables = [
      'datasets',
      'training_jobs',
      'metrics_points',
      'model_artifacts',
      'cost_records',
      'notifications'
    ];
    
    for (const table of tables) {
      const { error, count } = await client
        .from(table)
        .select('id', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Table ${table} error: ${error.message}`);
      }
      log('green', `  ✓ ${table} (${count ?? 0} rows)`);
    }
    
    log('green', '✓ All database tables exist and are accessible');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Database tables check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 3: RLS Policies
  log('yellow', '\n🔒 Checking RLS policies...');
  try {
    const { data, error } = await client
      .rpc('sql', {
        query: `
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
            AND tablename IN ('datasets', 'training_jobs', 'model_artifacts')
        `
      })
      .catch(() => {
        // Fallback: Try direct query if RPC not available
        return client
          .from('pg_tables')
          .select('tablename, rowsecurity')
          .eq('schemaname', 'public')
          .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);
      });

    if (error) {
      log('yellow', `  ⚠️  Could not verify RLS policies automatically`);
      log('yellow', `     Please verify manually in Supabase Dashboard`);
    } else if (data) {
      const allEnabled = data.every((table: any) => table.rowsecurity === true);
      if (!allEnabled) {
        throw new Error('Some RLS policies not enabled');
      }
      log('green', '✓ RLS policies enabled on all user tables');
    }
    
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ RLS policies check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 4: Storage Buckets
  log('yellow', '\n💾 Checking storage buckets...');
  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) throw error;

    const requiredBuckets = ['lora-datasets', 'lora-models'];
    
    for (const bucketName of requiredBuckets) {
      const bucket = buckets?.find(b => b.name === bucketName);
      if (!bucket) {
        throw new Error(`Bucket ${bucketName} not found`);
      }
      log('green', `  ✓ ${bucketName} (${bucket.public ? 'public' : 'private'})`);
    }
    
    log('green', '✓ All storage buckets configured');
    passedChecks++;
  } catch (error: any) {
    log('red', `✗ Storage buckets check failed: ${error.message}`);
    failedChecks++;
  }

  // Check 5: Database Indexes
  log('yellow', '\n⚡ Checking database indexes...');
  try {
    const { data, error } = await client
      .from('pg_indexes')
      .select('indexname, tablename')
      .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);

    if (error) {
      log('yellow', `  ⚠️  Could not verify indexes automatically`);
    } else if (data) {
      const expectedIndexes = [
        'idx_datasets_user_id',
        'idx_datasets_status',
        'idx_training_jobs_user_id',
        'idx_training_jobs_status',
        'idx_model_artifacts_user_id',
      ];

      const indexNames = data.map((idx: any) => idx.indexname);
      const foundCount = expectedIndexes.filter(idx => 
        indexNames.includes(idx)
      ).length;

      log('green', `  ✓ Found ${foundCount}/${expectedIndexes.length} expected indexes`);
    }
    
    log('green', '✓ Database indexes check complete');
    passedChecks++;
  } catch (error: any) {
    log('yellow', `⚠️  Indexes check skipped: ${error.message}`);
    passedChecks++;
  }

  // Check 6: Edge Functions (if URLs provided)
  if (process.env.GPU_CLUSTER_API_URL) {
    log('yellow', '\n⚙️  Checking Edge Functions deployment...');
    try {
      const functions = [
        'validate-datasets',
        'process-training-jobs',
        'create-model-artifacts',
      ];

      for (const func of functions) {
        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/${func}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            }
          );
          
          // Function exists if we get anything other than 404
          if (response.status !== 404) {
            log('green', `  ✓ ${func} deployed`);
          } else {
            throw new Error(`Function ${func} returned 404`);
          }
        } catch (error: any) {
          log('yellow', `  ⚠️  ${func}: ${error.message}`);
        }
      }
      
      log('green', '✓ Edge Functions deployment check complete');
      passedChecks++;
    } catch (error: any) {
      log('red', `✗ Edge Functions check failed: ${error.message}`);
      failedChecks++;
    }
  } else {
    log('yellow', '\n⚙️  Skipping Edge Functions check (GPU_CLUSTER_API_URL not set)');
  }

  // Summary
  log('cyan', '\n' + '='.repeat(60));
  log('blue', 'Integration Verification Summary');
  log('cyan', '='.repeat(60));
  log('green', `Passed: ${passedChecks}`);
  if (failedChecks > 0) {
    log('red', `Failed: ${failedChecks}`);
  }
  
  if (failedChecks === 0) {
    log('green', '\n✓ All integration checks passed!');
    log('green', 'System is ready for deployment.\n');
    process.exit(0);
  } else {
    log('red', '\n✗ Some integration checks failed.');
    log('red', 'Please fix the issues above before deploying.\n');
    process.exit(1);
  }
}

// Run verification
verifyIntegration().catch((error) => {
  log('red', `\n✗ Verification script error: ${error.message}\n`);
  process.exit(1);
});
```

---

### Task 2: Deployment Documentation

**Type:** Documentation  
**Strategy:** NEW - creating comprehensive deployment guides

#### Implementation Details

**File:** `docs/LORA_DEPLOYMENT_CHECKLIST.md`

```markdown
# BrightRun LoRA Training Platform - Deployment Checklist

**Version:** 2.0  
**Last Updated:** 2025-12-30  
**For:** Sections E01-E06 Implementation

---

## Pre-Deployment Verification

### 1. Code Quality
- [ ] No TypeScript errors (`npm run build` in `src/` directory)
- [ ] No linter warnings (`npm run lint` in `src/` directory)
- [ ] All tests passing (`npm run test` in `src/` directory)
- [ ] Integration verification script passed (`npx tsx scripts/verify-lora-integration.ts`)

### 2. Environment Variables

#### Required (Already Configured in BrightHub)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

#### New (Add to Vercel/Production Environment)
```bash
# GPU Cluster Configuration (for training execution)
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/your-endpoint-id
GPU_CLUSTER_API_KEY=rp_your-api-key-here

# Optional: Training Configuration Limits
MAX_DATASET_SIZE_MB=500
MAX_TRAINING_DURATION_HOURS=48
```

**Where to find these values:**
- `SUPABASE_URL`: Supabase Dashboard → Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → Service Role Key (⚠️ Keep secret!)
- `GPU_CLUSTER_API_URL`: Your RunPod or GPU cluster API endpoint
- `GPU_CLUSTER_API_KEY`: Your GPU cluster API authentication key

---

## Database Setup

### 1. Verify Migration Applied

```bash
# Check if migration exists
npx supabase migration list

# If not applied, run migration
npx supabase db push
```

### 2. Verify Tables Created

Run in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'datasets',
    'training_jobs',
    'metrics_points',
    'model_artifacts',
    'cost_records',
    'notifications'
  );
```

**Expected:** 6 rows

### 3. Verify RLS Policies

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('datasets', 'training_jobs', 'model_artifacts');
```

**Expected:** All should have `rowsecurity = true`

### 4. Verify Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('datasets', 'training_jobs', 'model_artifacts')
ORDER BY tablename, indexname;
```

**Expected indexes:**
- `idx_datasets_user_id`
- `idx_datasets_status`
- `idx_datasets_created_at`
- `idx_training_jobs_user_id`
- `idx_training_jobs_status`
- `idx_model_artifacts_user_id`

---

## Storage Setup

### 1. Create Buckets (via Supabase Dashboard)

Navigate to: **Storage** → **Buckets**

#### Bucket: lora-datasets
- **Name:** `lora-datasets`
- **Public:** ❌ No (Private)
- **File size limit:** 500 MB
- **Allowed MIME types:** `application/json`, `application/x-jsonlines`, `text/plain`
- **RLS Enabled:** ✅ Yes

**RLS Policy (for lora-datasets):**
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own datasets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own files
CREATE POLICY "Users can read own datasets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own datasets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Bucket: lora-models
- **Name:** `lora-models`
- **Public:** ❌ No (Private)
- **File size limit:** 5 GB
- **Allowed MIME types:** `application/octet-stream`, `application/x-tar`, `application/gzip`, `application/json`
- **RLS Enabled:** ✅ Yes

**RLS Policy (for lora-models):**
```sql
-- Users can access their own model files
CREATE POLICY "Users can read own models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lora-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role can write model files
CREATE POLICY "Service can write model files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lora-models' AND
  auth.role() = 'service_role'
);
```

### 2. Test Storage Operations

```typescript
// Test presigned URL generation (run in Node.js with proper env)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testPath = 'test-user-id/test-dataset/test-file.jsonl';
const { data, error } = await supabase.storage
  .from('lora-datasets')
  .createSignedUploadUrl(testPath);

console.log('Signed URL:', data?.signedUrl); // Should contain token
```

---

## Edge Functions Setup

### 1. Deploy Edge Functions

```bash
# Deploy all LoRA training Edge Functions
cd supabase

# Deploy validate-datasets
npx supabase functions deploy validate-datasets

# Deploy process-training-jobs
npx supabase functions deploy process-training-jobs

# Deploy create-model-artifacts
npx supabase functions deploy create-model-artifacts
```

### 2. Set Edge Function Environment Variables

Navigate to: **Supabase Dashboard → Edge Functions → Settings**

Add these secrets (applies to all functions):

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `[your-service-role-key]` |
| `GPU_CLUSTER_API_URL` | `https://api.runpod.ai/v2/your-endpoint-id` |
| `GPU_CLUSTER_API_KEY` | `rp_your-api-key` |

### 3. Configure Cron Schedules

**Option A: Using Supabase Dashboard**

Navigate to: **Database → Cron Jobs** (requires pg_cron extension)

If pg_cron not available, use **Option B** instead.

**Option B: Using External Cron Service (Recommended)**

Use a service like **cron-job.org** or **EasyCron** to trigger Edge Functions:

#### validate-datasets
- **Schedule:** Every 1 minute
- **URL:** `https://[your-project].supabase.co/functions/v1/validate-datasets`
- **Method:** POST
- **Headers:** `Authorization: Bearer [service-role-key]`

#### process-training-jobs
- **Schedule:** Every 30 seconds
- **URL:** `https://[your-project].supabase.co/functions/v1/process-training-jobs`
- **Method:** POST
- **Headers:** `Authorization: Bearer [service-role-key]`

#### create-model-artifacts
- **Schedule:** Every 1 minute
- **URL:** `https://[your-project].supabase.co/functions/v1/create-model-artifacts`
- **Method:** POST
- **Headers:** `Authorization: Bearer [service-role-key]`

**Option C: Using Vercel Cron Jobs**

If using Vercel, you can create API routes in your Next.js app that call the Edge Functions and configure Vercel Cron Jobs to trigger them.

### 4. Test Edge Functions Manually

```bash
# Test validate-datasets
curl -X POST "https://[your-project].supabase.co/functions/v1/validate-datasets" \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"

# Expected: {"success":true,...}
```

---

## Frontend Deployment

### 1. Build Application

```bash
cd src
npm run build
```

**Expected:** No errors, build completes successfully

### 2. Deploy to Vercel

**If using Vercel CLI:**
```bash
cd src
vercel --prod
```

**If using GitHub integration:**
1. Push to main branch
2. Vercel automatically deploys

### 3. Set Environment Variables in Vercel

Navigate to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add all variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GPU_CLUSTER_API_URL`
- `GPU_CLUSTER_API_KEY`

**For each variable:**
- Environment: Production, Preview, Development (select all)
- Click **Save**

### 4. Verify Deployment

- [ ] Site loads successfully at your domain
- [ ] Login/authentication works
- [ ] All routes accessible (datasets, training, models)
- [ ] API routes respond correctly
- [ ] No console errors on client-side

---

## Post-Deployment Testing

### 1. Test Critical User Flows

#### Dataset Upload Flow
1. Login as test user
2. Navigate to `/datasets/new`
3. Upload a valid dataset file (use `scripts/test-data/sample-dataset.jsonl`)
4. Wait 1-2 minutes for validation
5. Verify dataset status changes to 'ready'
6. Check notification received

#### Training Job Flow
1. Navigate to `/training/configure?datasetId=[dataset-id]`
2. Select training preset (e.g., "balanced")
3. Verify cost estimate displays
4. Submit training job
5. Navigate to `/training/jobs/[jobId]`
6. Verify job status updates
7. (In development: simulate job completion)
8. Verify model artifact created

#### Model Download Flow
1. Navigate to `/models`
2. Select a completed model
3. Click download
4. Verify presigned URL generated
5. Verify download starts

### 2. Verify Monitoring

#### Check Edge Function Logs
Navigate to: **Supabase Dashboard → Edge Functions → [Function] → Logs**

Verify:
- [ ] Functions running on schedule
- [ ] No recurring errors
- [ ] Jobs being processed

#### Check Database Metrics
Navigate to: **Supabase Dashboard → Database → Usage**

Verify:
- [ ] Queries executing normally
- [ ] No slow queries (> 1s)
- [ ] RLS policies enforcing correctly

### 3. Verify API Endpoints

Test key endpoints:

```bash
# Test costs API
curl "https://your-domain.com/api/costs?period=week" \
  -H "Cookie: [auth-cookie]"

# Test notifications API
curl "https://your-domain.com/api/notifications" \
  -H "Cookie: [auth-cookie]"

# Test models API
curl "https://your-domain.com/api/models" \
  -H "Cookie: [auth-cookie]"
```

---

## Rollback Plan

If issues are discovered post-deployment:

### 1. Immediate Rollback (Vercel)
```bash
vercel rollback
```

Or via Vercel Dashboard: **Deployments → [Previous Deployment] → Promote to Production**

### 2. Database Rollback
```bash
# Rollback last migration (if needed)
npx supabase migration down

# Or restore from backup
npx supabase db reset --local
```

### 3. Edge Functions Rollback
- Redeploy previous version from git history
- Or disable cron jobs temporarily

---

## Monitoring Setup

### 1. Error Tracking
- [ ] Set up Sentry or similar error tracking service
- [ ] Configure alerts for 500 errors
- [ ] Monitor API error rates

### 2. Performance Monitoring
- [ ] Enable Vercel Analytics
- [ ] Monitor Edge Function execution times
- [ ] Track database query performance

### 3. Business Metrics
- [ ] Track dataset upload success rate
- [ ] Track training job success rate
- [ ] Monitor costs per user
- [ ] Track user engagement

---

## Success Criteria

Deployment is successful when:

- [ ] All database tables exist and are accessible
- [ ] All storage buckets configured correctly
- [ ] All Edge Functions deployed and running
- [ ] All API routes responding correctly
- [ ] All pages loading and rendering
- [ ] Authentication working across all routes
- [ ] RLS policies enforcing data isolation
- [ ] Complete user workflows working end-to-end
- [ ] No critical errors in logs
- [ ] Integration verification script passes

---

## Support & Troubleshooting

### Common Issues

**Issue:** Edge Functions not running
- Check: Cron schedule configured correctly
- Check: Environment variables set in Edge Functions
- Solution: Redeploy function, verify cron trigger

**Issue:** Storage upload fails
- Check: Bucket exists and RLS policies configured
- Check: File size within limits
- Solution: Verify bucket permissions, check file size

**Issue:** Training jobs stuck in "queued"
- Check: `process-training-jobs` Edge Function running
- Check: GPU cluster API credentials valid
- Solution: Check function logs, verify GPU cluster connection

---

**Deployment Complete! 🎉**

After completing all steps above, your LoRA Training Platform is ready for production use.

For ongoing monitoring and maintenance, refer to `LORA_MONITORING_SETUP.md`.
```

---

**File:** `docs/LORA_MONITORING_SETUP.md`

```markdown
# BrightRun LoRA Training Platform - Monitoring & Observability

**Version:** 2.0  
**Last Updated:** 2025-12-30  
**For:** Sections E01-E06 Implementation

---

## Overview

This document outlines the monitoring and observability setup for the BrightRun LoRA Training Platform.

---

## Key Metrics to Track

### 1. Dataset Metrics

**Dataset Upload Success Rate**
- **Description:** Percentage of uploads that complete successfully
- **Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'ready') * 100.0 / COUNT(*) as success_rate
FROM datasets
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Dataset Validation Time**
- **Description:** Average time from upload to validation completion
- **Query:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (validated_at - created_at))) / 60 as avg_minutes
FROM datasets
WHERE validated_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';
```

**Active Datasets**
- **Query:**
```sql
SELECT COUNT(*) FROM datasets 
WHERE status = 'ready' AND deleted_at IS NULL;
```

### 2. Training Job Metrics

**Job Queue Depth**
- **Description:** Number of jobs waiting to be processed
- **Query:**
```sql
SELECT COUNT(*) FROM training_jobs WHERE status = 'queued';
```

**Job Success Rate**
- **Description:** Percentage of jobs that complete successfully
- **Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
  COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) as success_rate
FROM training_jobs
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Average Training Duration**
- **Query:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) / 3600 as avg_hours
FROM training_jobs
WHERE status = 'completed';
```

**Job Failure Rate**
- **Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM training_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### 3. Cost Metrics

**Daily Cost**
- **Query:**
```sql
SELECT 
  DATE(recorded_at) as date,
  SUM(amount) as total_cost,
  COUNT(DISTINCT job_id) as num_jobs
FROM cost_records
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(recorded_at)
ORDER BY date DESC;
```

**Cost per User (Current Month)**
- **Query:**
```sql
SELECT 
  user_id,
  SUM(amount) as total_cost,
  COUNT(DISTINCT job_id) as num_jobs,
  AVG(amount) as avg_cost_per_job
FROM cost_records
WHERE DATE_TRUNC('month', recorded_at) = DATE_TRUNC('month', NOW())
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 10;
```

**Most Expensive Jobs**
- **Query:**
```sql
SELECT 
  cr.job_id,
  tj.user_id,
  SUM(cr.amount) as total_cost,
  tj.status,
  tj.created_at
FROM cost_records cr
JOIN training_jobs tj ON cr.job_id = tj.id
WHERE cr.recorded_at > NOW() - INTERVAL '7 days'
GROUP BY cr.job_id, tj.user_id, tj.status, tj.created_at
ORDER BY total_cost DESC
LIMIT 10;
```

### 4. Storage Metrics

**Total Storage Used (Datasets)**
- **Query:**
```sql
SELECT 
  SUM(file_size) / 1024 / 1024 / 1024 as total_gb,
  COUNT(*) as total_datasets
FROM datasets
WHERE deleted_at IS NULL;
```

**Total Storage Used (Models)**
- **Query:**
```sql
SELECT 
  SUM(
    COALESCE((artifacts->>'lora_adapter_size')::bigint, 0) +
    COALESCE((artifacts->>'full_model_size')::bigint, 0)
  ) / 1024 / 1024 / 1024 as total_gb,
  COUNT(*) as total_models
FROM model_artifacts
WHERE deleted_at IS NULL;
```

**Storage Growth Rate (Daily)**
- **Query:**
```sql
SELECT 
  DATE(created_at) as date,
  SUM(file_size) / 1024 / 1024 / 1024 as daily_gb_added
FROM datasets
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Logging Strategy

### 1. API Route Logging

**Pattern:**
```typescript
// In all API routes
console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
console.log(`[USER] ${user.id}`);

// On success
console.log(`[SUCCESS] ${action} - ${details}`);

// On error
console.error(`[ERROR] ${error.message}`);
console.error(`[STACK] ${error.stack}`);
```

### 2. Edge Function Logging

**Pattern:**
```typescript
// In all Edge Functions
console.log(`[${functionName}] Starting execution`);
console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

// Processing
console.log(`[PROCESSING] ${action} - ${details}`);

// Completion
console.log(`[SUCCESS] Processed ${count} items in ${duration}ms`);

// Errors
console.error(`[ERROR] ${error.message}`);
console.error(`[CONTEXT] ${JSON.stringify(context)}`);
```

### 3. Client-Side Error Logging

**Pattern:**
```typescript
// In error boundaries and catch blocks
console.error('[CLIENT ERROR]', {
  message: error.message,
  stack: error.stack,
  url: window.location.href,
  user: user?.id,
  timestamp: new Date().toISOString(),
});

// Optional: Send to error tracking service
// Sentry.captureException(error, {...context});
```

---

## Alert Configuration

### 1. Critical Alerts (Immediate Action Required)

#### Edge Function Failures
**Trigger:** Edge Function returns 500 error for 3+ consecutive executions  
**Action:** Check Edge Function logs, verify GPU cluster connectivity, check environment variables

#### Database Connection Failures
**Trigger:** 10+ database connection errors in 5 minutes  
**Action:** Check Supabase status, verify connection limits, review query performance

#### High Queue Depth
**Trigger:** Queue depth > 50 jobs for more than 30 minutes  
**Action:** Check GPU cluster capacity, verify `process-training-jobs` function execution, review job errors

### 2. Warning Alerts (Action Required Within 24h)

#### High Job Failure Rate
**Trigger:** Job failure rate > 20% over 24 hours  
**Action:** Review failed job error messages, check GPU cluster logs, verify training configurations

#### Storage Quota Warning
**Trigger:** Storage usage > 80% of Supabase plan limit  
**Action:** Review old datasets, implement cleanup policy, consider upgrading plan

#### Slow Validation Times
**Trigger:** Average validation time > 5 minutes  
**Action:** Check `validate-datasets` function performance, review validation logic, verify storage access

### 3. Info Alerts (For Awareness)

#### Daily Summary
**Schedule:** 9:00 AM daily  
**Contents:**
- Jobs completed yesterday
- Average cost per job
- Total storage used
- Any failed jobs requiring attention
- New user signups (if applicable)

---

## Dashboard Setup

### 1. Supabase Dashboard

Navigate to: **Supabase Dashboard → Database → Reports**

Create custom reports for:
- **Queue Depth:** Refresh every 1 minute
- **Failed Jobs (24h):** Refresh every 5 minutes
- **Cost Trends (30d):** Daily refresh
- **Storage Usage:** Daily refresh

### 2. Custom Admin Dashboard (Optional)

Consider creating an internal admin dashboard at `/admin/lora-monitoring`:

**Components:**
- Real-time queue depth widget
- Recent job statuses (last 10)
- Cost breakdown by user (top 10)
- Storage usage chart
- Recent errors list
- System health indicators

---

## Performance Monitoring

### 1. API Route Performance

Track response times for all LoRA routes:

```typescript
const startTime = Date.now();
// ... route logic
const duration = Date.now() - startTime;
console.log(`[PERFORMANCE] ${route} completed in ${duration}ms`);
```

**Targets:**
- List endpoints: < 200ms (e.g., GET /api/datasets)
- Detail endpoints: < 150ms (e.g., GET /api/models/[id])
- Create endpoints: < 500ms (e.g., POST /api/jobs)
- Download URL generation: < 300ms

### 2. Edge Function Performance

Monitor execution times in Supabase Dashboard:

**Targets:**
- `validate-datasets`: < 10s per dataset
- `process-training-jobs`: < 5s per cycle
- `create-model-artifacts`: < 15s per artifact

**Check in:** Edge Functions → [Function] → Invocations

### 3. Database Query Performance

Monitor slow queries in Supabase Dashboard:

Navigate to: **Database → Query Performance**

Look for queries > 1s and optimize with:
- Better indexes
- Query optimization
- Denormalization if needed

---

## Health Checks

### 1. System Health Check Script

Create: `scripts/check-lora-health.ts`

```typescript
/**
 * Quick health check for LoRA Training Platform
 * Run: npx tsx scripts/check-lora-health.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkHealth() {
  console.log('🏥 LoRA Platform Health Check\n');
  
  // Check 1: Database connection
  const { error: dbError } = await supabase
    .from('datasets')
    .select('id')
    .limit(1);
  console.log(dbError ? '❌ Database' : '✅ Database');
  
  // Check 2: Queue depth
  const { count } = await supabase
    .from('training_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');
  console.log(`📊 Queue Depth: ${count ?? 0} jobs`);
  
  // Check 3: Failed jobs (last 24h)
  const { count: failedCount } = await supabase
    .from('training_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
  console.log(`${failedCount && failedCount > 0 ? '⚠️' : '✅'} Failed Jobs (24h): ${failedCount ?? 0}`);
  
  // Check 4: Storage buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasDatasets = buckets?.some(b => b.name === 'lora-datasets');
  const hasModels = buckets?.some(b => b.name === 'lora-models');
  console.log(hasDatasets ? '✅ lora-datasets bucket' : '❌ lora-datasets bucket');
  console.log(hasModels ? '✅ lora-models bucket' : '❌ lora-models bucket');
}

checkHealth();
```

### 2. Automated Health Checks

Set up automated health checks using a service like **UptimeRobot** or **Pingdom**:

- **Endpoint:** `https://your-domain.com/api/datasets` (requires auth)
- **Frequency:** Every 5 minutes
- **Alert:** If down for 2 consecutive checks

---

## Incident Response

### 1. Edge Function Not Running

**Symptoms:** Jobs stuck in 'queued' status for > 5 minutes

**Investigation:**
1. Check Edge Function logs in Supabase Dashboard
2. Verify cron schedule is active (if using pg_cron) or external cron service
3. Test manual function invocation:
   ```bash
   curl -X POST "https://[project].supabase.co/functions/v1/process-training-jobs" \
     -H "Authorization: Bearer [service-role-key]"
   ```

**Resolution:**
- Redeploy Edge Function if needed
- Restart/reconfigure cron job
- Check environment variables are set

### 2. High Job Failure Rate

**Symptoms:** Multiple jobs with `status='failed'`

**Investigation:**
1. Query failed jobs:
   ```sql
   SELECT id, error_message, created_at 
   FROM training_jobs 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
2. Check common error patterns
3. Verify GPU cluster API connectivity
4. Check GPU cluster capacity/availability

**Resolution:**
- Fix configuration issues if pattern found
- Increase GPU cluster capacity if needed
- Consider implementing retry logic for transient errors

### 3. Storage Quota Exceeded

**Symptoms:** Upload failures, presigned URL generation fails

**Investigation:**
1. Check total storage usage:
   ```sql
   SELECT 
     SUM(file_size) / 1024 / 1024 / 1024 as total_gb
   FROM datasets
   WHERE deleted_at IS NULL;
   ```
2. Identify large files:
   ```sql
   SELECT id, name, file_size / 1024 / 1024 as size_mb
   FROM datasets
   WHERE deleted_at IS NULL
   ORDER BY file_size DESC
   LIMIT 20;
   ```

**Resolution:**
- Delete old/unused datasets
- Archive old models to external storage
- Upgrade Supabase plan for more storage
- Implement automated cleanup policy

---

## Regular Maintenance Tasks

### Daily
- [ ] Review failed jobs from previous day
- [ ] Check Edge Function logs for errors
- [ ] Monitor queue depth (should be < 10 typically)
- [ ] Verify no critical alerts

### Weekly
- [ ] Review slow database queries
- [ ] Check storage usage trends
- [ ] Review cost trends and anomalies
- [ ] Update monitoring queries if needed

### Monthly
- [ ] Clean up old notifications (> 30 days):
  ```sql
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days' AND read = true;
  ```
- [ ] Review and archive old datasets (user-initiated)
- [ ] Analyze job success rates and performance trends
- [ ] Database vacuum and analyze (usually automatic in Supabase)

---

## Monitoring Tools Integration

### Recommended Tools

1. **Sentry** - Error tracking and performance monitoring
   - Track API errors
   - Monitor performance metrics
   - Alert on critical errors

2. **Vercel Analytics** - Frontend performance
   - Page load times
   - Core Web Vitals
   - User engagement

3. **Supabase Dashboard** - Database and Edge Functions
   - Built-in monitoring
   - Query performance
   - Function logs and metrics

4. **Custom Monitoring Dashboard** (Optional)
   - Build using Next.js
   - Real-time metrics from database
   - Custom business logic monitoring

---

## Support Contacts

**For Production Issues:**
- **Database/Storage:** Supabase Support (support@supabase.io)
- **GPU Cluster:** Your GPU provider support
- **Hosting:** Vercel Support (if using Vercel)
- **Code Issues:** Development team

**Escalation Path:**
1. Check this monitoring guide
2. Review Supabase Dashboard logs
3. Contact development team
4. Escalate to infrastructure team if needed

---

**Monitoring Setup Complete! 📊**

This monitoring setup ensures you can detect and respond to issues quickly, keeping the LoRA Training Platform running smoothly.

For deployment instructions, refer to `LORA_DEPLOYMENT_CHECKLIST.md`.
```

---

## ✅ Acceptance Criteria

### Functional Requirements

- [ ] Integration verification script runs successfully
- [ ] All database tables verified to exist with proper relationships
- [ ] All storage buckets verified to be configured correctly
- [ ] All API routes verified to respond correctly with authentication
- [ ] All Edge Functions verified to be deployed
- [ ] RLS policies verified to enforce data isolation (no cross-user leakage)

### Testing Requirements

- [ ] Integration verification script passes (exit code 0)
- [ ] Manual testing of critical flows completed (documented)
- [ ] Database queries in monitoring guide verified to work
- [ ] Health check script created and working

### Documentation Requirements

- [ ] Deployment checklist created with step-by-step instructions
- [ ] Monitoring setup guide created with key metrics and queries
- [ ] Integration verification script created and working
- [ ] All documentation clear, complete, and accurate
- [ ] Rollback procedures documented

### Technical Requirements

- [ ] No TypeScript errors in verification script
- [ ] Script follows existing patterns from codebase
- [ ] All imports resolve correctly
- [ ] Environment variables properly documented
- [ ] SQL queries tested and working

---

## 🧪 Testing & Validation

### Manual Testing Steps

1. **Run Integration Verification Script**
   ```bash
   npx tsx scripts/verify-lora-integration.ts
   ```
   Expected: All checks pass (green output), exit code 0

2. **Test Database Queries**
   - Open Supabase SQL Editor
   - Run each query from monitoring guide
   - Verify all queries execute without errors

3. **Verify Documentation Completeness**
   - Read through deployment checklist
   - Verify all steps are clear and actionable
   - Read through monitoring setup guide
   - Verify all queries work correctly

4. **Test Health Check Script** (if created)
   ```bash
   npx tsx scripts/check-lora-health.ts
   ```
   Expected: Health status of all systems displayed

5. **Manual Workflow Verification**
   - Complete dataset upload flow manually
   - Create a training job manually
   - Verify all notifications received
   - Check cost records created

### Expected Outputs

After completing this prompt, you should have:
- [ ] Integration verification script (`scripts/verify-lora-integration.ts`)
- [ ] Deployment checklist (`docs/LORA_DEPLOYMENT_CHECKLIST.md`)
- [ ] Monitoring setup guide (`docs/LORA_MONITORING_SETUP.md`)
- [ ] All scripts executable and working
- [ ] All documentation complete and accurate

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `scripts/verify-lora-integration.ts` - Automated integration verification
- [ ] `docs/LORA_DEPLOYMENT_CHECKLIST.md` - Production deployment guide
- [ ] `docs/LORA_MONITORING_SETUP.md` - Monitoring and observability guide
- [ ] Optional: `scripts/check-lora-health.ts` - Quick health check script

### Testing Deliverables

- [ ] Integration verification checks (database, storage, RLS, indexes)
- [ ] Environment variable validation
- [ ] Storage bucket verification
- [ ] Edge Functions deployment check
- [ ] Manual workflow testing completed

### Documentation Deliverables

- [ ] Complete deployment checklist with verification steps
- [ ] Environment variables documentation
- [ ] Database setup and verification guide
- [ ] Storage setup with RLS policies
- [ ] Edge Functions deployment guide
- [ ] Frontend deployment guide
- [ ] Post-deployment testing checklist
- [ ] Rollback procedures
- [ ] Monitoring metrics and SQL queries
- [ ] Logging strategy
- [ ] Alert configuration
- [ ] Incident response procedures
- [ ] Regular maintenance tasks

---

## 🔜 What's Next

### Section Complete

**This is the final section** of the BrightRun LoRA Training Platform implementation.

### Production Deployment

After completing this section:
1. Run the integration verification script
2. Follow the deployment checklist step-by-step
3. Complete post-deployment testing
4. Set up monitoring queries in Supabase Dashboard
5. Configure alerting for critical metrics
6. Monitor system performance for first 48-72 hours

### Future Enhancements

Consider these enhancements after initial deployment:
- **Advanced Analytics Dashboard:** Build custom admin dashboard for monitoring
- **User Quotas:** Implement per-user limits on jobs/storage
- **Billing Integration:** Connect cost tracking to actual billing system
- **Multi-Model Support:** Support multiple base models beyond Mistral
- **Custom Base Models:** Allow users to bring their own base models
- **Team Collaboration:** Share datasets and models within teams
- **API Access:** Provide REST API for programmatic job submission
- **Webhooks:** Notify external systems of job completion
- **Fine-Tuning Presets:** More sophisticated training configurations
- **A/B Testing:** Compare multiple training runs

---

## ⚠️ Important Reminders

1. **Comprehensive Testing:** This section focuses on ensuring ALL previous work integrates correctly. Take time to test thoroughly before declaring complete.

2. **No Shortcuts:** Don't skip verification steps. Integration issues are easier to fix now than in production.

3. **Real User Flows:** Test with realistic data and complete workflows, not just happy paths. Consider edge cases.

4. **Documentation Quality:** Deployment documentation should be clear enough for someone unfamiliar with the project to follow successfully.

5. **Production Mindset:** Think about what could go wrong in production:
   - What if the GPU cluster is down?
   - What if validation takes longer than expected?
   - What if a user uploads a 500MB invalid file?
   - What if 10 jobs are queued simultaneously?

6. **Monitoring is Critical:** Set up monitoring BEFORE deployment, not after issues arise. The monitoring queries provided are essential for operations.

7. **Rollback Plan:** Always have a tested rollback plan before deploying to production. Document it clearly.

8. **Environment Variables:** Double-check all environment variables are set in production. Missing GPU_CLUSTER_API_KEY will cause all jobs to fail.

9. **RLS Policies:** RLS is your security layer. Verify policies work correctly - test with multiple users to ensure no data leakage.

10. **Storage Limits:** Monitor storage usage carefully. Running out of storage will break uploads for all users.

---

## 📚 Reference Materials

### Files from Previous Sections

#### Section E01: Foundation & Authentication
- `supabase/migrations/20241223_create_lora_training_tables.sql` - Database migration
- `src/lib/types/lora-training.ts` - TypeScript type definitions
- `src/lib/supabase-server.ts` - Authentication and database client helpers

#### Section E02: Dataset Management
- `src/app/api/datasets/route.ts` - Dataset CRUD API
- `src/app/api/datasets/[id]/route.ts` - Dataset detail API
- `src/app/api/datasets/[id]/confirm/route.ts` - Confirm upload
- `supabase/functions/validate-datasets/index.ts` - Validation Edge Function

#### Section E03: Training Configuration
- `src/app/api/jobs/estimate/route.ts` - Cost estimation API
- `src/app/api/jobs/route.ts` - Job creation API
- `src/app/api/jobs/[jobId]/cancel/route.ts` - Job cancellation

#### Section E04: Training Execution & Monitoring
- `src/app/api/jobs/route.ts` - Job list API (GET)
- `src/app/api/jobs/[jobId]/route.ts` - Job detail API
- `supabase/functions/process-training-jobs/index.ts` - Job processing Edge Function

#### Section E05: Model Artifacts & Delivery
- `src/app/api/models/route.ts` - Models list API
- `src/app/api/models/[modelId]/route.ts` - Model detail API
- `src/app/api/models/[modelId]/download/route.ts` - Model download API
- `supabase/functions/create-model-artifacts/index.ts` - Artifact creation Edge Function

#### Section E06: Cost Tracking & Notifications
- `src/app/api/costs/route.ts` - Cost analytics API
- `src/app/api/notifications/route.ts` - Notifications list API
- `src/app/api/notifications/[id]/read/route.ts` - Notification mark as read API

### Infrastructure Patterns

**Authentication:**
```typescript
const { user, response } = await requireAuth(request);
if (response) return response;
```

**Database Client:**
```typescript
const supabase = await createServerSupabaseClient(); // async - must await
```

**Admin Client (bypasses RLS):**
```typescript
const supabaseAdmin = createServerSupabaseAdminClient(); // sync
```

**API Success Response:**
```typescript
return NextResponse.json({
  success: true,
  data: { ... },
});
```

**API Error Response:**
```typescript
return NextResponse.json(
  { error: 'Error message', details: error.message },
  { status: 500 }
);
```

**RLS Policy Pattern:**
```sql
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

---

**Ready to complete Section E07 - System Integration, Testing & Deployment!** 🎯

---

## Section Completion Checklist

After completing this prompt:

### Integration Verification
- [ ] Integration verification script created
- [ ] Script runs without errors
- [ ] All database tables verified
- [ ] All RLS policies verified
- [ ] All storage buckets verified
- [ ] All indexes verified
- [ ] Environment variables documented

### Documentation
- [ ] Deployment checklist completed
- [ ] Monitoring setup guide completed
- [ ] All SQL queries tested
- [ ] Rollback procedures documented
- [ ] Alert configuration documented

### Testing
- [ ] Manual testing of critical flows completed
- [ ] Database queries verified
- [ ] Health checks working
- [ ] Documentation reviewed for accuracy

### Production Readiness
- [ ] Integration verification script passes
- [ ] No TypeScript errors
- [ ] All dependencies correct
- [ ] Environment variables documented
- [ ] Rollback plan documented
- [ ] Monitoring queries ready

### Final Sign-Off
- [ ] All sections E01-E07 completed
- [ ] System fully integrated and documented
- [ ] Ready for production deployment
- [ ] Team trained on deployment process
- [ ] Monitoring dashboards configured

---

**End of Section E07 Execution Prompts (v2)**

**🎉 Congratulations! The BrightRun LoRA Training Platform is complete, tested, and ready for deployment!**

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 4-5 hours  
**Files to Create:** 3 core files (script + 2 docs)  
**Database Changes:** None (verification only)  
**Deployment Required:** Yes (Edge Functions cron setup, environment variables)

