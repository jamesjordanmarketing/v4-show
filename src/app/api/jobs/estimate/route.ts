import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema
const EstimateRequestSchema = z.object({
  dataset_id: z.string().uuid(),
  gpu_config: z.object({
    type: z.enum(['A100-80GB', 'A100-40GB', 'H100', 'V100-32GB']),
    count: z.number().int().min(1).max(8),
  }),
  hyperparameters: z.object({
    batch_size: z.number().int().min(1).max(64),
    epochs: z.number().int().min(1).max(20),
    learning_rate: z.number().min(0.00001).max(0.001),
    rank: z.number().int().min(4).max(128),
  }),
});

/**
 * POST /api/jobs/estimate - Calculate cost estimate for training configuration
 * 
 * This endpoint calculates:
 * - Training duration based on dataset size and throughput
 * - Compute cost based on GPU pricing
 * - Storage cost for model artifacts
 * - Total estimated cost
 */
export async function POST(request: NextRequest) {
  try {
    // From Section E01 - authentication pattern
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Parse and validate request
    const body = await request.json();
    const validation = EstimateRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { dataset_id, gpu_config, hyperparameters } = validation.data;

    const supabase = await createServerSupabaseClient();

    // From Section E02 - fetch dataset statistics for accurate duration estimation
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('total_training_pairs, total_tokens, name')
      .eq('id', dataset_id)
      .eq('user_id', user.id)
      .single();

    if (datasetError || !dataset) {
      return NextResponse.json(
        { error: 'Dataset not found or access denied' },
        { status: 404 }
      );
    }

    // GPU pricing configuration (per hour, per GPU)
    const GPU_PRICING: Record<string, number> = {
      'A100-80GB': 3.50,
      'A100-40GB': 2.80,
      'H100': 4.20,
      'V100-32GB': 2.10,
    };

    // GPU throughput (tokens per second per GPU)
    const GPU_THROUGHPUT: Record<string, number> = {
      'A100-80GB': 1800,
      'A100-40GB': 1500,
      'H100': 2200,
      'V100-32GB': 1200,
    };

    const pricePerGpu = GPU_PRICING[gpu_config.type];
    const throughputPerGpu = GPU_THROUGHPUT[gpu_config.type];
    const hourlyRate = pricePerGpu * gpu_config.count;
    const totalThroughput = throughputPerGpu * gpu_config.count;

    // Calculate training duration
    const trainingPairs = dataset.total_training_pairs || 1000;
    const totalTokens = dataset.total_tokens || trainingPairs * 200;
    
    // Steps calculation
    const stepsPerEpoch = Math.ceil(trainingPairs / hyperparameters.batch_size);
    const totalSteps = stepsPerEpoch * hyperparameters.epochs;
    
    // Time calculation
    const avgTokensPerStep = (totalTokens / trainingPairs) * hyperparameters.batch_size;
    const secondsPerStep = avgTokensPerStep / totalThroughput;
    const totalTrainingSeconds = totalSteps * secondsPerStep;
    
    // Add overhead: initialization (10 min), validation between epochs (5 min/epoch), final save (5 min)
    const overheadSeconds = (10 * 60) + (hyperparameters.epochs * 5 * 60) + (5 * 60);
    const totalSeconds = totalTrainingSeconds + overheadSeconds;
    const estimatedHours = totalSeconds / 3600;

    // Cost calculation
    const computeCost = hourlyRate * estimatedHours;
    const storageCost = 0.50; // Model artifacts storage (~2-5GB in Supabase Storage)
    const totalCost = computeCost + storageCost;

    return NextResponse.json({
      success: true,
      data: {
        estimated_cost: parseFloat(totalCost.toFixed(2)),
        cost_breakdown: {
          compute: parseFloat(computeCost.toFixed(2)),
          storage: storageCost,
        },
        estimated_duration_hours: parseFloat(estimatedHours.toFixed(2)),
        hourly_rate: parseFloat(hourlyRate.toFixed(2)),
        training_details: {
          total_steps: totalSteps,
          steps_per_epoch: stepsPerEpoch,
          estimated_throughput_tokens_per_sec: totalThroughput,
          dataset_name: dataset.name,
        },
      },
    });
  } catch (error: any) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate cost', details: error.message },
      { status: 500 }
    );
  }
}

