/**
 * API Route: Bulk Conversation Enrichment
 *
 * POST /api/conversations/bulk-enrich
 *
 * @deprecated — Replaced by POST /api/conversations/trigger-enrich.
 * Enrichment now uses chunked Inngest events with no conversation limit.
 * This route returns 410 Gone to inform any lingering clients.
 *
 * Previously: Synchronously enriched up to 100 conversations in a single
 * Vercel function invocation. Now enrichment is handled by the
 * batchEnrichConversations Inngest function in chunks of 25.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated. Use POST /api/conversations/trigger-enrich instead.',
    },
    { status: 410 }
  );
}
