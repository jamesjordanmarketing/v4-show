/**
 * API Route: Batch Conversation Generation
 * 
 * POST /api/conversations/generate-batch
 * Creates a batch generation job and starts processing in background
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { getBatchGenerationService } from '@/lib/services';
import type { BatchGenerationRequest } from '@/lib/services';
import { inngest } from '@/inngest/client';

// Validation schema
const BatchGenerateRequestSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
  tier: z.enum(['template', 'scenario', 'edge_case']).optional(),
  conversationIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional(),
  parameterSets: z.array(z.object({
    templateId: z.string().uuid(),
    parameters: z.record(z.string(), z.any()),
    tier: z.enum(['template', 'scenario', 'edge_case']),
  })).optional(),
  sharedParameters: z.record(z.string(), z.any()).optional(),
  concurrentProcessing: z.number().min(1).max(10).optional().default(3),
  errorHandling: z.enum(['stop', 'continue']).optional().default('continue'),
  userId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  workbaseId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    // Parse and validate request
    const body = await request.json();
    const validated = BatchGenerateRequestSchema.parse(body);
    
    // userId from body is IGNORED — use authenticated user.id
    const userId = user.id;
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured',
          details: 'Missing ANTHROPIC_API_KEY environment variable',
        },
        { status: 500 }
      );
    }
    
    // Validate that we have either conversationIds, parameterSets, or templateId
    if (!validated.conversationIds && !validated.parameterSets && !validated.templateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Must provide conversationIds, parameterSets, or templateId with tier',
        },
        { status: 400 }
      );
    }
    
    // Prepare batch generation request
    const batchRequest: BatchGenerationRequest = {
      name: validated.name,
      conversationIds: validated.conversationIds,
      parameterSets: validated.parameterSets,
      templateId: validated.templateId,
      tier: validated.tier,
      sharedParameters: validated.sharedParameters,
      concurrentProcessing: validated.concurrentProcessing,
      errorHandling: validated.errorHandling,
      userId,
      priority: validated.priority,
      workbaseId: validated.workbaseId,
    };
    
    // Get batch generation service
    const batchService = getBatchGenerationService();
    
    // Start batch generation (returns immediately with job ID)
    const result = await batchService.startBatchGeneration(batchRequest);
    
    // Fire Inngest event to start background processing
    await inngest.send({
      name: 'batch/job.created',
      data: {
        jobId: result.jobId,
        userId,
        workbaseId: validated.workbaseId || null,
      },
    });

    console.log(`🚀 Started batch generation job: ${result.jobId} — Inngest event emitted`);
    
    // Return 202 Accepted with job info
    return NextResponse.json(
      {
        success: true,
        jobId: result.jobId,
        status: result.status,
        estimatedCost: result.estimatedCost,
        estimatedTime: result.estimatedTime,
        message: 'Batch generation started. Use /api/conversations/batch/{jobId}/status to track progress.',
      },
      { status: 202 }
    );
    
  } catch (error) {
    console.error('Batch generation error:', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request', 
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    // Generic error handler
    return NextResponse.json(
      {
        success: false,
        error: 'Batch generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/generate-batch
 * Get information about batch generation
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: 'POST /api/conversations/generate-batch',
      description: 'Start a batch generation job',
      defaultConcurrency: 3,
      maxConcurrency: 10,
      requiredFields: ['name', 'one of: conversationIds, parameterSets, or (templateId + tier)'],
      optionalFields: ['sharedParameters', 'concurrentProcessing', 'errorHandling', 'userId', 'priority'],
      errorHandling: ['stop', 'continue'],
      priority: ['low', 'normal', 'high'],
    },
  });
}

