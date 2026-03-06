/**
 * API Route: Batch Job Status
 * 
 * GET /api/conversations/batch/:id/status
 * Get current status and progress of a batch generation job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/conversations/batch/:id/status
 * Get job status and progress (must be owned by authenticated user)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { id } = params;
    
    console.log(`[StatusAPI] Fetching status for job ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Query with ownership check
    const job = await batchJobService.getJobById(id, user.id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    // Calculate percentage
    const percentage = job.totalItems > 0 
      ? Math.round((job.completedItems / job.totalItems) * 100 * 10) / 10
      : 0;
    
    const status = {
      jobId: job.id,
      status: job.status,
      progress: {
        total: job.totalItems,
        completed: job.completedItems,
        successful: job.successfulItems,
        failed: job.failedItems,
        percentage,
      },
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
    };
    
    console.log(`[StatusAPI] Returning status:`, {
      jobId: status.jobId,
      status: status.status,
      completed: status.progress.completed,
      total: status.progress.total
    });
    
    return NextResponse.json(
      { success: true, ...status },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
    
  } catch (error) {
    console.error('Error getting batch status:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get job status', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
