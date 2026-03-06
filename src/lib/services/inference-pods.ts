/**
 * Inference Service - Pods Implementation
 *
 * RunPod Pods with vLLM OpenAI-compatible API.
 * 
 * CURRENT: Active implementation when INFERENCE_MODE=pods.
 * Uses direct OpenAI format, no RunPod wrapper.
 * Two separate endpoints: control (base model) and adapted (LoRA).
 * 
 * @see inference-service.ts for mode switching logic
 */

// ============================================
// Environment Variables
// ============================================

// These URLs change each time new pods are created
// Update in Vercel Dashboard: Settings → Environment Variables
const INFERENCE_API_URL = process.env.INFERENCE_API_URL!;
const INFERENCE_API_URL_ADAPTED = process.env.INFERENCE_API_URL_ADAPTED!;

// Base model path as configured in vLLM startup script
const BASE_MODEL_PATH = '/workspace/models/mistralai/Mistral-7B-Instruct-v0.2';

// ============================================
// Types
// ============================================

interface InferenceResult {
    response: string;
    generationTimeMs: number;
    tokensUsed: number;
}

// ============================================
// Pods Implementation
// ============================================

/**
 * Call inference endpoint using RunPod Pods with direct OpenAI format.
 * 
 * PODS IMPLEMENTATION:
 * - Direct OpenAI /v1/chat/completions format (no RunPod wrapper)
 * - Two separate endpoints: control vs adapted
 * - No Authorization header (public proxy URLs)
 * - Synchronous responses (no polling needed)
 * 
 * @param endpointId - Not used in pods mode (endpoint selected by useAdapter flag)
 * @param prompt - User's prompt text
 * @param systemPrompt - Optional system prompt
 * @param useAdapter - If true, use adapted endpoint with LoRA; if false, use control endpoint
 * @param adapterPath - Not used in pods mode (adapter pre-loaded on adapted pod)
 * @param jobId - Job ID used to construct adapter name for adapted endpoint
 */
export async function callInferenceEndpoint_Pods(
    endpointId: string,
    prompt: string,
    systemPrompt?: string,
    useAdapter: boolean = false,
    adapterPath?: string,
    jobId?: string
): Promise<InferenceResult> {
    const startTime = Date.now();

    // Select endpoint based on useAdapter flag
    const baseUrl = useAdapter ? INFERENCE_API_URL_ADAPTED : INFERENCE_API_URL;

    if (!baseUrl) {
        throw new Error(
            `Missing environment variable: ${useAdapter ? 'INFERENCE_API_URL_ADAPTED' : 'INFERENCE_API_URL'}. ` +
            'Please configure pod endpoints in Vercel Dashboard.'
        );
    }

    // Determine model name based on endpoint type
    // Control: use full model path (as loaded in vLLM)
    // Adapted: use adapter name format (as configured in --lora-modules)
    const model = useAdapter
        ? `adapter-${jobId?.substring(0, 8) || 'unknown'}`
        : BASE_MODEL_PATH;

    // Build messages array (OpenAI format)
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Build request body (direct OpenAI format - no wrapper)
    const requestBody = {
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
    };

    console.log('[INFERENCE-PODS] Calling pod endpoint:', {
        url: `${baseUrl}/v1/chat/completions`,
        useAdapter,
        model,
        messagesCount: messages.length,
        promptLength: prompt.length,
    });

    try {
        // POST to OpenAI-compatible endpoint
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // No Authorization header - pods use public proxy URLs
            },
            body: JSON.stringify(requestBody),
        });

        const generationTimeMs = Date.now() - startTime;

        // Handle HTTP errors
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[INFERENCE-PODS] ❌ HTTP error from pod:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText.substring(0, 500),
                url: baseUrl,
            });

            // Check for common pod issues
            if (response.status === 502 || response.status === 504) {
                throw new Error(
                    `Pod endpoint unreachable (${response.status}). ` +
                    'The pod may be stopped or the vLLM server is not running. ' +
                    'Please check RunPod console and ensure the startup script is running.'
                );
            }

            throw new Error(`Inference failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
        }

        // Parse response (direct OpenAI format)
        const result = await response.json();

        console.log('[INFERENCE-PODS] Response received:', {
            hasChoices: !!result.choices,
            choicesCount: result.choices?.length,
            hasUsage: !!result.usage,
            generationTimeMs,
        });

        // Extract response text from OpenAI format
        let responseText = '';
        if (result.choices && result.choices.length > 0) {
            const choice = result.choices[0];
            responseText = choice.message?.content || choice.text || '';
        }

        // Extract token usage
        let tokensUsed = 0;
        if (result.usage) {
            tokensUsed = result.usage.total_tokens || 0;
        }

        console.log('[INFERENCE-PODS] ✅ Extracted response:', {
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 100),
            tokensUsed,
            generationTimeMs,
        });

        return {
            response: responseText,
            generationTimeMs,
            tokensUsed,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error('[INFERENCE-PODS] ❌ Request failed:', {
            error: errorMessage,
            url: baseUrl,
            useAdapter,
            model,
        });

        // Add helpful context for network errors
        if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
            throw new Error(
                `Cannot connect to pod at ${baseUrl}. ` +
                'Common causes:\n' +
                '1. Pod is stopped - start it in RunPod console\n' +
                '2. vLLM server not running - run the startup script\n' +
                '3. Pod ID changed - update INFERENCE_API_URL in Vercel'
            );
        }

        throw error;
    }
}
