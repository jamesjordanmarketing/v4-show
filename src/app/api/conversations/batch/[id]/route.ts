/**
 * API Route: Batch Job Control
 *
 * PATCH /api/conversations/batch/:id
 *
 * @deprecated — Replaced by dedicated routes and Inngest background jobs.
 * - Cancel: Use POST /api/batch-jobs/[id]/cancel (emits Inngest cancel event)
 * - Pause/Resume: No longer supported. Inngest manages job lifecycle.
 * This route returns 410 Gone to inform any lingering clients.
 *
 * Previously: Supported pause, resume, and cancel actions via PATCH.
 * Now batch processing is fully managed by Inngest with automatic
 * checkpointing — pause/resume are unnecessary.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated. Use POST /api/batch-jobs/[id]/cancel for cancellation. Pause/resume are no longer supported — Inngest manages job lifecycle.',
    },
    { status: 410 }
  );
}
