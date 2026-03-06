# Adapter Application Module - Section E02: Service Layer Implementation

**Version:** 1.0  
**Date:** January 17, 2026  
**Section:** E02 - Service Layer  
**Prerequisites:** E01 (Database Schema & Types) must be complete  
**Builds Upon:** E01 foundation layer  

---

## Overview

This prompt implements the service layer for adapter testing infrastructure. This section creates two core services: the Inference Service (manages RunPod Serverless endpoints) and the Test Service (conducts A/B testing with optional Claude-as-Judge evaluation).

**What This Section Creates:**
1. Inference Service - RunPod endpoint management
2. Test Service - A/B testing and evaluation
3. Service exports and integration

**What This Section Does NOT Create:**
- API routes (E03)
- UI components (E05)
- React Query hooks (E04)

---

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'pipeline_inference_endpoints',limit:5});console.log(JSON.stringify(r.data,null,2));})();"
```

### Environment Variables

Add to `.env.local`:

```
RUNPOD_API_KEY=<your_runpod_api_key>
RUNPOD_API_URL=https://api.runpod.io/graphql
ANTHROPIC_API_KEY=<your_anthropic_key>
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing patterns from:**
- `src/lib/services/pipeline-service.ts` - Service patterns
- `src/lib/pipeline/evaluation-service.ts` - Claude evaluation patterns

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`
- SAOL Usage: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`

---

========================

# EXECUTION PROMPT E02 - SERVICE LAYER IMPLEMENTATION

## Context

You are implementing the service layer for the Adapter Application Module. This layer handles all business logic for:
1. **Inference Service**: Deploying and managing RunPod Serverless endpoints (Control and Adapted)
2. **Test Service**: Running A/B tests, calling Claude-as-Judge for evaluation, storing results

**Architecture Decision:**
- Two separate serverless endpoints: Control (base model) and Adapted (base + LoRA)
- RunPod Serverless with vLLM worker (OpenAI-compatible API)
- Optional Claude-as-Judge evaluation for quality comparison

---

## Task 1: Create Inference Service

This service manages RunPod Serverless inference endpoints.

### File: `src/lib/services/inference-service.ts`

```typescript
/**
 * Inference Service
 *
 * Manages RunPod serverless inference endpoints for adapter testing
 */

import { createClient } from '@/lib/supabase-server';
import {
  InferenceEndpoint,
  EndpointStatus,
  DeployAdapterResponse,
  EndpointStatusResponse
} from '@/types/pipeline-adapter';
import {
  mapDbRowToEndpoint,
  mapEndpointToDbRow
} from '@/lib/pipeline/adapter-db-utils';

// ============================================
// Constants
// ============================================

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;
const RUNPOD_API_URL = process.env.RUNPOD_API_URL || 'https://api.runpod.io/graphql';

const DEFAULT_ENDPOINT_CONFIG = {
  dockerImage: 'runpod/worker-vllm:stable-cuda12.1.0',
  idleTimeout: 300,  // 5 minutes
  maxWorkers: 1,
  gpuType: 'NVIDIA A40',
};

// ============================================
// RunPod API Helpers
// ============================================

async function callRunPodGraphQL(query: string, variables: Record<string, any> = {}) {
  const response = await fetch(RUNPOD_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`RunPod API error: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`RunPod GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function createRunPodEndpoint(config: {
  name: string;
  baseModel: string;
  adapterPath?: string;
}): Promise<string> {
  // Build environment variables for vLLM
  const envVars: Record<string, string> = {
    MODEL_NAME: config.baseModel,
    VLLM_ALLOW_RUNTIME_LORA_UPDATING: 'true',
  };

  if (config.adapterPath) {
    // Generate signed URL for adapter download from Supabase Storage
    const supabase = createClient();
    const { data: signedUrl } = await supabase.storage
      .from('lora-models')
      .createSignedUrl(config.adapterPath, 3600);  // 1 hour validity

    envVars.LORA_ADAPTER_URL = signedUrl?.signedUrl || '';
    envVars.LORA_ADAPTER_NAME = 'emotional-arc-adapter';
  }

  const mutation = `
    mutation CreateEndpoint($input: EndpointInput!) {
      createEndpoint(input: $input) {
        id
        name
        status
      }
    }
  `;

  const variables = {
    input: {
      name: config.name,
      templateId: 'vllm-serverless',  // RunPod's vLLM template
      gpuTypeId: DEFAULT_ENDPOINT_CONFIG.gpuType,
      workersMax: DEFAULT_ENDPOINT_CONFIG.maxWorkers,
      idleTimeout: DEFAULT_ENDPOINT_CONFIG.idleTimeout,
      env: Object.entries(envVars).map(([key, value]) => ({ key, value })),
    },
  };

  const result = await callRunPodGraphQL(mutation, variables);
  return result.createEndpoint.id;
}

async function getRunPodEndpointStatus(endpointId: string): Promise<{
  status: string;
  healthUrl: string;
}> {
  const query = `
    query GetEndpoint($id: String!) {
      endpoint(input: { id: $id }) {
        id
        status
        templateId
        workersRunning
      }
    }
  `;

  const result = await callRunPodGraphQL(query, { id: endpointId });

  return {
    status: result.endpoint.status,
    healthUrl: `https://api.runpod.ai/v2/${endpointId}/health`,
  };
}

// ============================================
// Core Service Functions
// ============================================

export async function deployAdapterEndpoints(
  userId: string,
  jobId: string
): Promise<DeployAdapterResponse> {
  try {
    const supabase = createClient();

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

    const existingControl = existingEndpoints?.find(e => e.endpoint_type === 'control');
    const existingAdapted = existingEndpoints?.find(e => e.endpoint_type === 'adapted');

    // Deploy Control endpoint if needed
    let controlEndpoint: InferenceEndpoint;
    if (existingControl && existingControl.status !== 'failed') {
      controlEndpoint = mapDbRowToEndpoint(existingControl);
    } else {
      // Get base model (default to Mistral-7B for now)
      const baseModel = 'mistralai/Mistral-7B-Instruct-v0.2';

      const runpodId = await createRunPodEndpoint({
        name: `control-${jobId.slice(0, 8)}`,
        baseModel,
      });

      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'control',
          runpod_endpoint_id: runpodId,
          base_model: baseModel,
          status: 'deploying',
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: `Failed to create control endpoint: ${insertError.message}` };
      }

      controlEndpoint = mapDbRowToEndpoint(newEndpoint);
    }

    // Deploy Adapted endpoint if needed
    let adaptedEndpoint: InferenceEndpoint;
    if (existingAdapted && existingAdapted.status !== 'failed') {
      adaptedEndpoint = mapDbRowToEndpoint(existingAdapted);
    } else {
      const baseModel = 'mistralai/Mistral-7B-Instruct-v0.2';

      const runpodId = await createRunPodEndpoint({
        name: `adapted-${jobId.slice(0, 8)}`,
        baseModel,
        adapterPath: job.adapter_file_path,
      });

      const { data: newEndpoint, error: insertError } = await supabase
        .from('pipeline_inference_endpoints')
        .insert({
          job_id: jobId,
          user_id: userId,
          endpoint_type: 'adapted',
          runpod_endpoint_id: runpodId,
          base_model: baseModel,
          adapter_path: job.adapter_file_path,
          status: 'deploying',
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
    const supabase = createClient();

    const { data: endpoints, error } = await supabase
      .from('pipeline_inference_endpoints')
      .select('*')
      .eq('job_id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    const controlEndpoint = endpoints?.find(e => e.endpoint_type === 'control');
    const adaptedEndpoint = endpoints?.find(e => e.endpoint_type === 'adapted');

    // Poll RunPod for actual status if deploying
    if (controlEndpoint?.status === 'deploying' && controlEndpoint.runpod_endpoint_id) {
      try {
        const status = await getRunPodEndpointStatus(controlEndpoint.runpod_endpoint_id);
        if (status.status === 'READY') {
          await supabase
            .from('pipeline_inference_endpoints')
            .update({
              status: 'ready',
              health_check_url: status.healthUrl,
              ready_at: new Date().toISOString(),
            })
            .eq('id', controlEndpoint.id);
          controlEndpoint.status = 'ready';
        }
      } catch (e) {
        console.error('Failed to check control endpoint status:', e);
      }
    }

    if (adaptedEndpoint?.status === 'deploying' && adaptedEndpoint.runpod_endpoint_id) {
      try {
        const status = await getRunPodEndpointStatus(adaptedEndpoint.runpod_endpoint_id);
        if (status.status === 'READY') {
          await supabase
            .from('pipeline_inference_endpoints')
            .update({
              status: 'ready',
              health_check_url: status.healthUrl,
              ready_at: new Date().toISOString(),
            })
            .eq('id', adaptedEndpoint.id);
          adaptedEndpoint.status = 'ready';
        }
      } catch (e) {
        console.error('Failed to check adapted endpoint status:', e);
      }
    }

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

export async function callInferenceEndpoint(
  endpointId: string,
  prompt: string,
  systemPrompt?: string,
  useAdapter: boolean = false
): Promise<{
  response: string;
  generationTimeMs: number;
  tokensUsed: number;
}> {
  const startTime = Date.now();

  // Build OpenAI-compatible request
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, any> = {
    input: {
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    },
  };

  // Add adapter specification for adapted endpoint
  if (useAdapter) {
    body.input.lora_adapter = 'emotional-arc-adapter';
  }

  const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Inference failed: ${response.status}`);
  }

  const result = await response.json();
  const generationTimeMs = Date.now() - startTime;

  return {
    response: result.output?.choices?.[0]?.message?.content || '',
    generationTimeMs,
    tokensUsed: result.output?.usage?.total_tokens || 0,
  };
}
```

---

## Task 2: Create Test Service

This service runs A/B tests and optionally evaluates with Claude-as-Judge.

### File: `src/lib/services/test-service.ts`

```typescript
/**
 * Test Service
 *
 * Manages A/B testing and Claude-as-Judge evaluation
 */

import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import {
  TestResult,
  TestResultStatus,
  RunTestRequest,
  RunTestResponse,
  ClaudeEvaluation,
  EvaluationComparison,
  UserRating,
} from '@/types/pipeline-adapter';
import { callInferenceEndpoint, getEndpointStatus } from './inference-service';
import {
  mapDbRowToTestResult,
  mapTestResultToDbRow
} from '@/lib/pipeline/adapter-db-utils';

// ============================================
// Constants
// ============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EVALUATION_PROMPT = `You are an expert evaluator assessing the quality of a financial advisor conversation. Analyze the following response and provide structured evaluation.

USER'S QUESTION:
{user_prompt}

SYSTEM CONTEXT:
{system_prompt}

ADVISOR'S RESPONSE:
{response}

Evaluate the response on these dimensions and respond in JSON format:

{
  "emotionalProgression": {
    "startState": { "primaryEmotion": "<detected starting emotion>", "intensity": <0.0-1.0> },
    "endState": { "primaryEmotion": "<detected ending emotion>", "intensity": <0.0-1.0> },
    "arcCompleted": <true/false>,
    "progressionQuality": <1-5>,
    "progressionNotes": "<brief explanation>"
  },
  "empathyEvaluation": {
    "emotionsAcknowledged": <true/false>,
    "acknowledgmentInFirstSentence": <true/false>,
    "validationProvided": <true/false>,
    "empathyScore": <1-5>,
    "empathyNotes": "<brief explanation>"
  },
  "voiceConsistency": {
    "warmthPresent": <true/false>,
    "judgmentFree": <true/false>,
    "specificNumbersUsed": <true/false>,
    "jargonExplained": <true/false>,
    "voiceScore": <1-5>,
    "voiceNotes": "<brief explanation>"
  },
  "conversationQuality": {
    "helpfulToUser": <true/false>,
    "actionableGuidance": <true/false>,
    "appropriateDepth": <true/false>,
    "naturalFlow": <true/false>,
    "qualityScore": <1-5>,
    "qualityNotes": "<brief explanation>"
  },
  "overallEvaluation": {
    "wouldUserFeelHelped": <true/false>,
    "overallScore": <1-5>,
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph overall assessment>"
  }
}

Respond ONLY with valid JSON, no other text.`;

// ============================================
// Claude-as-Judge Functions
// ============================================

async function evaluateWithClaude(
  userPrompt: string,
  systemPrompt: string | null,
  response: string
): Promise<ClaudeEvaluation> {
  const prompt = EVALUATION_PROMPT
    .replace('{user_prompt}', userPrompt)
    .replace('{system_prompt}', systemPrompt || 'General financial planning advice')
    .replace('{response}', response);

  const claudeResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = claudeResponse.content[0].type === 'text'
    ? claudeResponse.content[0].text
    : '';

  return JSON.parse(responseText) as ClaudeEvaluation;
}

function compareEvaluations(
  controlEval: ClaudeEvaluation,
  adaptedEval: ClaudeEvaluation
): EvaluationComparison {
  const controlScore = controlEval.overallEvaluation.overallScore;
  const adaptedScore = adaptedEval.overallEvaluation.overallScore;
  const scoreDiff = adaptedScore - controlScore;

  let winner: 'control' | 'adapted' | 'tie';
  if (scoreDiff > 0.5) winner = 'adapted';
  else if (scoreDiff < -0.5) winner = 'control';
  else winner = 'tie';

  // Identify improvements
  const improvements: string[] = [];
  const regressions: string[] = [];

  if (adaptedEval.empathyEvaluation.empathyScore > controlEval.empathyEvaluation.empathyScore) {
    improvements.push('Higher empathy score');
  } else if (adaptedEval.empathyEvaluation.empathyScore < controlEval.empathyEvaluation.empathyScore) {
    regressions.push('Lower empathy score');
  }

  if (adaptedEval.voiceConsistency.voiceScore > controlEval.voiceConsistency.voiceScore) {
    improvements.push('Better voice consistency');
  } else if (adaptedEval.voiceConsistency.voiceScore < controlEval.voiceConsistency.voiceScore) {
    regressions.push('Worse voice consistency');
  }

  if (adaptedEval.conversationQuality.qualityScore > controlEval.conversationQuality.qualityScore) {
    improvements.push('Higher quality guidance');
  } else if (adaptedEval.conversationQuality.qualityScore < controlEval.conversationQuality.qualityScore) {
    regressions.push('Lower quality guidance');
  }

  if (adaptedEval.emotionalProgression.arcCompleted && !controlEval.emotionalProgression.arcCompleted) {
    improvements.push('Completed emotional arc');
  } else if (!adaptedEval.emotionalProgression.arcCompleted && controlEval.emotionalProgression.arcCompleted) {
    regressions.push('Failed to complete emotional arc');
  }

  return {
    winner,
    controlOverallScore: controlScore,
    adaptedOverallScore: adaptedScore,
    scoreDifference: scoreDiff,
    improvements,
    regressions,
    summary: `The ${winner === 'tie' ? 'responses are comparable' : winner + ' response performed better'} with a score difference of ${Math.abs(scoreDiff).toFixed(1)} points.`,
  };
}

// ============================================
// Core Service Functions
// ============================================

export async function runABTest(
  userId: string,
  request: RunTestRequest
): Promise<RunTestResponse> {
  const supabase = createClient();

  try {
    // Verify endpoints are ready
    const endpointStatus = await getEndpointStatus(request.jobId);
    if (!endpointStatus.success || !endpointStatus.data?.bothReady) {
      return { success: false, error: 'Endpoints not ready' };
    }

    const { controlEndpoint, adaptedEndpoint } = endpointStatus.data;

    // Create test record
    const { data: testRecord, error: insertError } = await supabase
      .from('pipeline_test_results')
      .insert({
        job_id: request.jobId,
        user_id: userId,
        user_prompt: request.userPrompt,
        system_prompt: request.systemPrompt || null,
        evaluation_enabled: request.enableEvaluation || false,
        status: 'generating',
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: `Failed to create test: ${insertError.message}` };
    }

    // Run parallel inference
    const [controlResult, adaptedResult] = await Promise.all([
      callInferenceEndpoint(
        controlEndpoint!.runpodEndpointId!,
        request.userPrompt,
        request.systemPrompt,
        false  // No adapter
      ),
      callInferenceEndpoint(
        adaptedEndpoint!.runpodEndpointId!,
        request.userPrompt,
        request.systemPrompt,
        true   // Use adapter
      ),
    ]);

    // Update with responses
    const updates: Record<string, any> = {
      control_response: controlResult.response,
      control_generation_time_ms: controlResult.generationTimeMs,
      control_tokens_used: controlResult.tokensUsed,
      adapted_response: adaptedResult.response,
      adapted_generation_time_ms: adaptedResult.generationTimeMs,
      adapted_tokens_used: adaptedResult.tokensUsed,
      status: request.enableEvaluation ? 'evaluating' : 'completed',
      completed_at: request.enableEvaluation ? null : new Date().toISOString(),
    };

    // Run Claude-as-Judge evaluation if requested
    if (request.enableEvaluation) {
      try {
        await supabase
          .from('pipeline_test_results')
          .update({ status: 'evaluating' })
          .eq('id', testRecord.id);

        const [controlEval, adaptedEval] = await Promise.all([
          evaluateWithClaude(request.userPrompt, request.systemPrompt || null, controlResult.response),
          evaluateWithClaude(request.userPrompt, request.systemPrompt || null, adaptedResult.response),
        ]);

        const comparison = compareEvaluations(controlEval, adaptedEval);

        updates.control_evaluation = controlEval;
        updates.adapted_evaluation = adaptedEval;
        updates.evaluation_comparison = comparison;
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      } catch (evalError) {
        console.error('Evaluation failed:', evalError);
        // Continue without evaluation
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        updates.error_message = 'Evaluation failed but responses generated';
      }
    }

    const { data: finalResult, error: updateError } = await supabase
      .from('pipeline_test_results')
      .update(updates)
      .eq('id', testRecord.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: `Failed to update test: ${updateError.message}` };
    }

    return { success: true, data: mapDbRowToTestResult(finalResult) };
  } catch (error) {
    console.error('Run A/B test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}

export async function getTestHistory(
  jobId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ success: boolean; data?: TestResult[]; count?: number; error?: string }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('pipeline_test_results')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map(mapDbRowToTestResult),
      count: count || 0,
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch test history' };
  }
}

export async function rateTestResult(
  testId: string,
  userId: string,
  rating: UserRating,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('pipeline_test_results')
      .update({
        user_rating: rating,
        user_notes: notes || null,
      })
      .eq('id', testId)
      .eq('user_id', userId);  // Ensure ownership

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save rating' };
  }
}
```

---

## Task 3: Update Service Index

Update the service exports to include new adapter services.

### File: `src/lib/services/index.ts`

Add to existing exports:

```typescript
// Existing exports...
export * from './pipeline-service';

// NEW: Adapter testing exports
export * from './inference-service';
export * from './test-service';
```

---

## Task 4: Verification & Testing

After creating all files, verify the implementation:

### 1. Verify TypeScript Compilation

```bash
# Verify TypeScript compiles
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npx tsc --noEmit --project tsconfig.json
```

### 2. Test Service Imports

Create a quick test file: `src/lib/services/__tests__/adapter-services.test.ts`

```typescript
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
```

### 3. Verify Environment Variables

```bash
# Check environment variables are set
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && node -e "require('dotenv').config({path:'.env.local'});console.log('RUNPOD_API_KEY:',!!process.env.RUNPOD_API_KEY);console.log('ANTHROPIC_API_KEY:',!!process.env.ANTHROPIC_API_KEY);"
```

---

## Success Criteria

Verify ALL criteria are met:

- [ ] `src/lib/services/inference-service.ts` created
- [ ] `src/lib/services/test-service.ts` created
- [ ] `src/lib/services/index.ts` updated with new exports
- [ ] TypeScript compiles without errors
- [ ] Environment variables configured
- [ ] Service functions use correct database mapping utilities
- [ ] RunPod API integration follows GraphQL patterns
- [ ] Claude API integration follows evaluation patterns
- [ ] Error handling implemented for all service functions
- [ ] Parallel processing implemented for A/B testing

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/lib/services/inference-service.ts` | RunPod endpoint management |
| `src/lib/services/test-service.ts` | A/B testing and evaluation |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/services/index.ts` | Added adapter service exports |

---

## Next Steps

After completing E02:
- **E03:** API Routes (deploy, test, status endpoints)
- **E04:** React Query Hooks (useAdapterTesting)
- **E05:** UI Components & Pages

---

**END OF E02 PROMPT**

+++++++++++++++++



