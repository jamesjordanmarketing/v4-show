# Section E02: Dataset Management - Deployment Instructions for Vercel

**Date:** December 26, 2025  
**Target:** Vercel Production Deployment  
**Status:** Ready to Deploy

---

## 🎯 Overview

This guide provides **step-by-step instructions** to deploy Section E02 (Dataset Management) to Vercel production. The implementation is complete and ready for deployment.

**What's Been Done:**
- ✅ All code files created (API routes, hooks, components, pages)
- ✅ Edge Function implemented
- ✅ No linter errors
- ✅ Database schema verified

**What You Need to Do:**
1. Commit and push code to Github (triggers Vercel auto-build)
2. Deploy Edge Function to Supabase
3. Configure Cron job in Supabase
4. Verify storage bucket
5. Test the deployment

---

## 📋 Pre-Deployment Checklist

Before starting, verify these are complete:

- [ ] Section E01 deployed (database tables exist)
- [ ] Supabase project is live (not local)
- [ ] Vercel project connected to Github repo
- [ ] Environment variables set in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Step-by-Step Deployment

### Step 1: Commit and Push Code to Github

This will trigger Vercel to automatically build and deploy.

```bash
# Navigate to project root
cd c:/Users/james/Master/BrightHub/BRun/v4-show

# Check what files were created
git status

# Add all new E02 files
git add src/app/api/datasets/
git add src/hooks/use-datasets.ts
git add src/components/datasets/
git add src/app/\(dashboard\)/datasets/
git add supabase/functions/validate-datasets/
git add scripts/deploy-edge-functions.*
git add scripts/test-data/
git add E02_IMPLEMENTATION_SUMMARY.md
git add E02_TESTING_GUIDE.md

# Commit with clear message
git commit -m "feat: Implement Section E02 - Dataset Management

- Add dataset upload API with presigned URLs
- Add dataset validation Edge Function
- Add React Query hooks for datasets
- Add DatasetCard component
- Add datasets listing page with search/filters
- Add deployment scripts and test data
- Add comprehensive documentation

Closes E02 implementation"

# Push to Github (triggers Vercel deployment)
git push origin main
```

**Expected Result:**
- Vercel starts building automatically
- You'll receive a deployment notification (if configured)
- Build should complete in 2-3 minutes

**Verify Vercel Build:**
1. Go to: https://vercel.com/your-username/your-project
2. Check "Deployments" tab
3. Latest deployment should show "Building..." then "Ready"
4. Click on deployment to see build logs

---

### Step 2: Deploy Edge Function to Supabase

Edge Functions are **separate** from Vercel and must be deployed directly to Supabase.

#### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
supabase functions deploy validate-datasets

# Expected output:
# Deploying function validate-datasets...
# ✓ Function validate-datasets deployed successfully
```

#### Option B: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name: `validate-datasets`
5. Copy/paste content from: `supabase/functions/validate-datasets/index.ts`
6. Click **Deploy**

**Verify Deployment:**
```bash
# List all deployed functions
supabase functions list

# Expected output should include:
# validate-datasets

# Test the function manually
supabase functions invoke validate-datasets --no-verify-jwt

# Expected output:
# {"message":"No datasets to validate"}
# (This is correct if no datasets are pending validation)
```

---

### Step 3: Configure Cron Job in Supabase

The Edge Function needs to run automatically every minute to process datasets.

#### Option A: Using Supabase Dashboard (Easier)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to **Database** → **Cron Jobs** (in left sidebar)
3. Click **Create a new Cron Job**
4. Configure:
   - **Job name:** `validate-datasets-cron`
   - **Schedule:** `* * * * *` (every 1 minute)
   - **Command:** Select "Call Edge Function"
   - **Function:** `validate-datasets`
   - **Enable immediately:** ✅ Check this box
5. Click **Create Cron Job**

#### Option B: Using SQL Editor

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to **SQL Editor**
3. Click **New query**
4. Paste this SQL:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Get your project URL
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Example: https://abcdefghijklmnop.supabase.co

-- Schedule the validation function to run every minute
SELECT cron.schedule(
  'validate-datasets-cron',  -- Job name
  '* * * * *',                -- Every 1 minute
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/validate-datasets',
    headers := jsonb_build_object(
      'Authorization', 
      'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

5. **IMPORTANT:** Replace `YOUR_PROJECT_REF` with your actual project reference
6. Click **Run** (or press Ctrl+Enter)

**Verify Cron Job:**

```sql
-- Check if cron job exists
SELECT * FROM cron.job WHERE jobname = 'validate-datasets-cron';

-- Expected result: 1 row with schedule '* * * * *'
```

**Check Cron Job Logs (after waiting 2-3 minutes):**

```sql
-- View recent cron job runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'validate-datasets-cron')
ORDER BY start_time DESC 
LIMIT 10;
```

---

### Step 4: Verify Storage Bucket

The `lora-datasets` bucket should already exist from Section E01, but let's verify.

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to **Storage** (in left sidebar)
3. Look for bucket: `lora-datasets`

**If bucket exists:** ✅ Skip to Step 5

**If bucket doesn't exist:** Create it now:

1. Click **Create a new bucket**
2. Configure:
   - **Name:** `lora-datasets`
   - **Public:** ❌ Leave unchecked (private bucket)
   - **File size limit:** `524288000` (500MB in bytes)
   - **Allowed MIME types:** Leave empty (allows all)
3. Click **Create bucket**
4. Click on the bucket name
5. Go to **Policies** tab
6. Add RLS policy:

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lora-datasets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

### Step 5: Test the Deployment

Now verify everything works in production.

#### Test 1: Verify Vercel Build

1. Go to your Vercel deployment URL: `https://your-app.vercel.app`
2. Login to your app
3. Navigate to: `/datasets`
4. **Expected:** Page loads without errors (may show empty state if no datasets)

#### Test 2: Test Dataset Upload Flow

**Method 1: Using UI (Recommended for first test)**

1. Navigate to: `https://your-app.vercel.app/datasets`
2. Click "Upload Dataset" button
3. Fill in the form:
   - **Name:** Test Production Dataset
   - **Description:** Testing E02 deployment
   - **File:** Upload `scripts/test-data/sample-dataset.jsonl`
4. Click "Upload"
5. **Expected:** Dataset appears with status "uploading" → "validating" → "ready" (takes ~1 minute)

**Method 2: Using API (Curl)**

```bash
# Step 1: Get auth token from browser
# Open DevTools → Application → Cookies → Copy the auth cookie value

# Step 2: Create dataset
curl -X POST https://your-app.vercel.app/api/datasets \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "name": "Test Production Dataset",
    "description": "Testing E02 deployment",
    "file_name": "sample-dataset.jsonl",
    "file_size": 2048
  }'

# Step 3: Copy the uploadUrl from response

# Step 4: Upload file
curl -X PUT "PASTE_UPLOAD_URL_HERE" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@scripts/test-data/sample-dataset.jsonl"

# Step 5: Copy dataset ID from Step 2 response

# Step 6: Confirm upload
curl -X POST https://your-app.vercel.app/api/datasets/DATASET_ID/confirm \
  -H "Cookie: YOUR_AUTH_COOKIE"

# Step 7: Wait 60 seconds for validation

# Step 8: Check status
curl https://your-app.vercel.app/api/datasets/DATASET_ID \
  -H "Cookie: YOUR_AUTH_COOKIE"

# Expected: Status should be "ready" with statistics
```

#### Test 3: Verify Edge Function Validation

1. Wait 1-2 minutes after uploading a dataset
2. Check Edge Function logs:

```bash
# View recent logs
supabase functions logs validate-datasets --limit 20
```

**Expected logs:**
```
Processing 1 dataset(s)...
Validating dataset: [uuid] - Test Production Dataset
Dataset [uuid] validated successfully: 14 pairs, 182 tokens
Created notification for dataset [uuid]
```

#### Test 4: Verify Notification Created

1. In Supabase Dashboard → **Database** → **Table Editor**
2. Open table: `notifications`
3. Filter: `type = 'dataset_ready'`
4. **Expected:** 1 notification with message about your test dataset

#### Test 5: Verify UI Updates

1. Go back to: `https://your-app.vercel.app/datasets`
2. **Expected:**
   - Dataset shows status badge: "Ready" (green)
   - Statistics displayed: "14 training pairs", "182 tokens"
   - "Start Training" button visible
   - Can search/filter datasets

---

## ✅ Deployment Verification Checklist

Check off each item as you complete it:

### Code Deployment
- [ ] Code committed to Git
- [ ] Code pushed to Github
- [ ] Vercel build started automatically
- [ ] Vercel build completed successfully (green checkmark)
- [ ] No build errors in Vercel logs

### Supabase Edge Function
- [ ] Edge Function deployed via CLI or Dashboard
- [ ] Function appears in `supabase functions list`
- [ ] Function can be invoked manually without errors

### Cron Job Configuration
- [ ] Cron job created in Supabase
- [ ] Schedule set to `* * * * *` (every 1 minute)
- [ ] Job enabled and running
- [ ] Job logs show successful runs (check after 2-3 minutes)

### Storage Bucket
- [ ] `lora-datasets` bucket exists
- [ ] Bucket is private (not public)
- [ ] RLS policies configured
- [ ] Can generate presigned upload URLs

### End-to-End Testing
- [ ] `/datasets` page loads without errors
- [ ] Can create dataset via API
- [ ] Can upload file to presigned URL
- [ ] Can confirm upload
- [ ] Dataset status changes: uploading → validating → ready
- [ ] Statistics calculated correctly
- [ ] Notification created
- [ ] UI displays dataset with correct status and stats

---

## 🐛 Troubleshooting Common Issues

### Issue 1: Vercel Build Fails

**Error:** `Cannot find module '@/lib/types/lora-training'`

**Solution:**
1. Verify `src/lib/types/lora-training.ts` exists from Section E01
2. Check `tsconfig.json` has path alias configured:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
3. Rebuild: `npm run build`

### Issue 2: Edge Function Deploy Fails

**Error:** `Project not linked`

**Solution:**
```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# You can find PROJECT_REF in your Supabase Dashboard URL:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF

# Then try deploying again
supabase functions deploy validate-datasets
```

### Issue 3: Cron Job Not Running

**Symptoms:** Datasets stuck in "validating" status

**Debug Steps:**
```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not enabled, run:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'validate-datasets-cron';

-- Check job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'validate-datasets-cron')
ORDER BY start_time DESC 
LIMIT 5;

-- If job doesn't exist, create it using SQL from Step 3
```

### Issue 4: Upload URL Returns 401 Unauthorized

**Cause:** Service Role Key not configured or incorrect

**Solution:**
1. Verify environment variable in Vercel:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Check `SUPABASE_SERVICE_ROLE_KEY` exists and is correct
2. Get the correct key from Supabase:
   - Dashboard → Settings → API → `service_role` key
3. Update in Vercel and redeploy

### Issue 5: RLS Blocks Dataset Access

**Error:** "Dataset not found" but dataset exists in database

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'datasets';

-- Check policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'datasets';

-- If policies are missing, run the Section E01 migration again
```

### Issue 6: File Upload Fails

**Error:** `Failed to upload file` or `Access Denied`

**Solution:**
1. Check storage bucket exists and is private
2. Verify RLS policies on `storage.objects`:
   ```sql
   -- List storage policies
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```
3. Re-add policies from Step 4 if missing

---

## 📊 Monitoring & Logs

After deployment, you can monitor the system:

### View Edge Function Logs
```bash
# Real-time logs
supabase functions logs validate-datasets --tail

# Last 50 logs
supabase functions logs validate-datasets --limit 50
```

### View Cron Job History
```sql
-- In Supabase SQL Editor
SELECT 
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'validate-datasets-cron')
ORDER BY start_time DESC 
LIMIT 20;
```

### View Dataset Status Distribution
```sql
-- In Supabase SQL Editor
SELECT 
  status,
  COUNT(*) as count
FROM datasets
WHERE deleted_at IS NULL
GROUP BY status;
```

### View Recent Notifications
```sql
-- In Supabase SQL Editor
SELECT 
  type,
  title,
  message,
  created_at
FROM notifications
WHERE type = 'dataset_ready'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ **All checks pass:**
- Vercel build completes without errors
- `/datasets` page loads in production
- Can create dataset via API
- Can upload file to Supabase Storage
- Edge Function validates datasets automatically
- Dataset status changes correctly (uploading → validating → ready)
- Statistics calculated and displayed
- Notifications created
- No errors in logs

✅ **Performance targets:**
- Page load time < 2 seconds
- Upload URL generation < 500ms
- Validation completes within 2 minutes for typical datasets
- Cron job runs every minute without failures

✅ **User experience:**
- UI is responsive and intuitive
- Status updates appear automatically (no page refresh needed with React Query)
- Error messages are helpful
- Empty states guide users

---

## 📝 Post-Deployment Notes

**What's Ready:**
- ✅ Dataset upload system
- ✅ Background validation
- ✅ Dataset listing with search/filters
- ✅ Dataset statistics
- ✅ Notification system

**What's Next (Section E03):**
- Training job configuration
- Hyperparameter presets
- GPU selection
- Cost estimation
- Training job submission

**Maintenance:**
- Monitor Edge Function logs for errors
- Check Cron job runs regularly
- Monitor storage usage
- Review failed validations

---

## 🎉 Deployment Complete!

Once all steps are completed and tests pass, Section E02 is fully deployed to production!

**Summary:**
1. ✅ Code deployed to Vercel via Github
2. ✅ Edge Function deployed to Supabase
3. ✅ Cron job configured and running
4. ✅ Storage bucket configured with RLS
5. ✅ End-to-end testing completed

**You are now ready to proceed with Section E03: Training Job Configuration**

---

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check Vercel build logs for frontend errors
2. Check Supabase Edge Function logs for validation errors
3. Check Cron job logs for scheduling issues
4. Verify all environment variables are set correctly
5. Ensure Section E01 (database schema) is fully deployed

**Common Commands Reference:**
   ```bash
# Vercel
vercel --prod                          # Manual deploy
vercel logs                            # View logs

# Supabase
supabase functions deploy validate-datasets    # Deploy function
supabase functions logs validate-datasets      # View logs
supabase functions list                        # List functions

# Git
git status                             # Check changes
git add .                              # Stage all
git commit -m "message"                # Commit
git push origin main                   # Push (triggers Vercel)
```

---

**Last Updated:** December 26, 2025  
**Status:** Ready for Production Deployment  
**Next Section:** E03 - Training Job Configuration
