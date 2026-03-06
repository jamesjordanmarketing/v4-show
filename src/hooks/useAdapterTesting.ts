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
  EvaluatorsResponse,
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

  // Evaluators (NEW)
  evaluators: () => [...adapterTestingKeys.all, 'evaluators'] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Deploy control and adapted endpoints to RunPod
 */
async function deployAdapterEndpoints(
  jobId: string,
  forceRedeploy = false
): Promise<DeployAdapterResponse> {
  const response = await fetch('/api/pipeline/adapters/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, forceRedeploy }),
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

/**
 * Get available evaluation prompts (NEW)
 */
async function getEvaluators(): Promise<EvaluatorsResponse> {
  const response = await fetch('/api/pipeline/evaluators');

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to get evaluators');
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

/**
 * Get available evaluation prompts for the evaluator dropdown (NEW)
 * 
 * @param options - Query options
 * @returns Query with evaluator options
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useEvaluators();
 * const evaluators = data?.data || [];
 * const defaultEvaluator = evaluators.find(e => e.isDefault);
 * ```
 */
export function useEvaluators(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adapterTestingKeys.evaluators(),
    queryFn: getEvaluators,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes (evaluators don't change often)
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
 *     const result = await deploy.mutateAsync({ jobId, forceRedeploy: false });
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
    mutationFn: (params: { jobId: string; forceRedeploy?: boolean }) =>
      deployAdapterEndpoints(params.jobId, params.forceRedeploy),

    onSuccess: (data, variables) => {
      // Invalidate endpoint status to trigger refetch
      queryClient.invalidateQueries({
        queryKey: adapterTestingKeys.endpointStatus(variables.jobId)
      });

      // Set initial data in cache
      queryClient.setQueryData(
        adapterTestingKeys.endpointStatus(variables.jobId),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    deploy: async (options?: { forceRedeploy?: boolean }) => {
      if (!jobId) throw new Error('Job ID required');
      return deployMutation.mutateAsync({
        jobId,
        forceRedeploy: options?.forceRedeploy ?? false
      });
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
