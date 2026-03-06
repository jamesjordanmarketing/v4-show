/**
 * Test Result Rating API
 *
 * POST /api/pipeline/adapters/rate
 * 
 * Allows users to rate test results and provide feedback notes.
 * 
 * Request Body:
 * {
 *   testId: string;               // Test result ID
 *   rating: UserRating;           // 'control' | 'adapted' | 'tie' | 'neither'
 *   notes?: string;               // Optional feedback notes
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateTestResult } from '@/lib/services';
import { UserRating } from '@/types/pipeline-adapter';

// Valid rating values
const VALID_RATINGS: UserRating[] = ['control', 'adapted', 'tie', 'neither'];

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
    let body: { testId?: string; rating?: string; notes?: string };
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.testId || typeof body.testId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'testId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.rating || typeof body.rating !== 'string') {
      return NextResponse.json(
        { success: false, error: 'rating is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate rating value
    if (!VALID_RATINGS.includes(body.rating as UserRating)) {
      return NextResponse.json(
        {
          success: false,
          error: `rating must be one of: ${VALID_RATINGS.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate notes if provided
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') {
        return NextResponse.json(
          { success: false, error: 'notes must be a string' },
          { status: 400 }
        );
      }
      if (body.notes.length > 1000) {
        return NextResponse.json(
          { success: false, error: 'notes must be 1000 characters or less' },
          { status: 400 }
        );
      }
    }

    // Call service layer (E02)
    const result = await rateTestResult(
      body.testId,
      user.id,
      body.rating as UserRating,
      body.notes
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
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('POST /api/pipeline/adapters/rate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again later.'
      },
      { status: 500 }
    );
  }
}
