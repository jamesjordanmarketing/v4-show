/**
 * API Route: Download enriched JSON
 * GET /api/conversations/[id]/download/enriched
 * 
 * Returns signed URL to download enriched JSON (with predetermined fields populated)
 * Only available when enrichment_status is 'enriched' or 'completed'
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
      const downloadInfo = await storageService.getEnrichedDownloadUrl(conversationId);

      return NextResponse.json({
        conversation_id: downloadInfo.conversation_id,
        download_url: downloadInfo.download_url,
        filename: downloadInfo.filename || `${conversationId}-enriched.json`,
        file_size: downloadInfo.file_size,
        enrichment_status: 'completed',
        expires_at: downloadInfo.expires_at,
        expires_in_seconds: downloadInfo.expires_in_seconds
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Conversation not found' },
            { status: 404 }
          );
        }
        if (error.message.includes('Enrichment not complete')) {
          return NextResponse.json(
            { error: error.message, enrichment_status: 'not_completed' },
            { status: 400 }
          );
        }
        if (error.message.includes('No enriched file path')) {
          return NextResponse.json(
            { error: 'No enriched file available for this conversation' },
            { status: 404 }
          );
        }
      }

      console.error('Error generating enriched download URL:', error);
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
