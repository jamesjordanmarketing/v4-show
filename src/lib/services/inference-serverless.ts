/**
 * Inference Service - Serverless Implementation
 *
 * RunPod Serverless vLLM endpoint communication with retry logic.
 * 
 * PRESERVED: This code will be reused when RunPod fixes V1 + LoRA compatibility.
 * Currently disabled when INFERENCE_MODE=pods.
 * 
 * @see inference-service.ts for mode switching logic
 */

// ============================================
// Constants (Serverless-specific)
// ============================================

const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;
const RUNPOD_API_URL = process.env.INFERENCE_API_URL || process.env.GPU_CLUSTER_API_URL || 'https://api.runpod.ai/v2/780tauhj7c126b';

// ============================================
// Diagnostic Logging Utilities
// ============================================

interface DiagnosticContext {
    timestamp: string;
    attemptNumber?: number;
    requestId?: string;
    endpointUrl: string;
    useAdapter: boolean;
    adapterName?: string;
    modelSpecified?: string;
    phase: string;
}

function createDiagnosticContext(
    phase: string,
    options: Partial<DiagnosticContext> = {}
): DiagnosticContext {
    return {
        timestamp: new Date().toISOString(),
        endpointUrl: RUNPOD_API_URL,
        useAdapter: false,
        phase,
        ...options,
    };
}

function logDiagnostic(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: DiagnosticContext,
    details?: Record<string, unknown>
): void {
    const logData = {
        ...context,
        message,
        ...(details || {}),
    };

    const prefix = `[INFERENCE-SERVERLESS][${context.phase}]`;

    if (level === 'error') {
        console.error(`${prefix} ${message}`, JSON.stringify(logData, null, 2));
    } else if (level === 'warn') {
        console.warn(`${prefix} ${message}`, JSON.stringify(logData, null, 2));
    } else {
        console.log(`${prefix} ${message}`, JSON.stringify(logData, null, 2));
    }
}

/**
 * Check RunPod endpoint health before making inference requests.
 */
async function checkEndpointHealth(): Promise<{
    healthy: boolean;
    endpointReachable: boolean;
    workersAvailable?: number;
    queueDepth?: number;
    error?: string;
    rawResponse?: unknown;
}> {
    const ctx = createDiagnosticContext('HEALTH_CHECK');

    try {
        logDiagnostic('info', 'Checking RunPod endpoint health...', ctx);

        const healthUrl = `${RUNPOD_API_URL}/health`;
        const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
            },
        });

        const responseText = await response.text();
        let responseData: Record<string, unknown> = {};

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }

        logDiagnostic('info', 'Health check response received', ctx, {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            responseData,
        });

        if (!response.ok) {
            return {
                healthy: false,
                endpointReachable: true,
                error: `HTTP ${response.status}: ${responseText}`,
                rawResponse: responseData,
            };
        }

        const workers = responseData.workers as { running?: number; idle?: number; ready?: number } | undefined;
        const jobs = responseData.jobs as { inQueue?: number; inProgress?: number } | undefined;

        return {
            healthy: true,
            endpointReachable: true,
            workersAvailable: workers?.running || workers?.idle || workers?.ready || 0,
            queueDepth: jobs?.inQueue || 0,
            rawResponse: responseData,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logDiagnostic('error', 'Health check failed - endpoint may be unreachable', ctx, {
            error: errorMessage,
        });

        return {
            healthy: false,
            endpointReachable: false,
            error: errorMessage,
        };
    }
}

/**
 * Wait for a worker to be truly READY before sending requests.
 */
async function waitForReadyWorker(
    maxWaitMs: number = 120000,
    pollIntervalMs: number = 5000
): Promise<{
    ready: boolean;
    readyWorkerCount: number;
    idleWorkerCount: number;
    runningWorkerCount: number;
    initializingWorkerCount: number;
    error?: string;
    waitedMs: number;
}> {
    const ctx = createDiagnosticContext('WAIT_FOR_READY');
    const startTime = Date.now();
    let pollCount = 0;

    logDiagnostic('info', '⏳ Waiting for a READY worker (not just running)...', ctx, {
        maxWaitMs,
        pollIntervalMs,
        reason: 'vLLM V1 engine crashes if requests hit during Ray DAG initialization',
    });

    while ((Date.now() - startTime) < maxWaitMs) {
        pollCount++;

        try {
            const healthUrl = `${RUNPOD_API_URL}/health`;
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                },
            });

            if (!response.ok) {
                logDiagnostic('warn', `Health check poll ${pollCount} failed with HTTP error`, ctx, {
                    status: response.status,
                });
                await new Promise(r => setTimeout(r, pollIntervalMs));
                continue;
            }

            const data = await response.json();
            const workers = data.workers || {};
            const jobs = data.jobs || {};

            const readyCount = workers.ready || 0;
            const idleCount = workers.idle || 0;
            const runningCount = workers.running || 0;
            const initializingCount = workers.initializing || 0;
            const inProgressJobs = jobs.inProgress || 0;
            const queuedJobs = jobs.inQueue || 0;

            logDiagnostic('info', `Poll ${pollCount}: checking worker states...`, ctx, {
                workers: { ready: readyCount, idle: idleCount, running: runningCount, initializing: initializingCount },
                jobs: { inProgress: inProgressJobs, inQueue: queuedJobs },
                waitedMs: Date.now() - startTime,
            });

            if (readyCount > 0 || idleCount > 0) {
                const waitedMs = Date.now() - startTime;
                logDiagnostic('info', `✅ Found ${readyCount} ready and ${idleCount} idle workers after ${waitedMs}ms`, ctx, {
                    pollCount,
                    waitedMs,
                });
                return {
                    ready: true,
                    readyWorkerCount: readyCount,
                    idleWorkerCount: idleCount,
                    runningWorkerCount: runningCount,
                    initializingWorkerCount: initializingCount,
                    waitedMs,
                };
            }

            if (runningCount > 0 && readyCount === 0 && idleCount === 0 && initializingCount === 0) {
                logDiagnostic('warn', `⚠️ ${runningCount} running workers but 0 ready/idle - engine may be dead`, ctx, {
                    suggestion: 'Worker(s) may have crashed. Consider restarting workers in RunPod console.',
                    waitedMs: Date.now() - startTime,
                });
            }

            if (initializingCount > 0) {
                logDiagnostic('info', `⏳ ${initializingCount} workers still initializing, waiting...`, ctx);
            }

        } catch (error) {
            logDiagnostic('warn', `Health check poll ${pollCount} failed with error`, ctx, {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    const waitedMs = Date.now() - startTime;
    logDiagnostic('error', `❌ Timed out waiting for ready worker after ${waitedMs}ms`, ctx, {
        pollCount,
        maxWaitMs,
    });

    return {
        ready: false,
        readyWorkerCount: 0,
        idleWorkerCount: 0,
        runningWorkerCount: 0,
        initializingWorkerCount: 0,
        error: `No ready workers found after ${waitedMs}ms`,
        waitedMs,
    };
}

/**
 * Validate chat message roles for vLLM V1 strict chat template.
 * 
 * Rules (per RunPod support):
 * - Optional system message MUST be first
 * - Roles must alternate: user, assistant, user, assistant, ...
 * - No two consecutive same roles
 * 
 * @throws Error if validation fails with detailed explanation
 */
function validateMessageRoles(messages: Array<{ role: string; content: string }>): void {
    if (messages.length === 0) {
        throw new Error('Messages array cannot be empty');
    }

    // Check if first message is system
    const hasSystem = messages[0].role === 'system';
    const firstNonSystemIdx = hasSystem ? 1 : 0;

    // If system exists and there's only system, that's invalid
    if (hasSystem && messages.length === 1) {
        throw new Error('Cannot have only system message - need at least one user message');
    }

    // First non-system message MUST be user
    if (firstNonSystemIdx < messages.length && messages[firstNonSystemIdx].role !== 'user') {
        throw new Error(
            `First non-system message must be 'user', got '${messages[firstNonSystemIdx].role}'`
        );
    }

    // Check alternating pattern: user, assistant, user, assistant, ...
    for (let i = firstNonSystemIdx; i < messages.length; i++) {
        const expectedRole = (i - firstNonSystemIdx) % 2 === 0 ? 'user' : 'assistant';
        const actualRole = messages[i].role;

        if (actualRole !== expectedRole) {
            throw new Error(
                `Message at index ${i} violates alternating pattern. ` +
                `Expected '${expectedRole}', got '${actualRole}'. ` +
                `Full sequence: [${messages.map(m => m.role).join(', ')}]`
            );
        }
    }

    console.log('[INFERENCE-SERVERLESS] ✅ Message roles validated:', {
        messageCount: messages.length,
        roles: messages.map(m => m.role),
        hasSystem,
    });
}

/**
 * Internal function - handles a single inference attempt (serverless format)
 */
async function _callInferenceEndpointInternal(
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
    const startTime = Date.now();

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // VALIDATE MESSAGE ROLES (vLLM V1 strict chat template)
    // Per RunPod support: Invalid role sequences cause malformed errors → EngineDeadError
    try {
        validateMessageRoles(messages);
    } catch (error) {
        const validationError = error instanceof Error ? error.message : String(error);
        console.error('[INFERENCE-SERVERLESS] ❌ Message role validation FAILED:', {
            error: validationError,
            messages: messages.map(m => ({ role: m.role, contentLength: m.content.length })),
        });
        throw new Error(`Invalid message roles: ${validationError}`);
    }

    // Determine model name: adapter name or base model
    const modelName = (useAdapter && jobId) 
        ? `adapter-${jobId.substring(0, 8)}`
        : 'mistralai/Mistral-7B-Instruct-v0.2';

    // CRITICAL FIX: Use OpenAI route format to properly pass max_tokens and temperature
    // Per RunPod support (Feb 2026): Without openai_route, max_tokens defaults to 100 tokens
    // causing truncation at ~200 tokens when re-tokenized
    const body: {
        input: {
            openai_route: string;
            openai_input: {
                model: string;
                messages: Array<{ role: string; content: string }>;
                max_tokens: number;
                temperature: number;
            };
        };
    } = {
        input: {
            openai_route: '/v1/chat/completions',
            openai_input: {
                model: modelName,
                messages,
                max_tokens: 2048,
                temperature: 0.7,
            },
        },
    };

    if (useAdapter && jobId) {
        console.log('[INFERENCE-SERVERLESS] ✅ Using pre-loaded adapter:', { 
            adapterName: modelName, 
            jobId,
            requestFormat: 'OpenAI route wrapper'
        });
    } else {
        console.log('[INFERENCE-SERVERLESS] ⚪ Using base model:', { 
            model: modelName,
            requestFormat: 'OpenAI route wrapper'
        });
    }

    // ENHANCED REQUEST LOGGING (for RunPod support debugging)
    console.log('[INFERENCE-SERVERLESS] 📤 SENDING REQUEST TO RUNPOD:', {
        timestamp: new Date().toISOString(),
        url: `${RUNPOD_API_URL}/runsync`,
        endpoint: RUNPOD_API_URL,
        requestFormat: 'OpenAI route wrapper (Feb 2026 fix for truncation)',
        requestSummary: {
            openai_route: body.input.openai_route,
            model: body.input.openai_input.model,
            messageCount: body.input.openai_input.messages.length,
            messageRoles: body.input.openai_input.messages.map(m => m.role),
            max_tokens: body.input.openai_input.max_tokens,
            temperature: body.input.openai_input.temperature,
        },
        messagesDetail: body.input.openai_input.messages.map((m, i) => ({
            index: i,
            role: m.role,
            contentLength: m.content.length,
            contentPreview: m.content.substring(0, 80) + (m.content.length > 80 ? '...' : ''),
        })),
    });

    // FULL PAYLOAD for debugging (if support needs exact request)
    console.log('[INFERENCE-SERVERLESS] 📋 FULL REQUEST PAYLOAD:', 
        JSON.stringify(body, null, 2)
    );

    const response = await fetch(`${RUNPOD_API_URL}/runsync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[INFERENCE-SERVERLESS] RunPod API error:', {
            status: response.status,
            statusText: response.statusText,
            errorText
        });
        throw new Error(`Inference failed: ${response.status} - ${errorText}`);
    }

    let result = await response.json();

    console.log('[INFERENCE-SERVERLESS] Initial RunPod response:', {
        status: result.status,
        id: result.id,
        workerId: result.workerId,
        hasOutput: !!result.output,
        outputType: typeof result.output,
    });

    // Handle FAILED status
    if (result.status === 'FAILED') {
        console.error('[INFERENCE-SERVERLESS] ❌ RunPod request FAILED:', {
            id: result.id,
            error: result.error,
            errorContainsEngineDeadError: result.error?.includes('EngineDeadError'),
        });

        const isEngineDeadError = result.error && (
            result.error.includes('EngineDeadError') ||
            result.error.includes('EngineCore') ||
            result.error.includes('AsyncLLM output_handler failed')
        );

        if (isEngineDeadError) {
            throw new Error(`RETRYABLE_ENGINE_ERROR: vLLM engine crashed. WorkerId=${result.workerId}`);
        }

        let errorMessage = 'Inference request failed';
        if (result.error) {
            errorMessage = result.error.substring(0, 300);
        }
        throw new Error(`Inference failed: ${errorMessage}`);
    }

    // Handle IN_QUEUE status - poll for completion
    if (result.status === 'IN_QUEUE' && result.id) {
        console.log('[INFERENCE-SERVERLESS] ⏳ Request queued, polling for completion...');

        const maxPolls = 60;
        let pollCount = 0;

        while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            pollCount++;

            const statusResponse = await fetch(`${RUNPOD_API_URL}/status/${result.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                },
            });

            if (!statusResponse.ok) {
                console.error('[INFERENCE-SERVERLESS] Status poll failed:', { pollCount, status: statusResponse.status });
                continue;
            }

            result = await statusResponse.json();
            console.log('[INFERENCE-SERVERLESS] Poll result:', { pollCount, status: result.status, hasOutput: !!result.output });

            if (result.status === 'COMPLETED' && result.output) {
                console.log('[INFERENCE-SERVERLESS] ✅ Request completed after polling');
                break;
            } else if (result.status === 'FAILED') {
                throw new Error(`Inference failed: ${result.error || 'Unknown error'}`);
            }
        }

        if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
            throw new Error(
                'Inference timed out after 5 minutes. RunPod worker may be initializing. ' +
                'This usually means serverless workers are stuck. ' +
                'Try: (1) Set INFERENCE_MODE=pods in Vercel environment variables, or ' +
                '(2) Restart workers in RunPod dashboard.'
            );
        }
    }

    const generationTimeMs = Date.now() - startTime;

    // Extract response from RunPod result
    // With openai_route, response is standard OpenAI Chat Completion format
    let responseText = '';
    let finishReason = 'unknown';
    
    if (result.output) {
        if (typeof result.output === 'string') {
            responseText = result.output;
        } else if (Array.isArray(result.output) && result.output[0]) {
            const firstOutput = result.output[0];
            if (firstOutput.choices && firstOutput.choices[0]) {
                const choice = firstOutput.choices[0];
                finishReason = choice.finish_reason || 'not_provided';
                if (Array.isArray(choice.tokens) && choice.tokens[0]) {
                    responseText = choice.tokens[0];
                } else {
                    responseText = choice.message?.content || choice.text || '';
                }
            }
        } else if (result.output.choices && result.output.choices[0]) {
            const choice = result.output.choices[0];
            finishReason = choice.finish_reason || 'not_provided';
            if (Array.isArray(choice.tokens) && choice.tokens[0]) {
                responseText = choice.tokens[0];
            } else {
                responseText = choice.message?.content || choice.text || '';
            }
        } else if (result.output.response) {
            responseText = result.output.response;
        } else if (result.output.text) {
            responseText = result.output.text;
        }
    }

    // Extract token count (completion + prompt)
    let tokensUsed = 0;
    let promptTokens = 0;
    if (result.output) {
        if (Array.isArray(result.output) && result.output[0]?.usage) {
            const usage = result.output[0].usage;
            tokensUsed = usage.completion_tokens || usage.output || 0;
            promptTokens = usage.prompt_tokens || 0;
        } else if (result.output.usage) {
            tokensUsed = result.output.usage.completion_tokens || result.output.usage.total_tokens || 0;
            promptTokens = result.output.usage.prompt_tokens || 0;
        }
    }

    // Detect potential truncation
    const endsWithSentenceTerminator = /[.!?]["']?\s*$/.test(responseText.trim());
    const wasPotentiallyTruncated = !endsWithSentenceTerminator || finishReason === 'length';

    console.log('[INFERENCE-SERVERLESS] Extracted response:', {
        responseLength: responseText.length,
        tokensUsed,
        promptTokens,
        generationTimeMs,
        finishReason,
        wasPotentiallyTruncated,
        responseEnding: responseText.slice(-50)
    });

    // Log prompt token diagnostics — reveals if vLLM truncated input
    if (promptTokens > 0) {
        const estimatedInputTokens = messages.reduce((sum, m) => sum + Math.ceil(String(m.content).length / 4), 0);
        const inputRatio = ((promptTokens / estimatedInputTokens) * 100).toFixed(1);
        console.log('[INFERENCE-SERVERLESS] Token budget analysis:', {
            promptTokens,
            completionTokens: tokensUsed,
            totalTokens: promptTokens + tokensUsed,
            estimatedInputTokens,
            inputRatio: `${inputRatio}%`,
            inputPotentiallyTruncated: promptTokens < estimatedInputTokens * 0.8
        });
    }

    return {
        response: responseText,
        generationTimeMs,
        tokensUsed,
    };
}

/**
 * Call inference endpoint with automatic retry for engine cold-start crashes.
 * 
 * SERVERLESS IMPLEMENTATION - Uses RunPod wrapper format: {input: {...}}
 */
export async function callInferenceEndpoint_Serverless(
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
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [15000, 30000, 45000];
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const adapterName = jobId ? `adapter-${jobId.substring(0, 8)}` : undefined;

    const baseCtx = createDiagnosticContext('INFERENCE_WRAPPER', {
        requestId,
        useAdapter,
        adapterName,
        modelSpecified: useAdapter && adapterName ? adapterName : undefined,
    });

    logDiagnostic('info', '=== STARTING INFERENCE REQUEST (SERVERLESS) ===', baseCtx, {
        promptLength: prompt.length,
        hasSystemPrompt: !!systemPrompt,
        maxRetries: MAX_RETRIES,
    });

    // Wait for a worker to be truly READY
    logDiagnostic('info', '⏳ Waiting for worker to be READY...', baseCtx);

    const workerReadyResult = await waitForReadyWorker(60000, 3000);

    logDiagnostic('info', 'Worker ready check complete', baseCtx, {
        workerReady: workerReadyResult.ready,
        readyCount: workerReadyResult.readyWorkerCount,
        idleCount: workerReadyResult.idleWorkerCount,
        waitedMs: workerReadyResult.waitedMs,
    });

    if (!workerReadyResult.ready) {
        const errorMessage = `RunPod serverless workers are not ready. ` +
            `Workers may be stuck initializing or the endpoint may be unhealthy. ` +
            `Consider: (1) Switch to pods mode by setting INFERENCE_MODE=pods in environment variables, or ` +
            `(2) Restart workers in RunPod dashboard for endpoint ${RUNPOD_API_URL}`;
        
        logDiagnostic('error', '❌ Workers not ready - cannot proceed', baseCtx, {
            readyCount: workerReadyResult.readyWorkerCount,
            initializingCount: workerReadyResult.initializingWorkerCount,
            waitedMs: workerReadyResult.waitedMs,
        });
        
        throw new Error(errorMessage);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logDiagnostic('info', `Starting attempt ${attempt}/${MAX_RETRIES}`, baseCtx);

            const result = await _callInferenceEndpointInternal(
                endpointId,
                prompt,
                systemPrompt,
                useAdapter,
                adapterPath,
                jobId
            );

            logDiagnostic('info', `✅ Attempt ${attempt} SUCCEEDED`, baseCtx, {
                responseLength: result.response.length,
                tokensUsed: result.tokensUsed,
            });

            if (attempt > 1) {
                console.log(`[INFERENCE-SERVERLESS] ✅ Succeeded after ${attempt} attempts`);
            }

            return result;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const isRetryable = lastError.message.includes('RETRYABLE_ENGINE_ERROR');

            logDiagnostic('error', `❌ Attempt ${attempt} FAILED`, baseCtx, {
                errorMessage: lastError.message,
                isRetryable,
            });

            if (isRetryable && attempt < MAX_RETRIES) {
                const delayMs = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

                logDiagnostic('info', `Checking health before retry (will wait ${delayMs / 1000}s)...`, baseCtx);
                await checkEndpointHealth();

                logDiagnostic('warn', `🔄 Scheduling retry ${attempt + 1} in ${delayMs / 1000}s`, baseCtx, {
                    delayMs,
                    reason: 'vLLM V1 engine crashed - likely during Ray DAG initialization',
                });

                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }

            if (isRetryable) {
                throw new Error(
                    `Inference failed after ${attempt} attempts: vLLM engine crashed during initialization. ` +
                    `Request ID: ${requestId}. ` +
                    `The worker may need to be manually restarted.`
                );
            }

            throw lastError;
        }
    }

    throw lastError || new Error('Inference failed after all retries');
}
