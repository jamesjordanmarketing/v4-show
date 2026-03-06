import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { conversationIdsToSkip } = body;

  if (!conversationIdsToSkip || !Array.isArray(conversationIdsToSkip) || conversationIdsToSkip.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIdsToSkip array is required and must be non-empty' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  // Verify workbase ownership
  const { data: wb } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!wb) {
    return NextResponse.json({ success: false, error: 'Workbase not found' }, { status: 404 });
  }

  // Fetch the training set
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, conversation_ids, status, name')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  if (ts.status !== 'failed') {
    return NextResponse.json(
      { success: false, error: `Bypass only allowed on failed training sets (current status: ${ts.status})` },
      { status: 400 }
    );
  }

  // Remove the skipped IDs
  const skipSet = new Set(conversationIdsToSkip);
  const cleanedIds: string[] = (ts.conversation_ids || []).filter(
    (id: string) => !skipSet.has(id)
  );

  if (cleanedIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No conversations remain after bypass — all were in the skip list' },
      { status: 400 }
    );
  }

  // Update training set: remove skipped IDs, reset status, clear error fields
  const { data: updated, error: updateErr } = await supabase
    .from('training_sets')
    .update({
      conversation_ids: cleanedIds,
      conversation_count: cleanedIds.length,
      status: 'processing',
      last_build_error: null,
      failed_conversation_ids: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.tsId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  // Trigger async rebuild
  await inngest.send({
    name: 'training/set.updated',
    data: {
      trainingSetId: params.tsId,
      workbaseId: params.id,
      conversationIds: cleanedIds,
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      skippedCount: conversationIdsToSkip.length,
      remainingCount: cleanedIds.length,
      status: updated.status,
    },
  });
}
