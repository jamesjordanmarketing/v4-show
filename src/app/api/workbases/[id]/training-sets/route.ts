import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('training_sets')
    .select('*')
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    workbaseId: row.workbase_id,
    userId: row.user_id,
    name: row.name,
    conversationIds: row.conversation_ids || [],
    conversationCount: row.conversation_count,
    trainingPairCount: row.training_pair_count || 0,
    status: row.status,
    jsonlPath: row.jsonl_path,
    datasetId: row.dataset_id || null,
    isActive: row.is_active,
    lastBuildError: row.last_build_error || null,
    failedConversationIds: row.failed_conversation_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ success: true, data: mapped });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const body = await request.json();
  const { name, conversationIds } = body;

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'conversationIds array is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseAdminClient();

  const { data: wb, error: wbErr } = await supabase
    .from('workbases')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (wbErr || !wb) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Frontend sends business keys (conversation_id), not UUID PKs (id).
  // Validate ownership via workbase_id (already confirmed user owns this workbase above).
  const { data: convs, error: convErr } = await supabase
    .from('conversations')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('workbase_id', params.id);

  if (convErr || !convs || convs.length !== conversationIds.length) {
    return NextResponse.json(
      { success: false, error: 'One or more conversations not found or not owned' },
      { status: 400 }
    );
  }

  const trainingSetName =
    name ||
    `Training Set - ${new Date().toLocaleDateString()} (${conversationIds.length} conversations)`;

  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .insert({
      user_id: user.id,
      workbase_id: params.id,
      name: trainingSetName,
      conversation_ids: conversationIds,
      conversation_count: conversationIds.length,
      training_pair_count: 0,
      status: 'processing',
      is_active: false,
    })
    .select()
    .single();

  if (tsErr) {
    return NextResponse.json({ success: false, error: tsErr.message }, { status: 500 });
  }

  // Emit event to trigger async JSONL build via Inngest
  await inngest.send({
    name: 'training/set.created',
    data: {
      trainingSetId: ts.id,
      workbaseId: params.id,
      conversationIds,
      userId: user.id,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: ts.id,
        workbaseId: ts.workbase_id,
        userId: ts.user_id,
        name: ts.name,
        conversationIds: ts.conversation_ids || [],
        conversationCount: ts.conversation_count,
        trainingPairCount: ts.training_pair_count || 0,
        status: ts.status,
        jsonlPath: ts.jsonl_path,
        datasetId: ts.dataset_id || null,
        isActive: ts.is_active,
        createdAt: ts.created_at,
        updatedAt: ts.updated_at,
      },
    },
    { status: 201 }
  );
}
