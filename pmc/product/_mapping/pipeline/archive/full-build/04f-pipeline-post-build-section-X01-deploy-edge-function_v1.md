# Deploy Updated Edge Function

**What Changed:** Updated `process-training-jobs` Edge Function to use RunPod's standard serverless API instead of custom endpoints.

## Changes Made

1. **Job Submission** - Changed from `/training/submit` to `/run`
   - Payload wrapped in `{input: {...}}`
   - Response format: `{id: "job-id", status: "IN_QUEUE"}`

2. **Status Polling** - Changed from `/training/status/{id}` to `/status/{id}`
   - Added RunPod status mapping: `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`, `FAILED`
   - Extracts worker output from `response.output` field

## Deploy to Supabase

Run this command from the repo root:

```bash
npx supabase functions deploy process-training-jobs
```

Or if you have the Supabase CLI:

```bash
supabase functions deploy process-training-jobs
```

## Test the Fix

1. **Deploy the function** (above command)
2. **Submit a training job** from your app
3. **Check RunPod Console** → Requests tab - should see the job appear
4. **Monitor job status** in your app - should show "Queued on GPU" → "Training"

## Expected Flow

```
App submits job → Supabase DB (queued)
  ↓
Edge Function runs (30s cron)
  ↓
POST /run to RunPod → Returns {id: "xxx"}
  ↓
Saves external_job_id to DB
  ↓
Edge Function polls GET /status/{id} every 30s
  ↓
Updates progress in DB
  ↓
Job completes → Status changes to "completed"
```

## If Job Still Fails

Check Supabase Logs:
```bash
npx supabase functions logs process-training-jobs
```

Look for errors in the submission or status polling sections.
