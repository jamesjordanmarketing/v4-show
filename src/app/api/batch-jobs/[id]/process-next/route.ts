/**
 * API Route: Process Next Batch Item
 *
 * POST /api/batch-jobs/[id]/process-next
 *
 * @deprecated — Replaced by Inngest `processBatchJob` function.
 * Batch item processing now happens server-side via Inngest.
 * This route returns 410 Gone to inform any lingering clients.
 *
 * Previously: Browser-driven polling loop called this route to process
 * one batch item at a time. Now the entire batch is processed by Inngest
 * in the background without browser involvement.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated. Batch processing is now handled by Inngest background jobs.',
      status: 'deprecated',
      remainingItems: 0,
      progress: { total: 0, completed: 0, successful: 0, failed: 0, percentage: 0 },
    },
    { status: 410 }
  );
}
