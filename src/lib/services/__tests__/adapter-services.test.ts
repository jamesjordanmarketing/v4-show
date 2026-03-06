/**
 * Adapter Services Test
 * 
 * Verifies that adapter testing services export correctly
 */

import { deployAdapterEndpoints, getEndpointStatus } from '../inference-service';
import { runABTest, getTestHistory, rateTestResult } from '../test-service';

describe('Adapter Services', () => {
  it('should export inference service functions', () => {
    expect(typeof deployAdapterEndpoints).toBe('function');
    expect(typeof getEndpointStatus).toBe('function');
  });

  it('should export test service functions', () => {
    expect(typeof runABTest).toBe('function');
    expect(typeof getTestHistory).toBe('function');
    expect(typeof rateTestResult).toBe('function');
  });
});
