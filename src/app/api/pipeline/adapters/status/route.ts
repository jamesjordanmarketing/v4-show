/**
 * Endpoint Status API
 *
 * GET /api/pipeline/adapters/status?jobId={jobId}
 * 
 * Checks the deployment status of control and adapted endpoints.
 * Polls RunPod for current status and updates database accordingly.
 * 
 * Query Parameters:
 * - jobId: string (required) - Training job ID
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: {
 *     controlEndpoint: InferenceEndpoint | null;
 *     adaptedEndpoint: InferenceEndpoint | null;
 *     bothReady: boolean;
 *   };
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getEndpointStatus } from '@/lib/services';
import { EndpointStatusResponse } from '@/types/pipeline-adapter';

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

    // Call service layer (E02)
    const result: EndpointStatusResponse = await getEndpointStatus(jobId);

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
    console.error('GET /api/pipeline/adapters/status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
