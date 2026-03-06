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

Run in Supabase SQL Editor or using SAOL:

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

