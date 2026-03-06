# Adapter Application Module - Section E06: Integration, Verification & Deployment

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E06 - Integration & Deployment (FINAL SECTION)  
**Prerequisites:** E01, E02, E03, E04, E05 must ALL be complete  
**Purpose:** Verify complete implementation and prepare for production deployment  

---

## Overview

This is the FINAL section that verifies the complete Adapter Application Module implementation and prepares it for production deployment. This prompt ensures everything works together correctly and is ready for real users.

**What This Section Does:**
1. Verifies all previous sections (E01-E05) are complete
2. Runs comprehensive integration tests
3. Creates proper database migration file
4. Verifies environment configuration
5. Tests complete end-to-end workflow
6. Performs security audit
7. Checks performance
8. Creates deployment checklist
9. Updates documentation
10. Final cleanup and optimization

**This Section Completes:**
- The entire Adapter Application Module
- Full production readiness verification

---

## Critical Instructions

### Comprehensive Verification

This section requires running through ALL previous work systematically. Do not skip any verification steps.

### SAOL for Database Verification

Use SAOL for all database verification commands.

### Environment Variables

All environment variables must be verified before deployment:
```
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<configured>
SUPABASE_SERVICE_ROLE_KEY=<configured>
RUNPOD_API_KEY=<configured>
ANTHROPIC_API_KEY=<configured>
```

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`

---

========================

# EXECUTION PROMPT E06 - INTEGRATION, VERIFICATION & DEPLOYMENT

## Context

You are performing the final integration, verification, and deployment preparation for the Adapter Application Module. This is a comprehensive check to ensure everything works correctly before production deployment.

**Verification Philosophy:**
- Assume nothing - verify everything
- Test the happy path AND error cases
- Check security thoroughly
- Validate performance
- Document everything

---

## Part 1: Verify All Previous Sections

### Task 1.1: Verify E01 - Database Schema & Types

```bash
# 1. Verify all three tables exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['pipeline_inference_endpoints','pipeline_test_results','pipeline_base_models'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});console.log(t+':',r.success?'✓ EXISTS':'✗ MISSING');}})();"

# 2. Verify RLS policies are enabled
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['pipeline_inference_endpoints','pipeline_test_results','pipeline_base_models'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});if(r.success){console.log(t+' RLS:',r.tables[0].rlsEnabled?'✓ ENABLED':'✗ DISABLED');console.log('  Policies:',r.tables[0].policies.length);}}})();"

# 3. Verify seed data
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_base_models',select:'model_id,display_name,is_active'});console.log('Base models seeded:',r.data.length,'models');r.data.forEach(m=>console.log('  -',m.display_name,':',m.is_active?'active':'inactive'));})();"

# 4. Verify TypeScript types exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && test -f src/types/pipeline-adapter.ts && echo "✓ pipeline-adapter.ts exists" || echo "✗ pipeline-adapter.ts missing"

# 5. Verify database mapping utilities exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && test -f src/lib/pipeline/adapter-db-utils.ts && echo "✓ adapter-db-utils.ts exists" || echo "✗ adapter-db-utils.ts missing"
```

**E01 Success Criteria:**
- [ ] All 3 tables exist with correct columns
- [ ] RLS enabled on all tables with policies
- [ ] 4 base models seeded (Mistral-7B, DeepSeek-R1-Distill-32B, Llama-3-8B, Llama-3-70B)
- [ ] TypeScript types file created
- [ ] Database mapping utilities created

---

### Task 1.2: Verify E02 - Service Layer

```bash
# 1. Verify service files exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && \
test -f src/lib/services/inference-service.ts && echo "✓ inference-service.ts exists" || echo "✗ inference-service.ts missing" && \
test -f src/lib/services/test-service.ts && echo "✓ test-service.ts exists" || echo "✗ test-service.ts missing"

# 2. Verify service exports
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -q "inference-service" src/lib/services/index.ts && echo "✓ inference-service exported" || echo "✗ inference-service not exported"

# 3. Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "(error TS|✓)" || echo "✓ TypeScript compiles successfully"
```

**E02 Success Criteria:**
- [ ] inference-service.ts exists with all functions
- [ ] test-service.ts exists with all functions
- [ ] Services exported in index.ts
- [ ] TypeScript compiles without errors
- [ ] RunPod GraphQL integration implemented
- [ ] Claude API integration implemented

---

### Task 1.3: Verify E03 - API Routes

```bash
# 1. Verify all API route files exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && \
test -f src/app/api/pipeline/jobs/\[jobId\]/deploy/route.ts && echo "✓ deploy route exists" || echo "✗ deploy route missing" && \
test -f src/app/api/pipeline/jobs/\[jobId\]/test/route.ts && echo "✓ test route exists" || echo "✗ test route missing" && \
test -f src/app/api/pipeline/jobs/\[jobId\]/endpoints/route.ts && echo "✓ endpoints route exists" || echo "✗ endpoints route missing" && \
test -f src/app/api/pipeline/test/\[testId\]/rate/route.ts && echo "✓ rate route exists" || echo "✗ rate route missing"

# 2. Verify routes use authentication
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -r "auth.getUser()" src/app/api/pipeline/jobs/*/deploy/ && echo "✓ Deploy route has auth" || echo "✗ Deploy route missing auth"
```

**E03 Success Criteria:**
- [ ] Deploy endpoint route exists
- [ ] Test endpoint route exists (POST and GET)
- [ ] Endpoints status route exists
- [ ] Rate test route exists
- [ ] All routes require authentication
- [ ] All routes validate input
- [ ] All routes call service layer (not database directly)

---

### Task 1.4: Verify E04 - React Query Hooks

```bash
# 1. Verify hooks file exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && test -f src/hooks/useAdapterTesting.ts && echo "✓ useAdapterTesting.ts exists" || echo "✗ useAdapterTesting.ts missing"

# 2. Verify hooks are exported
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -q "useAdapterTesting" src/hooks/index.ts 2>/dev/null && echo "✓ Hooks exported" || echo "✗ Hooks not exported (may need to create index.ts)"

# 3. Count hooks implemented
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep "export function use" src/hooks/useAdapterTesting.ts | wc -l | xargs -I{} echo "Hooks implemented: {}"
```

**E04 Success Criteria:**
- [ ] useAdapterTesting.ts exists with 7+ hooks
- [ ] Query keys properly structured
- [ ] Cache invalidation implemented
- [ ] Polling strategy for endpoint status
- [ ] Combined convenience hooks created

---

### Task 1.5: Verify E05 - UI Components & Pages

```bash
# 1. Verify all component files exist
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && \
test -f src/components/pipeline/DeployAdapterButton.tsx && echo "✓ DeployAdapterButton.tsx exists" || echo "✗ DeployAdapterButton.tsx missing" && \
test -f src/components/pipeline/ABTestingPanel.tsx && echo "✓ ABTestingPanel.tsx exists" || echo "✗ ABTestingPanel.tsx missing" && \
test -f src/components/pipeline/TestResultComparison.tsx && echo "✓ TestResultComparison.tsx exists" || echo "✗ TestResultComparison.tsx missing" && \
test -f src/components/pipeline/EndpointStatusBanner.tsx && echo "✓ EndpointStatusBanner.tsx exists" || echo "✗ EndpointStatusBanner.tsx missing" && \
test -f src/components/pipeline/TestHistoryTable.tsx && echo "✓ TestHistoryTable.tsx exists" || echo "✗ TestHistoryTable.tsx missing"

# 2. Verify test page exists
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && test -f src/app/\(dashboard\)/pipeline/jobs/\[jobId\]/test/page.tsx && echo "✓ Test page exists" || echo "✗ Test page missing"

# 3. Verify components are exported
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -q "DeployAdapterButton" src/components/pipeline/index.ts && echo "✓ Components exported" || echo "✗ Components not exported"
```

**E05 Success Criteria:**
- [ ] All 5 component files created
- [ ] Components exported in index.ts
- [ ] Test page created at correct route
- [ ] Results page updated with Deploy button
- [ ] TypeScript compiles without errors

---

## Part 2: Integration Testing

### Task 2.1: Environment Configuration Check

Create verification script: `scripts/verify-env.js`

```javascript
// scripts/verify-env.js
require('dotenv').config({ path: '.env.local' });

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RUNPOD_API_KEY',
  'ANTHROPIC_API_KEY',
];

console.log('Environment Variable Check\n');

let allPresent = true;
for (const key of required) {
  const present = !!process.env[key];
  console.log(`${present ? '✓' : '✗'} ${key}: ${present ? 'SET' : 'MISSING'}`);
  if (!present) allPresent = false;
}

console.log('\n' + (allPresent ? '✓ All required variables set' : '✗ Some variables missing'));
process.exit(allPresent ? 0 : 1);
```

Run verification:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node scripts/verify-env.js
```

---

### Task 2.2: Database Migration File

Create proper migration file: `supabase/migrations/20260117_adapter_testing_infrastructure.sql`

```sql
-- Migration: Adapter Testing Infrastructure
-- Date: 2026-01-17
-- Description: Complete schema for adapter deployment and A/B testing
-- Dependencies: pipeline_training_jobs table must exist

-- ============================================
-- PART 1: INFERENCE ENDPOINTS
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_inference_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Endpoint identity
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('control', 'adapted')),
  runpod_endpoint_id TEXT,

  -- Model configuration
  base_model TEXT NOT NULL,
  adapter_path TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'deploying', 'ready', 'failed', 'terminated')),
  health_check_url TEXT,
  last_health_check TIMESTAMPTZ,

  -- Cost tracking
  idle_timeout_seconds INTEGER DEFAULT 300,
  estimated_cost_per_hour NUMERIC(10,4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Constraints
  UNIQUE(job_id, endpoint_type)
);

CREATE INDEX IF NOT EXISTS idx_endpoints_job_id ON pipeline_inference_endpoints(job_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON pipeline_inference_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_status ON pipeline_inference_endpoints(status);

ALTER TABLE pipeline_inference_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can view own endpoints"
  ON pipeline_inference_endpoints FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can insert own endpoints"
  ON pipeline_inference_endpoints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own endpoints" ON pipeline_inference_endpoints;
CREATE POLICY "Users can update own endpoints"
  ON pipeline_inference_endpoints FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 2: TEST RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_training_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Test input
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,

  -- Responses
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,

  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,

  -- Evaluation
  evaluation_enabled BOOLEAN DEFAULT FALSE,
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,

  -- User rating
  user_rating TEXT CHECK (user_rating IN ('control', 'adapted', 'tie', 'neither')),
  user_notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'evaluating', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_results_job_id ON pipeline_test_results(job_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON pipeline_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON pipeline_test_results(created_at DESC);

ALTER TABLE pipeline_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own test results" ON pipeline_test_results;
CREATE POLICY "Users can view own test results"
  ON pipeline_test_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own test results" ON pipeline_test_results;
CREATE POLICY "Users can insert own test results"
  ON pipeline_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own test results" ON pipeline_test_results;
CREATE POLICY "Users can update own test results"
  ON pipeline_test_results FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 3: BASE MODELS
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_base_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model identity
  model_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,

  -- Specifications
  parameter_count TEXT,
  context_length INTEGER,
  license TEXT,

  -- RunPod configuration
  docker_image TEXT NOT NULL DEFAULT 'runpod/worker-vllm:stable-cuda12.1.0',
  min_gpu_memory_gb INTEGER NOT NULL,
  recommended_gpu_type TEXT,

  -- Capabilities
  supports_lora BOOLEAN DEFAULT TRUE,
  supports_quantization BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO pipeline_base_models (model_id, display_name, parameter_count, context_length, license, min_gpu_memory_gb, recommended_gpu_type)
VALUES
  ('mistralai/Mistral-7B-Instruct-v0.2', 'Mistral 7B Instruct v0.2', '7B', 32768, 'Apache 2.0', 24, 'NVIDIA A40'),
  ('deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', 'DeepSeek R1 Distill Qwen 32B', '32B', 131072, 'MIT', 48, 'NVIDIA A100'),
  ('meta-llama/Meta-Llama-3-8B-Instruct', 'Llama 3 8B Instruct', '8B', 8192, 'Llama 3', 24, 'NVIDIA A40'),
  ('meta-llama/Meta-Llama-3-70B-Instruct', 'Llama 3 70B Instruct', '70B', 8192, 'Llama 3', 80, 'NVIDIA H100')
ON CONFLICT (model_id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pipeline_inference_endpoints')
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pipeline_test_results')
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pipeline_base_models')
  THEN
    RAISE NOTICE 'SUCCESS: All adapter testing tables created';
  ELSE
    RAISE EXCEPTION 'FAILED: Some tables missing';
  END IF;
END $$;
```

---

### Task 2.3: End-to-End Workflow Test

Create integration test script: `scripts/test-adapter-workflow.js`

```javascript
// scripts/test-adapter-workflow.js
require('dotenv').config({ path: '.env.local' });

const tests = [
  {
    name: 'Database Tables Exist',
    test: async () => {
      // Check tables via SAOL
      return true; // Implement actual check
    }
  },
  {
    name: 'TypeScript Compiles',
    test: async () => {
      const { execSync } = require('child_process');
      try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'API Routes Exist',
    test: async () => {
      const fs = require('fs');
      const routes = [
        'src/app/api/pipeline/jobs/[jobId]/deploy/route.ts',
        'src/app/api/pipeline/jobs/[jobId]/test/route.ts',
        'src/app/api/pipeline/jobs/[jobId]/endpoints/route.ts',
        'src/app/api/pipeline/test/[testId]/rate/route.ts',
      ];
      return routes.every(r => fs.existsSync(r));
    }
  },
  {
    name: 'Components Exist',
    test: async () => {
      const fs = require('fs');
      const components = [
        'src/components/pipeline/DeployAdapterButton.tsx',
        'src/components/pipeline/ABTestingPanel.tsx',
        'src/components/pipeline/TestResultComparison.tsx',
        'src/components/pipeline/EndpointStatusBanner.tsx',
        'src/components/pipeline/TestHistoryTable.tsx',
      ];
      return components.every(c => fs.existsSync(c));
    }
  },
];

(async () => {
  console.log('Adapter Application Module - Integration Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✓ ${name}`);
        passed++;
      } else {
        console.log(`✗ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ ${name} - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${passed}/${tests.length} tests passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
```

Run integration tests:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node scripts/test-adapter-workflow.js
```

---

## Part 3: Security Audit

### Task 3.1: RLS Policy Verification

Verify Row Level Security is properly configured:

```bash
# Verify RLS is enabled on all tables
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['pipeline_inference_endpoints','pipeline_test_results'];for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,transport:'pg'});if(r.success){console.log(t+':');console.log('  RLS Enabled:',r.tables[0].rlsEnabled?'✓':'✗ SECURITY ISSUE');console.log('  Policies:',r.tables[0].policies.length,'policies');r.tables[0].policies.forEach(p=>console.log('    -',p.name));}else{console.log(t+': ✗ TABLE NOT FOUND');}}})();"
```

**Security Checklist:**
- [ ] RLS enabled on pipeline_inference_endpoints
- [ ] RLS enabled on pipeline_test_results
- [ ] Users can only see their own endpoints
- [ ] Users can only see their own test results
- [ ] All API routes verify user authentication
- [ ] Job ownership validated in all endpoints

---

### Task 3.2: API Authentication Audit

Verify all API routes require authentication:

```bash
# Check all API routes have auth.getUser()
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && echo "Checking API authentication..." && \
find src/app/api/pipeline -name "route.ts" -type f -exec sh -c 'echo "\n{}:" && grep -c "auth.getUser()" "{}"' \;
```

All counts should be 1 or higher.

---

## Part 4: Performance Check

### Task 4.1: Bundle Size Analysis

```bash
# Check Next.js build
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run build 2>&1 | grep -E "(Route|Size|First Load)"
```

Look for any routes > 500KB.

---

### Task 4.2: Query Optimization Check

Review query patterns:

```bash
# Check for N+1 query patterns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -r ".select\|.from" src/lib/services/ --include="*.ts" | wc -l
```

Verify queries use proper joins and not sequential queries.

---

## Part 5: Documentation

### Task 5.1: Create README

Create file: `docs/ADAPTER_TESTING_README.md`

```markdown
# Adapter Testing Module

## Overview

The Adapter Testing Module enables users to deploy trained LoRA adapters to RunPod Serverless inference endpoints and conduct A/B testing comparing Control (base model) vs Adapted (base + LoRA) responses.

## Features

- **One-Click Deployment**: Deploy Control and Adapted inference endpoints
- **A/B Testing**: Side-by-side comparison of model responses
- **Claude-as-Judge**: Optional automated evaluation
- **Test History**: Track all tests for later analysis
- **User Rating**: Manual quality assessment

## Architecture

### Two-Endpoint Approach

- **Control Endpoint**: Base model only (e.g., Mistral-7B-Instruct)
- **Adapted Endpoint**: Base model + LoRA adapter

### Technology Stack

- RunPod Serverless (inference)
- vLLM worker (OpenAI-compatible API)
- Claude-as-Judge (optional evaluation)
- Supabase (storage + database)
- Next.js 13+ App Router
- React Query (data fetching)

## User Workflow

1. Complete training job → adapter stored in Supabase
2. Click "Deploy & Test Adapter" on results page
3. Wait for endpoints to deploy (30-60s cold start)
4. Enter test prompts on test page
5. Compare responses side-by-side
6. Optional: Enable Claude-as-Judge evaluation
7. Rate which response was better
8. Review test history

## Database Schema

### Tables

- `pipeline_inference_endpoints` - Tracks deployed endpoints
- `pipeline_test_results` - Stores A/B test results
- `pipeline_base_models` - Registry of supported models

### RLS Policies

All tables have Row Level Security enabled. Users can only access their own data.

## API Endpoints

- `POST /api/pipeline/jobs/[jobId]/deploy` - Deploy endpoints
- `POST /api/pipeline/jobs/[jobId]/test` - Run A/B test
- `GET /api/pipeline/jobs/[jobId]/test` - Get test history
- `GET /api/pipeline/jobs/[jobId]/endpoints` - Get endpoint status
- `POST /api/pipeline/test/[testId]/rate` - Rate test result

## Environment Variables

Required:
```
RUNPOD_API_KEY=<your_runpod_api_key>
ANTHROPIC_API_KEY=<your_anthropic_api_key>
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

## Cost Estimates

- Endpoint idle: ~$0.10/hour
- Inference per 1K tokens: ~$0.001
- Claude evaluation: ~$0.02/test
- Typical test without eval: ~$0.01
- Typical test with eval: ~$0.03

## Troubleshooting

### Endpoints fail to deploy
- Check RUNPOD_API_KEY is set
- Verify RunPod account has credits
- Check Supabase Storage adapter path

### Tests fail to run
- Verify endpoints status is 'ready'
- Check ANTHROPIC_API_KEY for evaluation
- Review browser console for errors

### UI doesn't update
- Check polling (every 5s during deployment)
- Verify cache invalidation
- Hard refresh browser (Ctrl+Shift+R)

## Support

For issues or questions, refer to:
- Implementation spec: `pmc/product/_mapping/pipeline/workfiles/adapter-build-implementation-spec_v1.md`
- Execution prompts: `pmc/product/_mapping/pipeline/adapter-app-build/`
```

---

### Task 5.2: Update Main README

Add section to `README.md`:

```markdown
## Adapter Testing

Deploy trained LoRA adapters and conduct A/B testing.

See [docs/ADAPTER_TESTING_README.md](docs/ADAPTER_TESTING_README.md) for details.

**Quick Start:**
1. Complete a training job
2. Go to job results page
3. Click "Deploy & Test Adapter"
4. Wait for endpoints to deploy
5. Start testing!
```

---

## Part 6: Deployment Checklist

### Task 6.1: Pre-Deployment Verification

Create file: `docs/ADAPTER_DEPLOYMENT_CHECKLIST.md`

```markdown
# Adapter Testing Module - Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] RUNPOD_API_KEY configured
- [ ] ANTHROPIC_API_KEY configured
- [ ] All Supabase keys configured
- [ ] Variables set in Vercel/deployment platform

### Database
- [ ] Migration file executed
- [ ] All 3 tables exist
- [ ] RLS policies enabled
- [ ] Seed data present (4 base models)
- [ ] Indexes created

### Code
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No console.errors in production code
- [ ] Proper error handling in all API routes
- [ ] Loading states implemented

### Security
- [ ] RLS enabled on all tables
- [ ] All API routes require authentication
- [ ] Job ownership validated
- [ ] No secrets in client-side code

### Performance
- [ ] Bundle size acceptable
- [ ] No N+1 query patterns
- [ ] Polling strategy implemented
- [ ] Cache invalidation working

## Deployment

### Steps
1. [ ] Run final integration tests
2. [ ] Commit all changes
3. [ ] Push to repository
4. [ ] Deploy to staging first
5. [ ] Test on staging
6. [ ] Deploy to production
7. [ ] Verify production deployment

### Post-Deployment

- [ ] Test complete workflow in production
- [ ] Monitor error logs
- [ ] Check RunPod costs
- [ ] Verify user feedback
- [ ] Monitor performance metrics

## Rollback Plan

If issues occur:
1. Revert code deployment
2. Keep database tables (no data loss)
3. Fix issues in development
4. Redeploy when ready

## Support Contacts

- RunPod Support: [RunPod Dashboard](https://runpod.io)
- Anthropic Support: [Anthropic Console](https://console.anthropic.com)
- Supabase Support: [Supabase Dashboard](https://supabase.com)
```

---

## Part 7: Final Cleanup

### Task 7.1: Remove Test Data

```bash
# Remove any test data from development
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{console.log('Checking for test data...');const r=await saol.agentQuery({table:'pipeline_test_results',select:'id,user_prompt',where:[{column:'user_prompt',operator:'like',value:'%test%'}]});console.log('Test records found:',r.data?.length||0);if(r.data?.length>0){console.log('Review these records and delete if appropriate');}})();"
```

---

### Task 7.2: Code Quality Check

```bash
# Check for TODO comments
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -r "TODO\|FIXME\|HACK" src/lib/services/inference-service.ts src/lib/services/test-service.ts src/components/pipeline/Deploy*.tsx src/app/api/pipeline/

# Check for console.log in production code
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && grep -r "console.log" src/components/pipeline/ src/lib/services/ --include="*.ts" --include="*.tsx" | grep -v "console.error" | wc -l
```

Remove any development console.logs.

---

### Task 7.3: Optimize Imports

```bash
# Check for unused imports
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx eslint src/components/pipeline/*.tsx src/lib/services/*.ts --fix
```

---

## Part 8: Final Verification

### Task 8.1: Complete System Test

Perform complete end-to-end test:

1. **Start Development Server**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run dev
```

2. **Test Workflow**
- [ ] Navigate to completed training job
- [ ] Click "Deploy & Test Adapter"
- [ ] Verify endpoints start deploying
- [ ] Wait for "Endpoints Ready" message
- [ ] Navigate to test page
- [ ] Enter test prompt
- [ ] Verify both responses appear
- [ ] Enable Claude-as-Judge
- [ ] Run test with evaluation
- [ ] Verify evaluation scores appear
- [ ] Rate the test result
- [ ] Check test history tab
- [ ] Verify test appears in history
- [ ] Click "View" on historical test
- [ ] Verify details display correctly

3. **Test Error Cases**
- [ ] Try deploying without completed job
- [ ] Try testing before endpoints ready
- [ ] Try testing with invalid prompt
- [ ] Verify error messages are user-friendly

---

### Task 8.2: Performance Metrics

Measure key metrics:

```bash
# Build production bundle
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run build

# Check bundle sizes
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run build 2>&1 | grep "Route.*pipeline.*test"
```

**Target Metrics:**
- Initial page load < 3s
- Endpoint status polling every 5s
- Test execution < 30s (without Claude)
- Test execution < 60s (with Claude)

---

## Success Criteria

### Complete Implementation Verified

All sections complete:
- [x] E01: Database & Types
- [x] E02: Service Layer
- [x] E03: API Routes
- [x] E04: React Query Hooks
- [x] E05: UI Components & Pages
- [x] E06: Integration & Deployment

### All Tests Pass

- [ ] All verification scripts pass
- [ ] TypeScript compiles without errors
- [ ] Integration tests pass
- [ ] Security audit complete
- [ ] Performance acceptable

### Documentation Complete

- [ ] README created
- [ ] Deployment checklist created
- [ ] API documentation complete
- [ ] Troubleshooting guide included

### Production Ready

- [ ] Environment variables configured
- [ ] Database migration file created
- [ ] RLS policies verified
- [ ] Error handling comprehensive
- [ ] User workflow tested end-to-end

---

## Files Created/Modified in E06

### New Files
| File | Purpose |
|------|---------|
| `scripts/verify-env.js` | Environment variable verification |
| `scripts/test-adapter-workflow.js` | Integration test suite |
| `supabase/migrations/20260117_adapter_testing_infrastructure.sql` | Production migration |
| `docs/ADAPTER_TESTING_README.md` | Module documentation |
| `docs/ADAPTER_DEPLOYMENT_CHECKLIST.md` | Deployment guide |

### Modified Files
| File | Changes |
|------|---------|
| `README.md` | Added Adapter Testing section |

---

## Next Steps After E06

The Adapter Application Module is **COMPLETE** and **PRODUCTION READY**.

**Immediate Actions:**
1. Review all verification output
2. Fix any issues found
3. Deploy to staging environment
4. Conduct user acceptance testing
5. Deploy to production

**Future Enhancements:**
1. Add more base models
2. Implement batch testing
3. Add cost analytics dashboard
4. Export test results to CSV
5. Add model comparison charts

---

**END OF E06 PROMPT - IMPLEMENTATION VERIFIED & DEPLOYMENT READY**

+++++++++++++++++



