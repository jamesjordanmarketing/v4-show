/**
 * RAG Query API
 * POST /api/rag/query — Query the RAG system (chat with documents)
 * GET /api/rag/query — Get query history
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { queryRAG, getQueryHistory } from '@/lib/rag/services/rag-retrieval-service';
import type { RAGQueryMode } from '@/types/rag';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { queryText, documentId, workbaseId, mode, modelJobId } = body;

    if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: queryText' },
        { status: 400 }
      );
    }

    if (!documentId && !workbaseId) {
      return NextResponse.json(
        { success: false, error: 'At least one of documentId or workbaseId is required' },
        { status: 400 }
      );
    }

    const validModes: RAGQueryMode[] = ['rag_only', 'lora_only', 'rag_and_lora'];
    const queryMode: RAGQueryMode = validModes.includes(mode) ? mode : 'rag_only';

    // Validate modelJobId is provided for LoRA modes
    if ((queryMode === 'lora_only' || queryMode === 'rag_and_lora') && !modelJobId) {
      return NextResponse.json(
        { success: false, error: 'modelJobId is required when mode is lora_only or rag_and_lora' },
        { status: 400 }
      );
    }

    const result = await queryRAG({
      queryText: queryText.trim(),
      documentId,
      workbaseId,
      userId: user.id,
      mode: queryMode,
      modelJobId: modelJobId || undefined,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/query error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = request.nextUrl.searchParams.get('documentId') || undefined;
    const workbaseId = request.nextUrl.searchParams.get('workbaseId') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    const result = await getQueryHistory({
      documentId,
      workbaseId,
      userId: user.id,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/query error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
