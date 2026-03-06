/**
 * Test Reports API — Save and list golden-set test reports
 *
 * POST — Save a completed test report
 * GET  — List historical reports for the canonical document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import type { TestRunSummary } from '@/lib/rag/testing/golden-set-definitions';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const body = await request.json();
        const summary: TestRunSummary = body.summary;
        const embeddingRunId: string | null = body.embeddingRunId || null;
        const notes: string | null = body.notes || null;
        const documentId: string | null = body.documentId || null;

        if (!summary || !summary.runId) {
            return NextResponse.json(
                { success: false, error: 'Missing summary or runId' },
                { status: 400 }
            );
        }

        if (!documentId) {
            return NextResponse.json(
                { success: false, error: 'documentId is required when saving a test report.' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseAdminClient();

        const { data, error } = await supabase
            .from('rag_test_reports')
            .insert({
                user_id: user!.id,
                test_run_id: summary.runId,
                document_id: documentId,
                embedding_run_id: embeddingRunId,
                pass_rate: summary.passRate,
                meets_target: summary.meetsTarget,
                total_passed: summary.totalPassed,
                total_failed: summary.totalFailed,
                total_errored: summary.totalErrored,
                avg_response_time_ms: summary.avgResponseTimeMs,
                avg_self_eval_score: summary.avgSelfEvalScore,
                total_duration_ms: summary.totalDurationMs,
                breakdown: summary.breakdown,
                preflight: summary.preflight,
                results: summary.results,
                notes,
            })
            .select('id, created_at')
            .single();

        if (error) {
            console.error('[Test Reports] Error saving report:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { reportId: data.id, savedAt: data.created_at },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to save report' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json(
                { success: false, error: 'documentId query parameter is required.' },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseAdminClient();

        // Return summary fields only (not the full results JSONB — that's big)
        const { data, error } = await supabase
            .from('rag_test_reports')
            .select(`
                id,
                test_run_id,
                document_id,
                embedding_run_id,
                pass_rate,
                meets_target,
                total_passed,
                total_failed,
                total_errored,
                avg_response_time_ms,
                avg_self_eval_score,
                total_duration_ms,
                notes,
                created_at
            `)
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}
