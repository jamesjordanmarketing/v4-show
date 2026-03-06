/**
 * RAG Expert Questions API
 * GET /api/rag/documents/[id]/questions — List expert questions for a document
 * POST /api/rag/documents/[id]/questions — Submit an answer to a question or skip it
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import {
  getQuestionsForDocument,
  submitExpertAnswer,
  skipQuestion,
} from '@/lib/rag/services/rag-expert-qa-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const includeAnswered = request.nextUrl.searchParams.get('includeAnswered') === 'true';

    const result = await getQuestionsForDocument({
      documentId: params.id,
      userId: user.id,
      includeAnswered,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/documents/[id]/questions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { questionId, answerText, skip } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: questionId' },
        { status: 400 }
      );
    }

    // Skip or answer
    if (skip) {
      const result = await skipQuestion({ questionId, userId: user.id });
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: answerText (or set skip: true)' },
        { status: 400 }
      );
    }

    const result = await submitExpertAnswer({
      questionId,
      userId: user.id,
      answerText: answerText.trim(),
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/questions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
