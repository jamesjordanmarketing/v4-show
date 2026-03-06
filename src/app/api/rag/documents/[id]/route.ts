/**
 * RAG Document Detail API
 * GET /api/rag/documents/[id] — Get document detail with sections and facts
 * DELETE /api/rag/documents/[id] — Delete a document and all related data
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToDocument, mapRowToSection, mapRowToFact } from '@/lib/rag/services/rag-db-mappers';
import { deleteDocumentEmbeddings } from '@/lib/rag/services/rag-embedding-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const documentId = params.id;

    // Fetch document
    const { data: docRow, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !docRow) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Fetch sections
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('section_index', { ascending: true });

    // Fetch facts
    const { data: factRows } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', documentId)
      .limit(10000);

    return NextResponse.json({
      success: true,
      data: {
        document: mapRowToDocument(docRow),
        sections: (sectionRows || []).map(mapRowToSection),
        facts: (factRows || []).map(mapRowToFact),
      },
    });
  } catch (error) {
    console.error('GET /api/rag/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const documentId = params.id;

    // Verify ownership
    const { data: docRow } = await supabase
      .from('rag_documents')
      .select('id, workbase_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!docRow) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete in order: embeddings → quality_scores (via queries) → queries → questions → facts → sections → document
    await deleteDocumentEmbeddings(documentId);
    
    // Get all query IDs for this document
    const { data: queries } = await supabase
      .from('rag_queries')
      .select('id')
      .eq('document_id', documentId);
    
    const queryIds = queries?.map(q => q.id) || [];
    
    if (queryIds.length > 0) {
      await supabase
        .from('rag_quality_scores')
        .delete()
        .in('query_id', queryIds);
    }
    
    await supabase.from('rag_queries').delete().eq('document_id', documentId);
    await supabase.from('rag_expert_questions').delete().eq('document_id', documentId);
    await supabase.from('rag_facts').delete().eq('document_id', documentId);
    await supabase.from('rag_sections').delete().eq('document_id', documentId);

    const { error: deleteError } = await supabase
      .from('rag_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('DELETE /api/rag/documents/[id] error:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    // Decrement workbase document count
    await supabase.rpc('increment_kb_doc_count', { 
      kb_id: docRow.workbase_id,
      increment: -1 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rag/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
