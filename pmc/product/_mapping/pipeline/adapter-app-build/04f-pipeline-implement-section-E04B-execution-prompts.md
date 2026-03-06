# Adapter Application Module - Section E04: React Query Hooks

**Version:** 2.0 (Revised)  
**Date:** January 17, 2026  
**Section:** E04 - Data Fetching Layer  
**Prerequisites:** E01 (Database Schema & Types) ✅ COMPLETE, E02 (Service Layer) ✅ COMPLETE, E03 (API Routes) ✅ COMPLETE  
**Builds Upon:** E01, E02, and E03 foundation  

---

## Overview

This prompt implements the React Query hooks for the adapter testing infrastructure. This section creates custom hooks that provide data fetching, caching, mutation capabilities, and automatic state management for the frontend components.

**What This Section Creates:**
1. **Adapter Testing Hooks** - Complete React Query hooks for all adapter operations
2. **Query Key Management** - Structured cache keys for efficient invalidation
3. **Optimistic Updates** - Immediate UI feedback for user actions
4. **Polling Strategies** - Automatic status polling during deployment
5. **Combined Hooks** - Convenient high-level hooks for common workflows

**What This Section Does NOT Create:**
- UI components (E05)
- API routes (E03 - already complete)
- Service layer (E02 - already complete)

---

## Critical Instructions

### React Query Patterns (IMPORTANT!)

**Use React Query v5 patterns:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query pattern
useQuery({
  queryKey: ['key'],
  queryFn: async () => { ... },
  enabled: boolean,
  refetchInterval: number | false,
  staleTime: number,
});

// Mutation pattern
useMutation({
  mutationFn: async (params) => { ... },
  onSuccess: (data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['key'] });
  },
});
```

### API Endpoints from E03

**Use these exact API endpoints (already implemented in E03):**

```typescript
// Deploy endpoints
POST /api/pipeline/adapters/deploy
Body: { jobId: string }

// Check status
GET /api/pipeline/adapters/status?jobId={jobId}

// Run A/B test
POST /api/pipeline/adapters/test
Body: { jobId, userPrompt, systemPrompt?, enableEvaluation? }

// Get test history
GET /api/pipeline/adapters/test?jobId={jobId}&limit={20}&offset={0}

// Rate test result
POST /api/pipeline/adapters/rate
Body: { testId, rating, notes? }
```

### Type Safety

Import types from E01:

```typescript
import {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
  UserRating,
  TestResult,
  InferenceEndpoint,
} from '@/types/pipeline-adapter';
```

---

## Reference Documents

**Completed Implementations:**
- E01 Complete: `docs/ADAPTER_E01_COMPLETE.md`
- E02 Complete: `docs/ADAPTER_E02_COMPLETE.md`
- E03 Complete: `docs/ADAPTER_E03_COMPLETE.md`
- E03 Quick Start: `docs/ADAPTER_E03_QUICK_START.md`

**API Endpoints (E03):**
- Deploy: `POST /api/pipeline/adapters/deploy`
- Status: `GET /api/pipeline/adapters/status`
- Test: `POST /api/pipeline/adapters/test`
- History: `GET /api/pipeline/adapters/test`
- Rate: `POST /api/pipeline/adapters/rate`

**Existing Patterns:**
- Pipeline Hooks: `src/hooks/usePipelineJobs.ts`

---

========================

# EXECUTION PROMPT E04B - REACT QUERY HOOKS IMPLEMENTATION

## Context

You are implementing the React Query hooks for the Adapter Application Module. These hooks provide a clean, type-safe data fetching and mutation interface for the frontend components.

**Architecture Principles:**
1. **Type Safety:** All hooks fully typed with E01 types
2. **Cache Management:** Proper query keys and invalidation
3. **Optimistic Updates:** Immediate UI feedback where appropriate
4. **Automatic Polling:** Status polling during deployment
5. **Error Handling:** Comprehensive error states
6. **Developer Experience:** Combined hooks for common workflows

**Implementation Strategy:**
- Create single hooks file with all adapter testing hooks
- Follow React Query v5 best practices
- Use structured query keys for cache management
- Implement polling for deployment status
- Provide both individual and combined hooks

---

## Task 1: Create Adapter Testing Hooks File

This file contains all React Query hooks for adapter testing functionality.

### File: `src/hooks/useAdapterTesting.ts`

```typescript
/**
 * Adapter Testing Hooks
 *
 * React Query hooks for adapter deployment, A/B testing, and evaluation.
 * Provides data fetching, mutations, and cache management for the adapter testing UI.
 *
 * @module useAdapterTesting
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
  UserRating,
  TestResult,
  InferenceEndpoint,
} from '@/types/pipeline-adapter';

// ============================================
// Query Keys
// ============================================

/**
 * Structured query keys for adapter testing
 * Follows React Query best practices for cache invalidation
 */
export const adapterTestingKeys = {
  all: ['adapter-testing'] as const,
  
  // Endpoint-related keys
  endpoints: () => [...adapterTestingKeys.all, 'endpoints'] as const,
  endpointStatus: (jobId: string) => 
    [...adapterTestingKeys.endpoints(), jobId] as const,
  
  // Test-related keys
  tests: () => [...adapterTestingKeys.all, 'tests'] as const,
  testsByJob: (jobId: string) => 
    [...adapterTestingKeys.tests(), jobId] as const,
  testHistory: (jobId: string, filters?: { limit?: number; offset?: number }) =>
    [...adapterTestingKeys.testsByJob(jobId), 'history', filters] as const,
  testDetail: (testId: string) =>
    [...adapterTestingKeys.tests(), testId] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Deploy control and adapted endpoints to RunPod
 */
async function deployAdapterEndpoints(jobId: string): Promise<DeployAdapterResponse> {
  const response = await fetch('/api/pipeline/adapters/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to deploy adapter endpoints');
  }
  
  return data;
}

/**
 * Get endpoint deployment status
 */
async function getEndpointStatus(jobId: string): Promise<EndpointStatusResponse> {
  const response = await fetch(
    `/api/pipeline/adapters/status?jobId=${encodeURIComponent(jobId)}`
  );

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to get endpoint status');
  }
  
  return data;
}

/**
 * Run A/B test between control and adapted models
 */
async function runABTest(params: RunTestRequest): Promise<RunTestResponse> {
  const response = await fetch('/api/pipeline/adapters/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to run A/B test');
  }
  
  return data;
}

/**
 * Get test history for a job with pagination
 */
async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<TestResultListResponse> {
  const params = new URLSearchParams({ jobId });
  
  if (options?.limit !== undefined) {
    params.set('limit', options.limit.toString());
  }
  if (options?.offset !== undefined) {
    params.set('offset', options.offset.toString());
  }

  const response = await fetch(`/api/pipeline/adapters/test?${params}`);

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to get test history');
  }
  
  return data;
}

/**
 * Rate a test result
 */
async function rateTestResult(params: {
  testId: string;
  rating: UserRating;
  notes?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch('/api/pipeline/adapters/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit rating');
  }
  
  return data;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Get endpoint deployment status
 * 
 * Automatically polls every 5 seconds when endpoints are deploying
 * 
 * @param jobId - Training job ID
 * @param options - Query options
 * @returns Query with endpoint status data
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useEndpointStatus(jobId);
 * const bothReady = data?.data?.bothReady;
 * ```
 */
export function useEndpointStatus(
  jobId: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
  }
) {
  return useQuery({
    queryKey: adapterTestingKeys.endpointStatus(jobId || ''),
    queryFn: () => getEndpointStatus(jobId!),
    enabled: !!jobId && (options?.enabled ?? true),
    
    // Poll every 5 seconds if endpoints are deploying
    refetchInterval: (query) => {
      // If custom refetchInterval provided, use it
      if (options?.refetchInterval !== undefined) {
        return options.refetchInterval;
      }
      
      // Auto-poll during deployment
      const data = query.state.data;
      if (data?.data && !data.data.bothReady) {
        const controlDeploying = data.data.controlEndpoint?.status === 'deploying';
        const adaptedDeploying = data.data.adaptedEndpoint?.status === 'deploying';
        
        if (controlDeploying || adaptedDeploying) {
          return 5000; // Poll every 5 seconds
        }
      }
      
      return false; // Don't poll
    },
    
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Get test history for a job with pagination
 * 
 * @param jobId - Training job ID
 * @param options - Pagination options
 * @returns Query with test history data
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useTestHistory(jobId, { limit: 20, offset: 0 });
 * const tests = data?.data || [];
 * const totalCount = data?.count || 0;
 * ```
 */
export function useTestHistory(
  jobId: string | null,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit, offset, enabled = true } = options || {};

  return useQuery({
    queryKey: adapterTestingKeys.testHistory(jobId || '', { limit, offset }),
    queryFn: () => getTestHistory(jobId!, { limit, offset }),
    enabled: !!jobId && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Deploy adapter endpoints (Control and Adapted)
 * 
 * Automatically invalidates endpoint status on success
 * 
 * @returns Mutation for deploying endpoints
 * 
 * @example
 * ```tsx
 * const deploy = useDeployAdapter();
 * 
 * const handleDeploy = async () => {
 *   try {
 *     const result = await deploy.mutateAsync(jobId);
 *     console.log('Deployed:', result.data);
 *   } catch (error) {
 *     console.error('Deploy failed:', error);
 *   }
 * };
 * ```
 */
export function useDeployAdapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deployAdapterEndpoints,
    
    onSuccess: (data, jobId) => {
      // Invalidate endpoint status to trigger refetch
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.endpointStatus(jobId)
      });
      
      // Set initial data in cache
      queryClient.setQueryData(
        adapterTestingKeys.endpointStatus(jobId),
        data
      );
    },
  });
}

/**
 * Run an A/B test
 * 
 * Automatically invalidates test history on success
 * 
 * @returns Mutation for running tests
 * 
 * @example
 * ```tsx
 * const runTest = useRunTest();
 * 
 * const handleTest = async () => {
 *   const result = await runTest.mutateAsync({
 *     jobId,
 *     userPrompt: 'Test prompt',
 *     systemPrompt: 'You are a helpful assistant',
 *     enableEvaluation: true,
 *   });
 *   console.log('Test result:', result.data);
 * };
 * ```
 */
export function useRunTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runABTest,
    
    onSuccess: (data, variables) => {
      // Invalidate test history to show new test
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.testsByJob(variables.jobId)
      });
      
      // Optionally set the new test in cache
      if (data.data) {
        queryClient.setQueryData(
          adapterTestingKeys.testDetail(data.data.id),
          data
        );
      }
    },
  });
}

/**
 * Rate a test result
 * 
 * Uses optimistic updates for immediate UI feedback
 * 
 * @returns Mutation for rating tests
 * 
 * @example
 * ```tsx
 * const rate = useRateTest();
 * 
 * const handleRate = async () => {
 *   await rate.mutateAsync({
 *     testId: 'test-uuid',
 *     rating: 'adapted',
 *     notes: 'Much better empathy!',
 *   });
 * };
 * ```
 */
export function useRateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rateTestResult,
    
    // Optimistic update
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: adapterTestingKeys.tests()
      });
      
      // Snapshot previous values
      const previousTests = queryClient.getQueriesData({
        queryKey: adapterTestingKeys.tests()
      });
      
      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: adapterTestingKeys.tests() },
        (old: any) => {
          if (!old?.data) return old;
          
          return {
            ...old,
            data: Array.isArray(old.data)
              ? old.data.map((test: TestResult) =>
                  test.id === variables.testId
                    ? {
                        ...test,
                        userRating: variables.rating,
                        userNotes: variables.notes || null,
                      }
                    : test
                )
              : old.data,
          };
        }
      );
      
      return { previousTests };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousTests) {
        context.previousTests.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Refetch on settle
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.tests()
      });
    },
  });
}

// ============================================
// Combined Hooks (High-Level Convenience)
// ============================================

/**
 * Combined hook for deployment workflow
 * 
 * Provides both deployment action and status checking in one hook
 * 
 * @param jobId - Training job ID
 * @returns Object with deployment functions and status
 * 
 * @example
 * ```tsx
 * const {
 *   deploy,
 *   isDeploying,
 *   status,
 *   bothReady,
 *   controlEndpoint,
 *   adaptedEndpoint,
 * } = useAdapterDeployment(jobId);
 * 
 * // Deploy endpoints
 * await deploy();
 * 
 * // Check if ready
 * if (bothReady) {
 *   console.log('Ready to test!');
 * }
 * ```
 */
export function useAdapterDeployment(jobId: string | null) {
  const deployMutation = useDeployAdapter();
  const statusQuery = useEndpointStatus(jobId);

  return {
    // Deployment action
    deploy: async () => {
      if (!jobId) throw new Error('Job ID required');
      return deployMutation.mutateAsync(jobId);
    },
    isDeploying: deployMutation.isPending,
    deployError: deployMutation.error,
    
    // Status information
    status: statusQuery.data?.data,
    isLoadingStatus: statusQuery.isLoading,
    isRefetchingStatus: statusQuery.isFetching && !statusQuery.isLoading,
    statusError: statusQuery.error,
    
    // Convenience flags
    bothReady: statusQuery.data?.data?.bothReady || false,
    controlEndpoint: statusQuery.data?.data?.controlEndpoint || null,
    adaptedEndpoint: statusQuery.data?.data?.adaptedEndpoint || null,
    
    // Status helpers
    isControlReady: statusQuery.data?.data?.controlEndpoint?.status === 'ready',
    isAdaptedReady: statusQuery.data?.data?.adaptedEndpoint?.status === 'ready',
    hasAnyFailed: 
      statusQuery.data?.data?.controlEndpoint?.status === 'failed' ||
      statusQuery.data?.data?.adaptedEndpoint?.status === 'failed',
  };
}

/**
 * Combined hook for testing workflow
 * 
 * Provides test execution, history, and rating in one hook
 * 
 * @param jobId - Training job ID
 * @param options - Options for history pagination
 * @returns Object with testing functions and data
 * 
 * @example
 * ```tsx
 * const {
 *   runTest,
 *   isRunning,
 *   latestResult,
 *   history,
 *   historyCount,
 *   rateTest,
 *   isRating,
 *   refetchHistory,
 * } = useAdapterTesting(jobId, { limit: 20 });
 * 
 * // Run a test
 * await runTest({
 *   jobId,
 *   userPrompt: 'Your prompt',
 *   enableEvaluation: true,
 * });
 * 
 * // Rate the latest test
 * await rateTest({
 *   testId: latestResult.id,
 *   rating: 'adapted',
 *   notes: 'Great improvement!',
 * });
 * ```
 */
export function useAdapterTesting(
  jobId: string | null,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const runTestMutation = useRunTest();
  const historyQuery = useTestHistory(jobId, options);
  const rateMutation = useRateTest();

  return {
    // Run test
    runTest: runTestMutation.mutateAsync,
    isRunning: runTestMutation.isPending,
    runError: runTestMutation.error,
    latestResult: runTestMutation.data?.data || null,
    
    // Test history
    history: historyQuery.data?.data || [],
    historyCount: historyQuery.data?.count || 0,
    isLoadingHistory: historyQuery.isLoading,
    isRefetchingHistory: historyQuery.isFetching && !historyQuery.isLoading,
    historyError: historyQuery.error,
    refetchHistory: historyQuery.refetch,
    
    // Rate test
    rateTest: rateMutation.mutateAsync,
    isRating: rateMutation.isPending,
    rateError: rateMutation.error,
    
    // Pagination helpers
    hasHistory: (historyQuery.data?.count || 0) > 0,
    currentPage: Math.floor((options?.offset || 0) / (options?.limit || 20)),
    totalPages: Math.ceil((historyQuery.data?.count || 0) / (options?.limit || 20)),
  };
}

/**
 * Combined hook for complete adapter workflow
 * 
 * Provides all deployment and testing functionality in one hook
 * 
 * @param jobId - Training job ID
 * @returns Object with all adapter testing functions and data
 * 
 * @example
 * ```tsx
 * const adapter = useAdapterWorkflow(jobId);
 * 
 * // 1. Deploy
 * await adapter.deploy();
 * 
 * // 2. Wait for ready (auto-polling)
 * if (adapter.bothReady) {
 *   // 3. Run test
 *   await adapter.runTest({
 *     jobId,
 *     userPrompt: 'Test',
 *     enableEvaluation: true,
 *   });
 *   
 *   // 4. Rate result
 *   await adapter.rateTest({
 *     testId: adapter.latestResult.id,
 *     rating: 'adapted',
 *   });
 * }
 * ```
 */
export function useAdapterWorkflow(jobId: string | null) {
  const deployment = useAdapterDeployment(jobId);
  const testing = useAdapterTesting(jobId);

  return {
    // Deployment
    ...deployment,
    
    // Testing
    ...testing,
    
    // Workflow state
    canTest: deployment.bothReady,
    isWorking: deployment.isDeploying || testing.isRunning || testing.isRating,
  };
}
```

---

## Task 2: Update Hooks Index

Update the hooks index to export new adapter testing hooks.

### File: `src/hooks/index.ts`

**If file exists**, add exports. **If not**, create it:

```typescript
/**
 * Hooks Index
 * 
 * Central export point for all custom React hooks
 */

// Existing hooks (if any)
export * from './usePipelineJobs';

// Adapter testing hooks (NEW)
export {
  // Query keys
  adapterTestingKeys,
  
  // Query hooks
  useEndpointStatus,
  useTestHistory,
  
  // Mutation hooks
  useDeployAdapter,
  useRunTest,
  useRateTest,
  
  // Combined hooks
  useAdapterDeployment,
  useAdapterTesting,
  useAdapterWorkflow,
} from './useAdapterTesting';

// Re-export types for convenience
export type {
  DeployAdapterResponse,
  EndpointStatusResponse,
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
  UserRating,
  TestResult,
  InferenceEndpoint,
} from '@/types/pipeline-adapter';
```

---

## Task 3: Verification & Testing

After creating all files, verify the implementation.

### 1. Verify File Structure

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"

# Check hooks file exists
ls -la src/hooks/useAdapterTesting.ts

# Check index file updated
ls -la src/hooks/index.ts
```

### 2. Verify TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src"
npx tsc --noEmit --project tsconfig.json
```

**Expected:** Exit code 0, no errors

### 3. Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show"
npx eslint src/hooks/useAdapterTesting.ts
```

### 4. Verify Imports and Exports

Create a test file to verify all exports work:

**File: `src/hooks/__tests__/adapter-hooks.test.ts`**

```typescript
/**
 * Test that all adapter hooks are properly exported
 */

import {
  adapterTestingKeys,
  useEndpointStatus,
  useTestHistory,
  useDeployAdapter,
  useRunTest,
  useRateTest,
  useAdapterDeployment,
  useAdapterTesting,
  useAdapterWorkflow,
} from '../useAdapterTesting';

describe('Adapter Testing Hooks Exports', () => {
  it('should export query keys', () => {
    expect(adapterTestingKeys).toBeDefined();
    expect(adapterTestingKeys.all).toEqual(['adapter-testing']);
  });

  it('should export all hooks', () => {
    expect(useEndpointStatus).toBeDefined();
    expect(useTestHistory).toBeDefined();
    expect(useDeployAdapter).toBeDefined();
    expect(useRunTest).toBeDefined();
    expect(useRateTest).toBeDefined();
    expect(useAdapterDeployment).toBeDefined();
    expect(useAdapterTesting).toBeDefined();
    expect(useAdapterWorkflow).toBeDefined();
  });
});

describe('Query Keys Structure', () => {
  it('should generate correct endpoint status key', () => {
    const key = adapterTestingKeys.endpointStatus('job-123');
    expect(key).toEqual(['adapter-testing', 'endpoints', 'job-123']);
  });

  it('should generate correct test history key', () => {
    const key = adapterTestingKeys.testHistory('job-123', { limit: 10 });
    expect(key).toEqual([
      'adapter-testing',
      'tests',
      'job-123',
      'history',
      { limit: 10 }
    ]);
  });

  it('should generate correct test detail key', () => {
    const key = adapterTestingKeys.testDetail('test-456');
    expect(key).toEqual(['adapter-testing', 'tests', 'test-456']);
  });
});
```

### 5. Integration Test (Optional)

Create an integration test that uses the hooks:

**File: `src/hooks/__tests__/adapter-hooks.integration.test.tsx`**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdapterDeployment, useAdapterTesting } from '../useAdapterTesting';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAdapterDeployment Integration', () => {
  it('should provide deployment functionality', () => {
    const { result } = renderHook(
      () => useAdapterDeployment('test-job-id'),
      { wrapper: createWrapper() }
    );

    expect(result.current.deploy).toBeDefined();
    expect(result.current.bothReady).toBe(false);
    expect(result.current.isDeploying).toBe(false);
  });
});

describe('useAdapterTesting Integration', () => {
  it('should provide testing functionality', () => {
    const { result } = renderHook(
      () => useAdapterTesting('test-job-id'),
      { wrapper: createWrapper() }
    );

    expect(result.current.runTest).toBeDefined();
    expect(result.current.rateTest).toBeDefined();
    expect(result.current.history).toEqual([]);
    expect(result.current.historyCount).toBe(0);
  });
});
```

---

## Success Criteria

Verify ALL criteria are met:

### Implementation ✅
- [ ] `src/hooks/useAdapterTesting.ts` created with all hooks
- [ ] `src/hooks/index.ts` updated with exports
- [ ] Query keys properly structured and exported
- [ ] All API functions implemented
- [ ] All query hooks implemented
- [ ] All mutation hooks implemented
- [ ] Combined hooks implemented

### Code Quality ✅
- [ ] TypeScript compiles without errors
- [ ] No linter warnings
- [ ] All hooks use correct E03 API endpoints
- [ ] All types imported from E01
- [ ] No `any` types used
- [ ] Comprehensive JSDoc comments

### Functionality ✅
- [ ] Deploy mutation invalidates endpoint status
- [ ] Endpoint status query polls during deployment (5s interval)
- [ ] Run test mutation invalidates test history
- [ ] Rate test mutation uses optimistic updates
- [ ] Combined hooks provide convenient interfaces
- [ ] Error handling in all hooks

### Testing ✅
- [ ] Unit tests created for query keys
- [ ] Integration tests created (optional but recommended)
- [ ] All exports verified

---

## Files Created

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useAdapterTesting.ts` | ~650 | All adapter testing hooks |
| `src/hooks/__tests__/adapter-hooks.test.ts` | ~70 | Unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/hooks/index.ts` | Added adapter testing hook exports |

**Total:** ~720 lines of production-ready React Query hooks

---

## Hook Documentation

### Query Hooks

#### useEndpointStatus(jobId, options?)

**Purpose:** Get endpoint deployment status with automatic polling

**Parameters:**
- `jobId: string | null` - Training job ID
- `options?: { enabled?, refetchInterval? }` - Query options

**Returns:**
```typescript
{
  data: EndpointStatusResponse;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Polling Behavior:**
- Automatically polls every 5 seconds when endpoints are deploying
- Stops polling when both endpoints are ready or failed
- Can override with custom `refetchInterval`

**Example:**
```typescript
const { data, isLoading } = useEndpointStatus(jobId);
const bothReady = data?.data?.bothReady;
const controlStatus = data?.data?.controlEndpoint?.status;
```

---

#### useTestHistory(jobId, options?)

**Purpose:** Get test history with pagination

**Parameters:**
- `jobId: string | null` - Training job ID
- `options?: { limit?, offset?, enabled? }` - Pagination options

**Returns:**
```typescript
{
  data: TestResultListResponse;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Example:**
```typescript
const { data, isLoading } = useTestHistory(jobId, {
  limit: 20,
  offset: 0,
});
const tests = data?.data || [];
const totalCount = data?.count || 0;
```

---

### Mutation Hooks

#### useDeployAdapter()

**Purpose:** Deploy control and adapted endpoints

**Returns:**
```typescript
{
  mutate: (jobId: string) => void;
  mutateAsync: (jobId: string) => Promise<DeployAdapterResponse>;
  isPending: boolean;
  error: Error | null;
  data: DeployAdapterResponse | undefined;
}
```

**Cache Invalidation:**
- Invalidates endpoint status query
- Sets initial data in cache

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

---

#### useRunTest()

**Purpose:** Run A/B test between control and adapted models

**Returns:**
```typescript
{
  mutateAsync: (params: RunTestRequest) => Promise<RunTestResponse>;
  isPending: boolean;
  error: Error | null;
  data: RunTestResponse | undefined;
}
```

**Cache Invalidation:**
- Invalidates test history
- Sets test detail in cache

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

---

#### useRateTest()

**Purpose:** Rate a test result with optimistic updates

**Returns:**
```typescript
{
  mutateAsync: (params: {
    testId: string;
    rating: UserRating;
    notes?: string;
  }) => Promise<{ success: boolean }>;
  isPending: boolean;
  error: Error | null;
}
```

**Optimistic Updates:**
- Immediately updates UI with rating
- Rolls back on error
- Refetches on settle

**Example:**
```typescript
const rate = useRateTest();

await rate.mutateAsync({
  testId: 'test-uuid',
  rating: 'adapted',
  notes: 'Much better empathy!',
});
```

---

### Combined Hooks

#### useAdapterDeployment(jobId)

**Purpose:** Combined deployment workflow hook

**Returns:**
```typescript
{
  // Deployment
  deploy: () => Promise<DeployAdapterResponse>;
  isDeploying: boolean;
  deployError: Error | null;
  
  // Status
  status: { controlEndpoint, adaptedEndpoint, bothReady } | undefined;
  isLoadingStatus: boolean;
  isRefetchingStatus: boolean;
  statusError: Error | null;
  
  // Convenience
  bothReady: boolean;
  controlEndpoint: InferenceEndpoint | null;
  adaptedEndpoint: InferenceEndpoint | null;
  isControlReady: boolean;
  isAdaptedReady: boolean;
  hasAnyFailed: boolean;
}
```

**Example:**
```typescript
const {
  deploy,
  isDeploying,
  bothReady,
  controlEndpoint,
  adaptedEndpoint,
} = useAdapterDeployment(jobId);

// Deploy endpoints
await deploy();

// Check status (auto-polling)
if (bothReady) {
  console.log('Ready to test!');
}
```

---

#### useAdapterTesting(jobId, options?)

**Purpose:** Combined testing workflow hook

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
const {
  runTest,
  isRunning,
  latestResult,
  history,
  rateTest,
} = useAdapterTesting(jobId, { limit: 20 });

// Run test
await runTest({
  jobId,
  userPrompt: 'Test prompt',
  enableEvaluation: true,
});

// Rate result
await rateTest({
  testId: latestResult.id,
  rating: 'adapted',
  notes: 'Great!',
});
```

---

#### useAdapterWorkflow(jobId)

**Purpose:** Complete adapter workflow in one hook

**Returns:** Combined `useAdapterDeployment` + `useAdapterTesting` returns, plus:
```typescript
{
  canTest: boolean;    // True when both endpoints ready
  isWorking: boolean;  // True during any operation
}
```

**Example:**
```typescript
const adapter = useAdapterWorkflow(jobId);

// Complete workflow
await adapter.deploy();

if (adapter.bothReady) {
  await adapter.runTest({
    jobId,
    userPrompt: 'Test',
    enableEvaluation: true,
  });
  
  await adapter.rateTest({
    testId: adapter.latestResult.id,
    rating: 'adapted',
  });
}
```

---

## Integration with E03 API

All hooks call E03 API endpoints:

| Hook | API Endpoint | Method |
|------|-------------|--------|
| `useDeployAdapter` | `/api/pipeline/adapters/deploy` | POST |
| `useEndpointStatus` | `/api/pipeline/adapters/status` | GET |
| `useRunTest` | `/api/pipeline/adapters/test` | POST |
| `useTestHistory` | `/api/pipeline/adapters/test` | GET |
| `useRateTest` | `/api/pipeline/adapters/rate` | POST |

---

## Query Key Structure

```typescript
// Base keys
['adapter-testing']

// Endpoints
['adapter-testing', 'endpoints']
['adapter-testing', 'endpoints', jobId]

// Tests
['adapter-testing', 'tests']
['adapter-testing', 'tests', jobId]
['adapter-testing', 'tests', jobId, 'history', { limit, offset }]
['adapter-testing', 'tests', testId]
```

**Cache Invalidation Strategy:**
- Deploy → Invalidates endpoint status
- Run test → Invalidates test history for job
- Rate test → Invalidates all test queries (optimistic update)

---

## Performance Considerations

### Polling Strategy

**Endpoint Status:**
- Polls every 5 seconds during deployment
- Stops when both ready or failed
- Uses `refetchInterval` function for dynamic behavior

**Test History:**
- No automatic polling
- Stale time: 30 seconds
- Manual refetch available

### Cache Management

**Stale Times:**
- Endpoint status: 10 seconds
- Test history: 30 seconds

**Optimistic Updates:**
- Rating uses optimistic updates for instant feedback
- Rollback on error
- Refetch on settle for consistency

---

## Troubleshooting Guide

### "Query not refetching"
**Cause:** Query might be disabled or staleTime too long  
**Fix:** Check `enabled` option and `staleTime` configuration

### "Polling not stopping"
**Cause:** `refetchInterval` logic issue  
**Fix:** Verify `bothReady` flag is being set correctly

### "Optimistic update not working"
**Cause:** Query key mismatch or data structure issue  
**Fix:** Verify query keys match and data structure is correct

### TypeScript errors
**Cause:** Type import issues  
**Fix:** Ensure all types imported from `@/types/pipeline-adapter`

### "Mutation not invalidating cache"
**Cause:** Query key mismatch  
**Fix:** Verify `queryKey` in invalidation matches query definition

---

## Next Steps

### E05: UI Components (Next Phase)

**Build user interface components:**

1. **Deployment Panel** - Deploy and monitor endpoints
   - Uses `useAdapterDeployment`
   - Shows status indicators
   - Displays error messages

2. **Test Runner** - Input prompts and run tests
   - Uses `useAdapterTesting`
   - Form for user/system prompts
   - Evaluation toggle

3. **Comparison View** - Side-by-side response display
   - Shows control vs adapted responses
   - Highlights differences
   - Displays generation times

4. **Evaluation Display** - Claude scores and feedback
   - Shows evaluation metrics
   - Displays comparison summary
   - Winner indication

5. **Test History Table** - Browse past tests
   - Uses `useTestHistory`
   - Pagination controls
   - Sortable columns

6. **Rating Interface** - Rate and provide feedback
   - Uses `useRateTest`
   - Rating buttons
   - Notes textarea

**Implementation Timeline:** 3-4 hours

---

## Documentation Generated

After implementation, create:

- [ ] `docs/ADAPTER_E04_COMPLETE.md` - Implementation summary
- [ ] `docs/ADAPTER_E04_CHECKLIST.md` - Verification checklist
- [ ] `docs/ADAPTER_E04_QUICK_START.md` - Quick reference guide

---

## Success Metrics

**When E04 is complete, you should have:**

- ✅ Complete React Query hooks file (~650 lines)
- ✅ All 8 hooks implemented and exported
- ✅ Structured query keys for cache management
- ✅ Automatic polling during deployment
- ✅ Optimistic updates for ratings
- ✅ Combined hooks for common workflows
- ✅ TypeScript compiles without errors
- ✅ Zero linter warnings
- ✅ Comprehensive JSDoc documentation
- ✅ Unit tests for query keys
- ✅ Integration with E03 API verified

---

**Status:** Ready for Implementation  
**Estimated Time:** 1-2 hours  
**Complexity:** Medium  
**Dependencies:** E01 ✅ E02 ✅ E03 ✅  

**Next Phase:** E05 - UI Components

---

**END OF E04B EXECUTION PROMPT**
