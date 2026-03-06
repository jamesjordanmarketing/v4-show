/**
 * Inngest Function: Dispatch Training Job to RunPod
 *
 * Triggered by: 'pipeline/job.created' event (sent from POST /api/pipeline/jobs)
 *
 * Responsibility:
 *   1. Fetch the pending job record from pipeline_training_jobs
 *   2. Generate a short-lived signed URL for the dataset file in Supabase Storage
 *   3. POST the job to the RunPod Serverless endpoint (brightrun-lora-trainer-qwen)
 *   4. Update the job status to 'initializing' with the RunPod job ID, or 'failed' on error
 *
 * Replaces: the brittle Vercel Cron + Edge Function trigger pattern.
 *
 * Retry behaviour: Inngest retries this function up to 3 times with exponential
 * backoff if any step throws. If RunPod is temporarily unavailable the job will
 * be retried automatically — no manual intervention needed.
 *
 * RunPod endpoint: GPU_CLUSTER_API_URL env var
 *   e.g. https://api.runpod.ai/v2/ei82ickpenoqlp
 *
 * RunPod worker: brighthub/brightrun-trainer:v19
 *   handler.py → train_lora.py → status_manager.py
 *   Worker writes progress directly back to Supabase — no polling needed here.
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';

// Must match the inference engine base model. LoRA adapters are architecture-specific:
// an adapter trained on Mistral-7B only works with Mistral-7B inference.
// The inference service (inference-service.ts) uses mistralai/Mistral-7B-Instruct-v0.2,
// so training must use the same base model.
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

export const dispatchTrainingJob = inngest.createFunction(
  {
    id: 'dispatch-training-job',
    name: 'Dispatch Training Job to RunPod',
    retries: 3,
    concurrency: { limit: 3 },
  },
  { event: 'pipeline/job.created' },
  async ({ event, step }) => {
    const { jobId, userId } = event.data;

    // ======================================================
    // Step 1: Fetch job and validate ownership
    // ======================================================
    const job = await step.run('fetch-job', async () => {
      const supabase = createServerSupabaseAdminClient();

      const { data, error } = await supabase
        .from('pipeline_training_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        throw new Error(`[DispatchTrainingJob] Job ${jobId} not found: ${error?.message}`);
      }

      if (data.user_id !== userId) {
        throw new Error(`[DispatchTrainingJob] Job ${jobId} does not belong to user ${userId} — aborting`);
      }

      if (data.status !== 'pending') {
        // Already picked up by a previous attempt or another trigger — stop silently
        console.log(`[DispatchTrainingJob] Job ${jobId} is already in status '${data.status}' — skipping dispatch`);
        return null;
      }

      return data;
    });

    // Job was already dispatched by a previous attempt — nothing to do
    if (!job) return { skipped: true, jobId };

    // ======================================================
    // Step 2: Mark job as 'queued' and generate signed dataset URL
    // ======================================================
    const datasetUrl = await step.run('get-signed-url', async () => {
      const supabase = createServerSupabaseAdminClient();

      // Optimistically mark as queued so a concurrent event doesn't double-dispatch
      await supabase
        .from('pipeline_training_jobs')
        .update({ status: 'queued', updated_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('status', 'pending'); // Only update if still pending (idempotency guard)

      // Prefer the path stored directly on the job record (set by pipeline-service.ts)
      if (job.dataset_file_path) {
        const { data: signed, error: signErr } = await supabase
          .storage
          .from('training-files')
          .createSignedUrl(job.dataset_file_path, 3600);

        if (signErr || !signed) {
          throw new Error(`[DispatchTrainingJob] Failed to sign dataset URL from job path: ${signErr?.message}`);
        }
        return signed.signedUrl;
      }

      // Fallback: look up the dataset record for its storage path + bucket
      const { data: dataset, error: datasetErr } = await supabase
        .from('datasets')
        .select('storage_path, storage_bucket')
        .eq('id', job.dataset_id)
        .single();

      if (datasetErr || !dataset) {
        throw new Error(`[DispatchTrainingJob] Dataset ${job.dataset_id} not found: ${datasetErr?.message}`);
      }

      const bucket = dataset.storage_bucket || 'training-files';
      const { data: signed, error: signErr } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(dataset.storage_path, 3600);

      if (signErr || !signed) {
        throw new Error(`[DispatchTrainingJob] Failed to sign dataset URL from datasets table: ${signErr?.message}`);
      }

      return signed.signedUrl;
    });

    // ======================================================
    // Step 3: POST job to RunPod Serverless endpoint
    // ======================================================
    const runpodJobId = await step.run('submit-to-runpod', async () => {
      const apiUrl = process.env.GPU_CLUSTER_API_URL;
      const apiKey = process.env.GPU_CLUSTER_API_KEY;

      if (!apiUrl || !apiKey) {
        throw new Error('[DispatchTrainingJob] Missing GPU_CLUSTER_API_URL or GPU_CLUSTER_API_KEY env vars');
      }

      const payload = {
        input: {
          job_id: job.id,
          dataset_url: datasetUrl,
          hyperparameters: {
            base_model: BASE_MODEL,
            learning_rate: job.learning_rate,
            batch_size: job.batch_size,
            epochs: job.epochs,
            rank: job.rank,
            alpha: job.alpha ?? 32,
            dropout: job.dropout ?? 0.05,
          },
          gpu_config: {
            type: job.gpu_type || 'NVIDIA A40',
            count: job.gpu_count || 1,
          },
        },
      };

      const response = await fetch(`${apiUrl}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(
          `[DispatchTrainingJob] RunPod returned non-JSON (HTTP ${response.status}) to ${apiUrl}/run — ` +
          `body: ${responseText.slice(0, 500) || '(empty)'}`
        );
      }

      if (!response.ok || !responseData.id) {
        throw new Error(
          `[DispatchTrainingJob] RunPod rejected job (HTTP ${response.status}) to ${apiUrl}/run — ` +
          `response: ${JSON.stringify(responseData).slice(0, 500)}`
        );
      }

      console.log(`[DispatchTrainingJob] RunPod accepted job ${jobId} → RunPod ID: ${responseData.id}`);
      return responseData.id as string;
    });

    // ======================================================
    // Step 4: Update job status to 'initializing' with RunPod ID
    // ======================================================
    await step.run('update-job-status', async () => {
      const supabase = createServerSupabaseAdminClient();

      const endpointId = process.env.GPU_CLUSTER_API_URL?.split('/').pop() ?? null;

      const { error } = await supabase
        .from('pipeline_training_jobs')
        .update({
          status: 'initializing',
          runpod_job_id: runpodJobId,
          runpod_endpoint_id: endpointId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) {
        // Non-fatal: RunPod has the job, just log the DB update failure
        console.error(`[DispatchTrainingJob] Failed to update job ${jobId} to 'initializing': ${error.message}`);
      } else {
        console.log(`[DispatchTrainingJob] Job ${jobId} → status: initializing, runpod_job_id: ${runpodJobId}`);
      }
    });

    return { success: true, jobId, runpodJobId };
  }
);

/**
 * Error handler: if all retries are exhausted, mark the job as 'failed'
 * in the database so the user sees a clear error state in the UI.
 *
 * Inngest calls this automatically after the final retry fails.
 */
export const dispatchTrainingJobFailureHandler = inngest.createFunction(
  {
    id: 'dispatch-training-job-failure',
    name: 'Handle Dispatch Training Job Failure',
  },
  { event: 'inngest/function.failed' },
  async ({ event, step }) => {
    // Only handle failures from our dispatch function
    if (event.data.function_id !== 'dispatch-training-job') return;

    const originalEvent = event.data.event as { data?: { jobId?: string } };
    const jobId = originalEvent?.data?.jobId;
    if (!jobId) return;

    await step.run('mark-job-failed', async () => {
      const supabase = createServerSupabaseAdminClient();

      await supabase
        .from('pipeline_training_jobs')
        .update({
          status: 'failed',
          error_message: `Dispatch failed after all retries: ${event.data.error?.message ?? 'Unknown error'}`,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        // Only mark failed if still in a dispatchable state — don't overwrite a
        // 'completed' job if somehow the failure event fires after the worker finishes
        .in('status', ['pending', 'queued']);

      console.error(`[DispatchTrainingJob] Job ${jobId} permanently failed after all retries`);
    });
  }
);
