# Adapter Testing Module - Production Guide

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** January 17, 2026  

---

## Overview

The Adapter Testing Module enables users to deploy trained LoRA adapters to serverless inference endpoints and conduct A/B testing comparing base model vs adapted model responses.

**Key Features:**
- One-click deployment to RunPod Serverless
- Side-by-side response comparison
- Optional Claude-as-Judge evaluation
- User rating and feedback system
- Complete test history with pagination
- Real-time deployment status updates

---

## Architecture

### Component Stack

```
User Interface (E05B)
    ├── DeployAdapterButton
    ├── EndpointStatusBanner
    ├── ABTestingPanel
    ├── TestResultComparison
    └── TestHistoryTable
    ↓
React Query Hooks (E04B)
    ├── useAdapterDeployment
    ├── useAdapterTesting
    └── useAdapterWorkflow
    ↓
API Routes (E03)
    ├── POST /api/pipeline/adapters/deploy
    ├── POST /api/pipeline/adapters/test
    ├── GET  /api/pipeline/adapters/status
    └── POST /api/pipeline/adapters/rate
    ↓
Service Layer (E02)
    ├── InferenceService (RunPod integration)
    └── TestService (A/B testing + Claude)
    ↓
Database (E01)
    ├── inference_endpoints
    ├── adapter_test_results
    └── base_models
```

### Two-Endpoint Strategy

**Control Endpoint:**
- Base model only (e.g., Mistral-7B-Instruct)
- Represents baseline performance
- No LoRA adapter loaded

**Adapted Endpoint:**
- Base model + LoRA adapter
- Represents fine-tuned performance
- Adapter loaded from Supabase Storage

Both endpoints:
- Run on RunPod Serverless
- Use vLLM worker with OpenAI-compatible API
- Auto-terminate after idle timeout (default: 5 minutes)
- Support streaming (not used in current implementation)

---

## User Workflow

### Complete Journey

1. **Training Completion**
   - User completes LoRA training job
   - Adapter file saved to Supabase Storage
   - Job status set to "completed"

2. **Navigate to Results**
   - User opens job results page
   - Sees training metrics and adapter file info
   - "Deploy & Test Adapter" button appears

3. **Initiate Deployment**
   - User clicks "Deploy & Test Adapter"
   - System deploys both endpoints in parallel
   - Button shows "Deploying Endpoints..." with spinner
   - Status updates every 5 seconds automatically

4. **Wait for Ready State**
   - Cold start: 30-60 seconds typical
   - Status banner shows progress
   - Both endpoints must reach "ready" state
   - Button changes to "Test Adapter"

5. **Navigate to Testing**
   - User clicks "Test Adapter"
   - Browser navigates to test page
   - Status banner confirms both endpoints ready

6. **Configure Test**
   - Enter system prompt (or use default)
   - Enter user prompt (or use example)
   - Toggle Claude-as-Judge evaluation (optional)
   - Click "Run Test"

7. **View Results**
   - Test executes (2-10 seconds)
   - Claude verdict displays (if enabled)
   - Side-by-side comparison shows
   - Evaluation scores display
   - Performance metrics shown

8. **Rate Result**
   - Choose: Control Better / Adapted Better / Tie / Neither
   - Add optional notes
   - Rating saves immediately (optimistic update)

9. **Review History**
   - Switch to "Test History" tab
   - View all previous tests
   - Click to view test details
   - Export or analyze results (future feature)

---

## Database Schema

### Table: inference_endpoints

Tracks deployed inference endpoints.

**Key Columns:**
- `id` - UUID primary key
- `job_id` - References training job
- `user_id` - References auth user
- `endpoint_type` - 'control' or 'adapted'
- `runpod_endpoint_id` - RunPod's endpoint ID
- `base_model` - Model identifier
- `adapter_path` - Supabase Storage path (null for control)
- `status` - 'pending' | 'deploying' | 'ready' | 'failed' | 'terminated'
- `health_check_url` - RunPod health check URL
- `estimated_cost_per_hour` - Cost tracking

**RLS Policies:**
- Users can only view/modify their own endpoints
- Authenticated access required

### Table: adapter_test_results

Stores A/B test results.

**Key Columns:**
- `id` - UUID primary key
- `job_id` - References training job
- `user_id` - References auth user
- `system_prompt` - System message (optional)
- `user_prompt` - User input (required)
- `control_response` - Base model output
- `adapted_response` - Adapted model output
- `control_generation_time_ms` - Performance metric
- `adapted_generation_time_ms` - Performance metric
- `evaluation_enabled` - Boolean flag
- `control_evaluation` - JSONB Claude evaluation
- `adapted_evaluation` - JSONB Claude evaluation
- `evaluation_comparison` - JSONB comparison result
- `user_rating` - 'control' | 'adapted' | 'tie' | 'neither'
- `user_notes` - Optional text
- `status` - 'pending' | 'generating' | 'evaluating' | 'completed' | 'failed'

**RLS Policies:**
- Users can only view/modify their own test results
- Authenticated access required

### Table: base_models

Registry of supported base models.

**Seed Data (4 models):**
1. Mistral 7B Instruct v0.2
2. DeepSeek R1 Distill Qwen 32B
3. Llama 3 8B Instruct
4. Llama 3 70B Instruct

**Configuration:**
- Docker image for vLLM worker
- GPU memory requirements
- Recommended GPU types
- LoRA support flag

---

## API Endpoints

### POST /api/pipeline/adapters/deploy

**Purpose:** Deploy Control and Adapted inference endpoints.

**Request:**
```json
{
  "jobId": "uuid",
  "forceRedeploy": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "controlEndpoint": { ... },
    "adaptedEndpoint": { ... }
  }
}
```

**Process:**
1. Verify job exists and user owns it
2. Check if endpoints already exist
3. If exists and ready, return existing
4. If forceRedeploy, terminate existing
5. Create database records
6. Deploy to RunPod (parallel)
7. Return endpoint records (status: 'deploying')

**Polling:** Client polls status endpoint for updates

---

### POST /api/pipeline/adapters/test

**Purpose:** Run A/B test with both endpoints.

**Request:**
```json
{
  "jobId": "uuid",
  "userPrompt": "string",
  "systemPrompt": "string (optional)",
  "enableEvaluation": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "test-uuid",
    "controlResponse": "...",
    "adaptedResponse": "...",
    "controlGenerationTimeMs": 1234,
    "adaptedGenerationTimeMs": 1456,
    "evaluationComparison": { ... }
  }
}
```

**Process:**
1. Verify endpoints are ready
2. Send prompt to Control endpoint (parallel)
3. Send prompt to Adapted endpoint (parallel)
4. Wait for both responses
5. If evaluation enabled, call Claude-as-Judge
6. Compare evaluations
7. Save to database
8. Return results

**Timing:** 2-10 seconds without eval, 5-30 seconds with eval

---

### GET /api/pipeline/adapters/status?jobId=uuid

**Purpose:** Get current deployment status.

**Response:**
```json
{
  "success": true,
  "data": {
    "controlEndpoint": { ... },
    "adaptedEndpoint": { ... },
    "bothReady": true
  }
}
```

**Polling:** Client polls every 5 seconds during deployment

---

### POST /api/pipeline/adapters/rate

**Purpose:** Rate test result.

**Request:**
```json
{
  "testId": "uuid",
  "rating": "adapted",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated test result */ }
}
```

**Process:**
1. Verify test exists and user owns it
2. Update rating and notes
3. Return updated test result
4. Invalidate cache

---

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# RunPod Configuration (required for deployment)
RUNPOD_API_KEY=your_runpod_api_key
```

### Optional Variables

```bash
# Anthropic Configuration (for Claude-as-Judge evaluation)
ANTHROPIC_API_KEY=your_anthropic_api_key

# If not set: Evaluation feature disabled in UI
```

### Deployment Platform Setup

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Set for Production, Preview, and Development
4. Redeploy after adding variables

**Other Platforms:**
- Follow platform-specific environment variable setup
- Ensure variables available at build time and runtime
- Test in staging before production

---

## Cost Estimates

### RunPod Serverless Costs

**Per Endpoint:**
- Idle cost: ~$0.10/hour (with 5-min timeout)
- Inference cost: ~$0.001 per 1K tokens
- Cold start: Free (included in first request)

**Per Test (2 endpoints):**
- Idle: ~$0.20/hour total (both endpoints)
- Inference: ~$0.002 per test (assuming 1K tokens each)
- **Total per test:** ~$0.01 (without evaluation)

### Anthropic API Costs

**Claude-as-Judge Evaluation:**
- Cost: ~$0.02 per evaluation
- Tokens: ~4K input, ~1K output
- **Total per test with eval:** ~$0.03

### Monthly Estimates

**Light Usage (10 jobs/month, 5 tests each):**
- RunPod: ~$5/month
- Anthropic: ~$10/month (if eval enabled)
- **Total:** ~$15/month

**Medium Usage (50 jobs/month, 10 tests each):**
- RunPod: ~$25/month
- Anthropic: ~$100/month (if eval enabled)
- **Total:** ~$125/month

**Heavy Usage (200 jobs/month, 20 tests each):**
- RunPod: ~$100/month
- Anthropic: ~$800/month (if eval enabled)
- **Total:** ~$900/month

**Cost Optimization:**
- Decrease idle timeout (trade-off: longer cold starts)
- Use smaller models (trade-off: lower quality)
- Disable Claude evaluation (trade-off: no automated scoring)
- Batch tests together (future feature)

---

## Performance Characteristics

### Deployment Times

| Phase | Duration | Notes |
|-------|----------|-------|
| API Call | < 1s | Create DB records + trigger RunPod |
| Cold Start | 30-60s | GPU allocation + model loading |
| Warm Start | 5-10s | Endpoint already running |
| Total Deploy | 30-60s | Both endpoints in parallel |

### Test Execution Times

| Configuration | Duration | Notes |
|---------------|----------|-------|
| Without Evaluation | 2-10s | Parallel endpoint calls |
| With Evaluation | 5-30s | + Claude API call |
| Network Latency | +0.5-2s | Varies by region |

### UI Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Initial Page Load | < 3s | ~2s |
| Test Execution | < 10s | 2-10s |
| Polling Interval | 5s | 5s |
| Rating Save | < 1s | <500ms (optimistic) |
| History Load | < 2s | ~1s |

---

## Troubleshooting

### Issue: Endpoints Fail to Deploy

**Symptoms:**
- Status stays "deploying" for > 5 minutes
- Status changes to "failed"
- Error message in deployment response

**Common Causes:**
1. Invalid `RUNPOD_API_KEY`
2. Insufficient RunPod credits
3. Adapter file not found in Supabase Storage
4. Invalid adapter path
5. GPU unavailable (capacity issues)

**Solutions:**
1. Verify `RUNPOD_API_KEY` is correct
2. Check RunPod dashboard for account balance
3. Verify adapter file exists in Supabase Storage
4. Check `adapter_path` in `pipeline_training_jobs` table
5. Try again later or contact RunPod support

---

### Issue: Tests Fail to Execute

**Symptoms:**
- "Run Test" button disabled
- Error message when clicking "Run Test"
- Test execution times out

**Common Causes:**
1. Endpoints not ready yet
2. Endpoint health check failing
3. Invalid prompt (empty or too long)
4. Network timeout
5. RunPod endpoint terminated

**Solutions:**
1. Wait for "Both endpoints are ready" message
2. Check endpoint status in database
3. Ensure prompt is 1-4000 characters
4. Check network connectivity
5. Redeploy endpoints if terminated

---

### Issue: Claude Evaluation Not Working

**Symptoms:**
- Evaluation toggle present but results missing
- Error about evaluation
- Tests complete but no Claude verdict

**Common Causes:**
1. `ANTHROPIC_API_KEY` not set
2. Invalid Anthropic API key
3. Anthropic rate limit hit
4. Network error to Anthropic API

**Solutions:**
1. Add `ANTHROPIC_API_KEY` to environment
2. Verify key in Anthropic console
3. Wait and retry (rate limits reset)
4. Check network connectivity
5. Test works without evaluation - feature is optional

---

### Issue: UI Not Updating During Deployment

**Symptoms:**
- Status banner stuck on "Deploying"
- No progress updates
- Page seems frozen

**Common Causes:**
1. Polling not working
2. React Query not configured
3. Network requests failing
4. JavaScript error in console

**Solutions:**
1. Check Network tab for polling requests (every 5s)
2. Check React Query DevTools (if enabled)
3. Open browser console for errors
4. Hard refresh browser (Ctrl+Shift+R)
5. Check `useEndpointStatus` hook implementation

---

### Issue: Rating Doesn't Save

**Symptoms:**
- Rating buttons clicked but no change
- No feedback after clicking
- Rating doesn't appear in history

**Common Causes:**
1. Network error
2. Optimistic update showing but API failed
3. Test ID invalid
4. User doesn't own test

**Solutions:**
1. Check Network tab for failed requests
2. Check browser console for errors
3. Verify test exists in database
4. Check RLS policies on `adapter_test_results`
5. Try refreshing page and rating again

---

## Monitoring & Observability

### Key Metrics to Track

**Deployment Success Rate:**
- Target: > 95%
- Track: `status = 'ready'` vs `status = 'failed'`
- Alert: If < 90% over 24 hours

**Test Execution Time:**
- Target: < 10s (without eval)
- Track: `completed_at - created_at`
- Alert: If p95 > 30s

**API Error Rate:**
- Target: < 1%
- Track: 5xx responses vs total requests
- Alert: If > 5% over 1 hour

**User Engagement:**
- Track: Tests per job
- Track: Rating completion rate
- Track: Returning users (multiple sessions)

### Logging Strategy

**Application Logs:**
- Error level: All exceptions and failures
- Warn level: Retries and degraded performance
- Info level: Key actions (deploy, test, rate)
- Debug level: Detailed execution flow (dev only)

**External Service Logs:**
- RunPod: Check via GraphQL API or dashboard
- Anthropic: Check via Anthropic console
- Supabase: Check via Supabase dashboard

---

## Security Considerations

### Authentication & Authorization

**All API routes require:**
1. Valid Supabase auth session
2. User ID extracted from JWT
3. Job/test ownership validation

**Database Security:**
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role key used server-side only

**API Key Security:**
- RunPod API key: Server-side only
- Anthropic API key: Server-side only
- Never exposed to client

### Data Privacy

**User Data:**
- Test prompts and responses stored
- No PII required for testing
- Users can only see own tests

**Adapter Files:**
- Stored in Supabase Storage (private buckets)
- RLS policies prevent unauthorized access
- Temporary URLs for RunPod deployment

---

## Maintenance & Updates

### Regular Tasks

**Weekly:**
- Review error logs
- Check deployment success rate
- Monitor costs (RunPod + Anthropic)
- Check for failed jobs

**Monthly:**
- Update base model registry (if new models)
- Review user feedback
- Analyze usage patterns
- Optimize cold start times
- Update documentation

**Quarterly:**
- Major version upgrades
- Performance optimization
- Cost optimization review
- Feature enhancements

### Backup Strategy

**Database:**
- Automated daily backups (Supabase)
- Point-in-time recovery available
- Test restore procedures quarterly

**Code:**
- Git version control
- Tagged releases
- Rollback procedures documented

---

## Future Enhancements

### Planned Features

1. **Batch Testing**
   - Run multiple tests simultaneously
   - CSV import for bulk testing
   - Scheduled test runs

2. **Export Functionality**
   - Export test history to CSV
   - Export results to JSON
   - PDF report generation

3. **Analytics Dashboard**
   - Win rate charts
   - Performance trends over time
   - Cost tracking dashboard

4. **Advanced Evaluation**
   - Custom evaluation criteria
   - Multiple evaluation models
   - Evaluation templates

5. **Model Comparison**
   - Compare multiple adapters
   - Compare across different base models
   - A/B/C/D testing (> 2 variants)

6. **Performance Optimizations**
   - Faster cold starts
   - Endpoint pooling
   - Predictive scaling

---

## Support & Resources

### Documentation
- Complete Guide: `docs/ADAPTER_MODULE_COMPLETE.md`
- Quick Start: `docs/ADAPTER_E05B_QUICK_START.md`
- Deployment Checklist: `docs/ADAPTER_DEPLOYMENT_CHECKLIST.md`
- Implementation Specs: `pmc/product/_mapping/pipeline/workfiles/`

### External Resources
- RunPod Documentation: https://docs.runpod.io
- Anthropic API Docs: https://docs.anthropic.com
- Supabase Docs: https://supabase.com/docs
- vLLM Documentation: https://docs.vllm.ai

### Getting Help
1. Check troubleshooting section above
2. Review error logs in application
3. Check external service dashboards
4. Contact internal support team
5. File GitHub issue (if applicable)

---

**Document Version:** 1.0  
**Author:** Development Team  
**Last Updated:** January 17, 2026  
**Status:** Production Ready  
