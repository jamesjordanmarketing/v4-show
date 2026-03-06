/**
 * A/B Testing API
 *
 * POST /api/pipeline/adapters/test
 * Run an A/B test between control and adapted models with optional Claude-as-Judge evaluation
 * 
 * GET /api/pipeline/adapters/test?jobId={jobId}&limit={limit}&offset={offset}
 * Retrieve test history for a job with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runABTest, getTestHistory } from '@/lib/services';
import {
  RunTestRequest,
  RunTestResponse,
  TestResultListResponse,
} from '@/types/pipeline-adapter';

// ============================================
// POST - Run A/B Test
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: Partial<RunTestRequest>;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.jobId || typeof body.jobId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'jobId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.userPrompt || typeof body.userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.userPrompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'userPrompt cannot be empty' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.systemPrompt !== undefined && typeof body.systemPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'systemPrompt must be a string' },
        { status: 400 }
      );
    }

    if (body.enableEvaluation !== undefined && typeof body.enableEvaluation !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enableEvaluation must be a boolean' },
        { status: 400 }
      );
    }

    // Validate evaluationPromptId (NEW)
    if (body.evaluationPromptId !== undefined && typeof body.evaluationPromptId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'evaluationPromptId must be a string' },
        { status: 400 }
      );
    }

    // Build request object
    const testRequest: RunTestRequest = {
      jobId: body.jobId,
      userPrompt: body.userPrompt.trim(),
      systemPrompt: body.systemPrompt,
      enableEvaluation: body.enableEvaluation ?? false,
      evaluationPromptId: body.evaluationPromptId,  // NEW: Pass the evaluator ID
    };

    // Call service layer (E02)
    const result: RunTestResponse = await runABTest(user.id, testRequest);

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('not ready') ? 400 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Retrieve Test History
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId query parameter is required' },
        { status: 400 }
      );
    }

    // Parse pagination parameters with defaults
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = 20; // Default limit
    let offset = 0;  // Default offset

    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: 'limit must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (offsetParam) {
      offset = parseInt(offsetParam, 10);
      if (isNaN(offset) || offset < 0) {
        return NextResponse.json(
          { success: false, error: 'offset must be 0 or greater' },
          { status: 400 }
        );
      }
    }

    // Call service layer (E02)
    const result: TestResultListResponse = await getTestHistory(jobId, {
      limit,
      offset,
    });

    // Handle service errors
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('GET /api/pipeline/adapters/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
