import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIds } = body;

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIds array is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch the existing training set
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, conversation_ids, conversation_count, status')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  // Validate that new conversations belong to this workbase
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('workbase_id', params.id);

  if (convErr || !convs || convs.length !== conversationIds.length) {
    return NextResponse.json(
      { success: false, error: 'One or more conversations not found in this workbase' },
      { status: 400 }
    );
  }

  // Deduplicate: only add IDs not already in the set
  const existingIds: string[] = ts.conversation_ids || [];
  const newIds = conversationIds.filter((id: string) => !existingIds.includes(id));

  if (newIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'All selected conversations are already in this training set' },
      { status: 400 }
    );
  }

  const mergedIds = [...existingIds, ...newIds];

  // Update the training set — reset to 'processing' so Inngest will rebuild the JSONL
  const { data: updated, error: updateErr } = await supabase
    .from('training_sets')
    .update({
      conversation_ids: mergedIds,
      conversation_count: mergedIds.length,
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.tsId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  // Trigger async JSONL rebuild via Inngest
  await inngest.send({
    name: 'training/set.updated',
    data: {
      trainingSetId: params.tsId,
      workbaseId: params.id,
      conversationIds: mergedIds,
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      workbaseId: updated.workbase_id,
      name: updated.name,
      conversationCount: updated.conversation_count,
      status: updated.status,
      addedCount: newIds.length,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Delete the training set (ownership enforced by user_id filter)
  const { error } = await supabase
    .from('training_sets')
    .delete()
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
