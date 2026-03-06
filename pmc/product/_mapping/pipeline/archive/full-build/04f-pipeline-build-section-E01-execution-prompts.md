# PIPELINE - Section E01: Foundation & Authentication - Execution Prompts

**Product:** PIPELINE  
**Section:** 1 - Foundation & Authentication  
**Generated:** 2025-12-26  
**Total Prompts:** 1  
**Estimated Total Time:** 3-5 hours  
**Source Section File:** 04f-pipeline-build-section-E01.md

---

## Section Overview

This section establishes the foundational database infrastructure for the LoRA Training Module. Since we're **extending an existing application**, most infrastructure already exists (Next.js 14, Supabase Auth, PostgreSQL, Storage, shadcn/ui components, Dashboard layout, React Query).

**What We're Adding in This Section**:
- ✅ 7 new database tables for LoRA training workflow
- ✅ TypeScript type definitions matching the schema
- ✅ 2 new Supabase Storage buckets
- ✅ Row-Level Security (RLS) policies for data isolation

**Key Infrastructure We're Reusing**:
- Existing Supabase PostgreSQL database
- Existing Supabase Auth system (`auth.users` table)
- Existing migration workflow
- Existing authentication patterns

---

## Prompt Sequence for This Section

This section has been divided into **1 progressive prompt**:

1. **Prompt P01: Database Foundation & TypeScript Types** (3-5h)
   - Features: FR-1.1 (Database Schema for LoRA Training)
   - Key Deliverables:
     - Migration file with 7 tables
     - RLS policies for security
     - Complete TypeScript type definitions
     - 2 storage buckets configured

---

## Integration Context

### Dependencies from Previous Sections

**None** - This is the foundation section (E01). No previous sections exist.

**Codebase Prerequisites** (must already exist):
- ✅ Supabase Auth configured (`@/lib/supabase-server`, `@/lib/auth-service`)
- ✅ Supabase Database client (`createServerSupabaseClient()`)
- ✅ Supabase Storage configured (environment variables)
- ✅ DashboardLayout component (`(dashboard)/layout.tsx`)
- ✅ shadcn/ui components in `/components/ui/`
- ✅ React Query provider configured

### Provides for Next Sections

This section provides the foundational data layer for all subsequent sections:

**Database Tables:**
- `datasets` - Dataset metadata and validation results
- `training_jobs` - Training job tracking and metrics
- `metrics_points` - Real-time training metrics
- `model_artifacts` - Trained model storage references
- `cost_records` - Cost tracking and billing
- `notifications` - User notifications

**TypeScript Types:**
- `Dataset`, `TrainingJob`, `HyperparameterConfig`, `GPUConfig` interfaces
- Type enums: `DatasetStatus`, `JobStatus`, `PresetId`
- Preset configurations: `HYPERPARAMETER_PRESETS`

**Storage Buckets:**
- `lora-datasets` - For dataset file uploads
- `lora-models` - For trained model artifacts

---

## Dependency Flow (This Section)

```
E01-P01 (Database Foundation)
  ↓
  Provides: Tables + Types + Buckets for all future sections
```

---

# PROMPT 1: Database Foundation & TypeScript Types

**Generated:** 2025-12-26  
**Section:** 1 - Foundation & Authentication  
**Prompt:** 1 of 1 in this section  
**Estimated Time:** 3-5 hours  
**Prerequisites:** Existing Supabase infrastructure (Auth, Database, Storage)

---

## 🎯 Mission Statement

Create the complete database foundation for the LoRA Training Module by implementing 7 new PostgreSQL tables, comprehensive TypeScript type definitions, and 2 storage buckets. This foundation will support dataset management, training job tracking, metrics collection, model artifact storage, cost tracking, and user notifications—all while leveraging the existing Supabase infrastructure.

---

## 📦 Section Context

### This Section's Goal

Establish the foundational database infrastructure for LoRA training features by extending the existing Supabase PostgreSQL database with new tables specifically designed for managing the complete LoRA training workflow.

### This Prompt's Scope

This is **Prompt 1 of 1** in Section E01. It implements:
- FR-1.1: Database Schema for LoRA Training (tables, indexes, RLS policies)
- Complete TypeScript type definitions
- Storage bucket configuration

---

## 🔗 Integration with Previous Work

### From Previous Sections

**None** - This is the first section (E01 - Foundation). No previous sections exist.

### From Existing Codebase (MUST Already Exist)

This prompt extends existing infrastructure. **Do NOT rebuild these**:

#### Supabase Authentication System
- ✅ `auth.users` table - We'll reference this for user ownership
- ✅ `auth.uid()` function - Used in RLS policies
- ✅ Authentication patterns via `@/lib/supabase-server`

#### Supabase Database Client
- ✅ `createServerSupabaseClient()` - For querying database
- ✅ Migration workflow - We'll add a new migration file

#### Supabase Storage
- ✅ Storage infrastructure configured
- ✅ Environment variables set (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

#### Application Framework
- ✅ Next.js 14 App Router with TypeScript
- ✅ shadcn/ui components library
- ✅ React Query for data fetching
- ✅ Dashboard layout and routing

**What We're Adding**: New tables that integrate with the existing `auth.users` table via foreign keys and RLS policies.

### From Previous Prompts (This Section)

**N/A** - This is the first prompt in Section E01.

---

## 🔍 Supabase Agent Ops Library (SAOL) - Database Operations Tool

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### ⚠️ CRITICAL: Use SAOL for ALL Database Operations

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations in this prompt.**  
Do not use raw `supabase-js` or manual PostgreSQL scripts for database verification or testing. SAOL is safe, robust, and handles edge cases automatically.

### What is SAOL?

SAOL is a tested, production-ready library for database operations that:
- ✅ Handles special characters and edge cases automatically
- ✅ Provides consistent error handling
- ✅ Includes deep schema introspection
- ✅ Works with Service Role Key for admin operations
- ✅ No manual SQL escaping required

**Library Location:** `supa-agent-ops/`  
**Documentation:** `supa-agent-ops/QUICK_START.md` (READ THIS FIRST)  
**Troubleshooting:** `supa-agent-ops/TROUBLESHOOTING.md`

---

### Setup & Prerequisites

**Installation Status:** ✅ Already available in project

**Environment Required:**
```bash
# Ensure these are set in .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Key Rules:**
1. **Use Service Role Key:** SAOL operations require admin privileges
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data
3. **No Manual Escaping:** SAOL handles special characters automatically
4. **Parameter Flexibility:** Accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible)

---

### Quick Reference: One-Liner Commands

**Note:** All examples updated for SAOL v2.1 with bug fixes applied.

#### Verify Tables Exist (After Migration)

```bash
# Check if datasets table exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log('Table exists:',r.success);if(r.success){console.log('Columns:',r.data.columns.map(c=>c.name).join(', '));}})();"

# Check all LoRA training tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t+':',r.success?'✅':'❌');}})();"
```

#### Query Tables (Verify Data)

```bash
# Check datasets table (all columns)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:5});console.log('Success:',r.success);console.log('Count:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Check datasets with specific columns and filtering
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status,training_ready,created_at',where:[{column:'status',operator:'eq',value:'ready'}],orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Ready datasets:',r.data.length);r.data.forEach(d=>console.log('-',d.name,'/',d.status));})();"

# Check training_jobs table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'training_jobs',select:'id,status,progress,current_epoch,total_epochs,created_at',orderBy:[{column:'created_at',asc:false}],limit:5});console.log('Training jobs:',r.data.length);r.data.forEach(j=>console.log('-',j.id.slice(0,8),'/',j.status,'/',j.progress+'%'));})();"
```

#### Deep Schema Introspection

```bash
# Get complete schema details for datasets table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});console.log(JSON.stringify(r,null,2));})();"

# Check RLS policies on datasets
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:',r.data.policies.length);}})();"
```

---

### SAOL API Reference (Quick)

#### agentQuery - Query Data

**Recommended Format** (clear intent):
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: ['id', 'name', 'status', 'created_at'],  // Array or comma-separated string
  where: [
    { column: 'status', operator: 'eq', value: 'ready' },
    { column: 'training_ready', operator: 'eq', value: true }
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

**Backward Compatible Format:**
```javascript
const result = await saol.agentQuery({
  table: 'datasets',
  select: 'id,name,status,created_at',  // String
  filters: [  // 'filters' instead of 'where'
    { field: 'status', operator: 'eq', value: 'ready' }  // 'field' instead of 'column'
  ],
  orderBy: [{ column: 'created_at', asc: false }],
  limit: 10
});
```

#### agentIntrospectSchema - Deep Schema Analysis

```javascript
const result = await saol.agentIntrospectSchema({
  table: 'datasets',
  transport: 'pg'  // Use PostgreSQL introspection (more detailed)
});

// Returns:
// {
//   success: true,
//   data: {
//     tableName: 'datasets',
//     columns: [...],
//     primaryKey: [...],
//     foreignKeys: [...],
//     indexes: [...],
//     rlsEnabled: true,
//     policies: [...]
//   }
// }
```

#### agentPreflight - Pre-Operation Check

```javascript
// Always run before mutations
const preflight = await saol.agentPreflight({
  table: 'datasets'
});

if (!preflight.success) {
  console.error('Preflight failed:', preflight.error);
  return;
}

// Proceed with operation...
```

---

### Common Use Cases for This Section

#### 1. Verify Migration Applied Successfully

```bash
# After running migration, verify all tables exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['datasets','training_jobs','metrics_points','model_artifacts','cost_records','notifications'];console.log('Verifying migration...');for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log('✓',t,'-',r.success?'EXISTS':'MISSING');}})();"
```

#### 2. Check Table Structure

```bash
# Verify datasets table has correct columns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('Columns:');r.data.columns.forEach(c=>console.log('-',c.name,':',c.type));}})();"
```

#### 3. Verify RLS Policies

```bash
# Check RLS is enabled and policies exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'datasets',transport:'pg'});if(r.success){console.log('RLS Enabled:',r.data.rlsEnabled);console.log('Policies:');r.data.policies.forEach(p=>console.log('-',p.name,'(',p.command,')'));}})();"
```

#### 4. Test Data Insertion

```bash
# Query to verify test data (after manual insert)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',limit:1});console.log('Sample dataset:',JSON.stringify(r.data[0],null,2));})();"
```

---

### When to Use SAOL in This Prompt

Use SAOL commands for:

1. ✅ **After Migration** - Verify tables exist and have correct structure
2. ✅ **Database Verification** - Check data was inserted correctly
3. ✅ **Schema Validation** - Confirm columns, indexes, foreign keys
4. ✅ **RLS Testing** - Verify policies are enabled and working
5. ✅ **Debugging** - Query tables to understand data state

**Do NOT use SAOL for:**
- ❌ Running migrations (use `supabase migration up` or Dashboard)
- ❌ Creating storage buckets (use Dashboard)
- ❌ Application code (use regular Supabase client)

---

### Important Notes

1. **Service Role Key Required:** SAOL uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
2. **Read-Only Recommended:** Use SAOL primarily for verification, not mutations
3. **Path Matters:** Always `cd` to `supa-agent-ops/` directory before running commands
4. **Env File:** Ensure `.env.local` is in parent directory with correct variables
5. **Windows Paths:** Use forward slashes in paths: `c:/Users/james/...`

---

---

## 🎯 Implementation Requirements

### Feature FR-1.1: Database Schema for LoRA Training

**Type:** Database (Data Model)  
**Strategy:** EXTENSION - Building on existing Supabase PostgreSQL database

#### Description

Create a comprehensive database schema to support the complete LoRA training workflow, including dataset management, training job orchestration, real-time metrics collection, model artifact tracking, cost accounting, and user notifications. All tables integrate with the existing Supabase Auth system for user isolation and security.

#### What Already Exists (Don't Rebuild)

- ✅ Supabase PostgreSQL database instance
- ✅ `auth.users` table (from Supabase Auth)
- ✅ Migration directory: `supabase/migrations/`
- ✅ RLS (Row-Level Security) infrastructure
- ✅ Supabase Storage buckets infrastructure

#### What We're Building (New in This Prompt)

**Database:**
- 🆕 Migration file: `supabase/migrations/20241223_create_lora_training_tables.sql`
- 🆕 Table: `datasets` - Dataset uploads and validation
- 🆕 Table: `training_jobs` - Training job lifecycle management
- 🆕 Table: `metrics_points` - Real-time training metrics
- 🆕 Table: `model_artifacts` - Trained model references
- 🆕 Table: `cost_records` - Cost tracking and billing
- 🆕 Table: `notifications` - User notification system
- 🆕 RLS policies for all tables
- 🆕 Indexes for query performance
- 🆕 Triggers for `updated_at` timestamp management

**TypeScript:**
- 🆕 Type definitions file: `src/lib/types/lora-training.ts`
- 🆕 All interfaces matching database schema
- 🆕 Enum types for status fields
- 🆕 Preset configurations for hyperparameters

**Storage:**
- 🆕 Bucket: `lora-datasets` (for dataset uploads)
- 🆕 Bucket: `lora-models` (for trained model artifacts)

#### Implementation Details

---

### Part 1: Database Migration

**Migration File:** `supabase/migrations/20241223_create_lora_training_tables.sql`

**Purpose:** Create all database tables, indexes, RLS policies, and triggers for the LoRA training workflow.

**Implementation:**

```sql
-- ============================================
-- BrightRun LoRA Training Module
-- Migration: Create LoRA Training Tables
-- ============================================

BEGIN;

-- DATASETS TABLE
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  format VARCHAR(50) DEFAULT 'brightrun_lora_v4',
  status VARCHAR(50) DEFAULT 'uploading',
  storage_bucket VARCHAR(100) DEFAULT 'lora-datasets',
  storage_path TEXT NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  total_training_pairs INTEGER,
  total_validation_pairs INTEGER,
  total_tokens BIGINT,
  avg_turns_per_conversation DECIMAL(10, 2),
  avg_tokens_per_turn DECIMAL(10, 2),
  training_ready BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_errors JSONB,
  sample_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_datasets_created_at ON datasets(created_at DESC);

-- RLS Policies
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id);

-- TRAINING_JOBS TABLE
CREATE TABLE IF NOT EXISTS training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  preset_id VARCHAR(50) NOT NULL,
  hyperparameters JSONB NOT NULL,
  gpu_config JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  current_stage VARCHAR(50) DEFAULT 'queued',
  progress DECIMAL(5, 2) DEFAULT 0,
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER NOT NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  current_metrics JSONB,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  current_cost DECIMAL(10, 2) DEFAULT 0,
  estimated_total_cost DECIMAL(10, 2) NOT NULL,
  final_cost DECIMAL(10, 2),
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  external_job_id VARCHAR(255) UNIQUE,
  artifact_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_training_jobs_user_id ON training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_dataset_id ON training_jobs(dataset_id);

-- RLS Policies
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- METRICS_POINTS TABLE
CREATE TABLE IF NOT EXISTS metrics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  epoch INTEGER NOT NULL,
  step INTEGER NOT NULL,
  training_loss DECIMAL(10, 6) NOT NULL,
  validation_loss DECIMAL(10, 6),
  learning_rate DECIMAL(12, 10) NOT NULL,
  gradient_norm DECIMAL(10, 6),
  throughput DECIMAL(10, 2),
  gpu_utilization DECIMAL(5, 2)
);

CREATE INDEX idx_metrics_points_job_id ON metrics_points(job_id);
CREATE INDEX idx_metrics_points_timestamp ON metrics_points(job_id, timestamp DESC);

-- MODEL_ARTIFACTS TABLE
CREATE TABLE IF NOT EXISTS model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL UNIQUE REFERENCES training_jobs(id) ON DELETE RESTRICT,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  description TEXT,
  status VARCHAR(50) DEFAULT 'stored',
  deployed_at TIMESTAMPTZ,
  quality_metrics JSONB NOT NULL,
  training_summary JSONB NOT NULL,
  configuration JSONB NOT NULL,
  artifacts JSONB NOT NULL,
  parent_model_id UUID REFERENCES model_artifacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_model_artifacts_user_id ON model_artifacts(user_id);
CREATE INDEX idx_model_artifacts_job_id ON model_artifacts(job_id);

-- RLS Policies
ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON model_artifacts FOR SELECT
  USING (auth.uid() = user_id);

-- COST_RECORDS TABLE
CREATE TABLE IF NOT EXISTS cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES training_jobs(id) ON DELETE SET NULL,
  cost_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  details JSONB,
  billing_period DATE NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_records_user_id ON cost_records(user_id);
CREATE INDEX idx_cost_records_billing_period ON cost_records(user_id, billing_period DESC);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read, created_at DESC);

-- Add foreign key from training_jobs to model_artifacts
ALTER TABLE training_jobs
ADD CONSTRAINT fk_training_jobs_artifact
FOREIGN KEY (artifact_id) REFERENCES model_artifacts(id);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_jobs_updated_at BEFORE UPDATE ON training_jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_artifacts_updated_at BEFORE UPDATE ON model_artifacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

**Key Schema Design Decisions:**

1. **User Isolation**: All tables have `user_id` foreign key to `auth.users(id)` with CASCADE delete
2. **RLS Policies**: Every user-facing table has policies using `auth.uid()` to isolate data
3. **Status Tracking**: VARCHAR status fields for flexibility (not enums, easier to extend)
4. **JSONB Fields**: Used for flexible metadata (validation_errors, hyperparameters, etc.)
5. **Storage Paths**: Store only paths, never full URLs (URLs generated on-demand)
6. **Soft Deletes**: `deleted_at` fields for datasets and model_artifacts
7. **Timestamps**: Automatic `created_at`, `updated_at` with triggers
8. **Indexes**: Strategic indexes on user_id, status, timestamps for query performance

**Pattern Source**: Existing Supabase patterns in the codebase (Infrastructure Inventory Section 2)

---

### Part 2: TypeScript Type Definitions

**File:** `src/lib/types/lora-training.ts`

**Purpose:** Provide complete TypeScript types matching the database schema, including helper types, enums, and preset configurations.

**Implementation:**

```typescript
// ============================================
// BrightRun LoRA Training Module
// TypeScript Type Definitions
// ============================================

// -------------------- ENUMS --------------------

export type DatasetStatus = 'uploading' | 'validating' | 'ready' | 'error';

export type JobStatus = 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';

export type PresetId = 'conservative' | 'balanced' | 'aggressive' | 'custom';

// -------------------- DATASET --------------------

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: 'brightrun_lora_v4' | 'brightrun_lora_v3';
  status: DatasetStatus;
  storage_bucket: string;
  storage_path: string;  // NEVER store URLs - only paths
  file_name: string;
  file_size: number;
  total_training_pairs: number | null;
  total_validation_pairs: number | null;
  total_tokens: number | null;
  avg_turns_per_conversation: number | null;
  avg_tokens_per_turn: number | null;
  training_ready: boolean;
  validated_at: string | null;
  validation_errors: ValidationError[] | null;
  sample_data: any | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// -------------------- TRAINING JOB --------------------

export interface TrainingJob {
  id: string;
  user_id: string;
  dataset_id: string;
  preset_id: PresetId;
  hyperparameters: HyperparameterConfig;
  gpu_config: GPUConfig;
  status: JobStatus;
  current_stage: string;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number | null;
  current_metrics: CurrentMetrics | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_completion_at: string | null;
  current_cost: number;
  estimated_total_cost: number;
  final_cost: number | null;
  error_message: string | null;
  error_stack: string | null;
  retry_count: number;
  external_job_id: string | null;
  artifact_id: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------- HYPERPARAMETERS --------------------

export interface HyperparameterConfig {
  base_model: string;
  learning_rate: number;
  batch_size: number;
  num_epochs: number;
  lora_rank: number;
  lora_alpha: number;
  lora_dropout: number;
  warmup_steps?: number;
  weight_decay?: number;
}

// -------------------- GPU CONFIGURATION --------------------

export interface GPUConfig {
  gpu_type: string;
  num_gpus: number;
  gpu_memory_gb: number;
  cost_per_gpu_hour: number;
}

// -------------------- METRICS --------------------

export interface CurrentMetrics {
  training_loss: number;
  validation_loss?: number;
  learning_rate: number;
  throughput?: number;
  gpu_utilization?: number;
}

export interface MetricsPoint {
  id: string;
  job_id: string;
  timestamp: string;
  epoch: number;
  step: number;
  training_loss: number;
  validation_loss: number | null;
  learning_rate: number;
  gradient_norm: number | null;
  throughput: number | null;
  gpu_utilization: number | null;
}

// -------------------- MODEL ARTIFACTS --------------------

export interface ModelArtifact {
  id: string;
  user_id: string;
  job_id: string;
  dataset_id: string;
  name: string;
  version: string;
  description: string | null;
  status: string;
  deployed_at: string | null;
  quality_metrics: QualityMetrics;
  training_summary: TrainingSummary;
  configuration: HyperparameterConfig;
  artifacts: ArtifactFiles;
  parent_model_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QualityMetrics {
  final_training_loss: number;
  final_validation_loss: number;
  best_epoch: number;
  convergence_score: number;
}

export interface TrainingSummary {
  total_epochs: number;
  total_steps: number;
  total_duration_seconds: number;
  total_cost: number;
  gpu_type: string;
  dataset_name: string;
}

export interface ArtifactFiles {
  adapter_model: string;      // storage path
  adapter_config: string;      // storage path
  training_logs: string;       // storage path
  metrics_chart?: string;      // storage path
}

// -------------------- COST RECORDS --------------------

export interface CostRecord {
  id: string;
  user_id: string;
  job_id: string | null;
  cost_type: string;
  amount: number;
  details: any | null;
  billing_period: string;
  recorded_at: string;
}

// -------------------- NOTIFICATIONS --------------------

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  action_url: string | null;
  metadata: any | null;
  created_at: string;
}

// -------------------- VALIDATION --------------------

export interface ValidationError {
  line: number;
  error: string;
  suggestion?: string;
}

// -------------------- PRESET CONFIGURATIONS --------------------

export const HYPERPARAMETER_PRESETS: Record<PresetId, HyperparameterConfig> = {
  conservative: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0001,
    batch_size: 4,
    num_epochs: 3,
    lora_rank: 8,
    lora_alpha: 16,
    lora_dropout: 0.05,
  },
  balanced: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
  aggressive: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0003,
    batch_size: 16,
    num_epochs: 10,
    lora_rank: 32,
    lora_alpha: 64,
    lora_dropout: 0.1,
  },
  custom: {
    base_model: 'mistralai/Mistral-7B-v0.1',
    learning_rate: 0.0002,
    batch_size: 8,
    num_epochs: 5,
    lora_rank: 16,
    lora_alpha: 32,
    lora_dropout: 0.1,
  },
};

// -------------------- GPU CONFIGURATIONS --------------------

export const GPU_CONFIGURATIONS = {
  'nvidia-a100-40gb': {
    gpu_type: 'NVIDIA A100 40GB',
    num_gpus: 1,
    gpu_memory_gb: 40,
    cost_per_gpu_hour: 2.50,
  },
  'nvidia-a100-80gb': {
    gpu_type: 'NVIDIA A100 80GB',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 3.50,
  },
  'nvidia-h100': {
    gpu_type: 'NVIDIA H100',
    num_gpus: 1,
    gpu_memory_gb: 80,
    cost_per_gpu_hour: 5.00,
  },
} as const;

export type GPUConfigurationId = keyof typeof GPU_CONFIGURATIONS;
```

**Key Type Design Decisions:**

1. **String Dates**: All timestamps as `string` (ISO format from PostgreSQL TIMESTAMPTZ)
2. **Nullable Fields**: Explicit `| null` for optional database fields
3. **Storage Paths**: Comment reminder to never store full URLs, only paths
4. **JSONB Types**: Strongly typed interfaces for JSONB fields (HyperparameterConfig, GPUConfig, etc.)
5. **Preset Constants**: Export const objects for presets (used in UI forms)
6. **Type Safety**: Union types for enums (`DatasetStatus`, `JobStatus`, `PresetId`)

**Pattern Source**: Existing type patterns from `@/lib/types/*` in the codebase

---

### Part 3: Storage Bucket Configuration

**Purpose:** Create two Supabase Storage buckets for dataset files and trained model artifacts.

**Implementation Method:** Via Supabase Dashboard (not code)

#### Bucket 1: `lora-datasets`

**Configuration:**
- **Name:** `lora-datasets`
- **Public Access:** ❌ No (private)
- **File Size Limit:** 500 MB
- **Allowed MIME Types:** 
  - `application/json`
  - `application/x-jsonlines`
  - `text/plain`

**RLS Policies (to be added via Dashboard):**
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

**Folder Structure:**
```
lora-datasets/
  {user_id}/
    {dataset_id}/
      dataset.jsonl
```

#### Bucket 2: `lora-models`

**Configuration:**
- **Name:** `lora-models`
- **Public Access:** ❌ No (private)
- **File Size Limit:** 5 GB
- **Allowed MIME Types:** 
  - `application/octet-stream`
  - `application/x-tar`
  - `application/gzip`
  - `application/json`

**RLS Policies (to be added via Dashboard):**
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own models"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lora-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own files
CREATE POLICY "Users can read own models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lora-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lora-models' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Folder Structure:**
```
lora-models/
  {user_id}/
    {artifact_id}/
      adapter_model.safetensors
      adapter_config.json
      training_logs.txt
      metrics_chart.png
```

**Setup Instructions:**

1. Navigate to Supabase Dashboard → Storage
2. Click "New bucket"
3. Enter bucket name and configuration
4. After creating bucket, go to "Policies" tab
5. Click "New Policy" and add the RLS policies above
6. Repeat for second bucket

**Pattern Source**: Existing storage bucket patterns from the codebase

---

## ✅ Acceptance Criteria

### Functional Requirements

- [ ] **7 database tables created successfully**:
  - [ ] `datasets` table with 21 columns
  - [ ] `training_jobs` table with 25 columns
  - [ ] `metrics_points` table with 10 columns
  - [ ] `model_artifacts` table with 14 columns
  - [ ] `cost_records` table with 8 columns
  - [ ] `notifications` table with 10 columns
  - [ ] All foreign key constraints created

- [ ] **Indexes created for query performance**:
  - [ ] User-based indexes (3 tables)
  - [ ] Status indexes (2 tables)
  - [ ] Timestamp indexes (3 tables)
  - [ ] Job-based indexes (2 tables)

- [ ] **RLS policies active and tested**:
  - [ ] Users can only view their own datasets
  - [ ] Users can only view their own training jobs
  - [ ] Users can only view their own model artifacts
  - [ ] Admin access not required (no service role bypassing)

- [ ] **Triggers functioning correctly**:
  - [ ] `updated_at` automatically updates on row changes
  - [ ] Triggers on `datasets`, `training_jobs`, `model_artifacts`

- [ ] **Storage buckets configured**:
  - [ ] `lora-datasets` bucket created with correct settings
  - [ ] `lora-models` bucket created with correct settings
  - [ ] RLS policies applied to both buckets

### Technical Requirements

- [ ] No TypeScript errors in `src/lib/types/lora-training.ts`
- [ ] No linter warnings
- [ ] Migration runs successfully without errors
- [ ] All type exports available for import
- [ ] Type definitions match database schema exactly

### Integration Requirements

- [ ] All tables correctly reference `auth.users(id)` foreign key
- [ ] RLS policies use `auth.uid()` from existing auth system
- [ ] Storage buckets integrate with existing Supabase project
- [ ] No conflicts with existing database tables
- [ ] Migration follows existing naming convention

---

## 🧪 Testing & Validation

### Manual Testing Steps

#### 1. Database Migration Verification

**Run the migration:**

```bash
# If using Supabase CLI locally
npx supabase migration up

# Or apply via Supabase Dashboard:
# Dashboard → Database → Migrations → Run new migration
```

**Verify tables exist:**

```sql
-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('datasets', 'training_jobs', 'metrics_points', 'model_artifacts', 'cost_records', 'notifications');

-- Should return 6 rows
```

**Verify indexes:**

```sql
-- Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('datasets', 'training_jobs', 'metrics_points', 'model_artifacts', 'cost_records', 'notifications')
ORDER BY tablename, indexname;

-- Should return multiple indexes per table
```

**Verify RLS policies:**

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('datasets', 'training_jobs', 'model_artifacts')
AND schemaname = 'public';

-- All should show rowsecurity = true

-- Check policies exist
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('datasets', 'training_jobs', 'model_artifacts');

-- Should show SELECT, INSERT, UPDATE policies
```

#### 2. TypeScript Type Verification

**Check TypeScript compiles:**

```bash
cd src
npx tsc --noEmit
# Should show no errors
```

**Test imports:**

```typescript
// Create a test file: src/lib/types/__test_import.ts
import { 
  Dataset, 
  TrainingJob, 
  HYPERPARAMETER_PRESETS 
} from './lora-training';

const preset = HYPERPARAMETER_PRESETS.balanced;
console.log('Imports work:', preset);

// Run: npx ts-node src/lib/types/__test_import.ts
// Should output: Imports work: { base_model: 'mistralai/Mistral-7B-v0.1', ... }
```

**Delete test file after verification**

#### 3. Storage Bucket Verification

**Check via Supabase Dashboard:**
1. Navigate to Storage section
2. Verify `lora-datasets` bucket exists
3. Verify `lora-models` bucket exists
4. Check RLS policies are applied to both

**Test upload/download (optional):**

```typescript
// Test file: scripts/test-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testStorage() {
  // Test upload to lora-datasets
  const { data, error } = await supabase.storage
    .from('lora-datasets')
    .upload('test-user-id/test.json', JSON.stringify({ test: true }));

  console.log('Upload result:', data ? 'SUCCESS' : 'FAILED', error);
}

testStorage();
```

#### 4. RLS Policy Testing

**Test with authenticated user:**

```sql
-- Simulate authenticated user context
SET request.jwt.claims = '{"sub": "test-user-uuid"}';

-- Try to insert a dataset (should work)
INSERT INTO datasets (user_id, name, storage_path, file_name, file_size)
VALUES ('test-user-uuid', 'Test Dataset', 'test/path', 'test.json', 1000);

-- Try to query (should only see own data)
SELECT * FROM datasets;

-- Try to query another user's data (should return empty)
SELECT * FROM datasets WHERE user_id = 'other-user-uuid';
```

### Expected Outputs

After completing this prompt, you should have:

- [ ] ✅ Migration file exists at `supabase/migrations/20241223_create_lora_training_tables.sql`
- [ ] ✅ Types file exists at `src/lib/types/lora-training.ts`
- [ ] ✅ 7 tables visible in Supabase Dashboard → Database → Tables
- [ ] ✅ 2 buckets visible in Supabase Dashboard → Storage
- [ ] ✅ RLS policies visible in table details
- [ ] ✅ TypeScript compiles without errors
- [ ] ✅ All types importable from `@/lib/types/lora-training`

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `supabase/migrations/20241223_create_lora_training_tables.sql` - Complete database schema
- [ ] `src/lib/types/lora-training.ts` - TypeScript type definitions

### Existing Files Modified

**None** - This prompt only creates new files

### Database Changes

- [ ] Table `datasets` created with 21 columns, 3 indexes, 3 RLS policies
- [ ] Table `training_jobs` created with 25 columns, 3 indexes, 2 RLS policies
- [ ] Table `metrics_points` created with 10 columns, 2 indexes
- [ ] Table `model_artifacts` created with 14 columns, 2 indexes, 1 RLS policy
- [ ] Table `cost_records` created with 8 columns, 2 indexes
- [ ] Table `notifications` created with 10 columns, 2 indexes
- [ ] Function `update_updated_at_column()` created
- [ ] 3 triggers created for automatic timestamp updates
- [ ] All foreign keys to `auth.users(id)` established
- [ ] Cross-table foreign key: `training_jobs.artifact_id → model_artifacts.id`

### Storage Buckets

- [ ] Bucket `lora-datasets` created (500MB limit, private)
- [ ] Bucket `lora-models` created (5GB limit, private)
- [ ] RLS policies applied to both buckets

### API Endpoints

**None** - This is a foundation prompt (database layer only)

### Components

**None** - This is a foundation prompt (database layer only)

---

## 🔜 What's Next

### For Next Prompt in This Section

**Section Complete** - This is the only prompt in Section E01.

This section's deliverables (database tables, types, and storage buckets) will be used by **all subsequent sections** for:
- Storing dataset uploads (Section E02)
- Creating training jobs (Section E03)
- Recording real-time metrics (Section E04)
- Managing model artifacts (Section E05)
- Tracking costs (Section E06)
- Sending notifications (Section E07)

### For Next Section

**Next Section:** E02 - Dataset Management

The next section will build upon this foundation by creating:
- API endpoints to interact with `datasets` table
- Upload handlers using `lora-datasets` bucket
- Validation logic to populate dataset statistics
- UI components to display datasets

**Key Deliverables E02 Will Use:**
- `datasets` table for CRUD operations
- `Dataset`, `DatasetStatus` types from `@/lib/types/lora-training`
- `lora-datasets` storage bucket for file uploads
- `validation_errors` JSONB field for validation feedback

---

## ⚠️ Important Reminders

1. **Follow the Spec Exactly:** All SQL and TypeScript code provided comes from the integrated specification. Implement it as written—do not modify table names, column types, or field names.

2. **Reuse Existing Infrastructure:** This prompt extends existing Supabase infrastructure:
   - ✅ Use existing `auth.users` table (don't create new auth)
   - ✅ Use existing Supabase client patterns
   - ✅ Follow existing migration file naming conventions
   - ✅ Match existing RLS policy patterns

3. **Storage Best Practices:**
   - ✅ Store only **paths** in database, never full URLs
   - ✅ Generate signed URLs on-demand using Supabase Storage API
   - ✅ Use user_id in folder structure for RLS enforcement

4. **Type Safety:**
   - ✅ All database fields must have corresponding TypeScript types
   - ✅ JSONB fields need strongly-typed interfaces
   - ✅ Use union types for status enums
   - ✅ Mark nullable fields explicitly (`| null`)

5. **Testing:**
   - ✅ Run migration and verify tables exist
   - ✅ Test RLS policies with different user contexts
   - ✅ Verify TypeScript compilation
   - ✅ Confirm storage buckets accessible

6. **Migration Safety:**
   - ✅ Use `BEGIN` and `COMMIT` for transactional migration
   - ✅ Use `IF NOT EXISTS` for idempotency
   - ✅ Test migration locally before applying to production

7. **Don't Skip Steps:**
   - ✅ Create both database migration AND TypeScript types
   - ✅ Configure both storage buckets
   - ✅ Apply RLS policies to tables AND buckets
   - ✅ Verify everything works before proceeding

---

## 📚 Reference Materials

### Files from Previous Work

**None** - This is the foundation section (E01). No previous sections exist.

### Existing Infrastructure to Reference

#### Authentication Patterns
- **Location:** `src/lib/supabase-server.ts`
- **Pattern:** `requireAuth()` for protected routes
- **Pattern:** `auth.uid()` in RLS policies

#### Database Client Patterns
- **Location:** `src/lib/supabase-server.ts`
- **Pattern:** `createServerSupabaseClient()` for database queries
- **Usage:** Server-side API routes and Server Components

#### Migration Workflow
- **Location:** `supabase/migrations/`
- **Pattern:** Timestamped files: `YYYYMMDD_description.sql`
- **Existing Files:** Reference other migrations for patterns

#### Storage Patterns
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

#### Type Patterns
- **Location:** `src/lib/types/`
- **Pattern:** One file per domain (e.g., `database.ts`, `auth.ts`)
- **Export:** Named exports for interfaces and types

---

**Ready to implement Section E01, Prompt P01!** 🚀

This is the foundation of the LoRA Training Module. After completing this prompt, you'll have a complete data layer ready for all subsequent features.

---
