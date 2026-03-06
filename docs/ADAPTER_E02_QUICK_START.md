# Adapter Service Layer - Quick Start Guide

**Section:** E02 - Service Layer  
**Status:** ✅ Complete  
**Date:** January 17, 2026  

---

## Overview

This guide shows you how to use the Adapter Testing Service Layer in your application.

---

## Service Functions

### Inference Service

#### 1. Deploy Adapter Endpoints

Deploy control and adapted inference endpoints to RunPod.

```typescript
import { deployAdapterEndpoints } from '@/lib/services';

const result = await deployAdapterEndpoints(
  userId,      // User ID (for authorization)
  jobId        // Training job ID (must be completed)
);

if (result.success) {
  console.log('Control Endpoint:', result.data.controlEndpoint);
  console.log('Adapted Endpoint:', result.data.adaptedEndpoint);
} else {
  console.error('Deployment failed:', result.error);
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    controlEndpoint: InferenceEndpoint;  // Base model endpoint
    adaptedEndpoint: InferenceEndpoint;  // Base + LoRA endpoint
  };
  error?: string;
}
```

---

#### 2. Get Endpoint Status

Check if endpoints are ready for testing.

```typescript
import { getEndpointStatus } from '@/lib/services';

const result = await getEndpointStatus(jobId);

if (result.success) {
  console.log('Control Status:', result.data.controlEndpoint?.status);
  console.log('Adapted Status:', result.data.adaptedEndpoint?.status);
  console.log('Both Ready?', result.data.bothReady);
}
```

**Endpoint Statuses:**
- `pending` - Endpoint creation requested
- `deploying` - RunPod is deploying the endpoint
- `ready` - Endpoint is ready for inference
- `failed` - Deployment failed
- `terminated` - Endpoint has been shut down

---

#### 3. Call Inference Endpoint (Advanced)

Directly call an inference endpoint (typically not used directly; use Test Service instead).

```typescript
import { callInferenceEndpoint } from '@/lib/services';

const result = await callInferenceEndpoint(
  runpodEndpointId,    // RunPod endpoint ID
  "I'm worried about retirement",  // User prompt
  "You are Elena Morales, CFP",    // System prompt (optional)
  true                              // Use adapter? (true for adapted endpoint)
);

console.log('Response:', result.response);
console.log('Generation time:', result.generationTimeMs, 'ms');
console.log('Tokens used:', result.tokensUsed);
```

---

### Test Service

#### 1. Run A/B Test

Run a side-by-side test of control vs adapted models.

```typescript
import { runABTest, RunTestRequest } from '@/lib/services';

const request: RunTestRequest = {
  jobId: 'training-job-uuid',
  userPrompt: "I'm worried about my retirement savings. What should I do?",
  systemPrompt: "You are Elena Morales, a financial planning consultant.",  // Optional
  enableEvaluation: true  // Optional: Use Claude-as-Judge
};

const result = await runABTest(userId, request);

if (result.success) {
  console.log('Control Response:', result.data.controlResponse);
  console.log('Adapted Response:', result.data.adaptedResponse);
  
  if (result.data.evaluationEnabled) {
    console.log('Winner:', result.data.evaluationComparison?.winner);
    console.log('Score Difference:', result.data.evaluationComparison?.scoreDifference);
  }
}
```

**Test Flow:**
1. Verify endpoints are ready
2. Call control endpoint (base model)
3. Call adapted endpoint (base + LoRA)
4. (Optional) Evaluate both with Claude-as-Judge
5. Compare results and determine winner
6. Store all results in database

---

#### 2. Get Test History

Retrieve past test results with pagination.

```typescript
import { getTestHistory } from '@/lib/services';

const result = await getTestHistory(jobId, {
  limit: 10,   // Optional: Default 10
  offset: 0    // Optional: For pagination
});

if (result.success) {
  console.log(`Found ${result.count} tests`);
  result.data.forEach(test => {
    console.log(`Test ${test.id}:`, test.status);
    console.log(`  Control: ${test.controlResponse?.substring(0, 50)}...`);
    console.log(`  Adapted: ${test.adaptedResponse?.substring(0, 50)}...`);
    if (test.evaluationComparison) {
      console.log(`  Winner: ${test.evaluationComparison.winner}`);
    }
  });
}
```

---

#### 3. Rate Test Result

Save user rating for a test result.

```typescript
import { rateTestResult, UserRating } from '@/lib/services';

const result = await rateTestResult(
  testId,
  userId,
  'adapted' as UserRating,  // 'control' | 'adapted' | 'tie' | 'neither'
  'The adapted version showed better empathy'  // Optional notes
);

if (result.success) {
  console.log('Rating saved successfully');
}
```

---

## Complete Example: Full Testing Flow

```typescript
import {
  deployAdapterEndpoints,
  getEndpointStatus,
  runABTest,
  getTestHistory,
  rateTestResult
} from '@/lib/services';

async function runFullTestingWorkflow(userId: string, jobId: string) {
  // Step 1: Deploy endpoints
  console.log('Deploying endpoints...');
  const deployResult = await deployAdapterEndpoints(userId, jobId);
  if (!deployResult.success) {
    throw new Error(`Deployment failed: ${deployResult.error}`);
  }
  
  // Step 2: Wait for endpoints to be ready
  console.log('Waiting for endpoints to be ready...');
  let ready = false;
  while (!ready) {
    const statusResult = await getEndpointStatus(jobId);
    if (statusResult.success && statusResult.data.bothReady) {
      ready = true;
      console.log('Endpoints are ready!');
    } else {
      console.log('Still deploying... waiting 10 seconds');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Step 3: Run A/B test with Claude evaluation
  console.log('Running A/B test...');
  const testResult = await runABTest(userId, {
    jobId,
    userPrompt: "I'm worried about my retirement savings. What should I do?",
    systemPrompt: "You are Elena Morales, a financial planning consultant.",
    enableEvaluation: true
  });
  
  if (!testResult.success) {
    throw new Error(`Test failed: ${testResult.error}`);
  }
  
  // Step 4: Review results
  console.log('\n=== Test Results ===');
  console.log('Control Response:', testResult.data.controlResponse);
  console.log('\nAdapted Response:', testResult.data.adaptedResponse);
  
  if (testResult.data.evaluationComparison) {
    console.log('\n=== Claude-as-Judge Evaluation ===');
    console.log('Winner:', testResult.data.evaluationComparison.winner);
    console.log('Score Difference:', testResult.data.evaluationComparison.scoreDifference);
    console.log('Improvements:', testResult.data.evaluationComparison.improvements);
    console.log('Summary:', testResult.data.evaluationComparison.summary);
  }
  
  // Step 5: Rate the result
  console.log('\nSaving user rating...');
  const ratingResult = await rateTestResult(
    testResult.data.id,
    userId,
    testResult.data.evaluationComparison?.winner || 'tie',
    'Automated test workflow'
  );
  
  // Step 6: View test history
  console.log('\nRetrieving test history...');
  const historyResult = await getTestHistory(jobId, { limit: 5 });
  console.log(`Total tests run: ${historyResult.count}`);
  
  return testResult.data;
}
```

---

## Type Definitions

### InferenceEndpoint

```typescript
interface InferenceEndpoint {
  id: string;
  jobId: string;
  userId: string;
  endpointType: 'control' | 'adapted';
  runpodEndpointId: string | null;
  baseModel: string;
  adapterPath: string | null;
  status: EndpointStatus;
  healthCheckUrl: string | null;
  lastHealthCheck: string | null;
  idleTimeoutSeconds: number;
  estimatedCostPerHour: number | null;
  createdAt: string;
  readyAt: string | null;
  terminatedAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
}
```

### TestResult

```typescript
interface TestResult {
  id: string;
  jobId: string;
  userId: string;
  systemPrompt: string | null;
  userPrompt: string;
  controlResponse: string | null;
  controlGenerationTimeMs: number | null;
  controlTokensUsed: number | null;
  adaptedResponse: string | null;
  adaptedGenerationTimeMs: number | null;
  adaptedTokensUsed: number | null;
  evaluationEnabled: boolean;
  controlEvaluation: ClaudeEvaluation | null;
  adaptedEvaluation: ClaudeEvaluation | null;
  evaluationComparison: EvaluationComparison | null;
  userRating: UserRating | null;
  userNotes: string | null;
  status: TestResultStatus;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}
```

### ClaudeEvaluation

```typescript
interface ClaudeEvaluation {
  emotionalProgression: {
    startState: { primaryEmotion: string; intensity: number };
    endState: { primaryEmotion: string; intensity: number };
    arcCompleted: boolean;
    progressionQuality: number;  // 1-5
    progressionNotes: string;
  };
  empathyEvaluation: {
    emotionsAcknowledged: boolean;
    acknowledgmentInFirstSentence: boolean;
    validationProvided: boolean;
    empathyScore: number;  // 1-5
    empathyNotes: string;
  };
  voiceConsistency: {
    warmthPresent: boolean;
    judgmentFree: boolean;
    specificNumbersUsed: boolean;
    jargonExplained: boolean;
    voiceScore: number;  // 1-5
    voiceNotes: string;
  };
  conversationQuality: {
    helpfulToUser: boolean;
    actionableGuidance: boolean;
    appropriateDepth: boolean;
    naturalFlow: boolean;
    qualityScore: number;  // 1-5
    qualityNotes: string;
  };
  overallEvaluation: {
    wouldUserFeelHelped: boolean;
    overallScore: number;  // 1-5
    keyStrengths: string[];
    areasForImprovement: string[];
    summary: string;
  };
}
```

### EvaluationComparison

```typescript
interface EvaluationComparison {
  winner: 'control' | 'adapted' | 'tie';
  controlOverallScore: number;
  adaptedOverallScore: number;
  scoreDifference: number;
  improvements: string[];
  regressions: string[];
  summary: string;
}
```

---

## Error Handling

All service functions return a standardized response:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

**Example:**

```typescript
const result = await runABTest(userId, request);

if (!result.success) {
  // Handle error
  console.error('Test failed:', result.error);
  return;
}

// Use data
const testData = result.data;
```

---

## Environment Variables

Required in `.env.local`:

```bash
# Claude API (for evaluation)
ANTHROPIC_API_KEY=sk-ant-...

# RunPod API (for inference endpoints)
RUNPOD_API_KEY=...
RUNPOD_API_URL=https://api.runpod.io/graphql

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Common Patterns

### Pattern 1: Deploy and Wait

```typescript
async function deployAndWait(userId: string, jobId: string) {
  await deployAdapterEndpoints(userId, jobId);
  
  while (true) {
    const status = await getEndpointStatus(jobId);
    if (status.data?.bothReady) break;
    await new Promise(r => setTimeout(r, 5000));
  }
}
```

### Pattern 2: Batch Testing

```typescript
async function runBatchTests(userId: string, jobId: string, prompts: string[]) {
  const results = [];
  
  for (const prompt of prompts) {
    const result = await runABTest(userId, {
      jobId,
      userPrompt: prompt,
      enableEvaluation: true
    });
    
    if (result.success) {
      results.push(result.data);
    }
  }
  
  return results;
}
```

### Pattern 3: Winner Statistics

```typescript
async function getWinnerStats(jobId: string) {
  const history = await getTestHistory(jobId);
  
  if (!history.success) return null;
  
  const stats = {
    control: 0,
    adapted: 0,
    tie: 0
  };
  
  history.data?.forEach(test => {
    if (test.evaluationComparison?.winner) {
      stats[test.evaluationComparison.winner]++;
    }
  });
  
  return stats;
}
```

---

## Integration with API Routes (E03)

The service layer is designed to be called from API routes:

```typescript
// Example API route: app/api/pipeline/adapters/test/route.ts
import { runABTest } from '@/lib/services';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth(request);
  if (authResponse) return authResponse;
  
  const body = await request.json();
  const result = await runABTest(user.id, body);
  
  return NextResponse.json(result);
}
```

---

## Next Steps

1. **E03:** Implement API routes that expose these services as HTTP endpoints
2. **E04:** Create React Query hooks for frontend data fetching
3. **E05:** Build UI components to display test results

---

## Troubleshooting

### Endpoints stuck in "deploying" status
- Check RunPod dashboard for endpoint status
- Verify GPU availability in your RunPod account
- Check RunPod API key is valid

### Claude evaluation fails but responses generated
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify Claude API quota/credits
- Review error message in `test.errorMessage`

### Inference calls timeout
- RunPod may be cold-starting the endpoint
- Increase timeout in `callInferenceEndpoint` (currently 30s default)
- Check endpoint health URL

---

**E02 Service Layer Complete**  
Ready for E03: API Routes Implementation
