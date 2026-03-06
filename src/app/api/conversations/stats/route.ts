/**
 * API Route: /api/conversations/stats
 * 
 * Provides analytics and statistics for conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { conversationService } from '@/lib/conversation-service';
import { AppError } from '@/lib/types/errors';

/**
 * GET /api/conversations/stats
 * Get comprehensive conversation statistics scoped to authenticated user
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    // Scope stats to authenticated user
    const stats = await conversationService.getStats(user.id);
    const qualityDistribution = await conversationService.getQualityDistribution(user.id);

    const responseBody = {
      ...stats,
      qualityDistribution,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/conversations/stats:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch conversation stats' },
      { status: 500 }
    );
  }
}
