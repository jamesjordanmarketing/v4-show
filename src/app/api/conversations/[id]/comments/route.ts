import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToComment } from '@/types/workbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversation_comments')
    .select('*')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRowToComment),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('conversation_comments')
    .insert({
      conversation_id: params.id,
      user_id: user.id,
      content: body.content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: mapRowToComment(data) }, { status: 201 });
}
