import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdapterDeployment, useAdapterTesting, useAdapterWorkflow } from '../useAdapterTesting';
import React from 'react';

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
    expect(result.current.controlEndpoint).toBeNull();
    expect(result.current.adaptedEndpoint).toBeNull();
  });

  it('should provide status helpers', () => {
    const { result } = renderHook(
      () => useAdapterDeployment('test-job-id'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isControlReady).toBe(false);
    expect(result.current.isAdaptedReady).toBe(false);
    expect(result.current.hasAnyFailed).toBe(false);
  });

  it('should handle null jobId', () => {
    const { result } = renderHook(
      () => useAdapterDeployment(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.deploy).toBeDefined();
    expect(result.current.bothReady).toBe(false);
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
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isRating).toBe(false);
  });

  it('should provide pagination helpers', () => {
    const { result } = renderHook(
      () => useAdapterTesting('test-job-id', { limit: 20, offset: 0 }),
      { wrapper: createWrapper() }
    );

    expect(result.current.hasHistory).toBe(false);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.totalPages).toBe(0);
  });

  it('should calculate pagination correctly', () => {
    const { result } = renderHook(
      () => useAdapterTesting('test-job-id', { limit: 10, offset: 30 }),
      { wrapper: createWrapper() }
    );

    expect(result.current.currentPage).toBe(3);
  });
});

describe('useAdapterWorkflow Integration', () => {
  it('should combine deployment and testing functionality', () => {
    const { result } = renderHook(
      () => useAdapterWorkflow('test-job-id'),
      { wrapper: createWrapper() }
    );

    // Deployment
    expect(result.current.deploy).toBeDefined();
    expect(result.current.bothReady).toBe(false);
    expect(result.current.isDeploying).toBe(false);

    // Testing
    expect(result.current.runTest).toBeDefined();
    expect(result.current.rateTest).toBeDefined();
    expect(result.current.history).toEqual([]);

    // Workflow state
    expect(result.current.canTest).toBe(false);
    expect(result.current.isWorking).toBe(false);
  });

  it('should provide all status helpers', () => {
    const { result } = renderHook(
      () => useAdapterWorkflow('test-job-id'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isControlReady).toBe(false);
    expect(result.current.isAdaptedReady).toBe(false);
    expect(result.current.hasAnyFailed).toBe(false);
    expect(result.current.isLoadingStatus).toBe(true);
    expect(result.current.isLoadingHistory).toBe(true);
  });
});
