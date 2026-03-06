/**
 * RAG Document Process API
 * POST /api/rag/documents/[id]/process — Re-trigger processing on a document that already has extracted text
 * 
 * UPDATED: Now triggers Inngest background job instead of using waitUntil()
 * Benefits: No timeout limits, automatic retries, better observability
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

// No longer need maxDuration - Inngest handles long-running processing
// export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = params.id;

    // Verify ownership and text existence
    const supabase = createServerSupabaseAdminClient();
    const { data: doc } = await supabase
      .from('rag_documents')
      .select('id, original_text, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (!doc.original_text) {
      return NextResponse.json(
        { success: false, error: 'Document has no extracted text. Upload a file first.' },
        { status: 400 }
      );
    }

    // Trigger Inngest background job — runs with no timeout limits
    await inngest.send({
      name: 'rag/document.uploaded',
      data: {
        documentId,
        userId: user.id,
      },
    });

    console.log(`[RAG Process] Triggered Inngest job for document ${documentId}`);

    return NextResponse.json({
      success: true,
      data: { documentId, status: 'processing' },
    }, { status: 202 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/process error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
