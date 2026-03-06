/**
 * RAG Document Upload API
 * POST /api/rag/documents/[id]/upload — Upload a file for an existing document, extract text, then trigger processing
 * 
 * UPDATED: Now triggers Inngest background job instead of using waitUntil()
 * Benefits: No timeout limits, automatic retries, better observability
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { uploadDocumentFile } from '@/lib/rag/services/rag-ingestion-service';
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file details
    const fileName = file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const validTypes = ['pdf', 'docx', 'txt', 'md'];

    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type "${fileType}". Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and extract text
    const uploadResult = await uploadDocumentFile({
      userId: user.id,
      documentId,
      file: buffer,
      fileName,
      fileType,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
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

    console.log(`[RAG Upload] Triggered Inngest job for document ${documentId}`);

    return NextResponse.json({
      success: true,
      data: { documentId, filePath: uploadResult.filePath, status: 'processing' },
    }, { status: 202 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
