import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// GPU Cluster API configuration
const GPU_CLUSTER_API_URL = Deno.env.get('GPU_CLUSTER_API_URL')!;
const GPU_CLUSTER_API_KEY = Deno.env.get('GPU_CLUSTER_API_KEY')!;

/**
 * Process training jobs edge function
 * 
 * This function runs on a cron schedule (every 30 seconds) and:
 * 1. Finds jobs with status='queued'
 * 2. Submits them to the GPU cluster
 * 3. Updates status to 'initializing'
 * 4. Polls running jobs for progress updates
 * 5. Updates metrics and progress in database
 * 6. Handles job completion and errors
 */
Deno.serve(async (req) => {
  try {
    console.log('[JobProcessor] Starting job processing cycle');

    // Process queued jobs (submit to GPU cluster)
    await processQueuedJobs();

    // Update running jobs (poll GPU cluster for progress)
    await updateRunningJobs();

    return new Response(
      JSON.stringify({ success: true, message: 'Job processing cycle complete' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[JobProcessor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process queued jobs - submit to GPU cluster
 */
async function processQueuedJobs() {
  // Fetch jobs waiting to be submitted
  const { data: queuedJobs, error } = await supabase
    .from('training_jobs')
    .select(`
      *,
      dataset:datasets(storage_path, storage_bucket, total_training_pairs)
    `)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5); // Process up to 5 jobs per cycle

  if (error) {
    console.error('[JobProcessor] Error fetching queued jobs:', error);
    return;
  }

  if (!queuedJobs || queuedJobs.length === 0) {
    console.log('[JobProcessor] No queued jobs to process');
    return;
  }

  console.log(`[JobProcessor] Processing ${queuedJobs.length} queued jobs`);

  for (const job of queuedJobs) {
    try {
      // Update status to initializing
      await supabase
        .from('training_jobs')
        .update({
          status: 'initializing',
          current_stage: 'initializing',
        })
        .eq('id', job.id);

      // IMPORTANT: Use the correct storage bucket from dataset record
      // This handles both 'training-files' (imported) and 'lora-datasets' (uploaded)
      const storageBucket = job.dataset.storage_bucket || 'lora-datasets';

      // Get signed URL for dataset
      const { data: signedUrlData } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(job.dataset.storage_path, 3600 * 24); // 24 hour expiry

      if (!signedUrlData) {
        throw new Error(`Failed to generate dataset signed URL from bucket: ${storageBucket}`);
      }

      console.log(`[JobProcessor] Generated signed URL for job ${job.id} from bucket: ${storageBucket}`);

      // Submit job to RunPod serverless endpoint
      // RunPod expects {input: {...}} format
      const runpodPayload = {
        input: {
          job_id: job.id,
          dataset_url: signedUrlData.signedUrl,
          hyperparameters: {
            ...job.hyperparameters,
            // Use Mistral Instruct for testing (has chat template, downloads from HuggingFace)
            base_model: job.hyperparameters.base_model || 'mistralai/Mistral-7B-Instruct-v0.3',
          },
          gpu_config: job.gpu_config,
          callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/training-callback`,
        },
      };

      const response = await fetch(`${GPU_CLUSTER_API_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
        },
        body: JSON.stringify(runpodPayload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`GPU cluster submission failed: ${errorData}`);
      }

      const runpodJob = await response.json();

      // RunPod returns {id: "job-id", status: "IN_QUEUE"}
      const externalJobId = runpodJob.id;

      // Update job with external ID and status
      await supabase
        .from('training_jobs')
        .update({
          external_job_id: externalJobId,
          status: 'running',
          current_stage: 'queued_on_gpu',
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[JobProcessor] Job ${job.id} submitted to RunPod: ${externalJobId}`);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: job.user_id,
        type: 'job_started',
        title: 'Training Started',
        message: `Your training job has started on ${job.gpu_config.num_gpus}x ${job.gpu_config.gpu_type}`,
        priority: 'medium',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });

    } catch (error) {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, error);

      // Mark job as failed
      await supabase
        .from('training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          error_stack: error.stack,
        })
        .eq('id', job.id);

      // Create error notification
      await supabase.from('notifications').insert({
        user_id: job.user_id,
        type: 'job_failed',
        title: 'Training Failed',
        message: `Your training job failed to start: ${error.message}`,
        priority: 'high',
        action_url: `/training/jobs/${job.id}`,
        metadata: { job_id: job.id },
      });
    }
  }
}

/**
 * Update running jobs - poll GPU cluster for progress
 */
async function updateRunningJobs() {
  // Fetch jobs currently running
  const { data: runningJobs, error } = await supabase
    .from('training_jobs')
    .select('*')
    .in('status', ['running', 'initializing'])
    .not('external_job_id', 'is', null);

  if (error) {
    console.error('[JobProcessor] Error fetching running jobs:', error);
    return;
  }

  if (!runningJobs || runningJobs.length === 0) {
    console.log('[JobProcessor] No running jobs to update');
    return;
  }

  console.log(`[JobProcessor] Updating ${runningJobs.length} running jobs`);

  for (const job of runningJobs) {
    try {
      // Poll RunPod serverless status endpoint
      const response = await fetch(
        `${GPU_CLUSTER_API_URL}/status/${job.external_job_id}`,
        {
          headers: {
            'Authorization': `Bearer ${GPU_CLUSTER_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`[JobProcessor] Failed to get status for job ${job.id}`);
        continue;
      }

      const runpodStatus = await response.json();

      // RunPod status format: {id, status: "IN_QUEUE"|"IN_PROGRESS"|"COMPLETED"|"FAILED", output: {...}}
      // Map RunPod status to our internal format
      let gpuJobStatus: any = {};

      if (runpodStatus.status === 'IN_QUEUE') {
        gpuJobStatus.stage = 'queued_on_gpu';
        gpuJobStatus.progress = 0;
      } else if (runpodStatus.status === 'IN_PROGRESS') {
        gpuJobStatus.stage = 'training';
        // Extract progress from output if worker provides it
        if (runpodStatus.output) {
          gpuJobStatus.progress = runpodStatus.output.progress || job.progress;
          gpuJobStatus.current_epoch = runpodStatus.output.current_epoch || job.current_epoch;
          gpuJobStatus.current_step = runpodStatus.output.current_step || job.current_step;
          gpuJobStatus.metrics = runpodStatus.output.metrics;
        }
      } else if (runpodStatus.status === 'COMPLETED') {
        gpuJobStatus.status = 'completed';
        gpuJobStatus.stage = 'completed';
        gpuJobStatus.progress = 100;
      } else if (runpodStatus.status === 'FAILED') {
        gpuJobStatus.status = 'failed';
        gpuJobStatus.error_message = runpodStatus.error || 'Job failed on GPU cluster';
      }

      // Update job progress and metrics
      const updates: any = {
        progress: gpuJobStatus.progress || job.progress,
        current_epoch: gpuJobStatus.current_epoch || job.current_epoch,
        current_step: gpuJobStatus.current_step || job.current_step,
        current_stage: gpuJobStatus.stage || job.current_stage,
      };

      // Update current metrics if available
      if (gpuJobStatus.metrics) {
        updates.current_metrics = {
          training_loss: gpuJobStatus.metrics.training_loss,
          validation_loss: gpuJobStatus.metrics.validation_loss,
          learning_rate: gpuJobStatus.metrics.learning_rate,
          throughput: gpuJobStatus.metrics.throughput,
          gpu_utilization: gpuJobStatus.metrics.gpu_utilization,
        };

        // Store metrics point for historical tracking
        await supabase.from('metrics_points').insert({
          job_id: job.id,
          epoch: gpuJobStatus.current_epoch,
          step: gpuJobStatus.current_step,
          training_loss: gpuJobStatus.metrics.training_loss,
          validation_loss: gpuJobStatus.metrics.validation_loss,
          learning_rate: gpuJobStatus.metrics.learning_rate,
          gradient_norm: gpuJobStatus.metrics.gradient_norm,
          throughput: gpuJobStatus.metrics.throughput,
          gpu_utilization: gpuJobStatus.metrics.gpu_utilization,
        });
      }

      // Calculate current cost
      if (job.started_at) {
        const startTime = new Date(job.started_at).getTime();
        const now = new Date().getTime();
        const hoursElapsed = (now - startTime) / (1000 * 60 * 60);
        const hourlyRate = job.gpu_config.cost_per_gpu_hour * job.gpu_config.num_gpus;
        updates.current_cost = parseFloat((hourlyRate * hoursElapsed).toFixed(2));
      }

      // Handle job completion
      if (gpuJobStatus.status === 'completed') {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        updates.final_cost = updates.current_cost;
        updates.progress = 100;

        // Record final cost
        await supabase.from('cost_records').insert({
          user_id: job.user_id,
          job_id: job.id,
          cost_type: 'training_compute',
          amount: updates.final_cost,
          details: {
            gpu_type: job.gpu_config.gpu_type,
            gpu_count: job.gpu_config.num_gpus,
            duration_hours: (new Date(updates.completed_at).getTime() - new Date(job.started_at).getTime()) / (1000 * 60 * 60),
          },
          billing_period: new Date().toISOString().split('T')[0],
        });

        // Create completion notification
        await supabase.from('notifications').insert({
          user_id: job.user_id,
          type: 'job_completed',
          title: 'Training Complete',
          message: `Your training job finished successfully. Cost: $${updates.final_cost.toFixed(2)}`,
          priority: 'high',
          action_url: `/training/jobs/${job.id}`,
          metadata: { job_id: job.id, final_cost: updates.final_cost },
        });
      }

      // Handle job failure
      if (gpuJobStatus.status === 'failed') {
        updates.status = 'failed';
        updates.completed_at = new Date().toISOString();
        updates.error_message = gpuJobStatus.error_message || 'GPU cluster reported failure';
        updates.final_cost = updates.current_cost;

        // Create failure notification
        await supabase.from('notifications').insert({
          user_id: job.user_id,
          type: 'job_failed',
          title: 'Training Failed',
          message: `Your training job failed: ${updates.error_message}`,
          priority: 'high',
          action_url: `/training/jobs/${job.id}`,
          metadata: { job_id: job.id },
        });
      }

      // Apply updates to job
      await supabase
        .from('training_jobs')
        .update(updates)
        .eq('id', job.id);

      console.log(`[JobProcessor] Updated job ${job.id}: ${updates.status || job.status} - ${updates.progress}%`);

    } catch (error) {
      console.error(`[JobProcessor] Error updating job ${job.id}:`, error);
    }
  }
}
