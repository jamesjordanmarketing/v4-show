/**
 * RAG Documents API
 * GET /api/rag/documents?workbaseId=xxx — List documents for a workbase
 * POST /api/rag/documents — Create a new document record
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createDocumentRecord, getDocuments } from '@/lib/rag/services/rag-ingestion-service';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const workbaseId = request.nextUrl.searchParams.get('workbaseId');
    if (!workbaseId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: workbaseId' },
        { status: 400 }
      );
    }

    const result = await getDocuments({ workbaseId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/documents error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { workbaseId, fileName, fileType, description, fastMode } = body;

    if (!workbaseId || !fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: workbaseId, fileName, fileType' },
        { status: 400 }
      );
    }

    const validTypes = ['pdf', 'docx', 'txt', 'md'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createDocumentRecord({
      workbaseId,
      userId: user.id,
      fileName,
      fileType,
      description,
      fastMode: fastMode || false,
    });

    return NextResponse.json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
