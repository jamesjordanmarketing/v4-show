/**
 * API Route: Trigger Chunked Enrichment via Inngest
 *
 * POST /api/conversations/trigger-enrich
 *
 * Accepts any number of conversation IDs (no .max() limit),
 * chunks them into groups of 25, and emits one Inngest
 * 'batch/enrich.requested' event per chunk.
 *
 * Replaces POST /api/conversations/bulk-enrich which had a
 * .max(100) limit and synchronous processing within a single
 * Vercel function timeout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase-server';
import { inngest } from '@/inngest/client';

const TriggerEnrichSchema = z.object({
  conversationIds: z.array(z.string().uuid()).min(1), // No .max() limit!
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const body = await request.json();
    const { conversationIds } = TriggerEnrichSchema.parse(body);

    // Chunk into groups of 25
    const CHUNK_SIZE = 25;
    const events = [];

    for (let i = 0; i < conversationIds.length; i += CHUNK_SIZE) {
      events.push({
        name: 'batch/enrich.requested' as const,
        data: {
          conversationIds: conversationIds.slice(i, i + CHUNK_SIZE),
          userId: user.id,
          jobId: null, // Manual trigger, no associated batch job
        },
      });
    }

    // Send all events (Inngest supports up to 400 events per call)
    await inngest.send(events);

    return NextResponse.json({
      success: true,
      queued: conversationIds.length,
      chunks: events.length,
      message: `${conversationIds.length} conversations queued for enrichment in ${events.length} chunks`,
    });
  } catch (error) {
    console.error('[TriggerEnrich] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger enrichment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
