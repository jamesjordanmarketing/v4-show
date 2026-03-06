/**
 * Embedding Runs API — List all available embedding runs (all documents)
 *
 * GET — Returns all embedding runs across all documents.
 *       The client uses these to populate the run selector dropdown.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getEmbeddingRuns } from '@/lib/rag/testing/test-diagnostics';

export async function GET(request: NextRequest) {
    const { response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    try {
        const runs = await getEmbeddingRuns(); // no documentId = all runs

        return NextResponse.json({
            success: true,
            data: {
                runs,
                untaggedCount: 0, // Legacy field — kept for API compatibility
            },
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Failed to fetch runs' },
            { status: 500 }
        );
    }
}
