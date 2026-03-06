import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToWorkbase } from '@/types/workbase';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const supabase = createServerSupabaseAdminClient();

  let query = supabase
    .from('workbases')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: (data || []).map(mapRowToWorkbase),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Name is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) }, { status: 201 });
}
