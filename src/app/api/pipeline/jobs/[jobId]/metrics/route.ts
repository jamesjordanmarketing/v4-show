/**
 * Pipeline Job Metrics API
 * 
 * GET - Get job training metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getPipelineJob, getPipelineJobMetrics } from '@/lib/services/pipeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    // Verify job ownership
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
    
    const result = await getPipelineJobMetrics(params.jobId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId]/metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
