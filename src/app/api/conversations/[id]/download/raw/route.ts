/**
 * API Route: Download raw minimal JSON
 * GET /api/conversations/[id]/download/raw
 * 
 * Returns signed URL to download raw minimal JSON from Claude (stored at raw_response_path)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { getConversationStorageService } from '@/lib/services/conversation-storage-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const conversationId = params.id;

    // Verify ownership before proceeding
    const supabase = createServerSupabaseAdminClient();
    const { data: conversation } = await supabase
      .from('conversations')
      .select('conversation_id, created_by, user_id')
      .eq('conversation_id', conversationId)
      .single();

    if (!conversation || (conversation.created_by !== user.id && conversation.user_id !== user.id)) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const storageService = getConversationStorageService();

    try {
      const downloadInfo = await storageService.getRawResponseDownloadUrl(conversationId);

      return NextResponse.json({
        conversation_id: downloadInfo.conversation_id,
        download_url: downloadInfo.download_url,
        filename: downloadInfo.filename || `${conversationId}-raw.json`,
        file_size: downloadInfo.file_size,
        expires_at: downloadInfo.expires_at,
        expires_in_seconds: downloadInfo.expires_in_seconds
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Conversation not found or no raw response available' },
            { status: 404 }
          );
        }
        if (error.message.includes('No raw response path')) {
          return NextResponse.json(
            { error: 'No raw response available for this conversation' },
            { status: 404 }
          );
        }
      }

      console.error('Error generating raw download URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
