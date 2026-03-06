# Adapter E04 - Quick Start Guide

**React Query Hooks for Adapter Testing**  
**Version:** 2.0  
**Date:** January 17, 2026

---

## Overview

This guide provides quick reference for using the adapter testing React Query hooks. All hooks are fully typed, documented, and tested.

---

## Installation

**Already installed** - No additional packages needed.

```typescript
import {
  // Query hooks
  useEndpointStatus,
  useTestHistory,
  
  // Mutation hooks
  useDeployAdapter,
  useRunTest,
  useRateTest,
  
  // Combined hooks (recommended)
  useAdapterDeployment,
  useAdapterTesting,
  useAdapterWorkflow,
} from '@/hooks';
```

---

## Quick Examples

### 1. Simple Deployment

```typescript
import { useAdapterDeployment } from '@/hooks';

function DeployButton({ jobId }: { jobId: string }) {
  const { deploy, isDeploying, bothReady } = useAdapterDeployment(jobId);

  return (
    <button onClick={deploy} disabled={isDeploying || bothReady}>
      {isDeploying ? 'Deploying...' : bothReady ? 'Ready!' : 'Deploy'}
    </button>
  );
}
```

### 2. Run A/B Test

```typescript
import { useAdapterTesting } from '@/hooks';

function TestRunner({ jobId }: { jobId: string }) {
  const [prompt, setPrompt] = useState('');
  const { runTest, isRunning, latestResult } = useAdapterTesting(jobId);

  const handleTest = async () => {
    await runTest({
      jobId,
      userPrompt: prompt,
      enableEvaluation: true,
    });
  };

  return (
    <div>
      <input value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button onClick={handleTest} disabled={isRunning}>
        Run Test
      </button>
      
      {latestResult && (
        <div>
          <p>Control: {latestResult.controlResponse}</p>
          <p>Adapted: {latestResult.adaptedResponse}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Complete Workflow

```typescript
import { useAdapterWorkflow } from '@/hooks';

function AdapterTestingPage({ jobId }: { jobId: string }) {
  const adapter = useAdapterWorkflow(jobId);

  return (
    <div>
      {/* Step 1: Deploy */}
      <button onClick={adapter.deploy} disabled={adapter.isDeploying}>
        {adapter.isDeploying ? 'Deploying...' : 'Deploy Endpoints'}
      </button>

      {/* Step 2: Test (only when ready) */}
      {adapter.bothReady && (
        <button 
          onClick={() => adapter.runTest({
            jobId,
            userPrompt: 'Test prompt',
            enableEvaluation: true,
          })}
          disabled={adapter.isRunning}
        >
          Run Test
        </button>
      )}

      {/* Step 3: Rate */}
      {adapter.latestResult && (
        <div>
          <button onClick={() => adapter.rateTest({
            testId: adapter.latestResult!.id,
            rating: 'adapted',
            notes: 'Better response!',
          })}>
            Rate: Adapted Better
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Hook Reference

### Combined Hooks (Recommended)

#### useAdapterDeployment(jobId)

**Best for:** Deployment panels, status indicators

**Returns:**
```typescript
{
  // Actions
  deploy: () => Promise<DeployAdapterResponse>;
  
  // Status
  bothReady: boolean;
  isControlReady: boolean;
  isAdaptedReady: boolean;
  hasAnyFailed: boolean;
  
  // Data
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
  status: { controlEndpoint, adaptedEndpoint, bothReady } | undefined;
  
  // Loading states
  isDeploying: boolean;
  isLoadingStatus: boolean;
  isRefetchingStatus: boolean;
  
  // Errors
  deployError: Error | null;
  statusError: Error | null;
}
```

**Example:**
```typescript
const { deploy, bothReady, controlEndpoint } = useAdapterDeployment(jobId);
```

---

#### useAdapterTesting(jobId, options?)

**Best for:** Test runners, history tables

**Parameters:**
```typescript
{
  limit?: number;   // Default: 20
  offset?: number;  // Default: 0
}
```

**Returns:**
```typescript
{
  // Run test
  runTest: (params: RunTestRequest) => Promise<RunTestResponse>;
  isRunning: boolean;
  runError: Error | null;
  latestResult: TestResult | null;
  
  // History
  history: TestResult[];
  historyCount: number;
  isLoadingHistory: boolean;
  isRefetchingHistory: boolean;
  historyError: Error | null;
  refetchHistory: () => void;
  
  // Rate test
  rateTest: (params) => Promise<{ success: boolean }>;
  isRating: boolean;
  rateError: Error | null;
  
  // Pagination
  hasHistory: boolean;
  currentPage: number;
  totalPages: number;
}
```

**Example:**
```typescript
const { runTest, history, rateTest } = useAdapterTesting(jobId, { limit: 20 });
```

---

#### useAdapterWorkflow(jobId)

**Best for:** Complete testing workflows

**Returns:** All of `useAdapterDeployment` + `useAdapterTesting` plus:
```typescript
{
  canTest: boolean;    // True when both endpoints ready
  isWorking: boolean;  // True during any operation
}
```

**Example:**
```typescript
const adapter = useAdapterWorkflow(jobId);

if (adapter.canTest) {
  await adapter.runTest({ jobId, userPrompt: 'Test' });
}
```

---

### Individual Hooks

#### useEndpointStatus(jobId, options?)

**Get endpoint deployment status with automatic polling**

**Parameters:**
```typescript
jobId: string | null;
options?: {
  enabled?: boolean;
  refetchInterval?: number | false;
}
```

**Example:**
```typescript
const { data, isLoading } = useEndpointStatus(jobId);
const bothReady = data?.data?.bothReady;
```

**Auto-polling:** Polls every 5s when endpoints are deploying, stops when ready/failed.

---

#### useTestHistory(jobId, options?)

**Get paginated test history**

**Parameters:**
```typescript
jobId: string | null;
options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}
```

**Example:**
```typescript
const { data } = useTestHistory(jobId, { limit: 20, offset: 0 });
const tests = data?.data || [];
const totalCount = data?.count || 0;
```

---

#### useDeployAdapter()

**Deploy control and adapted endpoints**

**Example:**
```typescript
const deploy = useDeployAdapter();

const handleDeploy = async () => {
  try {
    const result = await deploy.mutateAsync(jobId);
    console.log('Deployed:', result.data);
  } catch (error) {
    console.error('Failed:', error);
  }
};
```

**Cache invalidation:** Invalidates endpoint status query.

---

#### useRunTest()

**Run A/B test between control and adapted models**

**Example:**
```typescript
const runTest = useRunTest();

const result = await runTest.mutateAsync({
  jobId,
  userPrompt: 'I need help with retirement planning',
  systemPrompt: 'You are Elena Morales, CFP',
  enableEvaluation: true,
});
```

**Cache invalidation:** Invalidates test history for job.

---

#### useRateTest()

**Rate a test result with optimistic updates**

**Example:**
```typescript
const rate = useRateTest();

await rate.mutateAsync({
  testId: 'test-uuid',
  rating: 'adapted',
  notes: 'Much better empathy!',
});
```

**Optimistic update:** UI updates immediately, rolls back on error.

---

## Common Patterns

### Pattern 1: Deployment with Status Polling

```typescript
function DeploymentPanel({ jobId }: { jobId: string }) {
  const { deploy, isDeploying, bothReady, status } = useAdapterDeployment(jobId);

  return (
    <div>
      <button onClick={deploy} disabled={isDeploying || bothReady}>
        {isDeploying ? 'Deploying...' : bothReady ? 'Deployed' : 'Deploy'}
      </button>
      
      {status && (
        <div>
          <p>Control: {status.controlEndpoint?.status}</p>
          <p>Adapted: {status.adaptedEndpoint?.status}</p>
        </div>
      )}
      
      {bothReady && <p>✅ Both endpoints ready to test!</p>}
    </div>
  );
}
```

**Key Points:**
- Auto-polls every 5s during deployment
- Stops polling when both ready or failed
- No manual refetch needed

---

### Pattern 2: Test with Evaluation

```typescript
function TestRunner({ jobId }: { jobId: string }) {
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enableEval, setEnableEval] = useState(true);
  
  const { runTest, isRunning, latestResult } = useAdapterTesting(jobId);

  const handleTest = async () => {
    await runTest({
      jobId,
      userPrompt,
      systemPrompt: systemPrompt || undefined,
      enableEvaluation: enableEval,
    });
  };

  return (
    <div>
      <textarea 
        value={userPrompt} 
        onChange={e => setUserPrompt(e.target.value)}
        placeholder="User prompt..."
      />
      
      <textarea 
        value={systemPrompt} 
        onChange={e => setSystemPrompt(e.target.value)}
        placeholder="System prompt (optional)..."
      />
      
      <label>
        <input 
          type="checkbox" 
          checked={enableEval} 
          onChange={e => setEnableEval(e.target.checked)}
        />
        Enable Claude evaluation
      </label>
      
      <button onClick={handleTest} disabled={isRunning || !userPrompt}>
        {isRunning ? 'Running...' : 'Run Test'}
      </button>

      {latestResult && (
        <ComparisonView result={latestResult} />
      )}
    </div>
  );
}
```

---

### Pattern 3: Paginated History

```typescript
function TestHistoryTable({ jobId }: { jobId: string }) {
  const [page, setPage] = useState(0);
  const limit = 20;

  const {
    history,
    historyCount,
    isLoadingHistory,
    currentPage,
    totalPages,
  } = useAdapterTesting(jobId, {
    limit,
    offset: page * limit,
  });

  return (
    <div>
      {isLoadingHistory ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Rating</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map(test => (
              <tr key={test.id}>
                <td>{test.userPrompt}</td>
                <td>{test.userRating || 'Not rated'}</td>
                <td>{new Date(test.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div>
        <span>Page {currentPage + 1} of {totalPages}</span>
        
        <button 
          onClick={() => setPage(p => p - 1)} 
          disabled={page === 0}
        >
          Previous
        </button>
        
        <button 
          onClick={() => setPage(p => p + 1)} 
          disabled={page >= totalPages - 1}
        >
          Next
        </button>
      </div>
      
      <p>Total: {historyCount} tests</p>
    </div>
  );
}
```

---

### Pattern 4: Rating with Optimistic Update

```typescript
function RatingButtons({ testId }: { testId: string }) {
  const { rateTest, isRating } = useAdapterTesting(jobId);

  const handleRate = async (rating: UserRating) => {
    await rateTest({
      testId,
      rating,
      notes: '', // Optional
    });
  };

  return (
    <div>
      <button 
        onClick={() => handleRate('control')} 
        disabled={isRating}
      >
        Control Better
      </button>
      
      <button 
        onClick={() => handleRate('adapted')} 
        disabled={isRating}
      >
        Adapted Better
      </button>
      
      <button 
        onClick={() => handleRate('tie')} 
        disabled={isRating}
      >
        Tie
      </button>
      
      <button 
        onClick={() => handleRate('neither')} 
        disabled={isRating}
      >
        Neither
      </button>
    </div>
  );
}
```

**Key Points:**
- UI updates immediately (optimistic update)
- Rolls back if API fails
- Refetches on success for consistency

---

### Pattern 5: Error Handling

```typescript
function TestRunnerWithErrors({ jobId }: { jobId: string }) {
  const { 
    runTest, 
    isRunning, 
    runError,
    latestResult 
  } = useAdapterTesting(jobId);

  const handleTest = async () => {
    try {
      await runTest({
        jobId,
        userPrompt: 'Test prompt',
        enableEvaluation: true,
      });
    } catch (error) {
      // Error is also available in runError
      console.error('Test failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleTest} disabled={isRunning}>
        Run Test
      </button>

      {runError && (
        <div className="error">
          Error: {runError.message}
        </div>
      )}

      {latestResult && (
        <div className="success">
          Test completed successfully!
        </div>
      )}
    </div>
  );
}
```

---

## Query Keys

**For cache invalidation or inspection:**

```typescript
import { adapterTestingKeys } from '@/hooks';

// Base keys
adapterTestingKeys.all              // ['adapter-testing']
adapterTestingKeys.endpoints()      // ['adapter-testing', 'endpoints']
adapterTestingKeys.tests()          // ['adapter-testing', 'tests']

// Endpoint keys
adapterTestingKeys.endpointStatus('job-123')
// ['adapter-testing', 'endpoints', 'job-123']

// Test keys
adapterTestingKeys.testsByJob('job-123')
// ['adapter-testing', 'tests', 'job-123']

adapterTestingKeys.testHistory('job-123', { limit: 20, offset: 0 })
// ['adapter-testing', 'tests', 'job-123', 'history', { limit: 20, offset: 0 }]

adapterTestingKeys.testDetail('test-456')
// ['adapter-testing', 'tests', 'test-456']
```

**Manual invalidation:**
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { adapterTestingKeys } from '@/hooks';

function MyComponent() {
  const queryClient = useQueryClient();

  const refetchAll = () => {
    queryClient.invalidateQueries({
      queryKey: adapterTestingKeys.all
    });
  };

  return <button onClick={refetchAll}>Refresh All</button>;
}
```

---

## Type Reference

```typescript
import type {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
  UserRating,
  TestResult,
  InferenceEndpoint,
} from '@/hooks';  // Re-exported from @/types/pipeline-adapter
```

---

## API Endpoints Used

All hooks call these E03 API endpoints:

| Hook | Endpoint | Method |
|------|----------|--------|
| `useDeployAdapter` | `/api/pipeline/adapters/deploy` | POST |
| `useEndpointStatus` | `/api/pipeline/adapters/status` | GET |
| `useRunTest` | `/api/pipeline/adapters/test` | POST |
| `useTestHistory` | `/api/pipeline/adapters/test` | GET |
| `useRateTest` | `/api/pipeline/adapters/rate` | POST |

---

## Performance Tips

### 1. Use Combined Hooks

**Good:**
```typescript
const adapter = useAdapterWorkflow(jobId);
```

**Avoid:**
```typescript
const deploy = useDeployAdapter();
const status = useEndpointStatus(jobId);
const runTest = useRunTest();
const history = useTestHistory(jobId);
const rate = useRateTest();
```

**Why:** Combined hooks reduce code and provide better type inference.

---

### 2. Control Polling

**Custom interval:**
```typescript
const { data } = useEndpointStatus(jobId, {
  refetchInterval: 10000, // Poll every 10s instead of 5s
});
```

**Disable polling:**
```typescript
const { data } = useEndpointStatus(jobId, {
  refetchInterval: false,
});
```

---

### 3. Conditional Fetching

**Disable when not needed:**
```typescript
const { data } = useTestHistory(jobId, {
  enabled: isTabActive, // Only fetch when tab is active
});
```

---

### 4. Pagination Best Practices

**Track page in state:**
```typescript
const [page, setPage] = useState(0);
const limit = 20;

const { history } = useAdapterTesting(jobId, {
  limit,
  offset: page * limit,
});
```

**Reset page on jobId change:**
```typescript
useEffect(() => {
  setPage(0);
}, [jobId]);
```

---

## Troubleshooting

### "Query not refetching"

**Problem:** Status not updating during deployment

**Solution:** Check that polling is enabled:
```typescript
const { data } = useEndpointStatus(jobId, {
  refetchInterval: undefined, // Let hook decide (default)
});
```

---

### "Optimistic update not showing"

**Problem:** Rating doesn't update immediately

**Solution:** Use `useAdapterTesting` or `useAdapterWorkflow` hooks, not individual `useRateTest`:
```typescript
const { rateTest } = useAdapterTesting(jobId);
await rateTest({ testId, rating: 'adapted' });
```

---

### "Too many re-renders"

**Problem:** Component re-rendering too often

**Solution:** Don't destructure in render:
```typescript
// Bad - re-renders on every property change
const { deploy, bothReady, isControlReady, ... } = useAdapterDeployment(jobId);

// Good - only access what you need
const deployment = useAdapterDeployment(jobId);
return <button disabled={deployment.bothReady}>Deploy</button>;
```

---

### "Stale data after mutation"

**Problem:** History not updating after running test

**Solution:** Check that mutation succeeded:
```typescript
const { runTest, runError } = useAdapterTesting(jobId);

const handleTest = async () => {
  try {
    await runTest({ ... });
    // Success - history will auto-update
  } catch (error) {
    console.error('Test failed:', error);
    // Check runError for details
  }
};
```

---

## Best Practices

### 1. Always handle errors

```typescript
const { deploy, deployError } = useAdapterDeployment(jobId);

if (deployError) {
  return <div>Error: {deployError.message}</div>;
}
```

### 2. Show loading states

```typescript
const { isRunning } = useAdapterTesting(jobId);

return (
  <button disabled={isRunning}>
    {isRunning ? 'Running...' : 'Run Test'}
  </button>
);
```

### 3. Use null checks

```typescript
const { latestResult } = useAdapterTesting(jobId);

if (!latestResult) return null;

return <div>{latestResult.controlResponse}</div>;
```

### 4. Provide user feedback

```typescript
const { bothReady, isLoadingStatus } = useAdapterDeployment(jobId);

if (isLoadingStatus) return <Spinner />;
if (!bothReady) return <p>Deploying endpoints...</p>;
return <p>Ready to test!</p>;
```

---

## Next Steps

**After E04 (Hooks), implement E05 (UI Components):**

1. Deployment Panel - Deploy and monitor endpoints
2. Test Runner - Input prompts and run tests
3. Comparison View - Side-by-side response display
4. Evaluation Display - Claude scores and feedback
5. Test History Table - Browse past tests
6. Rating Interface - Rate and provide feedback

**All hooks are ready to use in these components!**

---

## Additional Resources

- **Complete Implementation:** `docs/ADAPTER_E04_COMPLETE.md`
- **Verification Checklist:** `docs/ADAPTER_E04_CHECKLIST.md`
- **E01 Types:** `docs/ADAPTER_E01_COMPLETE.md`
- **E03 API Routes:** `docs/ADAPTER_E03_COMPLETE.md`

---

**Last Updated:** January 17, 2026  
**Version:** E04B v2.0  
**Status:** Production Ready
