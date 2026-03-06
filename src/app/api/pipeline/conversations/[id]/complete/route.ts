/**
 * API Route: /api/pipeline/conversations/[id]/complete
 * 
 * POST - Mark conversation as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { completeConversation } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const result = await completeConversation(user.id, params.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('POST /api/pipeline/conversations/[id]/complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
