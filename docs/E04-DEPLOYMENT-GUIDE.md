# E04 Deployment & Testing Guide

**Quick guide for deploying and testing Section E04 components**

---

## Prerequisites

- ✅ Sections E01, E02, E03 completed
- ✅ Supabase project configured
- ✅ RunPod account with API access
- ⚠️ Anthropic API key needed (see below)

---

## Step 1: Configure Environment Variables

Add to your `.env.local` file (create if doesn't exist):

```bash
# Anthropic API for Claude-as-Judge
ANTHROPIC_API_KEY=sk-ant-api03-...

# Verify these are already set:
NEXT_PUBLIC_SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/ei82ickpenoqlp
GPU_CLUSTER_API_KEY=...
```

**Get Anthropic API Key:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy and paste into `.env.local`

---

## Step 2: Deploy Edge Function

```bash
# Navigate to project root
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"

# Make sure you're logged in to Supabase CLI
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref hqhtbxlgzysfbekexwku

# Deploy the edge function
npx supabase functions deploy process-pipeline-jobs --no-verify-jwt

# Set required secrets
npx supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/ei82ickpenoqlp
npx supabase secrets set GPU_CLUSTER_API_KEY=

# Verify deployment
npx supabase functions list
```

**Expected output:**
```
process-pipeline-jobs (deployed)
```

---

## Step 3: Set Up Cron Job (Optional but Recommended)

Run this SQL in Supabase SQL Editor to automatically process pending jobs every 5 minutes:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the edge function to run every 5 minutes
SELECT cron.schedule(
  'process-pipeline-jobs',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/process-pipeline-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job;
```

---

## Step 4: Verify TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit
```

**Expected:** No errors (exit code 0)

---

## Step 5: Test the Implementation

### 5.1 Test Edge Function Manually

```bash
curl -X POST \
  https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/process-pipeline-jobs \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 0,
  "results": []
}
```

### 5.2 Create a Test Training Job

Use the UI or API to create a test job. The job should:
1. Be created with status "pending"
2. Be picked up by the edge function
3. Status change to "queued" → "initializing" → "training"

### 5.3 Test Baseline Evaluation

Once you have a training job ID:

```bash
# Replace with your actual endpoint and auth token
curl -X POST https://your-app.vercel.app/api/pipeline/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "jobId": "your-job-uuid",
    "evaluationType": "baseline"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "runId": "evaluation-run-uuid",
    "status": "running",
    "totalScenarios": 6
  }
}
```

### 5.4 Check Evaluation Progress

Query the database:

```sql
-- Check evaluation run status
SELECT 
  id,
  evaluation_type,
  status,
  completed_scenarios,
  total_scenarios,
  arc_completion_rate,
  avg_overall_score
FROM pipeline_evaluation_runs
WHERE job_id = 'your-job-uuid'
ORDER BY created_at DESC;

-- Check individual results
SELECT 
  scenario_id,
  overall_evaluation->>'overallScore' as score,
  overall_evaluation->>'summary' as summary
FROM pipeline_evaluation_results
WHERE run_id = 'your-run-uuid';
```

### 5.5 Test Comparison Report

After both baseline and trained evaluations complete:

```bash
curl -X GET "https://your-app.vercel.app/api/pipeline/evaluate/compare?jobId=your-job-uuid" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "trainingSuccessful": true,
    "improvements": {
      "arcCompletion": {
        "baseline": 0.20,
        "trained": 0.45,
        "absoluteImprovement": 0.25,
        "percentImprovement": 1.25,
        "meetsTarget": true
      },
      ...
    },
    "recommendation": "Training was successful..."
  }
}
```

---

## Step 6: Monitor Logs

### Edge Function Logs

```bash
npx supabase functions logs process-pipeline-jobs --follow
```

### Database Logs

```sql
-- Check for failed jobs
SELECT id, name, status, error_message, created_at
FROM pipeline_training_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Check for failed evaluations
SELECT id, evaluation_type, status, error, created_at
FROM pipeline_evaluation_runs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY not found"

**Solution:**
1. Make sure `.env.local` exists in the root directory
2. Restart your development server: `npm run dev`
3. Check the key is not commented out
4. Verify the key format: `sk-ant-api03-...`

### Issue: Edge function returns 500 error

**Solution:**
1. Check edge function logs: `npx supabase functions logs process-pipeline-jobs`
2. Verify secrets are set: `npx supabase secrets list`
3. Test RunPod API independently
4. Check database connection

### Issue: Evaluation runs but never completes

**Solution:**
1. Check Anthropic API rate limits
2. Look for errors in server logs
3. Verify database can store JSONB results
4. Check the `runEvaluationPipeline` function isn't timing out

### Issue: TypeScript compilation errors

**Solution:**
1. Make sure you're using Node 20.x: `node --version`
2. Clear node_modules and reinstall: `cd src && rm -rf node_modules && npm install`
3. Check all imports use correct paths
4. Verify types are exported correctly

### Issue: Comparison report says "runs not found"

**Solution:**
1. Make sure both baseline AND trained evaluations completed
2. Check status is "completed" not "failed"
3. Verify you're using the correct job ID
4. Query database directly to see what runs exist

---

## Performance Considerations

### Evaluation Cost Estimates

For 6 scenarios with 5 turns each:

- **Conversation Generation:** ~30 API calls to Claude
- **Evaluation Judging:** 6 API calls to Claude
- **Total tokens per run:** ~50,000 tokens
- **Cost per run:** ~$0.50 - $1.00 (depending on model)

**Both baseline and trained = 2 runs per job**

### Optimization Tips

1. **Reduce turns:** Lower `maxTurns` in `generateConversation()` from 5 to 3
2. **Batch evaluations:** Process scenarios in parallel (requires code changes)
3. **Cache results:** Store evaluation results and reuse when retraining with same data
4. **Use smaller model:** Switch to Claude Haiku for cost savings (may reduce quality)

---

## Production Checklist

Before deploying to production:

- [ ] ANTHROPIC_API_KEY set in production environment
- [ ] Edge function deployed and tested
- [ ] Cron job scheduled (if using automated processing)
- [ ] Database indexes created for performance
- [ ] Error monitoring configured (Sentry, DataDog, etc.)
- [ ] Rate limiting implemented for evaluation endpoints
- [ ] Cost tracking enabled for Anthropic API
- [ ] Backup strategy for evaluation results
- [ ] Load testing completed
- [ ] Documentation updated

---

## Next Steps After Deployment

1. **Create test dataset** with real conversation examples
2. **Start test training job** with conservative hyperparameters
3. **Run baseline evaluation** to establish benchmark
4. **Wait for training** to complete (monitor via UI or API)
5. **Run trained evaluation** on the same test scenarios
6. **Compare results** using comparison endpoint
7. **Iterate on training data** if results don't meet targets
8. **Deploy to production** once satisfied with results

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Anthropic Docs:** https://docs.anthropic.com/
- **RunPod Docs:** https://docs.runpod.io/
- **Implementation Spec:** `pmc/product/_mapping/pipeline/workfiles/v4-show-full-implementation-spec_v1.md`
- **Claude-as-Judge Spec:** `pmc/product/_mapping/pipeline/workfiles/frontier-emotional-arc-LoRA-training-claude-as-judge-testing_v1.md`

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/pipeline/test-scenarios.ts` | Held-out test scenarios (6 total) |
| `src/lib/pipeline/evaluation-service.ts` | Conversation generation & Claude evaluation |
| `src/app/api/pipeline/evaluate/route.ts` | Start evaluation runs |
| `src/app/api/pipeline/evaluate/compare/route.ts` | Compare baseline vs trained |
| `supabase/functions/process-pipeline-jobs/index.ts` | Submit jobs to RunPod |

---

**Last Updated:** January 10, 2026  
**Status:** Ready for deployment and testing
