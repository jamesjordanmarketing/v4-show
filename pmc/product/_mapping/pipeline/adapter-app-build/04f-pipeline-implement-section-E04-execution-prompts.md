# Adapter Application Module - Section E04: React Query Hooks

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E04 - Data Fetching Layer  
**Prerequisites:** E01 (Database), E02 (Services), E03 (API Routes) must be complete  
**Builds Upon:** E01, E02, and E03 foundation  

---

## Overview

This prompt implements the React Query hooks for adapter testing. This section creates custom hooks that provide data fetching, caching, and mutation capabilities for the frontend components.

**What This Section Creates:**
1. Complete adapter testing hooks in `useAdapterTesting.ts`
2. Query key management for cache invalidation
3. Optimistic updates and polling strategies
4. Integration with existing pipeline hooks

**What This Section Does NOT Create:**
- UI components (E05)
- API routes (E03 - already done)
- Service layer (E02 - already done)

---

## Critical Instructions

### React Query Patterns

Follow existing patterns from:
- `src/hooks/usePipelineJobs.ts` - Query patterns
- Use `@tanstack/react-query` for all data fetching
- Implement proper cache invalidation
- Use optimistic updates where appropriate

### Environment Variables

No new environment variables needed for this section.

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/hooks/usePipelineJobs.ts` - Existing hook patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`

---

========================

# EXECUTION PROMPT E04 - REACT QUERY HOOKS

## Context

You are implementing the React Query hooks for the Adapter Application Module. These hooks provide a clean data fetching and mutation interface for the frontend components.

**Hook Architecture:**
- Query hooks for data fetching (endpoints status, test history)
- Mutation hooks for actions (deploy, run test, rate)
- Automatic cache invalidation after mutations
- Polling for endpoint status during deployment
- Integration with existing pipeline query keys

---

## Task 1: Create Adapter Testing Hooks

This file contains all hooks for adapter testing functionality.

### File: `src/hooks/useAdapterTesting.ts`

```typescript
/**
 * Adapter Testing Hooks
 *
 * React Query hooks for adapter deployment and A/B testing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestResponse,
  TestResultListResponse,
  TestResult,
  UserRating,
} from '@/types/pipeline-adapter';

// ============================================
// Query Keys
// ============================================

// Import existing pipeline query keys
import { pipelineKeys } from './usePipelineJobs';

export const adapterTestingKeys = {
  all: ['adapter-testing'] as const,
  endpoints: (jobId: string) => [...adapterTestingKeys.all, 'endpoints', jobId] as const,
  tests: (jobId: string) => [...adapterTestingKeys.all, 'tests', jobId] as const,
  testList: (jobId: string, filters?: { limit?: number }) =>
    [...adapterTestingKeys.tests(jobId), 'list', filters] as const,
};

// ============================================
// API Functions
// ============================================

async function deployAdapter(jobId: string): Promise<DeployAdapterResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/deploy`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deploy adapter');
  }
  return response.json();
}

async function getEndpointStatus(jobId: string): Promise<EndpointStatusResponse> {
  const response = await fetch(`/api/pipeline/jobs/${jobId}/endpoints`);
  if (!response.ok) throw new Error('Failed to get endpoint status');
  return response.json();
}

async function runTest(params: {
  jobId: string;
  userPrompt: string;
  systemPrompt?: string;
  enableEvaluation?: boolean;
}): Promise<RunTestResponse> {
  const response = await fetch(`/api/pipeline/jobs/${params.jobId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      enableEvaluation: params.enableEvaluation,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run test');
  }
  return response.json();
}

async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<TestResultListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const response = await fetch(`/api/pipeline/jobs/${jobId}/test?${params}`);
  if (!response.ok) throw new Error('Failed to get test history');
  return response.json();
}

async function rateTest(params: {
  testId: string;
  rating: UserRating;
  notes?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch(`/api/pipeline/test/${params.testId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: params.rating, notes: params.notes }),
  });
  if (!response.ok) throw new Error('Failed to submit rating');
  return response.json();
}

// ============================================
// Hooks
// ============================================

/**
 * Deploy adapter endpoints (Control and Adapted)
 */
export function useDeployAdapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deployAdapter,
    onSuccess: (_, jobId) => {
      // Invalidate endpoint status to trigger refetch
      queryClient.invalidateQueries({ queryKey: adapterTestingKeys.endpoints(jobId) });
      
      // Also invalidate job details (may want to show deployment status)
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(jobId) });
    },
  });
}

/**
 * Get endpoint status with automatic polling during deployment
 */
export function useEndpointStatus(jobId: string | null) {
  return useQuery({
    queryKey: adapterTestingKeys.endpoints(jobId || ''),
    queryFn: () => getEndpointStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll every 5s if endpoints are deploying
      const data = query.state.data;
      if (data?.data && !data.data.bothReady) {
        return 5000;
      }
      return false;
    },
    staleTime: 10 * 1000,  // 10 seconds
  });
}

/**
 * Run an A/B test
 */
export function useRunTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runTest,
    onSuccess: (_, variables) => {
      // Invalidate test history to show new test
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.tests(variables.jobId)
      });
    },
  });
}

/**
 * Get test history for a job
 */
export function useTestHistory(
  jobId: string | null,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: adapterTestingKeys.testList(jobId || '', options),
    queryFn: () => getTestHistory(jobId!, options),
    enabled: !!jobId,
    staleTime: 30 * 1000,  // 30 seconds
  });
}

/**
 * Rate a test result
 */
export function useRateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rateTest,
    onSuccess: () => {
      // Invalidate all test lists (we don't know which job)
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.all
      });
    },
  });
}

/**
 * Combined hook for deployment workflow
 * 
 * Provides both deployment action and status checking
 */
export function useAdapterDeployment(jobId: string | null) {
  const deploy = useDeployAdapter();
  const status = useEndpointStatus(jobId);

  return {
    deploy: async () => {
      if (!jobId) throw new Error('Job ID required');
      return deploy.mutateAsync(jobId);
    },
    isDeploying: deploy.isPending,
    deployError: deploy.error,
    status: status.data?.data,
    isLoadingStatus: status.isLoading,
    statusError: status.error,
    bothReady: status.data?.data?.bothReady || false,
  };
}

/**
 * Combined hook for testing workflow
 * 
 * Provides test execution, history, and rating
 */
export function useAdapterTesting(jobId: string | null) {
  const runTestMutation = useRunTest();
  const history = useTestHistory(jobId, { limit: 20 });
  const rate = useRateTest();

  return {
    runTest: runTestMutation.mutateAsync,
    isRunning: runTestMutation.isPending,
    runError: runTestMutation.error,
    latestResult: runTestMutation.data?.data,
    
    history: history.data?.data || [],
    historyCount: history.data?.count || 0,
    isLoadingHistory: history.isLoading,
    historyError: history.error,
    
    rateTest: rate.mutateAsync,
    isRating: rate.isPending,
    rateError: rate.error,
  };
}
```

---

## Task 2: Integration with Existing Hooks

Update the hooks index to export new adapter testing hooks.

### File: `src/hooks/index.ts`

If this file exists, add to exports. If not, create it:

```typescript
// Existing pipeline hooks
export * from './usePipelineJobs';

// NEW: Adapter testing hooks
export * from './useAdapterTesting';

// Other existing exports...
```

---

## Task 3: Verification & Testing

After creating all files, verify the implementation:

### 1. Verify TypeScript Compilation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json
```

### 2. Test Hook Exports

Create a quick test file: `src/hooks/__tests__/useAdapterTesting.test.tsx`

```typescript
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeployAdapter, useEndpointStatus, useRunTest } from '../useAdapterTesting';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useAdapterTesting hooks', () => {
  it('should provide deploy adapter mutation', () => {
    const { result } = renderHook(() => useDeployAdapter(), { wrapper });
    expect(result.current.mutate).toBeDefined();
  });

  it('should provide endpoint status query', () => {
    const { result } = renderHook(() => useEndpointStatus('test-job-id'), { wrapper });
    expect(result.current.isLoading).toBeDefined();
  });

  it('should provide run test mutation', () => {
    const { result } = renderHook(() => useRunTest(), { wrapper });
    expect(result.current.mutate).toBeDefined();
  });
});
```

### 3. Test Query Keys

Verify query keys are properly structured:

```typescript
import { adapterTestingKeys } from '../useAdapterTesting';

describe('Adapter Testing Query Keys', () => {
  it('should generate correct endpoint query keys', () => {
    const key = adapterTestingKeys.endpoints('job-123');
    expect(key).toEqual(['adapter-testing', 'endpoints', 'job-123']);
  });

  it('should generate correct test query keys', () => {
    const key = adapterTestingKeys.testList('job-123', { limit: 10 });
    expect(key).toEqual(['adapter-testing', 'tests', 'job-123', 'list', { limit: 10 }]);
  });
});
```

---

## Success Criteria

Verify ALL criteria are met:

- [ ] `src/hooks/useAdapterTesting.ts` created with all hooks
- [ ] Query keys properly structured and exported
- [ ] Deploy mutation invalidates endpoint status
- [ ] Endpoint status query polls during deployment
- [ ] Run test mutation invalidates test history
- [ ] Rate test mutation invalidates test lists
- [ ] Combined hooks provide convenient interfaces
- [ ] TypeScript compiles without errors
- [ ] All hooks follow React Query best practices
- [ ] Proper error handling in all hooks
- [ ] Cache invalidation strategies implemented

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useAdapterTesting.ts` | All adapter testing hooks |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/index.ts` | Added adapter testing hook exports |

---

## Hook Documentation

### useDeployAdapter()
**Purpose:** Deploy Control and Adapted endpoints  
**Returns:** Mutation with `mutate`, `mutateAsync`, `isPending`, `error`  
**Usage:**
```typescript
const deploy = useDeployAdapter();
await deploy.mutateAsync(jobId);
```

### useEndpointStatus(jobId)
**Purpose:** Get endpoint status with auto-polling  
**Returns:** Query with `data`, `isLoading`, `error`  
**Polling:** Every 5s when deploying  
**Usage:**
```typescript
const { data, isLoading } = useEndpointStatus(jobId);
const bothReady = data?.data?.bothReady;
```

### useRunTest()
**Purpose:** Run A/B test  
**Returns:** Mutation with `mutateAsync`, `isPending`, `data`, `error`  
**Usage:**
```typescript
const runTest = useRunTest();
const result = await runTest.mutateAsync({
  jobId,
  userPrompt: 'Test prompt',
  enableEvaluation: true,
});
```

### useTestHistory(jobId, options)
**Purpose:** Get test history  
**Returns:** Query with `data`, `isLoading`, `error`  
**Usage:**
```typescript
const { data } = useTestHistory(jobId, { limit: 20 });
const tests = data?.data || [];
```

### useRateTest()
**Purpose:** Rate test result  
**Returns:** Mutation with `mutateAsync`, `isPending`, `error`  
**Usage:**
```typescript
const rate = useRateTest();
await rate.mutateAsync({
  testId,
  rating: 'adapted',
  notes: 'Better empathy',
});
```

### useAdapterDeployment(jobId)
**Purpose:** Combined deployment workflow  
**Returns:** Object with deploy action and status  
**Usage:**
```typescript
const {
  deploy,
  isDeploying,
  status,
  bothReady,
} = useAdapterDeployment(jobId);

await deploy();
```

### useAdapterTesting(jobId)
**Purpose:** Combined testing workflow  
**Returns:** Object with test actions and history  
**Usage:**
```typescript
const {
  runTest,
  isRunning,
  latestResult,
  history,
  rateTest,
} = useAdapterTesting(jobId);

await runTest({ userPrompt: 'Test', enableEvaluation: true });
```

---

## Next Steps

After completing E04:
- **E05:** UI Components & Pages (final section)

---

**END OF E04 PROMPT**

+++++++++++++++++



