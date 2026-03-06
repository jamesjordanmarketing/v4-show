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

