/**
 * API Route: Single Conversation Generation
 * 
 * POST /api/conversations/generate
 * Generates a single conversation using the new conversation generation service
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { getConversationGenerationService } from '@/lib/services';
import { inngest } from '@/inngest/client';
import type { GenerationParams } from '@/lib/services';

// Validation schema
const GenerateRequestSchema = z.object({
  templateId: z.string().uuid('Template ID must be a valid UUID'),
  parameters: z.record(z.string(), z.any()),
  tier: z.enum(['template', 'scenario', 'edge_case']),
  userId: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(8192).optional(),
  category: z.array(z.string()).optional(),
  workbaseId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    // Parse and validate request
    const body = await request.json();
    const validated = GenerateRequestSchema.parse(body);
    
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
    
    // Prepare generation parameters
    const generationParams: GenerationParams = {
      templateId: validated.templateId,
      parameters: validated.parameters,
      tier: validated.tier,
      userId,
      temperature: validated.temperature,
      maxTokens: validated.maxTokens,
      category: validated.category,
    };
    
    // Get conversation generation service
    const generationService = getConversationGenerationService();
    
    // Generate conversation
    const result = await generationService.generateSingleConversation(generationParams);
    
    // Check if generation was successful
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Generation failed',
          message: result.error || 'Unknown error',
          details: result.error,
        },
        { status: 500 }
      );
    }

    // If workbaseId was provided, associate this conversation with the workbase.
    // The generation service creates the conversation without workbase_id;
    // we patch it here immediately after creation.
    if (validated.workbaseId && result.conversation.id) {
      try {
        const supabase = createServerSupabaseAdminClient();
        await supabase
          .from('conversations')
          .update({ workbase_id: validated.workbaseId })
          .eq('conversation_id', result.conversation.id)
          .eq('user_id', userId);
      } catch (err) {
        // Non-fatal — log and continue. Conversation was created; workbase link failed.
        console.error('[Generate] Failed to set workbase_id on conversation:', err);
      }
    }

    // Trigger auto-enrichment via Inngest (D8). Fire-and-forget.
    // The autoEnrichConversation function handles idempotency and retries.
    if (result.conversation.id) {
      try {
        await inngest.send({
          name: 'conversation/generation.completed',
          data: { conversationId: result.conversation.id, userId },
        });
      } catch (err) {
        // Non-fatal — enrichment can be triggered manually if Inngest is unavailable.
        console.error('[Generate] Failed to emit generation.completed event:', err);
      }
    }
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        conversation: result.conversation,
        cost: result.metrics.cost,
        qualityMetrics: {
          qualityScore: result.conversation.qualityScore,
          turnCount: result.conversation.totalTurns,
          tokenCount: result.conversation.totalTokens,
          durationMs: result.metrics.durationMs,
        },
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Generation error:', error);
    
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
        error: 'Generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/generate
 * Get API information
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuth(request);
  if (response) return response;

  return NextResponse.json({
    success: true,
    info: {
      endpoint: 'POST /api/conversations/generate',
      description: 'Generate a single conversation',
      requiredFields: ['templateId', 'parameters', 'tier'],
      optionalFields: ['userId', 'temperature', 'maxTokens', 'category', 'workbaseId'],
    },
  });
}
