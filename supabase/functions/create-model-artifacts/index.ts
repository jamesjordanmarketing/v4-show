import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration (RunPod Serverless)
// See .secrets/deployment-secrets.md for actual endpoint URL and API key
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Create Model Artifacts Edge Function
 * 
 * Triggered by cron schedule. This function:
 * 1. Finds completed jobs without artifacts
 * 2. Downloads model files from GPU cluster
 * 3. Uploads to Supabase Storage
 * 4. Calculates quality metrics
 * 5. Creates artifact record
 * 6. Links artifact to job
 */
Deno.serve(async (req) => {
  try {
    console.log('[ArtifactCreator] Starting artifact creation cycle');

    // Find completed jobs without artifacts
    const { data: completedJobs, error } = await supabase
      .from('training_jobs')
      .select('*')
      .eq('status', 'completed')
      .is('artifact_id', null)
      .not('external_job_id', 'is', null);

    if (error) {
      console.error('[ArtifactCreator] Error fetching completed jobs:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!completedJobs || completedJobs.length === 0) {
      console.log('[ArtifactCreator] No completed jobs waiting for artifacts');
      return new Response(JSON.stringify({ message: 'No jobs to process' }));
    }

    console.log(`[ArtifactCreator] Processing ${completedJobs.length} completed jobs`);

    for (const job of completedJobs) {
      try {
        await createArtifactForJob(job);
      } catch (error) {
        console.error(`[ArtifactCreator] Error creating artifact for job ${job.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: completedJobs.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ArtifactCreator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function createArtifactForJob(job: any) {
  console.log(`[ArtifactCreator] Creating artifact for job ${job.id}`);

  // Get completed job status from RunPod to access output
  const response = await fetch(
    `${GPU_CLUSTER_API_URL}/status/${job.external_job_id}`,
    {
      headers: { 'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get job status from RunPod`);
  }

  const jobStatus = await response.json();

  // Check if job actually completed
  if (jobStatus.status !== 'COMPLETED') {
    throw new Error(`Job status is ${jobStatus.status}, not COMPLETED`);
  }

  // Extract model file URLs from worker output
  // Worker should return: {output: {model_files: {adapter_model.bin: "url", ...}, model_metadata: {...}}}
  const output = jobStatus.output || {};
  const download_urls = output.model_files || output.download_urls || {};
  const model_metadata = output.model_metadata || output.metadata || {};

  if (Object.keys(download_urls).length === 0) {
    throw new Error('No model files found in job output');
  }

  console.log(`[ArtifactCreator] Found ${Object.keys(download_urls).length} model files`);

  // Download and upload each artifact file
  const artifactId = crypto.randomUUID();
  const storagePath = `${job.user_id}/${artifactId}`;
  const uploadedFiles: Record<string, string> = {};

  for (const [fileName, downloadUrl] of Object.entries(download_urls)) {
    try {
      // Download file from GPU cluster
      const fileResponse = await fetch(downloadUrl as string);
      if (!fileResponse.ok) {
        console.error(`Failed to download ${fileName}`);
        continue;
      }

      const fileBlob = await fileResponse.blob();
      const fileBuffer = await fileBlob.arrayBuffer();

      // Upload to Supabase Storage
      const uploadPath = `${storagePath}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('lora-models')
        .upload(uploadPath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for ${fileName}:`, uploadError);
        continue;
      }

      uploadedFiles[fileName] = uploadPath;
      console.log(`[ArtifactCreator] Uploaded ${fileName} to ${uploadPath}`);
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
    }
  }

  // Calculate quality metrics from training history
  const { data: metrics } = await supabase
    .from('metrics_points')  // Corrected table name
    .select('*')
    .eq('job_id', job.id)
    .order('timestamp', { ascending: true });

  const qualityMetrics = calculateQualityMetrics(metrics || [], job);

  // Fetch dataset info
  const { data: dataset } = await supabase
    .from('datasets')  // Corrected table name
    .select('name')
    .eq('id', job.dataset_id)
    .single();

  // Create artifact record
  const { data: artifact, error: artifactError } = await supabase
    .from('model_artifacts')  // Corrected table name
    .insert({
      id: artifactId,
      user_id: job.user_id,
      job_id: job.id,
      dataset_id: job.dataset_id,
      name: `${dataset?.name || 'Model'} - ${new Date().toLocaleDateString()}`,
      version: '1.0.0',
      status: 'stored',
      quality_metrics: qualityMetrics,
      training_summary: {
        epochs_completed: job.current_epoch,
        total_steps: job.current_step,
        final_loss: job.current_metrics?.training_loss,
        training_duration_hours: (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / (1000 * 60 * 60),
        total_cost: job.final_cost,
      },
      configuration: {
        preset_id: job.preset_id,
        hyperparameters: job.hyperparameters,
        gpu_config: job.gpu_config,
      },
      artifacts: uploadedFiles,
    })
    .select()
    .single();

  if (artifactError) {
    throw new Error(`Failed to create artifact record: ${artifactError.message}`);
  }

  // Link artifact to job
  await supabase
    .from('training_jobs')  // Corrected table name
    .update({ artifact_id: artifactId })
    .eq('id', job.id);

  // Create notification
  await supabase.from('notifications').insert({  // Corrected table name
    user_id: job.user_id,
    type: 'artifact_ready',
    title: 'Model Ready for Download',
    message: `Your trained model is ready. Quality score: ${qualityMetrics.overall_score}/5 stars`,
    priority: 'high',
    action_url: `/models/${artifactId}`,
    metadata: { artifact_id: artifactId, job_id: job.id },
  });

  console.log(`[ArtifactCreator] Artifact ${artifactId} created for job ${job.id}`);
}

/**
 * Calculate quality metrics from training metrics history
 */
function calculateQualityMetrics(metrics: any[], job: any) {
  if (metrics.length === 0) {
    return {
      overall_score: 3,
      convergence_quality: 'unknown',
      final_training_loss: null,
      final_validation_loss: null,
      perplexity: null,
    };
  }

  const finalMetrics = metrics[metrics.length - 1];
  const finalTrainingLoss = finalMetrics.training_loss;
  const finalValidationLoss = finalMetrics.validation_loss;

  // Calculate perplexity (exp of loss)
  const perplexity = finalValidationLoss ? Math.exp(finalValidationLoss) : null;

  // Assess convergence quality
  // Check if loss decreased over time
  const initialLoss = metrics[0].training_loss;
  const lossReduction = ((initialLoss - finalTrainingLoss) / initialLoss) * 100;

  let convergenceQuality = 'poor';
  let overallScore = 1;

  if (lossReduction > 50) {
    convergenceQuality = 'excellent';
    overallScore = 5;
  } else if (lossReduction > 30) {
    convergenceQuality = 'good';
    overallScore = 4;
  } else if (lossReduction > 15) {
    convergenceQuality = 'fair';
    overallScore = 3;
  } else if (lossReduction > 5) {
    convergenceQuality = 'poor';
    overallScore = 2;
  }

  // Check for overfitting (validation loss much higher than training loss)
  if (finalValidationLoss && finalTrainingLoss) {
    const gap = finalValidationLoss - finalTrainingLoss;
    if (gap > 0.5) {
      convergenceQuality = 'overfit';
      overallScore = Math.max(2, overallScore - 1);
    }
  }

  return {
    overall_score: overallScore,
    convergence_quality: convergenceQuality,
    final_training_loss: finalTrainingLoss,
    final_validation_loss: finalValidationLoss,
    perplexity: perplexity,
    loss_reduction_percent: lossReduction,
  };
}

