/**
 * Process Pipeline Jobs Edge Function
 * 
 * Polls for pending jobs and submits them to RunPod
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Must match the inference engine base model. LoRA adapters are architecture-specific:
// an adapter trained on Mistral-7B only works with Mistral-7B inference.
// The inference service uses mistralai/Mistral-7B-Instruct-v0.2, so training must too.
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending pipeline jobs
    const { data: pendingJobs, error: queryError } = await supabase
      .from('pipeline_training_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const job of pendingJobs || []) {
      try {
        // Update status to queued
        await supabase
          .from('pipeline_training_jobs')
          .update({ status: 'queued', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        // Get signed URL for dataset (valid for 1 hour)
        let datasetUrl = '';
        if (job.dataset_file_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('training-files')
            .createSignedUrl(job.dataset_file_path, 3600); // 1 hour expiry
          
          if (signedUrlError) {
            throw new Error(`Failed to get signed URL: ${signedUrlError.message}`);
          }
          datasetUrl = signedUrlData.signedUrl;
        } else {
          // Try to get dataset path from datasets table
          const { data: dataset, error: datasetError } = await supabase
            .from('datasets')
            .select('storage_path, storage_bucket')
            .eq('id', job.dataset_id)
            .single();
          
          if (datasetError || !dataset) {
            throw new Error(`Dataset not found: ${job.dataset_id}`);
          }
          
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from(dataset.storage_bucket || 'training-files')
            .createSignedUrl(dataset.storage_path, 3600);
          
          if (signedUrlError) {
            throw new Error(`Failed to get signed URL: ${signedUrlError.message}`);
          }
          datasetUrl = signedUrlData.signedUrl;
        }

        // Submit to RunPod with correct format expected by handler.py
        const gpuApiUrl = Deno.env.get('GPU_CLUSTER_API_URL');
        const gpuApiKey = Deno.env.get('GPU_CLUSTER_API_KEY');

        if (!gpuApiUrl || !gpuApiKey) {
          throw new Error(
            `Missing RunPod env vars — GPU_CLUSTER_API_URL=${gpuApiUrl ? 'set' : 'MISSING'}, GPU_CLUSTER_API_KEY=${gpuApiKey ? 'set' : 'MISSING'}`
          );
        }

        const runpodResponse = await fetch(
          `${gpuApiUrl}/run`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gpuApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: {
                job_id: job.id,
                dataset_url: datasetUrl,
                hyperparameters: {
                  base_model: BASE_MODEL,
                  learning_rate: job.learning_rate,
                  batch_size: job.batch_size,
                  epochs: job.epochs,
                  rank: job.rank,
                  alpha: job.alpha || 32,
                  dropout: job.dropout || 0.05,
                },
                gpu_config: {
                  type: job.gpu_type || 'NVIDIA A40',
                  count: job.gpu_count || 1,
                },
              },
            }),
          }
        );

        // Capture raw text first so we can log the actual RunPod response on error
        const runpodText = await runpodResponse.text();
        let runpodData: any;
        try {
          runpodData = JSON.parse(runpodText);
        } catch {
          throw new Error(
            `RunPod returned non-JSON response (HTTP ${runpodResponse.status}) to ${gpuApiUrl}/run — ` +
            `body: ${runpodText.slice(0, 500) || '(empty)'}`
          );
        }

        if (runpodData.id) {
          // Update with RunPod job ID
          await supabase
            .from('pipeline_training_jobs')
            .update({
              status: 'initializing',
              runpod_job_id: runpodData.id,
              runpod_endpoint_id: Deno.env.get('GPU_CLUSTER_API_URL')?.split('/').pop(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          results.push({ jobId: job.id, runpodId: runpodData.id, status: 'submitted' });
        } else {
          throw new Error(runpodData.error || 'Failed to submit to RunPod');
        }
      } catch (jobError) {
        console.error(`Failed to process job ${job.id}:`, jobError);
        
        await supabase
          .from('pipeline_training_jobs')
          .update({
            status: 'failed',
            error_message: jobError instanceof Error ? jobError.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'failed', error: String(jobError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
