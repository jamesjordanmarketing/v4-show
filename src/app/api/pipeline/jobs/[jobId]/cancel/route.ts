/**
 * Pipeline Job Cancel API
 * 
 * POST - Cancel a running job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getPipelineJob, cancelPipelineJob } from '@/lib/services/pipeline-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    // Get job and verify ownership
    const jobResult = await getPipelineJob(params.jobId);
    
    if (!jobResult.success || !jobResult.data) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (jobResult.data.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    // Check if cancellable
    const cancellableStatuses = ['pending', 'queued', 'initializing', 'running'];
    if (!cancellableStatuses.includes(jobResult.data.status)) {
      return NextResponse.json(
        { success: false, error: 'Job cannot be cancelled in current state' },
        { status: 400 }
      );
    }
    
    const result = await cancelPipelineJob(params.jobId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/pipeline/jobs/[jobId]/cancel error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
