import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getConversationStorageService } from '@/lib/services/conversation-storage-service';

/**
 * GET /api/conversations - List conversations with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);

    // Extract filters
    const status = searchParams.get('status') as any;
    const tier = searchParams.get('tier') as any;
    const persona_id = searchParams.get('persona_id') || undefined;
    const emotional_arc_id = searchParams.get('emotional_arc_id') || undefined;
    const training_topic_id = searchParams.get('training_topic_id') || undefined;
    const workbase_id = searchParams.get('workbaseId') || undefined;
    const quality_min = searchParams.get('quality_min')
      ? parseFloat(searchParams.get('quality_min')!)
      : undefined;
    const quality_max = searchParams.get('quality_max')
      ? parseFloat(searchParams.get('quality_max')!)
      : undefined;
    const enrichment_status = searchParams.get('enrichment_status') || undefined;

    // Extract pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc';

    const service = getConversationStorageService();
    const result = await service.listConversations(
      { 
        status, 
        tier, 
        persona_id, 
        emotional_arc_id,
        training_topic_id,
        workbase_id,
        quality_min,
        quality_max,
        enrichment_status,
        created_by: user.id
      },
      { page, limit, sortBy: sortBy as any, sortDirection }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations - Create a new conversation
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body = await request.json();

    const service = getConversationStorageService();
    const conversation = await service.createConversation({
      ...body,
      created_by: user.id,
      user_id: user.id,
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
