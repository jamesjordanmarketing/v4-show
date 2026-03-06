/**
 * API Route: Get validation report
 * GET /api/conversations/[id]/validation-report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClientFromRequest } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  try {
    const conversationId = params.id;

    // Verify parent conversation ownership
    const { supabase } = createServerSupabaseClientFromRequest(request);

    // Fetch conversation with validation data and ownership check
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        conversation_id,
        created_by,
        enrichment_status,
        validation_report,
        enrichment_error,
        raw_stored_at,
        enriched_at,
        updated_at,
        processing_status
      `)
      .eq('conversation_id', conversationId)
      .single();

    if (error || !conversation || conversation.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Build pipeline stages status
    const pipelineStages = buildPipelineStages(conversation);

    // Build report
    const report = {
      conversation_id: conversationId,
      enrichment_status: conversation.enrichment_status,
      processing_status: conversation.processing_status,
      validation_report: conversation.validation_report || null,
      enrichment_error: conversation.enrichment_error || null,
      timeline: {
        raw_stored_at: conversation.raw_stored_at,
        enriched_at: conversation.enriched_at,
        last_updated: conversation.updated_at
      },
      pipeline_stages: pipelineStages
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build pipeline stages status from conversation data
 */
function buildPipelineStages(conversation: any) {
  const status = conversation.enrichment_status;

  return {
    stage_1_generation: {
      name: 'Claude Generation',
      status: conversation.raw_stored_at ? 'completed' : 'pending',
      completed_at: conversation.raw_stored_at
    },
    stage_2_validation: {
      name: 'Structural Validation',
      status: status === 'validation_failed' ? 'failed' :
              ['validated', 'enrichment_in_progress', 'enriched', 'completed'].includes(status) ? 'completed' :
              'pending',
      completed_at: conversation.validation_report?.validatedAt || null
    },
    stage_3_enrichment: {
      name: 'Data Enrichment',
      status: status === 'enrichment_in_progress' ? 'in_progress' :
              ['enriched', 'completed'].includes(status) ? 'completed' :
              'pending',
      completed_at: conversation.enriched_at
    },
    stage_4_normalization: {
      name: 'JSON Normalization',
      status: status === 'normalization_failed' ? 'failed' :
              status === 'completed' ? 'completed' :
              'pending',
      completed_at: status === 'completed' ? conversation.updated_at : null
    }
  };
}
