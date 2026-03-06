# Docker Worker + Edge Functions Deployment Instructions

**Date**: January 2, 2026  
**Purpose**: Step-by-step instructions for returning model file URLs from Docker worker and deploying Edge Functions

---

## Part 1: Docker Worker - Return Model File URLs

### Step 1: Locate Your Docker Worker Code

1. Open your terminal
2. Navigate to your Docker worker repository (wherever `brighthub/brightrun-trainer:v1` code is stored)
3. Locate the main handler file (typically `handler.py`, `main.py`, or `rp_handler.py`)

### Step 2: Install Required Python Packages

1. Open your `requirements.txt` or `Dockerfile`
2. Add these lines if not present:
   ```
   boto3
   python-dotenv
   ```
3. Save the file

### Step 3: Create S3 API Keys in RunPod Console

1. Go to https://console.runpod.io/
2. Click **Settings** in left sidebar
3. Scroll to **S3 API Keys** section
4. Click **Create an S3 API key**
5. Enter name: `lora-model-storage`
6. Click **Create**
7. **Save immediately** (displayed only once):
   - Access Key ID (format: `user_***`)
   - Secret Access Key (format: `rps_***`)

### Step 4: Add S3 Credentials to RunPod Template

1. Go to https://console.runpod.io/serverless
2. Click your endpoint `ei82ickpenoqlp`
3. Click **Edit Template** or **Edit Endpoint**
4. Scroll to **Environment Variables** section
5. Add these variables:
   ```
   S3_ENDPOINT_URL=https://s3api-eu-ro-1.runpod.io
   S3_ACCESS_KEY_ID=<your-access-key-from-step-3>
   S3_SECRET_ACCESS_KEY=<your-secret-key-from-step-3>
   NETWORK_VOLUME_ID=4jw1fcocwl
   ```
6. To find network volume ID:
   - Go to https://console.runpod.io/storage
   - Find your 240GB volume in EU-RO-1
   - Copy the ID (format: `xxxxx-xxxxx-xxxxx`)
7. Click **Save**

### Step 5: Add S3 Upload Code to Handler

1. Open your handler file (e.g., `handler.py`)
2. Add imports at top:
   ```python
   import boto3
   import os
   import json
   from pathlib import Path
   ```

3. Add this function after imports:
   ```python
   def upload_model_to_s3(job_id, model_dir):
       """Upload model files to RunPod S3 and return signed URLs"""
       s3_client = boto3.client(
           's3',
           endpoint_url=os.environ.get('S3_ENDPOINT_URL'),
           aws_access_key_id=os.environ.get('S3_ACCESS_KEY_ID'),
           aws_secret_access_key=os.environ.get('S3_SECRET_ACCESS_KEY')
       )
       
       bucket_name = os.environ.get('NETWORK_VOLUME_ID')
       model_files = {}
       
       # Find all model files
       model_path = Path(model_dir)
       file_patterns = ['*.bin', '*.json', 'training_args.bin', 'adapter_*']
       
       for pattern in file_patterns:
           for file_path in model_path.glob(pattern):
               s3_key = f"models/{job_id}/{file_path.name}"
               
               # Upload file
               s3_client.upload_file(
                   str(file_path),
                   bucket_name,
                   s3_key
               )
               
               # Generate presigned URL (24 hours)
               url = s3_client.generate_presigned_url(
                   'get_object',
                   Params={
                       'Bucket': bucket_name,
                       'Key': s3_key
                   },
                   ExpiresIn=86400  # 24 hours
               )
               
               model_files[file_path.name] = url
       
       return model_files
   ```

### Step 6: Modify Your Handler Return Statement

1. Find your main handler function (e.g., `def handler(job):` or `def run(job):`)
2. Locate where training completes and model is saved
3. Find your return statement (currently returns something like `{"status": "success"}`)
4. Replace with this pattern:

   ```python
   def handler(job):
       # ... existing training code ...
       
       # After training completes and model is saved
       job_id = job['input']['job_id']
       model_save_path = "/workspace/output"  # or wherever you save models
       
       # Upload model files and get URLs
       model_files = upload_model_to_s3(job_id, model_save_path)
       
       # Return with model file URLs
       return {
           "status": "success",
           "model_files": model_files,
           "model_metadata": {
               "base_model": job['input'].get('base_model', 'mistralai/Mistral-7B-v0.1'),
               "lora_rank": job['input']['hyperparameters'].get('lora_rank', 16),
               "final_loss": final_loss  # from your training metrics
           },
           "progress": 100,
           "current_epoch": total_epochs,
           "current_step": total_steps
       }
   ```

### Step 7: Build New Docker Image

1. Open terminal in Docker worker directory
2. Run:
   ```bash
   docker build -t brighthub/brightrun-trainer:v2 .
   ```
3. Wait for build to complete

### Step 8: Push Docker Image to Docker Hub

1. Login to Docker Hub:
   ```bash
   docker login
   ```
2. Enter your Docker Hub credentials
3. Push image:
   ```bash
   docker push brighthub/brightrun-trainer:v2
   ```
4. Wait for upload to complete

### Step 9: Update RunPod Template

1. Go to https://console.runpod.io/serverless
2. Click your endpoint `ei82ickpenoqlp`
3. Click **Edit Template** or **Edit Endpoint**
4. Find **Container Image** field
5. Change from `brighthub/brightrun-trainer:v1` to `brighthub/brightrun-trainer:v2`
6. Click **Save**

### Step 10: Wait for Workers to Update

1. Go to https://console.runpod.io/serverless
2. Click your endpoint `ei82ickpenoqlp`
3. Click **Workers** tab
4. Watch workers status:
   - Current workers will show "Terminating"
   - New workers will show "Initializing"
   - Wait until at least 1 worker shows "Running" or "Idle"
5. This takes 2-5 minutes

### Step 11: Test Model File Upload

1. Submit a test training job from your application
2. Wait for job to complete
3. Go to https://console.runpod.io/serverless
4. Click your endpoint → **Requests** tab
5. Find your job → Click to expand
6. Check **Output** section - should see:
   ```json
   {
     "status": "success",
     "model_files": {
       "adapter_model.bin": "https://...",
       "adapter_config.json": "https://..."
     }
   }
   ```
7. Copy one URL and paste in browser - should download file

---

## Part 2: Deploy Edge Functions

### Step 12: Verify Supabase CLI Installation

1. Open terminal
2. Run:
   ```bash
   supabase --version
   ```
3. If shows version number, skip to Step 13
4. If error "command not found":
   ```bash
   winget install Supabase.cli
   ```
5. Close and reopen terminal
6. Run `supabase --version` again to verify

### Step 13: Navigate to Project Directory

1. Open terminal
2. Run:
   ```bash
   cd C:\Users\james\Master\BrightHub\BRun\v4-show
   ```
3. Verify you're in correct directory:
   ```bash
   dir
   ```
4. Should see `supabase` folder in list

### Step 14: Link to Supabase Project

1. Run:
   ```bash
   supabase link --project-ref hqhtbxlgzysfbekexwku
   ```
2. When prompted for database password, press Enter (uses service role key from .env.local)
3. Wait for "Linked successfully" message

### Step 15: Set Edge Function Secrets

1. Run:
   ```bash
   supabase secrets set GPU_CLUSTER_API_KEY=YOUR_RUNPOD_API_KEY
   ```
2. Wait for confirmation
3. Run:
   ```bash
   supabase secrets set GPU_CLUSTER_ENDPOINT=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID
   ```
4. Wait for confirmation

### Step 16: Verify Secrets Are Set

1. Run:
   ```bash
   supabase secrets list
   ```
2. Should show:
   ```
   GPU_CLUSTER_API_KEY
   GPU_CLUSTER_ENDPOINT
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   ```

### Step 17: Deploy process-training-jobs Function

1. Run:
   ```bash
   supabase functions deploy process-training-jobs
   ```
2. Wait for deployment (30-60 seconds)
3. Should show:
   ```
   Deployed Function process-training-jobs on region [region]
   ```

### Step 18: Deploy create-model-artifacts Function

1. Run:
   ```bash
   supabase functions deploy create-model-artifacts
   ```
2. Wait for deployment (30-60 seconds)
3. Should show:
   ```
   Deployed Function create-model-artifacts on region [region]
   ```

### Step 19: Verify Functions Are Deployed

1. Go to https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku
2. Click **Edge Functions** in left sidebar
3. Should see both functions listed:
   - `process-training-jobs`
   - `create-model-artifacts`
4. Both should show green "Active" status

### Step 20: Check Function Logs

1. In terminal, run:
   ```bash
   supabase functions logs process-training-jobs
   ```
2. Press Ctrl+C to stop
3. Run:
   ```bash
   supabase functions logs create-model-artifacts
   ```
4. Press Ctrl+C to stop
5. If no errors shown, deployment successful

### Step 21: Verify Cron Jobs Are Running

1. Go to https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku
2. Click **Database** in left sidebar
3. Click **Extensions** tab
4. Find `pg_cron` - should be enabled
5. Click **SQL Editor** in left sidebar
6. Run:
   ```sql
   SELECT * FROM cron.job WHERE command LIKE '%process-training-jobs%' OR command LIKE '%create-model-artifacts%';
   ```
7. Should show 2 rows with schedule `*/30 * * * * *` (every 30 seconds)

### Step 22: Test End-to-End Flow

1. Open your application: https://your-app-url.vercel.app
2. Go to **Training** section
3. Click **New Training Job**
4. Select a dataset
5. Configure training parameters
6. Click **Start Training**
7. Wait 30-60 seconds
8. Check job status - should change from "Queued" to "Queued on GPU"
9. Monitor progress over next few minutes
10. When complete, check for **Download Model** button

### Step 23: Verify Model Files Downloaded

1. After job shows "Completed"
2. Click **Download Model** button
3. Should download ZIP file
4. Extract ZIP file
5. Should contain:
   - `adapter_model.bin`
   - `adapter_config.json`
   - `training_args.bin`
   - Other model files

---

## Troubleshooting Commands

### If Docker Worker Not Returning URLs:
```bash
# Check RunPod logs
# Go to https://console.runpod.io/serverless
# Click endpoint → Workers tab → Click worker → View Logs
```

### If Edge Functions Not Running:
```bash
# View process-training-jobs logs
supabase functions logs process-training-jobs --tail 50

# View create-model-artifacts logs  
supabase functions logs create-model-artifacts --tail 50
```

### If Jobs Stuck in "Queued":
```bash
# Check RunPod endpoint status
# Go to https://console.runpod.io/serverless
# Click endpoint → should show at least 1 worker "Running" or "Idle"
```

### If Model Files Not Appearing in Supabase:
```bash
# Check Supabase Storage
# Go to https://supabase.com/dashboard/project/hqhtbxlgzysfbekexwku
# Click Storage → lora-models bucket
# Should see folders with job IDs
```

---

**Deployment Complete**
