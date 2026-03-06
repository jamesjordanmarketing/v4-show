/**
 * Adapter Database Mapping Utilities
 * 
 * Maps database snake_case to TypeScript camelCase
 */

import {
  InferenceEndpoint,
  EndpointStatus,
  TestResult,
  TestResultStatus,
  BaseModel,
} from '@/types/pipeline-adapter';

// ============================================
// Endpoint Mapping
// ============================================

export function mapDbRowToEndpoint(row: any): InferenceEndpoint {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    endpointType: row.endpoint_type,
    runpodEndpointId: row.runpod_endpoint_id,
    baseModel: row.base_model,
    adapterPath: row.adapter_path,
    status: row.status as EndpointStatus,
    healthCheckUrl: row.health_check_url,
    lastHealthCheck: row.last_health_check,
    idleTimeoutSeconds: row.idle_timeout_seconds,
    estimatedCostPerHour: row.estimated_cost_per_hour,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    terminatedAt: row.terminated_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
  };
}

export function mapEndpointToDbRow(endpoint: Partial<InferenceEndpoint>): Record<string, any> {
  const row: Record<string, any> = {};

  if (endpoint.jobId !== undefined) row.job_id = endpoint.jobId;
  if (endpoint.userId !== undefined) row.user_id = endpoint.userId;
  if (endpoint.endpointType !== undefined) row.endpoint_type = endpoint.endpointType;
  if (endpoint.runpodEndpointId !== undefined) row.runpod_endpoint_id = endpoint.runpodEndpointId;
  if (endpoint.baseModel !== undefined) row.base_model = endpoint.baseModel;
  if (endpoint.adapterPath !== undefined) row.adapter_path = endpoint.adapterPath;
  if (endpoint.status !== undefined) row.status = endpoint.status;
  if (endpoint.healthCheckUrl !== undefined) row.health_check_url = endpoint.healthCheckUrl;
  if (endpoint.lastHealthCheck !== undefined) row.last_health_check = endpoint.lastHealthCheck;
  if (endpoint.idleTimeoutSeconds !== undefined) row.idle_timeout_seconds = endpoint.idleTimeoutSeconds;
  if (endpoint.estimatedCostPerHour !== undefined) row.estimated_cost_per_hour = endpoint.estimatedCostPerHour;
  if (endpoint.readyAt !== undefined) row.ready_at = endpoint.readyAt;
  if (endpoint.terminatedAt !== undefined) row.terminated_at = endpoint.terminatedAt;
  if (endpoint.errorMessage !== undefined) row.error_message = endpoint.errorMessage;
  if (endpoint.errorDetails !== undefined) row.error_details = endpoint.errorDetails;

  return row;
}

// ============================================
// Test Result Mapping
// ============================================

export function mapDbRowToTestResult(row: any): TestResult {
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    systemPrompt: row.system_prompt,
    userPrompt: row.user_prompt,
    controlResponse: row.control_response,
    controlGenerationTimeMs: row.control_generation_time_ms,
    controlTokensUsed: row.control_tokens_used,
    adaptedResponse: row.adapted_response,
    adaptedGenerationTimeMs: row.adapted_generation_time_ms,
    adaptedTokensUsed: row.adapted_tokens_used,
    evaluationEnabled: row.evaluation_enabled,
    evaluationPromptId: row.evaluation_prompt_id,  // NEW: Track which evaluator was used
    controlEvaluation: row.control_evaluation,
    adaptedEvaluation: row.adapted_evaluation,
    evaluationComparison: row.evaluation_comparison,
    userRating: row.user_rating,
    userNotes: row.user_notes,
    status: row.status as TestResultStatus,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

export function mapTestResultToDbRow(result: Partial<TestResult>): Record<string, any> {
  const row: Record<string, any> = {};

  if (result.jobId !== undefined) row.job_id = result.jobId;
  if (result.userId !== undefined) row.user_id = result.userId;
  if (result.systemPrompt !== undefined) row.system_prompt = result.systemPrompt;
  if (result.userPrompt !== undefined) row.user_prompt = result.userPrompt;
  if (result.controlResponse !== undefined) row.control_response = result.controlResponse;
  if (result.controlGenerationTimeMs !== undefined) row.control_generation_time_ms = result.controlGenerationTimeMs;
  if (result.controlTokensUsed !== undefined) row.control_tokens_used = result.controlTokensUsed;
  if (result.adaptedResponse !== undefined) row.adapted_response = result.adaptedResponse;
  if (result.adaptedGenerationTimeMs !== undefined) row.adapted_generation_time_ms = result.adaptedGenerationTimeMs;
  if (result.adaptedTokensUsed !== undefined) row.adapted_tokens_used = result.adaptedTokensUsed;
  if (result.evaluationEnabled !== undefined) row.evaluation_enabled = result.evaluationEnabled;
  if (result.evaluationPromptId !== undefined) row.evaluation_prompt_id = result.evaluationPromptId;  // NEW
  if (result.controlEvaluation !== undefined) row.control_evaluation = result.controlEvaluation;
  if (result.adaptedEvaluation !== undefined) row.adapted_evaluation = result.adaptedEvaluation;
  if (result.evaluationComparison !== undefined) row.evaluation_comparison = result.evaluationComparison;
  if (result.userRating !== undefined) row.user_rating = result.userRating;
  if (result.userNotes !== undefined) row.user_notes = result.userNotes;
  if (result.status !== undefined) row.status = result.status;
  if (result.completedAt !== undefined) row.completed_at = result.completedAt;
  if (result.errorMessage !== undefined) row.error_message = result.errorMessage;

  return row;
}

// ============================================
// Base Model Mapping
// ============================================

export function mapDbRowToBaseModel(row: any): BaseModel {
  return {
    id: row.id,
    modelId: row.model_id,
    displayName: row.display_name,
    parameterCount: row.parameter_count,
    contextLength: row.context_length,
    license: row.license,
    dockerImage: row.docker_image,
    minGpuMemoryGb: row.min_gpu_memory_gb,
    recommendedGpuType: row.recommended_gpu_type,
    supportsLora: row.supports_lora,
    supportsQuantization: row.supports_quantization,
    isActive: row.is_active,
  };
}
