import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToWorkbase } from '@/types/workbase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.activeAdapterJobId !== undefined) updates.active_adapter_job_id = body.activeAdapterJobId || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from('workbases')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: mapRowToWorkbase(data) });
}
