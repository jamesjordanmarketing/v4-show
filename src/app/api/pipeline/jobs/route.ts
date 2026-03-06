/**
 * Pipeline Jobs API
 * 
 * GET  - List user's pipeline jobs
 * POST - Create new pipeline job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { createPipelineJob, listPipelineJobs } from '@/lib/services/pipeline-service';
import { CreatePipelineJobRequest } from '@/types/pipeline';
import { inngest } from '@/inngest/client';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;
    const workbaseId = searchParams.get('workbaseId') || undefined;
    
    const result = await listPipelineJobs(user.id, { 
      limit, 
      offset, 
      status: status as any,
      workbaseId,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    
    const body: CreatePipelineJobRequest = await request.json();
    
    // Validate required fields
    if (!body.jobName || !body.datasetId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jobName, datasetId' },
        { status: 400 }
      );
    }
    
    const result = await createPipelineJob(user.id, body);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Send Inngest event to dispatch this job to RunPod.
    // Inngest handles retries (3x, exponential backoff) automatically.
    await inngest.send({
      name: 'pipeline/job.created',
      data: {
        jobId: result.data!.id,
        userId: user.id,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/pipeline/jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
