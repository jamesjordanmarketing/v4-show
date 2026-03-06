/**
 * RAG Models API
 * GET /api/rag/models — List deployed LoRA models available for RAG queries
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import type { RAGDeployedModel } from '@/types/rag';

export async function GET(request: NextRequest) {
    try {
        const { user, response } = await requireAuth(request);
        if (response) return response;

        const supabase = createServerSupabaseAdminClient();

        // Fetch adapted endpoints that are ready, joined with job info
        const { data: endpoints, error } = await supabase
            .from('pipeline_inference_endpoints')
            .select(`
        job_id,
        endpoint_type,
        base_model,
        status,
        adapter_path,
        created_at,
        pipeline_training_jobs!inner (
          job_name,
          dataset_id,
          datasets (name)
        )
      `)
            .eq('user_id', user.id)
            .eq('endpoint_type', 'adapted')
            .eq('status', 'ready')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('GET /api/rag/models join query failed, falling back to simple query:', error);

            // Fallback: simpler query without joins
            const { data: fallbackEndpoints, error: fallbackError } = await supabase
                .from('pipeline_inference_endpoints')
                .select('job_id, endpoint_type, base_model, status, adapter_path, created_at')
                .eq('user_id', user.id)
                .eq('endpoint_type', 'adapted')
                .eq('status', 'ready')
                .order('created_at', { ascending: false });

            if (fallbackError) {
                console.error('GET /api/rag/models fallback error:', fallbackError);
                return NextResponse.json(
                    { success: false, error: 'Failed to fetch deployed models' },
                    { status: 500 }
                );
            }

            const models: RAGDeployedModel[] = (fallbackEndpoints || []).map((ep: any) => ({
                jobId: ep.job_id,
                endpointType: ep.endpoint_type,
                baseModel: ep.base_model,
                status: ep.status,
                adapterPath: ep.adapter_path,
                jobName: null,
                datasetName: null,
                createdAt: ep.created_at,
            }));

            return NextResponse.json({ success: true, data: models });
        }

        // Map to RAGDeployedModel format
        const models: RAGDeployedModel[] = (endpoints || []).map((ep: any) => ({
            jobId: ep.job_id,
            endpointType: ep.endpoint_type,
            baseModel: ep.base_model,
            status: ep.status,
            adapterPath: ep.adapter_path,
            jobName: ep.pipeline_training_jobs?.job_name || null,
            datasetName: ep.pipeline_training_jobs?.datasets?.name || null,
            createdAt: ep.created_at,
        }));

        return NextResponse.json({ success: true, data: models });
    } catch (error) {
        console.error('GET /api/rag/models error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
