/**
 * Pipeline Job Detail API
 * 
 * GET - Get job details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getPipelineJob } from '@/lib/services/pipeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const result = await getPipelineJob(params.jobId);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    
    // Verify ownership
    if (result.data?.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs/[jobId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
