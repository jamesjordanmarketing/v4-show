/**
 * RAG Quality API
 * GET /api/rag/quality?documentId=xxx — Get quality scores (or summary with ?summary=true)
 * POST /api/rag/quality — Evaluate a query's quality
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { evaluateQueryQuality, getQualityScores, getAverageQuality } from '@/lib/rag/services/rag-quality-service';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = request.nextUrl.searchParams.get('documentId') || undefined;
    const summary = request.nextUrl.searchParams.get('summary') === 'true';

    if (summary && documentId) {
      const result = await getAverageQuality({ documentId, userId: user.id });
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    const result = await getQualityScores({ documentId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/quality error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { queryId } = body;

    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: queryId' },
        { status: 400 }
      );
    }

    const result = await evaluateQueryQuality({ queryId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/quality error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
