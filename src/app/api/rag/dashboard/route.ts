import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const { user, response } = await requireAuth(request);
        if (response) return response;

        const supabase = createServerSupabaseAdminClient();
        const userId = user.id;

        // 1. Total queries and average self-eval score
        const { data: statsRows } = await supabase
            .from('rag_queries')
            .select('self_eval_score, mode, user_feedback, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(500);

        const stats = statsRows || [];
        const totalQueries = stats.length;

        const scoresWithValues = stats.filter(s => s.self_eval_score !== null);
        const avgScore = scoresWithValues.length > 0
            ? scoresWithValues.reduce((sum, s) => sum + (s.self_eval_score || 0), 0) / scoresWithValues.length
            : null;

        // 2. Mode breakdown
        const modeBreakdown: Record<string, number> = {};
        for (const s of stats) {
            const mode = s.mode || 'rag_only';
            modeBreakdown[mode] = (modeBreakdown[mode] || 0) + 1;
        }

        // 3. Feedback summary
        const feedbackSummary = {
            positive: stats.filter(s => s.user_feedback === 'positive').length,
            negative: stats.filter(s => s.user_feedback === 'negative').length,
            none: stats.filter(s => !s.user_feedback).length,
        };

        // 4. Score trend (last 7 days, daily averages)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentStats = stats.filter(s => new Date(s.created_at) >= sevenDaysAgo);

        const dailyScores: Record<string, { total: number; count: number }> = {};
        for (const s of recentStats) {
            if (s.self_eval_score === null) continue;
            const day = new Date(s.created_at).toISOString().split('T')[0];
            if (!dailyScores[day]) dailyScores[day] = { total: 0, count: 0 };
            dailyScores[day].total += s.self_eval_score;
            dailyScores[day].count += 1;
        }

        const scoreTrend = Object.entries(dailyScores)
            .map(([date, { total, count }]) => ({
                date,
                avgScore: Math.round((total / count) * 100) / 100,
                queryCount: count,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 5. Confidence distribution
        const confidenceDistribution = {
            high: scoresWithValues.filter(s => (s.self_eval_score || 0) > 0.8).length,
            medium: scoresWithValues.filter(s => (s.self_eval_score || 0) >= 0.5 && (s.self_eval_score || 0) <= 0.8).length,
            low: scoresWithValues.filter(s => (s.self_eval_score || 0) < 0.5).length,
        };

        return NextResponse.json({
            success: true,
            data: {
                totalQueries,
                averageSelfEvalScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
                modeBreakdown,
                feedbackSummary,
                scoreTrend,
                confidenceDistribution,
            },
        });
    } catch (err) {
        console.error('[RAG Dashboard] Error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
