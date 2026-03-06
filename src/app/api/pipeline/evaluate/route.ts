/**
 * Pipeline Evaluation API
 * 
 * POST - Start evaluation run (baseline or trained)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { 
  generateConversation, 
  evaluateWithClaude,
  calculateAggregateMetrics 
} from '@/lib/pipeline/evaluation-service';
import { TEST_SCENARIOS } from '@/lib/pipeline/test-scenarios';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { jobId, evaluationType } = await request.json();
    
    if (!jobId || !evaluationType) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId or evaluationType' },
        { status: 400 }
      );
    }
    
    if (!['baseline', 'trained'].includes(evaluationType)) {
      return NextResponse.json(
        { success: false, error: 'evaluationType must be "baseline" or "trained"' },
        { status: 400 }
      );
    }
    
    // Get job and verify ownership
    const { data: job, error: jobError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Create evaluation run
    const { data: run, error: runError } = await supabase
      .from('pipeline_evaluation_runs')
      .insert({
        job_id: jobId,
        evaluation_type: evaluationType,
        model_id: 'meta-llama/Meta-Llama-3-70B-Instruct',
        adapter_path: evaluationType === 'trained' ? job.adapter_file_path : null,
        total_scenarios: TEST_SCENARIOS.length,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (runError) {
      console.error('Failed to create evaluation run:', runError);
      return NextResponse.json(
        { success: false, error: 'Failed to create evaluation run' },
        { status: 500 }
      );
    }
    
    // Start async evaluation process
    // In production, this would be handled by a background job
    runEvaluationPipeline(run.id, job, evaluationType);
    
    return NextResponse.json({
      success: true,
      data: {
        runId: run.id,
        status: 'running',
        totalScenarios: TEST_SCENARIOS.length,
      },
    });
  } catch (error) {
    console.error('POST /api/pipeline/evaluate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function runEvaluationPipeline(
  runId: string,
  job: any,
  evaluationType: string
) {
  const supabase = await createServerSupabaseClient();
  const results: any[] = [];
  
  try {
    for (const scenario of TEST_SCENARIOS) {
      // Generate conversation
      const { turns, totalTokens, generationTimeMs } = await generateConversation(
        scenario,
        process.env.GPU_CLUSTER_API_URL!,
        evaluationType === 'trained' ? job.adapter_file_path : null
      );
      
      // Evaluate with Claude
      const { evaluation, tokensUsed } = await evaluateWithClaude(scenario, turns);
      
      // Store result
      const { data: result } = await supabase
        .from('pipeline_evaluation_results')
        .insert({
          run_id: runId,
          scenario_id: scenario.id,
          conversation_turns: turns,
          total_tokens: totalTokens,
          generation_time_ms: generationTimeMs,
          emotional_progression: evaluation.emotionalProgression,
          empathy_evaluation: evaluation.empathyEvaluation,
          voice_consistency: evaluation.voiceConsistency,
          conversation_quality: evaluation.conversationQuality,
          overall_evaluation: evaluation.overallEvaluation,
          claude_model_used: evaluation.claudeModelUsed,
          evaluation_tokens: tokensUsed,
          raw_response: evaluation.rawResponse,
        })
        .select()
        .single();
      
      results.push(result);
      
      // Update completed count
      await supabase
        .from('pipeline_evaluation_runs')
        .update({ completed_scenarios: results.length })
        .eq('id', runId);
    }
    
    // Calculate and store aggregate metrics
    const aggregates = calculateAggregateMetrics(results);
    
    await supabase
      .from('pipeline_evaluation_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        arc_completion_rate: aggregates.arcCompletionRate,
        avg_progression_quality: aggregates.avgProgressionQuality,
        empathy_first_rate: aggregates.empathyFirstRate,
        avg_empathy_score: aggregates.avgEmpathyScore,
        avg_voice_score: aggregates.avgVoiceScore,
        helpful_rate: aggregates.helpfulRate,
        avg_quality_score: aggregates.avgQualityScore,
        avg_overall_score: aggregates.avgOverallScore,
      })
      .eq('id', runId);
      
  } catch (error) {
    console.error('Evaluation pipeline failed:', error);
    
    await supabase
      .from('pipeline_evaluation_runs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', runId);
  }
}
