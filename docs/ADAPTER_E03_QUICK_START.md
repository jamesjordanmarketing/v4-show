# Adapter API Routes - Quick Start Guide

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E03 - API Routes  

---

## Overview

Quick reference guide for the Adapter Testing API routes. This guide provides the essential information needed to use the API endpoints for deploying and testing LoRA adapters.

---

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

All routes are under: `/api/pipeline/adapters/`

---

## Authentication

**All routes require authentication** via Supabase session cookie.

```typescript
// Frontend (automatic with Supabase client)
const supabase = createClientComponentClient();
// Session cookie automatically included in fetch requests

// cURL (manual testing)
curl -H "Cookie: sb-access-token=YOUR_TOKEN" ...
```

---

## API Endpoints

### 1. Deploy Endpoints

**Deploy control and adapted inference endpoints to RunPod**

```http
POST /api/pipeline/adapters/deploy
```

**Request:**
```json
{
  "jobId": "uuid-of-completed-training-job"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "controlEndpoint": {
      "id": "uuid",
      "endpointType": "control",
      "status": "deploying",
      "baseModel": "meta-llama/Llama-3.2-3B-Instruct",
      "runpodEndpointId": "abcdef123456",
      "createdAt": "2026-01-17T21:00:00Z"
    },
    "adaptedEndpoint": {
      "id": "uuid",
      "endpointType": "adapted",
      "status": "deploying",
      "baseModel": "meta-llama/Llama-3.2-3B-Instruct",
      "adapterPath": "s3://bucket/adapter.safetensors",
      "runpodEndpointId": "xyz789",
      "createdAt": "2026-01-17T21:00:01Z"
    }
  }
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid jobId or job not ready
- `404` - Job not found
- `500` - Server error

**Example (TypeScript):**
```typescript
const deployEndpoints = async (jobId: string) => {
  const response = await fetch('/api/pipeline/adapters/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  });
  return response.json();
};
```

---

### 2. Check Endpoint Status

**Check if endpoints are ready for testing**

```http
GET /api/pipeline/adapters/status?jobId={jobId}
```

**Query Parameters:**
- `jobId` (required) - Training job ID

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "controlEndpoint": {
      "id": "uuid",
      "status": "ready",
      "healthCheckUrl": "https://...",
      "lastHealthCheck": "2026-01-17T21:15:00Z"
    },
    "adaptedEndpoint": {
      "id": "uuid",
      "status": "ready",
      "healthCheckUrl": "https://...",
      "lastHealthCheck": "2026-01-17T21:15:30Z"
    },
    "bothReady": true
  }
}
```

**Endpoint Status Values:**
- `pending` - Waiting to deploy
- `deploying` - Currently deploying
- `ready` - Ready for testing ✅
- `failed` - Deployment failed
- `terminated` - Endpoint shut down

**Errors:**
- `401` - Not authenticated
- `400` - Missing jobId
- `500` - Server error

**Example (TypeScript):**
```typescript
const checkStatus = async (jobId: string) => {
  const response = await fetch(
    `/api/pipeline/adapters/status?jobId=${jobId}`
  );
  return response.json();
};

// Poll until ready
const waitForEndpoints = async (jobId: string) => {
  while (true) {
    const { data } = await checkStatus(jobId);
    if (data.bothReady) break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};
```

---

### 3. Run A/B Test

**Test a prompt against both models**

```http
POST /api/pipeline/adapters/test
```

**Request:**
```json
{
  "jobId": "uuid",
  "userPrompt": "I'm worried about my retirement savings",
  "systemPrompt": "You are Elena Morales, CFP",
  "enableEvaluation": false
}
```

**Request Fields:**
- `jobId` (required) - Training job ID
- `userPrompt` (required) - User message to test
- `systemPrompt` (optional) - System prompt/persona
- `enableEvaluation` (optional) - Enable Claude-as-Judge (default: false)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "test-uuid",
    "jobId": "uuid",
    "systemPrompt": "You are Elena Morales, CFP",
    "userPrompt": "I'm worried about my retirement savings",
    "controlResponse": "I understand your concern about retirement...",
    "controlGenerationTimeMs": 1234,
    "controlTokensUsed": 89,
    "adaptedResponse": "It sounds like you're feeling anxious about retirement...",
    "adaptedGenerationTimeMs": 1456,
    "adaptedTokensUsed": 95,
    "evaluationEnabled": false,
    "controlEvaluation": null,
    "adaptedEvaluation": null,
    "evaluationComparison": null,
    "userRating": null,
    "userNotes": null,
    "status": "completed",
    "createdAt": "2026-01-17T21:20:00Z",
    "completedAt": "2026-01-17T21:20:03Z",
    "errorMessage": null
  }
}
```

**With Evaluation (enableEvaluation: true):**
```json
{
  "success": true,
  "data": {
    // ... same fields as above
    "evaluationEnabled": true,
    "controlEvaluation": {
      "emotionalProgression": { /* ... */ },
      "empathyEvaluation": { /* ... */ },
      "voiceConsistency": { /* ... */ },
      "conversationQuality": { /* ... */ },
      "overallEvaluation": {
        "wouldUserFeelHelped": true,
        "overallScore": 3.5,
        "keyStrengths": ["Clear communication"],
        "areasForImprovement": ["More empathy"],
        "summary": "Solid response with room for improvement"
      }
    },
    "adaptedEvaluation": { /* ... similar structure */ },
    "evaluationComparison": {
      "winner": "adapted",
      "controlOverallScore": 3.5,
      "adaptedOverallScore": 4.2,
      "scoreDifference": 0.7,
      "improvements": ["Better empathy", "More validation"],
      "regressions": [],
      "summary": "Adapted model shows improvement..."
    }
  }
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid request or endpoints not ready
- `500` - Server error

**Example (TypeScript):**
```typescript
const runTest = async (
  jobId: string,
  userPrompt: string,
  options?: {
    systemPrompt?: string;
    enableEvaluation?: boolean;
  }
) => {
  const response = await fetch('/api/pipeline/adapters/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      userPrompt,
      ...options
    })
  });
  return response.json();
};
```

---

### 4. Get Test History

**Retrieve past test results with pagination**

```http
GET /api/pipeline/adapters/test?jobId={jobId}&limit={limit}&offset={offset}
```

**Query Parameters:**
- `jobId` (required) - Training job ID
- `limit` (optional) - Results per page (default: 20, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "test-uuid-1",
      "userPrompt": "I'm worried about retirement",
      "controlResponse": "...",
      "adaptedResponse": "...",
      "userRating": "adapted",
      "userNotes": "Better empathy",
      "status": "completed",
      "createdAt": "2026-01-17T21:20:00Z"
    },
    // ... more results
  ],
  "count": 5
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid parameters
- `500` - Server error

**Example (TypeScript):**
```typescript
const getTestHistory = async (
  jobId: string,
  page: number = 0,
  pageSize: number = 20
) => {
  const offset = page * pageSize;
  const response = await fetch(
    `/api/pipeline/adapters/test?jobId=${jobId}&limit=${pageSize}&offset=${offset}`
  );
  return response.json();
};
```

---

### 5. Rate Test Result

**Submit user rating and feedback for a test**

```http
POST /api/pipeline/adapters/rate
```

**Request:**
```json
{
  "testId": "uuid",
  "rating": "adapted",
  "notes": "Much better empathy and emotional awareness"
}
```

**Request Fields:**
- `testId` (required) - Test result ID
- `rating` (required) - One of: `"control"`, `"adapted"`, `"tie"`, `"neither"`
- `notes` (optional) - Feedback text (max 1000 chars)

**Rating Values:**
- `"control"` - Control response was better
- `"adapted"` - Adapted response was better
- `"tie"` - Both responses equally good
- `"neither"` - Neither response was satisfactory

**Response (Success):**
```json
{
  "success": true
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid rating or validation error
- `404` - Test result not found
- `500` - Server error

**Example (TypeScript):**
```typescript
const rateTest = async (
  testId: string,
  rating: 'control' | 'adapted' | 'tie' | 'neither',
  notes?: string
) => {
  const response = await fetch('/api/pipeline/adapters/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId, rating, notes })
  });
  return response.json();
};
```

---

## Common Workflows

### Complete Testing Flow

```typescript
// 1. Deploy endpoints
const { data: { controlEndpoint, adaptedEndpoint } } = 
  await deployEndpoints(jobId);

// 2. Wait for endpoints to be ready
let ready = false;
while (!ready) {
  const { data } = await checkStatus(jobId);
  ready = data.bothReady;
  if (!ready) await new Promise(r => setTimeout(r, 5000));
}

// 3. Run tests
const test1 = await runTest(jobId, "Test prompt 1", {
  systemPrompt: "You are Elena Morales, CFP",
  enableEvaluation: true
});

const test2 = await runTest(jobId, "Test prompt 2", {
  enableEvaluation: false
});

// 4. Rate results
await rateTest(test1.data.id, "adapted", "Much better!");
await rateTest(test2.data.id, "control", "Original was clearer");

// 5. View history
const { data: history, count } = await getTestHistory(jobId);
console.log(`${count} total tests`);
```

---

## Response Times

Typical response times:

| Endpoint | Time | Notes |
|----------|------|-------|
| Deploy | 2-5s | Creates DB records + RunPod calls |
| Status | 500ms-2s | DB query + optional health check |
| Test (no eval) | 2-4s | Parallel inference |
| Test (with eval) | 4-8s | Inference + evaluation |
| History | 100-500ms | DB query |
| Rate | 50-200ms | DB update |

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Common Error Patterns:**

```typescript
const handleResponse = async (response: Response) => {
  const json = await response.json();
  
  if (!json.success) {
    throw new Error(json.error);
  }
  
  return json.data;
};

// Usage
try {
  const result = await deployEndpoints(jobId);
  // Use result
} catch (error) {
  console.error('Deployment failed:', error.message);
  // Show error to user
}
```

---

## Testing with cURL

### Deploy Endpoints
```bash
curl -X POST http://localhost:3000/api/pipeline/adapters/deploy \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "your-job-uuid"}'
```

### Check Status
```bash
curl "http://localhost:3000/api/pipeline/adapters/status?jobId=your-job-uuid" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### Run Test
```bash
curl -X POST http://localhost:3000/api/pipeline/adapters/test \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "your-job-uuid",
    "userPrompt": "Test prompt",
    "enableEvaluation": false
  }'
```

### Get History
```bash
curl "http://localhost:3000/api/pipeline/adapters/test?jobId=your-job-uuid&limit=10" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### Rate Test
```bash
curl -X POST http://localhost:3000/api/pipeline/adapters/rate \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "test-uuid",
    "rating": "adapted",
    "notes": "Great improvement"
  }'
```

---

## Best Practices

### 1. Status Polling
```typescript
// ✅ Good: Poll every 5-10 seconds
const pollStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const { data } = await checkStatus(jobId);
    if (data.bothReady) {
      clearInterval(interval);
      // Endpoints ready!
    }
  }, 5000);
};

// ❌ Bad: Continuous polling
// Don't poll more than once per second
```

### 2. Evaluation Usage
```typescript
// ✅ Good: Make evaluation optional
const quickTest = await runTest(jobId, prompt, {
  enableEvaluation: false  // Faster, cheaper
});

const detailedTest = await runTest(jobId, prompt, {
  enableEvaluation: true   // Slower, more insights
});

// ❌ Bad: Always enable evaluation
// Costs more and is slower
```

### 3. Pagination
```typescript
// ✅ Good: Use pagination for large result sets
const page1 = await getTestHistory(jobId, 0, 20);
const page2 = await getTestHistory(jobId, 1, 20);

// ❌ Bad: Request all results at once
// Can be slow and use lots of memory
```

### 4. Error Recovery
```typescript
// ✅ Good: Retry with exponential backoff
const retry = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

const result = await retry(() => runTest(jobId, prompt));
```

---

## Next Steps

1. **E04: React Query Hooks** - Use these APIs with React Query for automatic caching, refetching, and state management

2. **E05: UI Components** - Build user interface components that consume the React Query hooks

---

## Support

**Documentation:**
- Complete Guide: `docs/ADAPTER_E03_COMPLETE.md`
- Checklist: `docs/ADAPTER_E03_CHECKLIST.md`
- Quick Start: `docs/ADAPTER_E03_QUICK_START.md` (this file)

**Related Documentation:**
- E01 Types: `docs/ADAPTER_E01_COMPLETE.md`
- E02 Services: `docs/ADAPTER_E02_COMPLETE.md`

---

**Last Updated:** January 17, 2026  
**API Version:** 1.0  
**Status:** Production Ready ✅
