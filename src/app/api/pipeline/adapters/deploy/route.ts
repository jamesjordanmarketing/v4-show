/**
 * Deploy Adapter Endpoints API
 *
 * POST /api/pipeline/adapters/deploy
 * 
 * Deploys Control (base model) and Adapted (base + LoRA) inference endpoints
 * to RunPod Serverless for A/B testing.
 * 
 * Request Body:
 * {
 *   jobId: string          // Training job ID (must be completed)
 *   forceRedeploy?: boolean // Force terminate existing endpoints and redeploy (default: false)
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     controlEndpoint: InferenceEndpoint;
 *     adaptedEndpoint: InferenceEndpoint;
 *   };
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { deployAdapterEndpoints } from '@/lib/services';
import { DeployAdapterResponse } from '@/types/pipeline-adapter';

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
    let body;
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

    // Validate optional fields
    const forceRedeploy = body.forceRedeploy === true;

    // Call service layer (E02)
    const result: DeployAdapterResponse = await deployAdapterEndpoints(
      user.id,
      body.jobId,
      forceRedeploy
    );

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }

    // Return success response
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/deploy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
