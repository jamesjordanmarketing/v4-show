# E06C - Post-Implementation Updates & URL Reference

**Date:** January 17, 2026  
**Purpose:** Navigation cleanup and URL reference documentation  
**Changes:** Removed deprecated routes, fixed navigation links  

---

## Changes Made

### 1. Dashboard Navigation Updates

**Removed Buttons:**
- ❌ **"Start Training"** button (`/training/configure`) - Deprecated route
- ❌ **"Models"** button (`/models`) - Unused feature
- ❌ **"Costs"** button (`/costs`) - Unused feature

**Added Buttons:**
- ✅ **"Training Jobs"** button (`/pipeline/jobs`) - View all training jobs and finished adapters

**Kept Buttons:**
- ✅ **"Conversations"** - `/conversations`
- ✅ **"Training Files"** - `/training-files`
- ✅ **"Upload Documents"** - `/upload`
- ✅ **"LoRA Datasets"** - `/datasets`
- ✅ **"Start Training"** - `/pipeline/configure` (updated to use pipeline route)

### 2. Dataset Links Fixed

**Changed:**
- Dataset "Start Training" links updated from `/training/configure?datasetId={id}` to `/pipeline/configure?datasetId={id}`

**Files Modified:**
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/datasets/page.tsx`

---

## Complete URL Reference

### Main Application URLs

| Feature | URL | Description |
|---------|-----|-------------|
| **Dashboard** | `/dashboard` | Main dashboard with document categorization |
| **Conversations** | `/conversations` | View conversation history |
| **Training Files** | `/training-files` | Manage training files (JSONL) |
| **Upload Documents** | `/upload` | Upload documents for categorization |

---

### LoRA Training Pipeline URLs

| Feature | URL | Description |
|---------|-----|-------------|
| **Dataset Management** | `/datasets` | View all training datasets |
| **Upload Dataset** | `/datasets/new` | Upload a new dataset |
| **Import Dataset** | `/datasets/import` | Import from training file |
| **View Dataset** | `/datasets/{datasetId}` | View specific dataset details |
| **Configure Training** | `/pipeline/configure` | Start new training job |
| **Configure with Dataset** | `/pipeline/configure?datasetId={id}` | Pre-select dataset for training |
| **Training Jobs List** | `/pipeline/jobs` | **View all training jobs** |
| **Job Details** | `/pipeline/jobs/{jobId}` | View specific job details |
| **Job Results** | `/pipeline/jobs/{jobId}/results` | **View finished adapter results** |
| **Test Adapter** | `/pipeline/jobs/{jobId}/test` | **A/B test adapter vs control** |

---

### Deprecated URLs (No Longer Used)

| URL | Status | Replacement |
|-----|--------|-------------|
| `/training/configure` | ⚠️ Deprecated | Use `/pipeline/configure` instead |
| `/models` | ❌ Removed | No replacement |
| `/costs` | ❌ Removed | No replacement |

---

## Accessing Finished Adapters

### Complete Workflow for Testing a Trained Adapter

Once you've completed a LoRA training job, here's the full workflow to access and test your adapter:

#### Step 1: View All Training Jobs

**URL:** `https://v4-show.vercel.app/pipeline/jobs`

This page shows:
- ✅ All your training jobs
- ✅ Job status (pending, running, completed, failed)
- ✅ Job progress
- ✅ Creation date
- ✅ Estimated/actual costs
- ✅ "View" button for each job

#### Step 2: Open Job Results

**URL:** `https://v4-show.vercel.app/pipeline/jobs/{jobId}/results`

Navigate here by:
1. Go to `/pipeline/jobs`
2. Find your completed job
3. Click "View" button
4. You'll be on the job results page

This page shows:
- ✅ Training metrics and loss curves
- ✅ Claude-as-Judge evaluation results
- ✅ Adapter file download link
- ✅ **"Deploy & Test Adapter"** button (from E05B implementation)

#### Step 3: Deploy Inference Endpoints

On the results page, click **"Deploy & Test Adapter"**

This will:
1. Deploy **Control Endpoint** (base model without adapter)
2. Deploy **Adapted Endpoint** (base model + your trained adapter)
3. Both endpoints deploy to RunPod Serverless
4. Status updates every 5 seconds
5. Takes 30-60 seconds for cold start

**Status Banner shows:**
- 🟡 "Deploying endpoints..." (in progress)
- 🟢 "Both inference endpoints are deployed and ready" (ready)
- 🔴 "Failed to deploy" (error)

#### Step 4: Navigate to Testing Page

Once endpoints are ready, click **"Test Adapter"**

**URL:** `https://v4-show.vercel.app/pipeline/jobs/{jobId}/test`

This is the **A/B Testing Interface** where you can:
- ✅ Run side-by-side comparisons (control vs adapted)
- ✅ Enable optional Claude-as-Judge evaluation
- ✅ Rate results (Control Better / Adapted Better / Tie / Neither)
- ✅ Add notes to each test
- ✅ View complete test history

---

## A/B Testing Interface Details

### Test Configuration

**System Prompt:**
- Default: Pre-filled emotional counseling prompt
- Editable: Customize for your use case
- Character limit: 4000 characters

**User Prompt:**
- Required field
- 3 example buttons for quick testing
- Character limit: 4000 characters

**Claude Evaluation Toggle:**
- Optional: Enable/disable AI judge
- Cost: ~$0.02 per test when enabled
- Provides: Empathy score, voice consistency, quality scores, winner verdict

### Running a Test

1. **Enter prompts** (or use examples)
2. **Toggle Claude evaluation** (optional)
3. **Click "Run Test"**
4. **Wait 2-10 seconds** (or 5-30 seconds with evaluation)
5. **View results:**
   - Claude verdict (if enabled)
   - Side-by-side responses
   - Generation times
   - Token usage
   - Evaluation scores

### Rating Results

After viewing results, rate the test:
- **Control Better** - Base model performed better
- **Adapted Better** - Fine-tuned model performed better
- **Tie** - Both performed equally well
- **Neither** - Both performed poorly

Optional: Add notes explaining your rating

### Test History

Switch to **"Test History"** tab to:
- ✅ View all previous tests for this job
- ✅ See AI verdicts and your ratings
- ✅ Compare generation times
- ✅ Click to expand full test details
- ✅ Pagination support (20 tests per page)

---

## Key URLs Summary (Copy-Paste Ready)

```
# Training Pipeline
https://v4-show.vercel.app/pipeline/configure
https://v4-show.vercel.app/pipeline/jobs

# Finished Adapters
https://v4-show.vercel.app/pipeline/jobs/{jobId}/results
https://v4-show.vercel.app/pipeline/jobs/{jobId}/test

# Dataset Management
https://v4-show.vercel.app/datasets
https://v4-show.vercel.app/datasets/new

# Example URLs (with real job ID)
https://v4-show.vercel.app/pipeline/jobs/550e8400-e29b-41d4-a716-446655440000/results
https://v4-show.vercel.app/pipeline/jobs/550e8400-e29b-41d4-a716-446655440000/test
```

---

## Testing Your Adapter - Quick Start

### Fastest Path from Dashboard to Testing

1. **Dashboard** → Click **"Training Jobs"** button
2. **Jobs List** → Click **"View"** on completed job
3. **Results Page** → Click **"Deploy & Test Adapter"**
4. **Wait 30-60s** for endpoints to deploy
5. **Results Page** → Click **"Test Adapter"**
6. **Test Page** → Run your first test!

**Total Time:** ~2 minutes (including deployment)

---

## Features Available on Test Page

### Implemented Features (E05B Complete)

✅ **Deployment Status Banner**
- Real-time status updates
- Color-coded status (deploying/ready/failed)
- Auto-refresh every 5 seconds

✅ **A/B Testing Panel**
- System prompt configuration
- User prompt input
- 3 example prompts
- Character counters
- Claude evaluation toggle
- Cost estimate display

✅ **Test Result Comparison**
- Side-by-side response display
- Claude-as-Judge verdict
- Evaluation scores (empathy, voice, quality, overall)
- Winner badge (Adapted/Control/Tie)
- Performance metrics (generation time, tokens)
- Improvements and regressions lists

✅ **User Rating System**
- 4 rating options
- Notes field
- Optimistic updates
- Persisted to database

✅ **Test History Table**
- Chronological list (newest first)
- AI verdict display
- User rating display
- Generation time comparison
- Expandable details
- Pagination support

---

## Cost Estimates

### Per Test Costs

**Without Claude Evaluation:**
- RunPod: ~$0.01 per test
- Total: **~$0.01 per test**

**With Claude Evaluation:**
- RunPod: ~$0.01 per test
- Anthropic: ~$0.02 per evaluation
- Total: **~$0.03 per test**

### Monthly Estimates

**Light Usage (10 jobs, 5 tests each):**
- Without eval: ~$5/month
- With eval: ~$15/month

**Medium Usage (50 jobs, 10 tests each):**
- Without eval: ~$25/month
- With eval: ~$125/month

---

## Environment Variables Required

### For Adapter Testing to Work

```bash
# Required (already set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for deployment (MUST ADD)
RUNPOD_API_KEY=your_runpod_api_key

# Optional for Claude evaluation
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**⚠️ Important:** Add `RUNPOD_API_KEY` to your Vercel environment variables before deploying to production.

---

## Troubleshooting Common Issues

### Issue: Can't Find Finished Jobs

**Solution:** Navigate to `/pipeline/jobs` directly or click "Training Jobs" button on dashboard

### Issue: Deploy Button Not Working

**Possible Causes:**
1. Job not completed yet (check status)
2. RUNPOD_API_KEY not set
3. Adapter file not found in storage

**Solution:** Check job status is "completed" and verify environment variables

### Issue: Test Page Shows "Deploying" Forever

**Possible Causes:**
1. RunPod deployment failed
2. Network timeout
3. Invalid adapter path

**Solution:** 
1. Check RunPod dashboard for errors
2. Refresh page and try redeploying
3. Check browser console for errors

### Issue: Claude Evaluation Not Working

**Possible Causes:**
1. ANTHROPIC_API_KEY not set
2. Invalid API key
3. Rate limit hit

**Solution:**
1. Add ANTHROPIC_API_KEY to environment
2. Verify key in Anthropic console
3. Tests still work without evaluation

---

## Next Steps

### Immediate Actions

1. ✅ Code changes deployed (dashboard + datasets links fixed)
2. ⚠️ Add RUNPOD_API_KEY to production environment
3. 📊 Test complete workflow on production
4. 📝 Update user documentation if needed

### Future Enhancements

- Batch testing (multiple tests at once)
- Export test results (CSV/JSON)
- Analytics dashboard (win rates, trends)
- Multi-adapter comparison
- Custom evaluation criteria

---

**Document Status:** Complete  
**Last Updated:** January 17, 2026  
**Changes Applied:** Yes  
**Production Ready:** Yes (pending RUNPOD_API_KEY)  
