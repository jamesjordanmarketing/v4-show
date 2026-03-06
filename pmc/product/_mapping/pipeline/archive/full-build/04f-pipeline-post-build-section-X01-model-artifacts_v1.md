# Model Artifacts - How It Works

## What Was Updated

`supabase/functions/create-model-artifacts/index.ts` now:
1. Calls RunPod `/status/{job_id}` to get completed job
2. Extracts model files from `output.model_files` or `output.download_urls`
3. Downloads each file and uploads to Supabase Storage (`lora-models` bucket)
4. Creates artifact record with download links

## Deploy Edge Function

```bash
npx supabase functions deploy create-model-artifacts
```

## CRITICAL: Docker Worker Must Return Model Files

Your RunPod Docker worker **must include model file URLs in its output**. When training completes, return:

```json
{
  "status": "success",
  "model_files": {
    "adapter_model.bin": "https://signed-url-to-file",
    "adapter_config.json": "https://signed-url-to-file",
    "training_args.bin": "https://signed-url-to-file"
  },
  "model_metadata": {
    "base_model": "mistralai/Mistral-7B-v0.1",
    "lora_rank": 16,
    "final_loss": 0.45
  },
  "progress": 100,
  "current_epoch": 3,
  "current_step": 1500
}
```

## Where to Save Model Files

**Option 1: Network Volume (Recommended)**
- Save to `/runpod-volume/models/{job_id}/`
- Generate signed URLs using RunPod S3 API
- Return URLs in output

**Option 2: External S3**
- Upload to your own S3/R2/Wasabi bucket
- Return presigned URLs in output

## Testing

1. Deploy the function
2. Wait 30 seconds for cron to run
3. Check Supabase Storage → `lora-models` bucket
4. Should see folder with your model files
5. Go to `/training/jobs/{id}` - should now show download button

## Troubleshooting

**No download button?**
Check Supabase logs:
```bash
npx supabase functions logs create-model-artifacts
```

Look for:
- "No model files found in job output" → Worker didn't return files
- "Failed to download {file}" → URLs are invalid/expired
