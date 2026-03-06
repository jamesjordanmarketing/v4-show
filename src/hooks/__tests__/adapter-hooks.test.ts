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

  it('should generate correct tests by job key', () => {
    const key = adapterTestingKeys.testsByJob('job-789');
    expect(key).toEqual(['adapter-testing', 'tests', 'job-789']);
  });

  it('should generate correct base keys', () => {
    expect(adapterTestingKeys.all).toEqual(['adapter-testing']);
    expect(adapterTestingKeys.endpoints()).toEqual(['adapter-testing', 'endpoints']);
    expect(adapterTestingKeys.tests()).toEqual(['adapter-testing', 'tests']);
  });
});
