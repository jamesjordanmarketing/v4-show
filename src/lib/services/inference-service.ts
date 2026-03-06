/**
 * Inference Service - Mode Selector
 *
 * Routes inference requests to either Pods or Serverless implementation
 * based on INFERENCE_MODE environment variable.
 *
 * INFERENCE_MODE Configuration
 *
 * "serverless" (default):
 *   - Uses RunPod Serverless vLLM endpoints
 *   - Workers auto-scale (workersMin/workersMax)
 *   - Adapters loaded via LORA_MODULES env var at worker cold-start
 *   - Cost: pay per second of active compute
 *   - Endpoint URL: INFERENCE_API_URL (e.g. https://api.runpod.ai/v2/780tauhj7c126b)
 *   - Shared by BOTH Pipeline adapter testing AND RAG LoRA queries
 *
 * "pods" (permanent instance):
 *   - Uses dedicated RunPod Pods with direct OpenAI-compatible API
 *   - Requires two separate pods: one for base model, one with adapter loaded
 *   - Adapters loaded via vLLM CLI args (--lora-modules) at pod startup
 *   - Cost: ~$0.50-5.00/hour continuous (GPU-dependent), faster cold-start
 *   - Endpoint URLs: INFERENCE_API_URL (control) + INFERENCE_API_URL_ADAPTED (adapted)
 *   - To add new adapters: restart the adapted pod with updated --lora-modules
 *
 * Switching: Set INFERENCE_MODE env var in Vercel + .env.local
 *
 * IMPORTANT: This file serves as the entry point. The actual implementations are in:
 * - inference-pods.ts (current, active when INFERENCE_MODE=pods)
 * - inference-serverless.ts (preserved for future, active when INFERENCE_MODE=serverless)
 *
 * To switch modes: Update INFERENCE_MODE in Vercel Dashboard → Settings → Environment Variables
 */

import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import {
  InferenceEndpoint,
  DeployAdapterResponse,
  EndpointStatusResponse
} from '@/types/pipeline-adapter';
import { mapDbRowToEndpoint } from '@/lib/pipeline/adapter-db-utils';

// Import both implementations
import { callInferenceEndpoint_Serverless } from './inference-serverless';
import { callInferenceEndpoint_Pods } from './inference-pods';

// ============================================
// Mode Selection
// ============================================

/**
 * Feature flag to switch between inference modes.
 * 
 * Values:
 * - 'pods' (current/recommended): Uses RunPod Pods with direct OpenAI API
 * - 'serverless' (preserved): Uses RunPod Serverless with wrapper format
 * 
 * Change in Vercel Dashboard → Settings → Environment Variables
 */
const INFERENCE_MODE = process.env.INFERENCE_MODE || 'serverless';

// Log mode selection on module load
console.log(`[INFERENCE-SERVICE] Mode selected: ${INFERENCE_MODE}`);

// ============================================
// Inference Endpoint URLs (for legacy health checks)
// ============================================

const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const INFERENCE_API_URL = process.env.INFERENCE_API_URL || 'https://api.runpod.ai/v2/ei82ickpenoqlp';

// Configuration for virtual endpoints
const INFERENCE_CONFIG = {
  endpointPrefix: 'virtual-inference',
  defaultBaseModel: 'mistralai/mistral-7b-instruct-v0.2',
};

// ============================================
// Signed URL Generation (shared utility)
// ============================================

async function getAdapterSignedUrl(adapterPath: string): Promise<string | null> {
  const supabase = createServerSupabaseAdminClient();

  let storagePath = adapterPath;
  if (storagePath.startsWith('lora-models/')) {
    storagePath = storagePath.replace('lora-models/', '');
  }

  const { data: signedUrl, error } = await supabase.storage
    .from('lora-models')
    .createSignedUrl(storagePath, 3600 * 24);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return signedUrl?.signedUrl || null;
}

// ============================================
// Deployment Functions (shared)
// ============================================

export async function deployAdapterEndpoints(
  userId: string,
  jobId: string,
  forceRedeploy = false
): Promise<DeployAdapterResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (job.status !== 'completed' || !job.adapter_file_path) {
      return { success: false, error: 'Job must be completed with adapter' };
    }

    // Check for existing endpoints
    const { data: existingEndpoints } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', jobId);

    let existingControl = existingEndpoints?.find(e => e.endpoint_type === 'control');
    let existingAdapted = existingEndpoints?.find(e => e.endpoint_type === 'adapted');

    // If force redeploy, delete existing endpoints
    if (forceRedeploy && existingEndpoints && existingEndpoints.length > 0) {
      await supabase
        .from('pipeline_inference_endpoints')
        .delete()
        .eq('job_id', jobId);

      existingControl = undefined;
      existingAdapted = undefined;
    }

    // Get signed URL for adapter (needed for adapted endpoint)
    const adapterUrl = await getAdapterSignedUrl(job.adapter_file_path);
    if (!adapterUrl) {
      return { success: false, error: 'Failed to generate adapter download URL' };
    }

    const baseModel = INFERENCE_CONFIG.defaultBaseModel;
    const virtualEndpointId = `${INFERENCE_CONFIG.endpointPrefix}-${jobId.slice(0, 8)}`;

    // Create Control endpoint record if needed
    let controlEndpoint: InferenceEndpoint;
    if (existingControl && existingControl.status !== 'failed') {
      controlEndpoint = mapDbRowToEndpoint(existingControl);
    } else {
      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'control',
          runpod_endpoint_id: `${virtualEndpointId}-control`,
          base_model: baseModel,
          status: 'ready',
          ready_at: new Date().toISOString(),
          health_check_url: `${INFERENCE_API_URL}/health`,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: `Failed to create control endpoint: ${insertError.message}` };
      }

      controlEndpoint = mapDbRowToEndpoint(newEndpoint);
    }

    // Create Adapted endpoint record if needed
    let adaptedEndpoint: InferenceEndpoint;
    if (existingAdapted && existingAdapted.status !== 'failed') {
      adaptedEndpoint = mapDbRowToEndpoint(existingAdapted);
    } else {
      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'adapted',
          runpod_endpoint_id: `${virtualEndpointId}-adapted`,
          base_model: baseModel,
          adapter_path: job.adapter_file_path,
          status: 'ready',
          ready_at: new Date().toISOString(),
          health_check_url: `${INFERENCE_API_URL}/health`,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: `Failed to create adapted endpoint: ${insertError.message}` };
      }

      adaptedEndpoint = mapDbRowToEndpoint(newEndpoint);
    }

    return {
      success: true,
      data: { controlEndpoint, adaptedEndpoint },
    };
  } catch (error) {
    console.error('Deploy adapter endpoints error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deployment failed'
    };
  }
}

export async function getEndpointStatus(
  jobId: string
): Promise<EndpointStatusResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: endpoints, error } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    const controlEndpoint = endpoints?.find(e => e.endpoint_type === 'control');
    const adaptedEndpoint = endpoints?.find(e => e.endpoint_type === 'adapted');

    const bothReady =
      controlEndpoint?.status === 'ready' &&
      adaptedEndpoint?.status === 'ready';

    return {
      success: true,
      data: {
        controlEndpoint: controlEndpoint ? mapDbRowToEndpoint(controlEndpoint) : null,
        adaptedEndpoint: adaptedEndpoint ? mapDbRowToEndpoint(adaptedEndpoint) : null,
        bothReady,
      },
    };
  } catch (error) {
    console.error('Get endpoint status error:', error);
    return { success: false, error: 'Failed to get status' };
  }
}

// ============================================
// Main Entry Point - Routes to correct implementation
// ============================================

/**
 * Call inference endpoint with the configured mode.
 * 
 * Routes to either:
 * - callInferenceEndpoint_Pods (INFERENCE_MODE=pods)
 * - callInferenceEndpoint_Serverless (INFERENCE_MODE=serverless)
 * 
 * @param endpointId - Virtual endpoint ID (from database)
 * @param prompt - User prompt text
 * @param systemPrompt - Optional system prompt
 * @param useAdapter - Whether to use the LoRA adapter (adapted endpoint)
 * @param adapterPath - Path to adapter (used for serverless mode)
 * @param jobId - Job ID (used to construct adapter name)
 */
export async function callInferenceEndpoint(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false,
  adapterPath?: string,
  jobId?: string
): Promise<{
  response: string;
  generationTimeMs: number;
  tokensUsed: number;
}> {
  console.log(`[INFERENCE-SERVICE] Routing to ${INFERENCE_MODE} implementation`, {
    endpointId,
    useAdapter,
    hasJobId: !!jobId,
    promptLength: prompt.length,
  });

  if (INFERENCE_MODE === 'pods') {
    // Use Pods implementation (current/recommended)
    return await callInferenceEndpoint_Pods(
      endpointId,
      prompt,
      systemPrompt,
      useAdapter,
      adapterPath,
      jobId
    );
  } else {
    // Use Serverless implementation (preserved for future)
    return await callInferenceEndpoint_Serverless(
      endpointId,
      prompt,
      systemPrompt,
      useAdapter,
      adapterPath,
      jobId
    );
  }
}
