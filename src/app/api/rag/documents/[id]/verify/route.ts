/**
 * RAG Document Verify API
 * POST /api/rag/documents/[id]/verify — Mark document as verified after expert Q&A
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { markDocumentVerified } from '@/lib/rag/services/rag-expert-qa-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const result = await markDocumentVerified({
      documentId: params.id,
      userId: user.id,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/verify error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
