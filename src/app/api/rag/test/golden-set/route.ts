/**
 * Golden-Set Regression Test API
 *
 * POST — Run a single batch of golden-set queries (2 per batch, 10 batches total)
 * GET  — Health check (returns test availability + count)
 *
 * The client (page.tsx) orchestrates sequential batch calls to avoid
 * Vercel's 120-second function timeout.
 * Batch size is 2 (2 × ~30s = ~60s max, well within 120s).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { runPreflightChecks, runSingleTest } from '@/lib/rag/testing/test-diagnostics';
import {
    GOLDEN_SET,
    TARGET_PASS_RATE,
} from '@/lib/rag/testing/golden-set-definitions';
import type { TestResult, PreflightResult } from '@/lib/rag/testing/golden-set-definitions';

// Reduced from 4 to 2: 2 × ~30s = ~60s max per batch (well within 120s Vercel limit)
const BATCH_SIZE = 2;

export const maxDuration = 120;

export async function GET() {
    return NextResponse.json({
        available: true,
        testCount: GOLDEN_SET.length,
        targetPassRate: TARGET_PASS_RATE,
        documentId: null,
    });
}

export async function POST(request: NextRequest) {
    // Auth check
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const batch: number = body.batch ?? 0;
    const runId: string | undefined = body.runId || undefined;

    // documentId is required — no fallback to a stale canonical ID
    if (!body.documentId) {
        return NextResponse.json(
            { success: false, error: 'documentId is required. Select a document before running the golden test.' },
            { status: 400 }
        );
    }
    const documentId: string = body.documentId;

    // If runId is provided, validate it belongs to the specified document
    if (runId) {
        const supabase = createServerSupabaseAdminClient();
        const { data: run } = await supabase
            .from('rag_embedding_runs')
            .select('id, document_id')
            .eq('id', runId)
            .single();
        if (!run) {
            return NextResponse.json(
                { success: false, error: `Embedding run ${runId} not found.` },
                { status: 400 }
            );
        }
        if (run.document_id !== documentId) {
            return NextResponse.json(
                { success: false, error: `Embedding run ${runId} belongs to document ${run.document_id}, not ${documentId}. Select the correct run.` },
                { status: 400 }
            );
        }
    }

    const totalBatches = Math.ceil(GOLDEN_SET.length / BATCH_SIZE);

    if (batch < 0 || batch >= totalBatches) {
        return NextResponse.json(
            { success: false, error: `Invalid batch index: ${batch}. Must be 0-${totalBatches - 1}.` },
            { status: 400 }
        );
    }

    try {
        // Preflight checks only on batch 0
        let preflight: PreflightResult | undefined;
        if (batch === 0) {
            preflight = await runPreflightChecks(documentId);
            if (!preflight.passed) {
                return NextResponse.json({
                    success: true,
                    data: {
                        batch: 0,
                        totalBatches,
                        preflight,
                        results: [],
                        batchDurationMs: 0,
                    },
                });
            }
        }

        // Slice the questions for this batch
        const items = GOLDEN_SET.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
        const batchStart = Date.now();
        const results: TestResult[] = [];

        for (const item of items) {
            const result = await runSingleTest(item, user!.id, documentId, runId);
            results.push(result);

            // 500ms delay between queries to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return NextResponse.json({
            success: true,
            data: {
                batch,
                totalBatches,
                ...(preflight ? { preflight } : {}),
                results,
                batchDurationMs: Date.now() - batchStart,
            },
        });
    } catch (err) {
        console.error(`[Golden-Set Test] Batch ${batch} error:`, err);
        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : 'Batch failed',
            },
            { status: 500 }
        );
    }
}
