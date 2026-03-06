/**
 * Hooks Index
 * 
 * Central export point for all custom React hooks
 */

// Pipeline jobs hooks
export * from './usePipelineJobs';

// Adapter testing hooks
export {
  // Query keys
  adapterTestingKeys,

  // Query hooks
  useEndpointStatus,
  useTestHistory,
  useEvaluators,  // NEW: For evaluator dropdown

  // Mutation hooks
  useDeployAdapter,
  useRunTest,
  useRateTest,

  // Combined hooks
  useAdapterDeployment,
  useAdapterTesting,
  useAdapterWorkflow,
} from './useAdapterTesting';

// Multi-turn chat hooks
export { useDualChat } from './useDualChat';
export type { UseDualChatReturn } from './useDualChat';

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
  EndpointStatus,
} from '@/types/pipeline-adapter';
