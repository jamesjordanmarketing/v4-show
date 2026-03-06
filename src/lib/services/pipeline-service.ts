/**
 * Pipeline Service
 * 
 * Backend service for pipeline training job operations
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  PipelineTrainingJob,
  CreatePipelineJobRequest,
  PipelineJobStatus,
  DEFAULT_ENGINE,
} from '@/types/pipeline';
import { convertToTechnicalParams, estimateTrainingCost } from '@/lib/pipeline/hyperparameter-utils';

// ============================================
// Type Mappings (Database → TypeScript)
// ============================================

function mapDbRowToJob(row: any): PipelineTrainingJob {
  return {
    id: row.id,
    userId: row.user_id,
    jobName: row.job_name,
    status: row.status as PipelineJobStatus,
    trainingSensitivity: row.training_sensitivity,
    trainingProgression: row.training_progression,
    trainingRepetition: row.training_repetition,
    learningRate: row.learning_rate,
    batchSize: row.batch_size,
    epochs: row.epochs,
    rank: row.rank,
    alpha: row.alpha,
    dropout: row.dropout,
    datasetId: row.dataset_id,
    datasetName: row.dataset_name,
    datasetFilePath: row.dataset_file_path,
    engineId: row.engine_id,
    engineName: row.engine_name,
    engineFeatures: row.engine_features || [],
    gpuType: row.gpu_type,
    gpuCount: row.gpu_count,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    progress: row.progress || 0,
    currentEpoch: row.current_epoch || 0,
    currentStep: row.current_step || 0,
    totalSteps: row.total_steps,
    currentLoss: row.current_loss,
    currentLearningRate: row.current_learning_rate,
    tokensPerSecond: row.tokens_per_second,
    runpodJobId: row.runpod_job_id,
    runpodEndpointId: row.runpod_endpoint_id,
    finalLoss: row.final_loss,
    trainingTimeSeconds: row.training_time_seconds,
    adapterFilePath: row.adapter_file_path,
    adapterDownloadUrl: row.adapter_download_url,
    adapterStatus: row.adapter_status ?? null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
  };
}

// ============================================
// Job CRUD Operations
// ============================================

export async function createPipelineJob(
  userId: string,
  request: CreatePipelineJobRequest
): Promise<{ success: boolean; data?: PipelineTrainingJob; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Convert lay-person config to technical params
    const technicalParams = convertToTechnicalParams({
      trainingSensitivity: request.trainingSensitivity,
      trainingProgression: request.trainingProgression,
      trainingRepetition: request.trainingRepetition,
    });
    
    // Estimate cost
    const costEstimate = estimateTrainingCost({
      trainingSensitivity: request.trainingSensitivity,
      trainingProgression: request.trainingProgression,
      trainingRepetition: request.trainingRepetition,
    });
    
    // Get dataset info (use storage_path, not file_path)
    const { data: dataset } = await supabase
      .from('datasets')
      .select('name, storage_path, storage_bucket')
      .eq('id', request.datasetId)
      .single();
    
    // Insert job
    const { data, error } = await supabase
      .from('pipeline_training_jobs')
      .insert({
        user_id: userId,
        workbase_id: request.workbaseId || null,
        job_name: request.jobName,
        status: 'pending',
        training_sensitivity: request.trainingSensitivity,
        training_progression: request.trainingProgression,
        training_repetition: request.trainingRepetition,
        learning_rate: technicalParams.learningRate,
        batch_size: technicalParams.batchSize,
        epochs: technicalParams.epochs,
        rank: technicalParams.rank,
        alpha: technicalParams.alpha,
        dropout: technicalParams.dropout,
        dataset_id: request.datasetId,
        dataset_name: dataset?.name || null,
        dataset_file_path: dataset?.storage_path || null,
        engine_id: DEFAULT_ENGINE.id,
        engine_name: DEFAULT_ENGINE.name,
        engine_features: DEFAULT_ENGINE.features,
        gpu_type: request.gpuType || 'NVIDIA A40',
        gpu_count: request.gpuCount || 1,
        estimated_cost: costEstimate.totalCost,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pipeline job:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: mapDbRowToJob(data) };
  } catch (err) {
    console.error('Exception creating pipeline job:', err);
    return { success: false, error: 'Failed to create job' };
  }
}

export async function getPipelineJob(
  jobId: string
): Promise<{ success: boolean; data?: PipelineTrainingJob; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data: mapDbRowToJob(data) };
  } catch (err) {
    console.error('Exception getting pipeline job:', err);
    return { success: false, error: 'Failed to get job' };
  }
}

export async function listPipelineJobs(
  userId: string,
  options?: { limit?: number; offset?: number; status?: PipelineJobStatus; workbaseId?: string }
): Promise<{ success: boolean; data?: PipelineTrainingJob[]; count?: number; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    let query = supabase
      .from('pipeline_training_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.workbaseId) {
      query = query.eq('workbase_id', options.workbaseId);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      data: data.map(mapDbRowToJob),
      count: count || 0,
    };
  } catch (err) {
    console.error('Exception listing pipeline jobs:', err);
    return { success: false, error: 'Failed to list jobs' };
  }
}

export async function updatePipelineJobStatus(
  jobId: string,
  status: PipelineJobStatus,
  additionalUpdates?: Partial<Record<string, any>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalUpdates,
    };
    
    // Set started_at if moving to running
    if (status === 'running' && !additionalUpdates?.started_at) {
      updates.started_at = new Date().toISOString();
    }
    
    // Set completed_at if terminal status
    if (['completed', 'failed', 'cancelled'].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('pipeline_training_jobs')
      .update(updates)
      .eq('id', jobId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Exception updating pipeline job:', err);
    return { success: false, error: 'Failed to update job' };
  }
}

export async function cancelPipelineJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  return updatePipelineJobStatus(jobId, 'cancelled');
}

// ============================================
// Metrics Operations
// ============================================

export async function getPipelineJobMetrics(
  jobId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('pipeline_training_metrics')
      .select('*')
      .eq('job_id', jobId)
      .order('measured_at', { ascending: true });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Exception getting metrics:', err);
    return { success: false, error: 'Failed to get metrics' };
  }
}

// ============================================
// Engine Information
// ============================================

export function getCurrentEngine() {
  // Single engine architecture - always return the default engine
  return DEFAULT_ENGINE;
}
