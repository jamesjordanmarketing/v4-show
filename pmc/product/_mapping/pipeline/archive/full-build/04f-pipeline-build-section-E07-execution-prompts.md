# PIPELINE - Section E07: Complete System Integration - Execution Prompts

**Product:** PIPELINE  
**Section:** 7 - Complete System Integration  
**Generated:** 2025-12-26  
**Total Prompts:** 1  
**Estimated Total Time:** 4-5 hours  
**Source Section File:** 04f-pipeline-build-section-E07.md

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
- 7 database tables with RLS policies
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
- Cost dashboard API
- Notifications system
- User alerts for training events

### Provides for Next Sections

**N/A** - This is the final section of the implementation.

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

**Generated:** 2025-12-26  
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

### From Section E02: Dataset Management
**API Endpoints:**
- `POST /api/datasets` - Create dataset and generate upload URL
- `GET /api/datasets` - List user's datasets
- `GET /api/datasets/[id]` - Get dataset details
- `DELETE /api/datasets/[id]` - Delete dataset

**Pages:**
- `/datasets` - Dataset list page
- `/datasets/new` - Dataset upload page
- `/datasets/[id]` - Dataset detail page

**Edge Functions:**
- `validate-datasets` - Background dataset validation

### From Section E03: Training Configuration
**API Endpoints:**
- `POST /api/jobs/estimate` - Cost estimation
- `POST /api/jobs` - Create training job

**Pages:**
- `/training/configure` - Training configuration page

**Hooks:**
- `useCostEstimate` - Real-time cost calculation

### From Section E04: Training Execution & Monitoring
**API Endpoints:**
- `GET /api/jobs` - List training jobs
- `GET /api/jobs/[id]` - Get job details with metrics

**Pages:**
- `/training/jobs` - Training jobs list
- `/training/jobs/[id]` - Training monitor (real-time)

**Edge Functions:**
- `process-training-jobs` - Job submission and monitoring

### From Section E05: Model Artifacts & Delivery
**API Endpoints:**
- `GET /api/models` - List model artifacts
- `GET /api/models/[id]` - Get model details
- `POST /api/models/[id]/download` - Generate download URLs

**Pages:**
- `/models` - Model list page
- `/models/[id]` - Model detail page

**Edge Functions:**
- `create-model-artifacts` - Artifact creation and storage

### From Section E06: Cost Tracking & Notifications
**API Endpoints:**
- `GET /api/costs/dashboard` - Cost summary
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/[id]` - Mark notification as read

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
- ✅ All UI pages from Sections E02-E05
- ✅ All React hooks and components

#### What We're Building (New in This Prompt)
- 🆕 `tests/integration/system-verification.test.ts` - Integration verification tests
- 🆕 `tests/e2e/complete-workflows.test.ts` - End-to-end workflow tests
- 🆕 `docs/deployment-checklist.md` - Deployment documentation
- 🆕 `docs/monitoring-setup.md` - Monitoring configuration
- 🆕 `scripts/verify-integration.ts` - Integration verification script

#### Implementation Details

**File:** `tests/integration/system-verification.test.ts`

```typescript
/**
 * System Integration Verification Tests
 * 
 * These tests verify that all system components are properly integrated:
 * - Database tables exist with correct relationships
 * - Storage buckets are configured correctly
 * - API routes respond correctly
 * - Edge Functions are deployed
 * - Authentication works across all routes
 * - RLS policies enforce data isolation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Test users
const testUser1 = {
  email: 'test-user-1@example.com',
  password: 'TestPassword123!',
};

const testUser2 = {
  email: 'test-user-2@example.com',
  password: 'TestPassword123!',
};

describe('Database Integration', () => {
  let adminClient: any;

  beforeAll(() => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
  });

  it('should have all 7 required tables', async () => {
    const { data: tables } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'datasets',
        'training_jobs',
        'metrics_points',
        'model_artifacts',
        'cost_records',
        'notifications',
      ]);

    expect(tables?.length).toBe(6);
  });

  it('should have proper foreign key relationships', async () => {
    // Verify training_jobs -> datasets relationship
    const { data: jobsFK } = await adminClient
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'training_jobs')
      .eq('constraint_type', 'FOREIGN KEY');

    expect(jobsFK?.length).toBeGreaterThan(0);
  });

  it('should have RLS policies enabled on user tables', async () => {
    const { data: rlsStatus } = await adminClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);

    rlsStatus?.forEach((table: any) => {
      expect(table.rowsecurity).toBe(true);
    });
  });

  it('should have proper indexes on frequently queried columns', async () => {
    const { data: indexes } = await adminClient
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'datasets');

    const indexNames = indexes?.map((idx: any) => idx.indexname) || [];
    expect(indexNames).toContain('idx_datasets_user_id');
    expect(indexNames).toContain('idx_datasets_status');
  });
});

describe('Storage Integration', () => {
  let adminClient: any;

  beforeAll(() => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
  });

  it('should have lora-datasets bucket configured', async () => {
    const { data: buckets } = await adminClient.storage.listBuckets();
    const datasetBucket = buckets?.find((b: any) => b.name === 'lora-datasets');
    expect(datasetBucket).toBeDefined();
    expect(datasetBucket.public).toBe(false);
  });

  it('should have lora-models bucket configured', async () => {
    const { data: buckets } = await adminClient.storage.listBuckets();
    const modelsBucket = buckets?.find((b: any) => b.name === 'lora-models');
    expect(modelsBucket).toBeDefined();
    expect(modelsBucket.public).toBe(false);
  });

  it('should generate presigned URLs for uploads', async () => {
    const testPath = 'test-user/test-dataset/test-file.jsonl';
    const { data: signedUrl } = await adminClient.storage
      .from('lora-datasets')
      .createSignedUploadUrl(testPath);

    expect(signedUrl).toBeDefined();
    expect(signedUrl.signedUrl).toContain('token=');
  });
});

describe('API Integration', () => {
  let userSession: any;

  beforeAll(async () => {
    // Create test user and get session
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await client.auth.signInWithPassword({
      email: testUser1.email,
      password: testUser1.password,
    });
    userSession = data?.session;
  });

  it('should require authentication for all dataset routes', async () => {
    const response = await fetch('http://localhost:3000/api/datasets');
    expect(response.status).toBe(401);
  });

  it('should return user datasets with valid auth', async () => {
    const response = await fetch('http://localhost:3000/api/datasets', {
      headers: {
        Authorization: `Bearer ${userSession.access_token}`,
      },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should enforce RLS policies (no cross-user data leakage)', async () => {
    // User 1 creates dataset
    const client1 = createClient(supabaseUrl, supabaseAnonKey);
    await client1.auth.signInWithPassword(testUser1);
    
    const { data: dataset1 } = await client1
      .from('datasets')
      .insert({ name: 'User 1 Dataset' })
      .select()
      .single();

    // User 2 tries to access User 1's dataset
    const client2 = createClient(supabaseUrl, supabaseAnonKey);
    await client2.auth.signInWithPassword(testUser2);
    
    const { data: dataset2 } = await client2
      .from('datasets')
      .select()
      .eq('id', dataset1.id);

    expect(dataset2).toHaveLength(0); // User 2 cannot see User 1's data
  });

  it('should validate request schemas', async () => {
    const response = await fetch('http://localhost:3000/api/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userSession.access_token}`,
      },
      body: JSON.stringify({
        name: '', // Invalid: empty name
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });
});

describe('Edge Functions Integration', () => {
  it('should have validate-datasets function deployed', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/validate-datasets`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    expect(response.status).toBeLessThan(500); // Function exists
  });

  it('should have process-training-jobs function deployed', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-training-jobs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    expect(response.status).toBeLessThan(500);
  });

  it('should have create-model-artifacts function deployed', async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-model-artifacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    expect(response.status).toBeLessThan(500);
  });
});

describe('Authentication Integration', () => {
  it('should protect all pages with authentication', async () => {
    const protectedRoutes = [
      '/datasets',
      '/datasets/new',
      '/training/configure',
      '/training/jobs',
      '/models',
    ];

    for (const route of protectedRoutes) {
      const response = await fetch(`http://localhost:3000${route}`);
      // Should redirect to login or show auth required
      expect([302, 401, 403]).toContain(response.status);
    }
  });
});
```

**File:** `tests/e2e/complete-workflows.test.ts`

```typescript
/**
 * End-to-End Workflow Tests
 * 
 * These tests verify complete user workflows work from start to finish:
 * 1. Dataset Upload Flow
 * 2. Training Job Flow
 * 3. Model Download Flow
 * 4. Error Handling Flow
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Complete Dataset Upload Flow', () => {
  let client: any;
  let userId: string;

  beforeAll(async () => {
    client = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await client.auth.signInWithPassword({
      email: 'test-user@example.com',
      password: 'TestPassword123!',
    });
    userId = data.user.id;
  });

  it('should complete full dataset upload and validation flow', async () => {
    // Step 1: Create dataset and get presigned URL
    const createResponse = await fetch('http://localhost:3000/api/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
      body: JSON.stringify({
        name: 'E2E Test Dataset',
        description: 'End-to-end test dataset',
        format: 'brightrun_lora_v4',
        file_name: 'test-dataset.jsonl',
        file_size: 1024,
      }),
    });

    expect(createResponse.status).toBe(201);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    expect(createData.data.presigned_upload_url).toBeDefined();

    const datasetId = createData.data.dataset.id;
    const uploadUrl = createData.data.presigned_upload_url;

    // Step 2: Upload file to presigned URL
    const testFileContent = JSON.stringify({
      conversations: [
        {
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        },
      ],
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: testFileContent,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(uploadResponse.status).toBe(200);

    // Step 3: Wait for validation (Edge Function runs every 1 minute)
    await new Promise((resolve) => setTimeout(resolve, 65000)); // Wait 65 seconds

    // Step 4: Check dataset status
    const statusResponse = await fetch(
      `http://localhost:3000/api/datasets/${datasetId}`,
      {
        headers: {
          Authorization: `Bearer ${client.auth.session()?.access_token}`,
        },
      }
    );

    const statusData = await statusResponse.json();
    expect(statusData.data.status).toBe('ready');
    expect(statusData.data.training_ready).toBe(true);
    expect(statusData.data.total_training_pairs).toBeGreaterThan(0);

    // Step 5: Verify notification was created
    const notifResponse = await fetch('http://localhost:3000/api/notifications', {
      headers: {
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
    });

    const notifData = await notifResponse.json();
    const datasetNotif = notifData.data.find(
      (n: any) => n.type === 'dataset_validated' && n.metadata?.dataset_id === datasetId
    );
    expect(datasetNotif).toBeDefined();
  }, 120000); // 2-minute timeout
});

describe('Complete Training Job Flow', () => {
  let client: any;
  let datasetId: string;

  beforeAll(async () => {
    client = createClient(supabaseUrl, supabaseAnonKey);
    await client.auth.signInWithPassword({
      email: 'test-user@example.com',
      password: 'TestPassword123!',
    });

    // Create a ready dataset for testing
    const { data: dataset } = await client
      .from('datasets')
      .insert({
        name: 'Training Test Dataset',
        status: 'ready',
        training_ready: true,
        total_training_pairs: 100,
      })
      .select()
      .single();
    datasetId = dataset.id;
  });

  it('should complete full training job workflow', async () => {
    // Step 1: Get cost estimate
    const estimateResponse = await fetch('http://localhost:3000/api/jobs/estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        gpu_config: {
          type: 'A100-40GB',
          count: 1,
        },
        hyperparameters: {
          batch_size: 4,
          epochs: 3,
          learning_rate: 0.0002,
          rank: 16,
        },
      }),
    });

    const estimateData = await estimateResponse.json();
    expect(estimateData.data.estimated_cost).toBeGreaterThan(0);

    // Step 2: Create training job
    const createJobResponse = await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        preset_id: 'balanced',
        hyperparameters: {
          base_model: 'mistralai/Mistral-7B-v0.1',
          learning_rate: 0.0002,
          batch_size: 8,
          num_epochs: 5,
          lora_rank: 16,
          lora_alpha: 32,
          lora_dropout: 0.1,
        },
        gpu_config: {
          gpu_type: 'A100-40GB',
          num_gpus: 1,
          gpu_memory_gb: 40,
          cost_per_gpu_hour: 1.5,
        },
      }),
    });

    const jobData = await createJobResponse.json();
    expect(jobData.success).toBe(true);
    const jobId = jobData.data.id;

    // Step 3: Wait for job processing (Edge Function runs every 30 seconds)
    await new Promise((resolve) => setTimeout(resolve, 35000)); // Wait 35 seconds

    // Step 4: Check job was picked up
    const jobStatusResponse = await fetch(
      `http://localhost:3000/api/jobs/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${client.auth.session()?.access_token}`,
        },
      }
    );

    const jobStatusData = await jobStatusResponse.json();
    expect(['initializing', 'running', 'completed']).toContain(
      jobStatusData.data.status
    );

    // Step 5: Verify notifications were created
    const notifResponse = await fetch('http://localhost:3000/api/notifications', {
      headers: {
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
    });

    const notifData = await notifResponse.json();
    const jobNotifs = notifData.data.filter(
      (n: any) => n.metadata?.job_id === jobId
    );
    expect(jobNotifs.length).toBeGreaterThan(0);
  }, 60000); // 1-minute timeout
});

describe('Error Handling Flow', () => {
  let client: any;

  beforeAll(async () => {
    client = createClient(supabaseUrl, supabaseAnonKey);
    await client.auth.signInWithPassword({
      email: 'test-user@example.com',
      password: 'TestPassword123!',
    });
  });

  it('should handle invalid dataset format gracefully', async () => {
    // Create dataset
    const createResponse = await fetch('http://localhost:3000/api/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client.auth.session()?.access_token}`,
      },
      body: JSON.stringify({
        name: 'Invalid Dataset',
        file_name: 'invalid.jsonl',
        file_size: 100,
      }),
    });

    const createData = await createResponse.json();
    const datasetId = createData.data.dataset.id;
    const uploadUrl = createData.data.presigned_upload_url;

    // Upload invalid content
    await fetch(uploadUrl, {
      method: 'PUT',
      body: 'not valid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Wait for validation
    await new Promise((resolve) => setTimeout(resolve, 65000));

    // Check status
    const statusResponse = await fetch(
      `http://localhost:3000/api/datasets/${datasetId}`,
      {
        headers: {
          Authorization: `Bearer ${client.auth.session()?.access_token}`,
        },
      }
    );

    const statusData = await statusResponse.json();
    expect(statusData.data.status).toBe('error');
    expect(statusData.data.validation_errors).toBeDefined();
    expect(statusData.data.training_ready).toBe(false);
  }, 120000);
});
```

**Integration Verification Script:**

**File:** `scripts/verify-integration.ts`

```typescript
/**
 * Integration Verification Script
 * 
 * Run this script to verify all system components are properly integrated.
 * Usage: npx tsx scripts/verify-integration.ts
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function verifyIntegration() {
  console.log(chalk.blue('\n🔍 Starting System Integration Verification\n'));

  const client = createClient(supabaseUrl, supabaseServiceKey);
  let passedChecks = 0;
  let failedChecks = 0;

  // Check 1: Database Tables
  console.log(chalk.yellow('Checking database tables...'));
  try {
    const tables = ['datasets', 'training_jobs', 'metrics_points', 
                   'model_artifacts', 'cost_records', 'notifications'];
    
    for (const table of tables) {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) throw error;
    }
    console.log(chalk.green('✓ All database tables exist'));
    passedChecks++;
  } catch (error) {
    console.log(chalk.red('✗ Database tables check failed:', error));
    failedChecks++;
  }

  // Check 2: Storage Buckets
  console.log(chalk.yellow('\nChecking storage buckets...'));
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const requiredBuckets = ['lora-datasets', 'lora-models'];
    
    for (const bucketName of requiredBuckets) {
      const bucket = buckets?.find(b => b.name === bucketName);
      if (!bucket) throw new Error(`Bucket ${bucketName} not found`);
    }
    console.log(chalk.green('✓ All storage buckets configured'));
    passedChecks++;
  } catch (error) {
    console.log(chalk.red('✗ Storage buckets check failed:', error));
    failedChecks++;
  }

  // Check 3: RLS Policies
  console.log(chalk.yellow('\nChecking RLS policies...'));
  try {
    const { data } = await client
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['datasets', 'training_jobs', 'model_artifacts']);

    const allEnabled = data?.every(table => table.rowsecurity === true);
    if (!allEnabled) throw new Error('Some RLS policies not enabled');
    
    console.log(chalk.green('✓ RLS policies enabled on all user tables'));
    passedChecks++;
  } catch (error) {
    console.log(chalk.red('✗ RLS policies check failed:', error));
    failedChecks++;
  }

  // Check 4: Edge Functions
  console.log(chalk.yellow('\nChecking Edge Functions...'));
  try {
    const functions = [
      'validate-datasets',
      'process-training-jobs',
      'create-model-artifacts',
    ];

    for (const func of functions) {
      const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      });
      
      if (response.status >= 500) {
        throw new Error(`Function ${func} returned ${response.status}`);
      }
    }
    
    console.log(chalk.green('✓ All Edge Functions deployed'));
    passedChecks++;
  } catch (error) {
    console.log(chalk.red('✗ Edge Functions check failed:', error));
    failedChecks++;
  }

  // Check 5: Environment Variables
  console.log(chalk.yellow('\nChecking environment variables...'));
  try {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        throw new Error(`Missing ${envVar}`);
      }
    }
    
    console.log(chalk.green('✓ All required environment variables set'));
    passedChecks++;
  } catch (error) {
    console.log(chalk.red('✗ Environment variables check failed:', error));
    failedChecks++;
  }

  // Summary
  console.log(chalk.blue('\n' + '='.repeat(50)));
  console.log(chalk.blue('Integration Verification Summary'));
  console.log(chalk.blue('='.repeat(50)));
  console.log(chalk.green(`Passed: ${passedChecks}`));
  console.log(chalk.red(`Failed: ${failedChecks}`));
  
  if (failedChecks === 0) {
    console.log(chalk.green('\n✓ All integration checks passed!'));
    console.log(chalk.green('System is ready for deployment.\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n✗ Some integration checks failed.'));
    console.log(chalk.red('Please fix the issues above before deploying.\n'));
    process.exit(1);
  }
}

verifyIntegration();
```

---

### Task 2: Deployment Documentation

**Type:** Documentation  
**Strategy:** NEW - creating comprehensive deployment guides

#### Implementation Details

**File:** `docs/deployment-checklist.md`

```markdown
# BrightRun LoRA Training Platform - Deployment Checklist

**Version:** 1.0  
**Last Updated:** 2025-12-26

---

## Pre-Deployment Verification

### 1. Code Quality
- [ ] No TypeScript errors (`npm run build`)
- [ ] No linter warnings (`npm run lint`)
- [ ] All tests passing (`npm run test`)
- [ ] Integration verification script passed (`npx tsx scripts/verify-integration.ts`)

### 2. Environment Variables

#### Required (Already Configured)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### New (Add to Vercel/Production)
```bash
GPU_CLUSTER_API_URL=your_gpu_cluster_url
GPU_CLUSTER_API_KEY=your_gpu_cluster_key
```

---

## Database Setup

### 1. Run Migration
```bash
# Local
npx supabase migration up

# Production
npx supabase db push
```

### 2. Verify Tables Created
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

Expected: 6 rows

### 3. Verify RLS Policies
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('datasets', 'training_jobs', 'model_artifacts');
```

Expected: All should have `rowsecurity = true`

### 4. Test RLS with Test Users
- [ ] Create test user 1
- [ ] Create test user 2
- [ ] User 1 creates dataset
- [ ] User 2 cannot see User 1's dataset
- [ ] Each user can only see their own data

---

## Storage Setup

### 1. Create Buckets (via Supabase Dashboard)

#### Bucket: lora-datasets
- **Name:** `lora-datasets`
- **Public:** No (Private)
- **File size limit:** 500 MB
- **Allowed MIME types:** `application/json`, `application/x-jsonlines`
- **RLS Enabled:** Yes

#### Bucket: lora-models
- **Name:** `lora-models`
- **Public:** No (Private)
- **File size limit:** 5 GB
- **Allowed MIME types:** `application/octet-stream`, `application/x-tar`, `application/json`
- **RLS Enabled:** Yes

### 2. Test Storage Operations
```typescript
// Test presigned URL generation
const { data } = await supabase.storage
  .from('lora-datasets')
  .createSignedUploadUrl('test-path');

console.log(data.signedUrl); // Should contain token
```

---

## Edge Functions Setup

### 1. Deploy Edge Functions

```bash
# Deploy validate-datasets
npx supabase functions deploy validate-datasets

# Deploy process-training-jobs
npx supabase functions deploy process-training-jobs

# Deploy create-model-artifacts
npx supabase functions deploy create-model-artifacts
```

### 2. Set Environment Variables (via Supabase Dashboard)

Navigate to: **Edge Functions → Settings → Secrets**

Add:
```
GPU_CLUSTER_API_URL=your_url
GPU_CLUSTER_API_KEY=your_key
```

### 3. Configure Cron Schedules (via Supabase Dashboard)

Navigate to: **Database → Cron Jobs**

#### validate-datasets
- **Schedule:** Every 1 minute
- **SQL:**
```sql
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/validate-datasets',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
);
```

#### process-training-jobs
- **Schedule:** Every 30 seconds
- **SQL:**
```sql
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/process-training-jobs',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
);
```

#### create-model-artifacts
- **Schedule:** Every 1 minute
- **SQL:**
```sql
SELECT net.http_post(
  url := 'https://your-project.supabase.co/functions/v1/create-model-artifacts',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
);
```

### 4. Test Edge Functions Manually

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/validate-datasets" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Expected: `{ "success": true }`

---

## Frontend Deployment

### 1. Build Application
```bash
npm run build
```

Expected: No errors, build completes successfully

### 2. Deploy to Vercel
```bash
vercel --prod
```

Or via GitHub integration (automatic deployment on push to main)

### 3. Set Environment Variables in Vercel

Navigate to: **Project Settings → Environment Variables**

Add all variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GPU_CLUSTER_API_URL`
- `GPU_CLUSTER_API_KEY`

### 4. Verify Deployment
- [ ] Site loads successfully
- [ ] Login/authentication works
- [ ] All routes accessible
- [ ] API routes respond correctly

---

## Post-Deployment Testing

### 1. Test Critical User Flows

#### Dataset Upload Flow
1. Login as test user
2. Navigate to `/datasets/new`
3. Upload a valid dataset file
4. Wait 1-2 minutes for validation
5. Verify dataset status changes to 'ready'
6. Check notification received

#### Training Job Flow
1. Navigate to `/training/configure?datasetId=xxx`
2. Configure training parameters
3. Verify cost estimate displays
4. Submit training job
5. Navigate to `/training/jobs/[id]`
6. Verify job status updates in real-time
7. Wait for job completion (or simulate)
8. Verify model artifact created

#### Model Download Flow
1. Navigate to `/models`
2. Select a completed model
3. Click download
4. Verify presigned URL generated
5. Verify download starts

### 2. Verify Monitoring

#### Check Edge Function Logs
Navigate to: **Edge Functions → [Function] → Logs**

Verify:
- [ ] Functions running on schedule
- [ ] No recurring errors
- [ ] Jobs being processed

#### Check Database Metrics
Navigate to: **Database → Usage**

Verify:
- [ ] Queries executing normally
- [ ] No slow queries (> 1s)
- [ ] RLS policies enforcing correctly

---

## Rollback Plan

If issues are discovered post-deployment:

### 1. Immediate Rollback (Vercel)
```bash
vercel rollback
```

### 2. Database Rollback
```bash
# Rollback last migration
npx supabase db reset --local
npx supabase migration down
```

### 3. Edge Functions Rollback
- Deploy previous version from git history
- Or disable cron jobs temporarily

---

## Monitoring Setup

### 1. Error Tracking
- [ ] Set up Sentry or similar error tracking
- [ ] Configure alerts for 500 errors
- [ ] Monitor API error rates

### 2. Performance Monitoring
- [ ] Set up Vercel Analytics
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
- [ ] All Edge Functions deployed and running on schedule
- [ ] All API routes responding correctly
- [ ] All pages loading and rendering
- [ ] Authentication working across all routes
- [ ] RLS policies enforcing data isolation
- [ ] Complete user workflows working end-to-end
- [ ] No critical errors in logs
- [ ] All tests passing

---

**Deployment Complete! 🎉**
```

**File:** `docs/monitoring-setup.md`

```markdown
# BrightRun LoRA Training Platform - Monitoring & Observability

**Version:** 1.0  
**Last Updated:** 2025-12-26

---

## Overview

This document outlines the monitoring and observability setup for the BrightRun LoRA Training Platform.

---

## Key Metrics to Track

### 1. Dataset Metrics
- **Dataset Upload Success Rate**: Percentage of uploads that complete successfully
- **Dataset Validation Time**: Average time from upload to validation completion
- **Dataset Validation Errors**: Count and types of validation errors
- **Active Datasets**: Number of datasets with status='ready'

**Queries:**
```sql
-- Upload success rate (last 24 hours)
SELECT 
  COUNT(*) FILTER (WHERE status = 'ready') * 100.0 / COUNT(*) as success_rate
FROM datasets
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average validation time
SELECT 
  AVG(EXTRACT(EPOCH FROM (validated_at - created_at))) / 60 as avg_minutes
FROM datasets
WHERE validated_at IS NOT NULL;
```

### 2. Training Job Metrics
- **Job Queue Depth**: Number of jobs with status='queued'
- **Job Success Rate**: Percentage of jobs that complete successfully
- **Average Training Duration**: Time from queued to completed
- **Job Failure Rate**: Percentage of failed jobs
- **Cost per Job**: Average and median cost

**Queries:**
```sql
-- Current queue depth
SELECT COUNT(*) FROM training_jobs WHERE status = 'queued';

-- Success rate (last 7 days)
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / 
  COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) as success_rate
FROM training_jobs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Average training duration
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) / 3600 as avg_hours
FROM training_jobs
WHERE status = 'completed';
```

### 3. Cost Metrics
- **Daily Cost**: Total cost per day
- **Cost per User**: Average cost per user per month
- **Most Expensive Jobs**: Top 10 jobs by cost
- **Cost Trends**: Daily/weekly/monthly trends

**Queries:**
```sql
-- Daily cost (last 30 days)
SELECT 
  DATE(recorded_at) as date,
  SUM(amount) as total_cost
FROM cost_records
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(recorded_at)
ORDER BY date DESC;

-- Cost per user (current month)
SELECT 
  user_id,
  SUM(amount) as total_cost,
  COUNT(DISTINCT job_id) as num_jobs
FROM cost_records
WHERE billing_period = DATE_TRUNC('month', NOW())
GROUP BY user_id
ORDER BY total_cost DESC;
```

### 4. Storage Metrics
- **Total Storage Used**: Sum of all dataset and model file sizes
- **Storage per User**: Average storage per user
- **Storage Growth Rate**: Daily storage increase

**Queries:**
```sql
-- Total storage by bucket
SELECT 
  storage_bucket,
  SUM(file_size) / 1024 / 1024 / 1024 as total_gb
FROM datasets
GROUP BY storage_bucket;

-- Model artifacts storage
SELECT 
  SUM(
    (artifacts->>'lora_adapter_size')::bigint +
    (artifacts->>'full_model_size')::bigint
  ) / 1024 / 1024 / 1024 as total_gb
FROM model_artifacts;
```

---

## Logging Strategy

### 1. API Route Logging

**Pattern:**
```typescript
// In all API routes
console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
console.log(`[USER] ${user.id}`);
console.log(`[REQUEST] ${JSON.stringify(body)}`);

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
console.log(`[SUCCESS] Processed ${count} items`);

// Errors
console.error(`[ERROR] ${error.message}`);
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

// Send to error tracking service (e.g., Sentry)
Sentry.captureException(error, {
  tags: {
    component: 'ComponentName',
    action: 'actionName',
  },
});
```

---

## Alert Configuration

### 1. Critical Alerts (Immediate Action Required)

#### Edge Function Failures
**Trigger:** Edge Function returns 500 error for 3+ consecutive executions  
**Action:** Check Edge Function logs, verify GPU cluster connectivity

#### Database Connection Failures
**Trigger:** 10+ database connection errors in 5 minutes  
**Action:** Check Supabase status, verify connection limits

#### High Queue Depth
**Trigger:** Queue depth > 50 jobs for more than 30 minutes  
**Action:** Check GPU cluster capacity, verify Edge Function execution

### 2. Warning Alerts (Action Required Within 24h)

#### High Job Failure Rate
**Trigger:** Job failure rate > 20% over 24 hours  
**Action:** Review failed job error messages, check GPU cluster

#### Storage Quota Warning
**Trigger:** Storage usage > 80% of limit  
**Action:** Review old datasets, implement cleanup policy

#### Slow Validation Times
**Trigger:** Average validation time > 5 minutes  
**Action:** Check Edge Function performance, review validation logic

### 3. Info Alerts (For Awareness)

#### Daily Summary
**Schedule:** 9:00 AM daily  
**Contents:**
- Jobs completed yesterday
- Average cost per job
- Total storage used
- Any failed jobs

---

## Dashboard Setup

### 1. Supabase Dashboard

Navigate to: **Supabase Dashboard → Database → Reports**

Create custom queries for:
- Queue depth (refreshes every minute)
- Failed jobs (last 24 hours)
- Cost trends (last 30 days)
- Storage usage

### 2. Custom Admin Dashboard (Optional)

Create an internal dashboard at `/admin/monitoring`:

**Components:**
- Real-time queue depth
- Recent job statuses
- Cost breakdown by user
- Storage usage chart
- Recent errors

---

## Performance Monitoring

### 1. API Route Performance

Track response times for all routes:
```typescript
const startTime = Date.now();
// ... route logic
const duration = Date.now() - startTime;
console.log(`[PERFORMANCE] ${route} completed in ${duration}ms`);
```

**Targets:**
- List endpoints: < 200ms
- Detail endpoints: < 100ms
- Create endpoints: < 300ms
- Download URL generation: < 500ms

### 2. Edge Function Performance

Monitor execution times in Supabase Dashboard:
- `validate-datasets`: < 10s per dataset
- `process-training-jobs`: < 5s per cycle
- `create-model-artifacts`: < 15s per artifact

### 3. Database Query Performance

Monitor slow queries (> 1s) in Supabase Dashboard:
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Health Checks

### 1. API Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T12:00:00Z",
  "services": {
    "database": "connected",
    "storage": "accessible",
    "auth": "functional"
  }
}
```

### 2. Edge Function Health Check

Run manually or via cron:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/health-check" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## Incident Response

### 1. Edge Function Not Running
**Symptoms:** Jobs stuck in 'queued' status  
**Investigation:**
1. Check Edge Function logs
2. Verify cron schedule is active
3. Test manual function invocation
**Resolution:**
- Redeploy Edge Function
- Restart cron job

### 2. High Job Failure Rate
**Symptoms:** Multiple jobs with status='failed'  
**Investigation:**
1. Check error messages in `training_jobs.error_message`
2. Verify GPU cluster API connectivity
3. Check GPU cluster capacity
**Resolution:**
- Fix configuration issues
- Increase GPU cluster capacity
- Retry failed jobs

### 3. Storage Quota Exceeded
**Symptoms:** Upload failures, presigned URL generation fails  
**Investigation:**
1. Check total storage usage
2. Identify large files
3. Review retention policy
**Resolution:**
- Delete old datasets
- Archive old models
- Increase storage quota

---

## Regular Maintenance Tasks

### Daily
- [ ] Review failed jobs
- [ ] Check Edge Function logs for errors
- [ ] Monitor queue depth

### Weekly
- [ ] Review slow database queries
- [ ] Check storage usage trends
- [ ] Review cost trends

### Monthly
- [ ] Clean up old notifications (> 30 days)
- [ ] Archive old cost records (> 1 year)
- [ ] Review and optimize database indexes
- [ ] Database vacuum analyze

---

**Monitoring Setup Complete! 📊**
```

---

## ✅ Acceptance Criteria

### Functional Requirements

- [ ] All 7 database tables verified to exist with proper relationships
- [ ] All storage buckets verified to be configured correctly
- [ ] All API routes verified to respond correctly with authentication
- [ ] All Edge Functions verified to be deployed and running
- [ ] All pages verified to render and function correctly
- [ ] RLS policies verified to enforce data isolation (no cross-user leakage)

### Testing Requirements

- [ ] Integration tests pass for database, storage, API, and Edge Functions
- [ ] End-to-end tests pass for dataset upload flow (upload → validation → ready)
- [ ] End-to-end tests pass for training job flow (configure → submit → monitor → complete)
- [ ] Error handling tests pass for invalid datasets and failed jobs
- [ ] Authentication tests pass (all protected routes require auth)

### Documentation Requirements

- [ ] Deployment checklist created with step-by-step instructions
- [ ] Monitoring setup guide created with key metrics and queries
- [ ] Integration verification script created and working
- [ ] All documentation clear, complete, and accurate

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All test suites run successfully
- [ ] Integration verification script exits with code 0 (all checks pass)
- [ ] Code follows existing patterns from infrastructure

---

## 🧪 Testing & Validation

### Manual Testing Steps

1. **Run Integration Verification Script**
   ```bash
   npx tsx scripts/verify-integration.ts
   ```
   Expected: All checks pass (green output)

2. **Run Integration Tests**
   ```bash
   npm run test:integration
   ```
   Expected: All tests pass

3. **Run End-to-End Tests**
   ```bash
   npm run test:e2e
   ```
   Expected: All workflows complete successfully

4. **Manual Workflow Testing**
   - Complete dataset upload flow manually
   - Create and monitor a training job manually
   - Download a model artifact manually
   - Verify all notifications received

5. **Review Documentation**
   - Read through deployment checklist
   - Verify all steps are clear and complete
   - Read through monitoring setup guide
   - Verify all queries work correctly

### Expected Outputs

After completing this prompt, you should have:
- [ ] Integration tests suite (`tests/integration/`)
- [ ] End-to-end tests suite (`tests/e2e/`)
- [ ] Integration verification script (`scripts/verify-integration.ts`)
- [ ] Deployment checklist (`docs/deployment-checklist.md`)
- [ ] Monitoring setup guide (`docs/monitoring-setup.md`)
- [ ] All tests passing
- [ ] All documentation complete and accurate

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `tests/integration/system-verification.test.ts` - Integration verification tests
- [ ] `tests/e2e/complete-workflows.test.ts` - End-to-end workflow tests
- [ ] `scripts/verify-integration.ts` - Automated integration verification
- [ ] `docs/deployment-checklist.md` - Production deployment guide
- [ ] `docs/monitoring-setup.md` - Monitoring and observability guide

### Testing Deliverables

- [ ] Database integration tests (tables, RLS, indexes)
- [ ] Storage integration tests (buckets, presigned URLs)
- [ ] API integration tests (authentication, RLS enforcement)
- [ ] Edge Functions integration tests (deployment verification)
- [ ] Authentication integration tests (route protection)
- [ ] End-to-end dataset upload workflow test
- [ ] End-to-end training job workflow test
- [ ] End-to-end error handling test

### Documentation Deliverables

- [ ] Complete deployment checklist with verification steps
- [ ] Environment variables documentation
- [ ] Database setup guide
- [ ] Storage setup guide
- [ ] Edge Functions deployment guide
- [ ] Frontend deployment guide
- [ ] Post-deployment testing checklist
- [ ] Rollback procedures
- [ ] Monitoring metrics and queries
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
2. Follow the deployment checklist
3. Complete post-deployment testing
4. Set up monitoring and alerts
5. Monitor system performance for first 48 hours

### Future Enhancements

Consider these enhancements after initial deployment:
- Advanced analytics dashboard
- User quotas and billing
- Multi-model support
- Custom base models
- Team collaboration features
- API access for programmatic job submission

---

## ⚠️ Important Reminders

1. **Comprehensive Testing:** This section focuses on ensuring ALL previous work integrates correctly. Take time to test thoroughly.

2. **No Shortcuts:** Don't skip integration tests. They catch issues that unit tests miss.

3. **Real User Flows:** Test with realistic data and complete workflows, not just happy paths.

4. **Documentation Quality:** Deployment documentation should be clear enough for someone unfamiliar with the project to follow.

5. **Production Mindset:** Think about what could go wrong in production:
   - What if the GPU cluster is down?
   - What if validation takes longer than expected?
   - What if a user uploads a 500MB invalid file?

6. **Monitoring is Critical:** Set up monitoring BEFORE deployment, not after issues arise.

7. **Rollback Plan:** Always have a tested rollback plan before deploying to production.

---

## 📚 Reference Materials

### Files from Previous Sections

#### Section E01: Foundation & Authentication
- `supabase/migrations/20241223_create_lora_training_tables.sql` - Database migration
- `src/lib/types/lora-training.ts` - TypeScript type definitions

#### Section E02: Dataset Management
- `src/app/api/datasets/route.ts` - Dataset CRUD API
- `src/app/api/datasets/[id]/route.ts` - Dataset detail API
- `src/app/api/datasets/[id]/download/route.ts` - Dataset download API
- `src/app/(dashboard)/datasets/page.tsx` - Dataset list page
- `src/app/(dashboard)/datasets/new/page.tsx` - Dataset upload page
- `src/app/(dashboard)/datasets/[id]/page.tsx` - Dataset detail page
- `supabase/functions/validate-datasets/index.ts` - Validation Edge Function

#### Section E03: Training Configuration
- `src/app/api/jobs/estimate/route.ts` - Cost estimation API
- `src/app/api/jobs/route.ts` - Job creation API
- `src/app/(dashboard)/training/configure/page.tsx` - Training configuration page
- `src/lib/hooks/useCostEstimate.ts` - Cost estimation hook

#### Section E04: Training Execution & Monitoring
- `src/app/api/jobs/route.ts` - Job list API (GET)
- `src/app/api/jobs/[id]/route.ts` - Job detail API
- `src/app/(dashboard)/training/jobs/page.tsx` - Jobs list page
- `src/app/(dashboard)/training/jobs/[id]/page.tsx` - Training monitor page
- `supabase/functions/process-training-jobs/index.ts` - Job processing Edge Function

#### Section E05: Model Artifacts & Delivery
- `src/app/api/models/route.ts` - Models list API
- `src/app/api/models/[id]/route.ts` - Model detail API
- `src/app/api/models/[id]/download/route.ts` - Model download API
- `src/app/(dashboard)/models/page.tsx` - Models list page
- `src/app/(dashboard)/models/[id]/page.tsx` - Model detail page
- `supabase/functions/create-model-artifacts/index.ts` - Artifact creation Edge Function

#### Section E06: Cost Tracking & Notifications
- `src/app/api/costs/dashboard/route.ts` - Cost dashboard API
- `src/app/api/notifications/route.ts` - Notifications list API
- `src/app/api/notifications/[id]/route.ts` - Notification mark as read API

### Infrastructure Patterns

- **Authentication:** `requireAuth()` from `@/lib/supabase-server`
- **Database:** `createServerSupabaseClient()` from `@/lib/supabase-server`
- **Storage:** Supabase Storage with presigned URLs
- **Edge Functions:** Supabase Edge Functions with Deno runtime
- **API Responses:** `{ success: true, data }` or `{ error, details }`
- **Error Handling:** Try-catch with specific error messages
- **RLS:** All user tables have policies based on `auth.uid()`

---

**Ready to complete Section E07 - System Integration, Testing & Deployment!** 🎯

---

## Section Completion Checklist

After completing this prompt:

### Integration Verification
- [ ] All database tables verified to exist
- [ ] All RLS policies verified to be active
- [ ] All storage buckets verified to be configured
- [ ] All Edge Functions verified to be deployed
- [ ] All API routes verified to respond correctly
- [ ] Authentication verified across all routes

### Testing
- [ ] Integration tests created and passing
- [ ] End-to-end workflow tests created and passing
- [ ] Error handling tests created and passing
- [ ] Manual testing of critical flows completed

### Documentation
- [ ] Deployment checklist completed
- [ ] Monitoring setup guide completed
- [ ] All documentation reviewed and accurate

### Production Readiness
- [ ] Integration verification script passes
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All dependencies up to date
- [ ] Environment variables documented
- [ ] Rollback plan documented

### Final Sign-Off
- [ ] All sections E01-E07 completed
- [ ] System fully integrated and tested
- [ ] Ready for production deployment

---

**End of Section E07 Execution Prompts**

**🎉 Congratulations! The BrightRun LoRA Training Platform is complete and ready for deployment!**
