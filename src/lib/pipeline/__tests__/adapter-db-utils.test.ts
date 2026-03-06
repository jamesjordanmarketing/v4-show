/**
 * Tests for Adapter Database Mapping Utilities
 * 
 * Verifies snake_case ↔ camelCase mapping functions
 */

import {
  mapDbRowToEndpoint,
  mapEndpointToDbRow,
  mapDbRowToTestResult,
  mapTestResultToDbRow,
  mapDbRowToBaseModel,
} from '../adapter-db-utils';

describe('Adapter Database Mapping Utilities', () => {
  
  // ============================================
  // Endpoint Mapping Tests
  // ============================================
  
  describe('mapDbRowToEndpoint', () => {
    it('should map complete database row to InferenceEndpoint', () => {
      const dbRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        job_id: '123e4567-e89b-12d3-a456-426614174001',
        user_id: '123e4567-e89b-12d3-a456-426614174002',
        endpoint_type: 'control',
        runpod_endpoint_id: 'rp-endpoint-123',
        base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
        adapter_path: null,
        status: 'ready',
        health_check_url: 'https://api.runpod.ai/v2/endpoint-123/health',
        last_health_check: '2026-01-17T12:00:00Z',
        idle_timeout_seconds: 300,
        estimated_cost_per_hour: 2.5,
        created_at: '2026-01-17T10:00:00Z',
        ready_at: '2026-01-17T10:05:00Z',
        terminated_at: null,
        updated_at: '2026-01-17T12:00:00Z',
        error_message: null,
        error_details: null,
      };

      const endpoint = mapDbRowToEndpoint(dbRow);

      expect(endpoint.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(endpoint.jobId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(endpoint.userId).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(endpoint.endpointType).toBe('control');
      expect(endpoint.runpodEndpointId).toBe('rp-endpoint-123');
      expect(endpoint.baseModel).toBe('mistralai/Mistral-7B-Instruct-v0.2');
      expect(endpoint.adapterPath).toBeNull();
      expect(endpoint.status).toBe('ready');
      expect(endpoint.healthCheckUrl).toBe('https://api.runpod.ai/v2/endpoint-123/health');
      expect(endpoint.lastHealthCheck).toBe('2026-01-17T12:00:00Z');
      expect(endpoint.idleTimeoutSeconds).toBe(300);
      expect(endpoint.estimatedCostPerHour).toBe(2.5);
      expect(endpoint.createdAt).toBe('2026-01-17T10:00:00Z');
      expect(endpoint.readyAt).toBe('2026-01-17T10:05:00Z');
      expect(endpoint.terminatedAt).toBeNull();
      expect(endpoint.updatedAt).toBe('2026-01-17T12:00:00Z');
      expect(endpoint.errorMessage).toBeNull();
      expect(endpoint.errorDetails).toBeNull();
    });

    it('should handle adapted endpoint with adapter_path', () => {
      const dbRow = {
        id: '123',
        job_id: '456',
        user_id: '789',
        endpoint_type: 'adapted',
        runpod_endpoint_id: 'rp-endpoint-456',
        base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
        adapter_path: 'lora-models/adapters/job-456.tar.gz',
        status: 'ready',
        health_check_url: null,
        last_health_check: null,
        idle_timeout_seconds: 300,
        estimated_cost_per_hour: null,
        created_at: '2026-01-17T10:00:00Z',
        ready_at: null,
        terminated_at: null,
        updated_at: '2026-01-17T10:00:00Z',
        error_message: null,
        error_details: null,
      };

      const endpoint = mapDbRowToEndpoint(dbRow);

      expect(endpoint.endpointType).toBe('adapted');
      expect(endpoint.adapterPath).toBe('lora-models/adapters/job-456.tar.gz');
    });

    it('should handle error details as JSONB', () => {
      const dbRow = {
        id: '123',
        job_id: '456',
        user_id: '789',
        endpoint_type: 'control',
        runpod_endpoint_id: null,
        base_model: 'mistralai/Mistral-7B-Instruct-v0.2',
        adapter_path: null,
        status: 'failed',
        health_check_url: null,
        last_health_check: null,
        idle_timeout_seconds: 300,
        estimated_cost_per_hour: null,
        created_at: '2026-01-17T10:00:00Z',
        ready_at: null,
        terminated_at: null,
        updated_at: '2026-01-17T10:01:00Z',
        error_message: 'Deployment failed',
        error_details: {
          code: 'INSUFFICIENT_GPU',
          message: 'No GPU available',
          timestamp: '2026-01-17T10:01:00Z',
        },
      };

      const endpoint = mapDbRowToEndpoint(dbRow);

      expect(endpoint.status).toBe('failed');
      expect(endpoint.errorMessage).toBe('Deployment failed');
      expect(endpoint.errorDetails).toEqual({
        code: 'INSUFFICIENT_GPU',
        message: 'No GPU available',
        timestamp: '2026-01-17T10:01:00Z',
      });
    });
  });

  describe('mapEndpointToDbRow', () => {
    it('should map partial InferenceEndpoint to database row', () => {
      const endpoint = {
        jobId: '456',
        userId: '789',
        endpointType: 'control' as const,
        baseModel: 'mistralai/Mistral-7B-Instruct-v0.2',
        status: 'pending' as const,
        idleTimeoutSeconds: 300,
      };

      const dbRow = mapEndpointToDbRow(endpoint);

      expect(dbRow.job_id).toBe('456');
      expect(dbRow.user_id).toBe('789');
      expect(dbRow.endpoint_type).toBe('control');
      expect(dbRow.base_model).toBe('mistralai/Mistral-7B-Instruct-v0.2');
      expect(dbRow.status).toBe('pending');
      expect(dbRow.idle_timeout_seconds).toBe(300);
    });

    it('should only include defined fields', () => {
      const endpoint = {
        status: 'ready' as const,
        readyAt: '2026-01-17T10:05:00Z',
      };

      const dbRow = mapEndpointToDbRow(endpoint);

      expect(dbRow.status).toBe('ready');
      expect(dbRow.ready_at).toBe('2026-01-17T10:05:00Z');
      expect(Object.keys(dbRow)).toHaveLength(2);
    });
  });

  // ============================================
  // Test Result Mapping Tests
  // ============================================

  describe('mapDbRowToTestResult', () => {
    it('should map complete database row to TestResult', () => {
      const dbRow = {
        id: '123',
        job_id: '456',
        user_id: '789',
        system_prompt: 'You are a helpful assistant.',
        user_prompt: 'Tell me about emotional arcs.',
        control_response: 'Emotional arcs are patterns...',
        control_generation_time_ms: 1234,
        control_tokens_used: 150,
        adapted_response: 'Emotional arcs represent the journey...',
        adapted_generation_time_ms: 1456,
        adapted_tokens_used: 175,
        evaluation_enabled: true,
        control_evaluation: {
          emotionalProgression: {
            startState: { primaryEmotion: 'curious', intensity: 0.6 },
            endState: { primaryEmotion: 'informed', intensity: 0.8 },
            arcCompleted: true,
            progressionQuality: 4,
            progressionNotes: 'Clear progression',
          },
          empathyEvaluation: {
            emotionsAcknowledged: true,
            acknowledgmentInFirstSentence: true,
            validationProvided: true,
            empathyScore: 4,
            empathyNotes: 'Good empathy',
          },
          voiceConsistency: {
            warmthPresent: true,
            judgmentFree: true,
            specificNumbersUsed: false,
            jargonExplained: true,
            voiceScore: 4,
            voiceNotes: 'Consistent voice',
          },
          conversationQuality: {
            helpfulToUser: true,
            actionableGuidance: true,
            appropriateDepth: true,
            naturalFlow: true,
            qualityScore: 4,
            qualityNotes: 'High quality',
          },
          overallEvaluation: {
            wouldUserFeelHelped: true,
            overallScore: 4,
            keyStrengths: ['Clear', 'Helpful'],
            areasForImprovement: ['Could be more specific'],
            summary: 'Good response overall',
          },
        },
        adapted_evaluation: null,
        evaluation_comparison: null,
        user_rating: 'adapted',
        user_notes: 'Adapted was more empathetic',
        status: 'completed',
        created_at: '2026-01-17T10:00:00Z',
        completed_at: '2026-01-17T10:01:00Z',
        error_message: null,
      };

      const result = mapDbRowToTestResult(dbRow);

      expect(result.id).toBe('123');
      expect(result.jobId).toBe('456');
      expect(result.userId).toBe('789');
      expect(result.systemPrompt).toBe('You are a helpful assistant.');
      expect(result.userPrompt).toBe('Tell me about emotional arcs.');
      expect(result.controlResponse).toBe('Emotional arcs are patterns...');
      expect(result.controlGenerationTimeMs).toBe(1234);
      expect(result.controlTokensUsed).toBe(150);
      expect(result.adaptedResponse).toBe('Emotional arcs represent the journey...');
      expect(result.adaptedGenerationTimeMs).toBe(1456);
      expect(result.adaptedTokensUsed).toBe(175);
      expect(result.evaluationEnabled).toBe(true);
      expect(result.controlEvaluation).toEqual(dbRow.control_evaluation);
      expect(result.userRating).toBe('adapted');
      expect(result.userNotes).toBe('Adapted was more empathetic');
      expect(result.status).toBe('completed');
      expect(result.createdAt).toBe('2026-01-17T10:00:00Z');
      expect(result.completedAt).toBe('2026-01-17T10:01:00Z');
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('mapTestResultToDbRow', () => {
    it('should map partial TestResult to database row', () => {
      const result = {
        jobId: '456',
        userId: '789',
        userPrompt: 'Test prompt',
        evaluationEnabled: false,
        status: 'pending' as const,
      };

      const dbRow = mapTestResultToDbRow(result);

      expect(dbRow.job_id).toBe('456');
      expect(dbRow.user_id).toBe('789');
      expect(dbRow.user_prompt).toBe('Test prompt');
      expect(dbRow.evaluation_enabled).toBe(false);
      expect(dbRow.status).toBe('pending');
    });

    it('should handle user rating update', () => {
      const result = {
        userRating: 'control' as const,
        userNotes: 'Control was clearer',
      };

      const dbRow = mapTestResultToDbRow(result);

      expect(dbRow.user_rating).toBe('control');
      expect(dbRow.user_notes).toBe('Control was clearer');
    });
  });

  // ============================================
  // Base Model Mapping Tests
  // ============================================

  describe('mapDbRowToBaseModel', () => {
    it('should map complete database row to BaseModel', () => {
      const dbRow = {
        id: '123',
        model_id: 'mistralai/Mistral-7B-Instruct-v0.2',
        display_name: 'Mistral 7B Instruct v0.2',
        parameter_count: '7B',
        context_length: 32768,
        license: 'Apache 2.0',
        docker_image: 'runpod/worker-vllm:stable-cuda12.1.0',
        min_gpu_memory_gb: 24,
        recommended_gpu_type: 'NVIDIA A40',
        supports_lora: true,
        supports_quantization: true,
        is_active: true,
      };

      const model = mapDbRowToBaseModel(dbRow);

      expect(model.id).toBe('123');
      expect(model.modelId).toBe('mistralai/Mistral-7B-Instruct-v0.2');
      expect(model.displayName).toBe('Mistral 7B Instruct v0.2');
      expect(model.parameterCount).toBe('7B');
      expect(model.contextLength).toBe(32768);
      expect(model.license).toBe('Apache 2.0');
      expect(model.dockerImage).toBe('runpod/worker-vllm:stable-cuda12.1.0');
      expect(model.minGpuMemoryGb).toBe(24);
      expect(model.recommendedGpuType).toBe('NVIDIA A40');
      expect(model.supportsLora).toBe(true);
      expect(model.supportsQuantization).toBe(true);
      expect(model.isActive).toBe(true);
    });

    it('should handle inactive models', () => {
      const dbRow = {
        id: '456',
        model_id: 'deprecated/old-model',
        display_name: 'Old Model',
        parameter_count: '13B',
        context_length: 2048,
        license: 'MIT',
        docker_image: 'runpod/worker-vllm:old',
        min_gpu_memory_gb: 32,
        recommended_gpu_type: 'NVIDIA V100',
        supports_lora: false,
        supports_quantization: false,
        is_active: false,
      };

      const model = mapDbRowToBaseModel(dbRow);

      expect(model.isActive).toBe(false);
      expect(model.supportsLora).toBe(false);
    });
  });
});
