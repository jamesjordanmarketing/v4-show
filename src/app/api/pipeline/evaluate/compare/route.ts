/**
 * Evaluation Comparison API
 * 
 * GET - Get comparison report between baseline and trained runs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { SUCCESS_CRITERIA } from '@/types/pipeline-evaluation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }
    
    // Get baseline and trained runs
    const { data: runs, error } = await supabase
      .from('pipeline_evaluation_runs')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'completed');
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    const baselineRun = runs?.find(r => r.evaluation_type === 'baseline');
    const trainedRun = runs?.find(r => r.evaluation_type === 'trained');
    
    if (!baselineRun || !trainedRun) {
      return NextResponse.json({
        success: false,
        error: 'Both baseline and trained evaluation runs are required',
        available: {
          baseline: !!baselineRun,
          trained: !!trainedRun,
        },
      });
    }
    
    // Build comparison metrics
    const buildComparison = (
      baselineValue: number,
      trainedValue: number,
      target: number
    ) => ({
      baseline: baselineValue,
      trained: trainedValue,
      absoluteImprovement: trainedValue - baselineValue,
      percentImprovement: baselineValue > 0 
        ? (trainedValue - baselineValue) / baselineValue 
        : 0,
      meetsTarget: trainedValue >= target,
    });
    
    const comparison = {
      arcCompletion: buildComparison(
        baselineRun.arc_completion_rate || 0,
        trainedRun.arc_completion_rate || 0,
        SUCCESS_CRITERIA.arcCompletionRate.target
      ),
      empathyFirst: buildComparison(
        baselineRun.empathy_first_rate || 0,
        trainedRun.empathy_first_rate || 0,
        SUCCESS_CRITERIA.empathyFirstRate.target
      ),
      voiceConsistency: buildComparison(
        (baselineRun.avg_voice_score || 0) / 5,
        (trainedRun.avg_voice_score || 0) / 5,
        SUCCESS_CRITERIA.voiceConsistency.target
      ),
      overallScore: buildComparison(
        baselineRun.avg_overall_score || 0,
        trainedRun.avg_overall_score || 0,
        SUCCESS_CRITERIA.overallScore.target
      ),
    };
    
    const successCriteriaMet = Object.entries(SUCCESS_CRITERIA)
      .filter(([key]) => {
        const metricKey = key as keyof typeof comparison;
        return comparison[metricKey]?.meetsTarget;
      })
      .map(([, criteria]) => criteria.description);
    
    const successCriteriaMissed = Object.entries(SUCCESS_CRITERIA)
      .filter(([key]) => {
        const metricKey = key as keyof typeof comparison;
        return !comparison[metricKey]?.meetsTarget;
      })
      .map(([, criteria]) => criteria.description);
    
    const trainingSuccessful = successCriteriaMet.length >= 3;
    
    let recommendation = '';
    if (trainingSuccessful) {
      recommendation = 'Training was successful. The model shows significant improvement across key metrics and is ready for production use.';
    } else if (successCriteriaMet.length >= 2) {
      recommendation = 'Training shows promise but needs refinement. Consider adjusting training parameters or adding more training data.';
    } else {
      recommendation = 'Training did not meet expectations. Review training data quality and consider alternative approaches.';
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: `${baselineRun.id}_${trainedRun.id}`,
        generatedAt: new Date().toISOString(),
        baselineRunId: baselineRun.id,
        trainedRunId: trainedRun.id,
        trainingJobId: jobId,
        improvements: comparison,
        trainingSuccessful,
        successCriteriaMet,
        successCriteriaMissed,
        recommendation,
      },
    });
  } catch (error) {
    console.error('GET /api/pipeline/evaluate/compare error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
