import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const { user, response } = await requireAuth(request);
        if (response) return response;

        const { queryId, feedback } = await request.json();

        if (!queryId) {
            return NextResponse.json({ success: false, error: 'queryId is required' }, { status: 400 });
        }

        if (!feedback || !['positive', 'negative'].includes(feedback)) {
            return NextResponse.json(
                { success: false, error: 'feedback must be "positive" or "negative"' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseAdminClient();

        // Verify the query belongs to this user
        const { data: queryRow, error: fetchError } = await supabase
            .from('rag_queries')
            .select('id, user_id')
            .eq('id', queryId)
            .single();

        if (fetchError || !queryRow) {
            return NextResponse.json({ success: false, error: 'Query not found' }, { status: 404 });
        }

        if (queryRow.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Update feedback
        const { error: updateError } = await supabase
            .from('rag_queries')
            .update({
                user_feedback: feedback,
                feedback_at: new Date().toISOString(),
            })
            .eq('id', queryId);

        if (updateError) {
            console.error('[RAG Feedback] Error updating feedback:', updateError);
            return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[RAG Feedback] Error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
