import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    // Scope orphaned conversations to the authenticated user
    const { supabase } = createServerSupabaseClientFromRequest(request);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('created_by', user.id)
      .is('parent_chunk_id', null)
      .not('status', 'in', '(draft,archived)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Get orphaned conversations error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
