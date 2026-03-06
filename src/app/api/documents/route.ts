import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const supabase = createServerSupabaseAdminClient();
    let query = supabase
      .from('documents')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Documents fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', success: false },
        { status: 500 }
      )
    }

    const transformedDocuments = (documents || []).map(document => ({
      id: document.id,
      title: document.title,
      content: document.content || '',
      summary: document.summary || '',
      createdAt: document.created_at.split('T')[0],
      authorId: document.author_id,
      status: document.status
    }))

    return NextResponse.json({
      documents: transformedDocuments,
      total: transformedDocuments.length,
      success: true
    })
  } catch (error) {
    console.error('Documents API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const body = await request.json()

    const { title, content, summary } = body
    if (!title || !content || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      )
    }

    const { data: newDocument, error: insertError } = await supabase
      .from('documents')
      .insert({
        title,
        content,
        summary,
        author_id: user.id,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Document creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create document', success: false },
        { status: 500 }
      )
    }

    return NextResponse.json({
      document: {
        id: newDocument.id,
        title: newDocument.title,
        content: newDocument.content,
        summary: newDocument.summary,
        authorId: newDocument.author_id,
        createdAt: newDocument.created_at.split('T')[0],
        status: newDocument.status
      },
      success: true
    }, { status: 201 })
  } catch (error) {
    console.error('Document creation API Error:', error)
    return NextResponse.json(
      { error: 'Failed to create document', success: false },
      { status: 500 }
    )
  }
}
