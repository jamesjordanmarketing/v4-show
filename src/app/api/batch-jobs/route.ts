/**
 * API Route: Batch Jobs List
 * 
 * GET /api/batch-jobs
 * List all batch generation jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';

/**
 * GET /api/batch-jobs
 * List batch jobs scoped to the authenticated user
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled' | null;
    const workbaseId = searchParams.get('workbaseId') || undefined;

    // Override any client-supplied createdBy — always scope to authenticated user
    const jobs = await batchJobService.getAllJobs(user.id, {
      ...(status ? { status } : {}),
      ...(workbaseId ? { workbaseId } : {}),
    });

    // Transform to simpler response format
    const simplifiedJobs = jobs.map(job => ({
      id: job.id,
      name: job.name,
      status: job.status,
      totalItems: job.totalItems,
      completedItems: job.completedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      priority: job.priority,
    }));

    return NextResponse.json({
      success: true,
      jobs: simplifiedJobs,
      count: simplifiedJobs.length,
    });

  } catch (error) {
    console.error('Error fetching batch jobs:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch batch jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
