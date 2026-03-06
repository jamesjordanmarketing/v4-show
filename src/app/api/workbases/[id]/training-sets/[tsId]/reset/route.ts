import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';

/**
 * POST /api/workbases/[id]/training-sets/[tsId]/reset
 *
 * Resets a Training Set that is stuck in 'processing' back to a usable state.
 * - If a previous JSONL file exists (jsonl_path is set), resets to 'ready'.
 * - If no JSONL exists (training set was never successfully built), resets to 'failed'
 *   so the user knows a retry is needed.
 *
 * Only allowed when status === 'processing'. Returns 400 for any other status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; tsId: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const supabase = createServerSupabaseAdminClient();

  // Verify ownership
  const { data: ts, error: tsErr } = await supabase
    .from('training_sets')
    .select('id, status, jsonl_path, name')
    .eq('id', params.tsId)
    .eq('workbase_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (tsErr || !ts) {
    return NextResponse.json({ success: false, error: 'Training set not found' }, { status: 404 });
  }

  if (ts.status !== 'processing') {
    return NextResponse.json(
      { success: false, error: `Training set is not stuck — current status: ${ts.status}` },
      { status: 400 }
    );
  }

  // If a JSONL exists from a prior successful build, restore to 'ready'.
  // Otherwise reset to 'failed' so the user can trigger a fresh build.
  const newStatus = ts.jsonl_path ? 'ready' : 'failed';

  const { error: updateErr } = await supabase
    .from('training_sets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', params.tsId);

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: ts.id,
      name: ts.name,
      previousStatus: 'processing',
      status: newStatus,
    },
  });
}
