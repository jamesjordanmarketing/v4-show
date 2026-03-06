/**
 * API Route: Cancel Batch Job
 * 
 * POST /api/batch-jobs/[id]/cancel
 * Cancel an active batch job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { batchJobService } from '@/lib/services/batch-job-service';
import { inngest } from '@/inngest/client';

/**
 * POST /api/batch-jobs/[id]/cancel
 * Cancel a batch job by ID (must be owned by authenticated user)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    console.log(`[CancelJob] Cancelling job ${id}`);

    // Get job with ownership check
    const job = await batchJobService.getJobById(id, user.id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }

    // Check if job can be cancelled
    if (job.status === 'completed' || job.status === 'cancelled') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot cancel job with status '${job.status}'` 
        },
        { status: 400 }
      );
    }

    // Cancel the job (ownership already verified above)
    await batchJobService.cancelJob(id, user.id);

    // Signal Inngest to cancel the running function
    await inngest.send({
      name: 'batch/job.cancel.requested',
      data: {
        jobId: id,
        userId: user.id,
      },
    });

    console.log(`[CancelJob] Job ${id} cancelled successfully — Inngest cancel event emitted`);

    // Fetch updated job
    const updatedJob = await batchJobService.getJobById(id, user.id);

    if (!updatedJob) {
      return NextResponse.json({ success: true, message: 'Job cancelled successfully' });
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      job: {
        id: updatedJob.id,
        name: updatedJob.name,
        status: updatedJob.status,
        totalItems: updatedJob.totalItems,
        completedItems: updatedJob.completedItems,
        successfulItems: updatedJob.successfulItems,
        failedItems: updatedJob.failedItems,
      },
    });

  } catch (error) {
    console.error('[CancelJob] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel batch job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
