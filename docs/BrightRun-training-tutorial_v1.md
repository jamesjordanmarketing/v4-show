# BrightRun LoRA Training Platform - Complete Tutorial

**Version:** 1.0  
**Last Updated:** December 30, 2025  
**Platform:** Bright Run LoRA Training Pipeline

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Part 1: Migrating Existing Datasets](#part-1-migrating-existing-datasets)
4. [Part 2: Uploading New Datasets](#part-2-uploading-new-datasets)
5. [Part 3: Configuring Training Jobs](#part-3-configuring-training-jobs)
6. [Part 4: Monitoring Training Progress](#part-4-monitoring-training-progress)
7. [Part 5: Downloading Trained Models](#part-5-downloading-trained-models)
8. [Part 6: Cost Management](#part-6-cost-management)
9. [Training Time & Cost Estimates](#training-time--cost-estimates)
10. [Dashboard Features Reference](#dashboard-features-reference)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

The BrightRun LoRA Training Platform enables you to fine-tune large language models using your custom training data. This platform provides end-to-end workflow from dataset upload to trained model delivery.

**Key Features:**
- ✅ Automated dataset validation
- ✅ GPU-accelerated training on RunPod infrastructure
- ✅ Real-time progress monitoring
- ✅ Automatic cost tracking
- ✅ Secure model artifact delivery
- ✅ Multiple training presets (Conservative, Balanced, Aggressive)

---

## Getting Started

### Access the Platform

1. **Login:** Navigate to `/signin`
2. **Dashboard:** You'll be redirected to `/dashboard` after login

### Navigation Overview

**Main Dashboard Sections:**
- **Datasets** (`/datasets`) - Manage training datasets
- **Training** (`/training`) - Configure and monitor training jobs
- **Models** (`/models`) - Download trained model artifacts  
- **Costs** (`/costs`) - View training cost analytics
- **Notifications** - Training status alerts

---

## Part 1: Migrating Existing Datasets

If you have existing training files from the conversation generation module, you can migrate them to the LoRA training datasets.

### Step 1: Navigate to Datasets Page

1. From dashboard, click **"LoRA Datasets"** button (or navigate to `/datasets`)

### Step 2: Import from Training File

**Option A: Using the Import API (Programmatic)**

```bash
curl -X POST "https://your-domain.com/api/datasets/import-from-training-file" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "training_file_id": "existing-training-file-uuid",
    "dataset_name": "My Imported Dataset",
    "description": "Dataset imported from training files module"
  }'
```

**Option B: Using the UI (if Import button is available)**

1. On `/datasets` page, look for **"Import from Training File"** button
2. Select your existing training file
3. Enter dataset name and description
4. Click **"Import"**

### Step 3: Wait for Validation

- The dataset will automatically be copied from `training-files` bucket to `lora-datasets` bucket
- Validation runs automatically (check status every 1 minute)
- Status changes: `uploading` → `validating` → `ready`
- You'll receive a notification when validation completes

### Step 4: Verify Dataset is Ready

On the datasets page, you'll see:
- ✅ **Status:** `ready`
- ✅ **Training Ready:** `true`
- 📊 **Statistics:** Total training pairs, tokens, conversations

---

## Part 2: Uploading New Datasets

If you're uploading fresh training data (not from training files module):

### Step 1: Navigate to Upload Page

1. From `/datasets`, click **"Upload Dataset"** button
2. Or navigate directly to `/datasets/new`

### Step 2: Prepare Your Dataset

**Required Format:** BrightRun LoRA v4 (JSONL)

Each line must be valid JSON with this structure:
```json
{
  "conversations": [
    {
      "role": "user",
      "content": "Question or prompt"
    },
    {
      "role": "assistant",
      "content": "Model response"
    }
  ]
}
```

**File Requirements:**
- Format: `.jsonl` (JSON Lines)
- Max size: 500 MB
- Each conversation must have at least 2 turns
- Recommended: 100+ training pairs for meaningful training

### Step 3: Upload Dataset

1. **Name:** Enter descriptive name (e.g., "Customer Support Q&A")
2. **Description:** Optional details about the dataset
3. **Format:** Select `brightrun_lora_v4`
4. **File:** Click "Choose File" and select your `.jsonl` file
5. Click **"Upload Dataset"**

### Step 4: Monitor Upload

- Progress bar shows upload status
- After upload completes, automatic validation begins
- Wait 1-2 minutes for validation
- Check notifications for completion alert

### Step 5: Review Validation Results

Visit `/datasets/[dataset-id]` to see:
- ✅ Validation status
- 📊 Dataset statistics (training pairs, tokens, avg turns per conversation)
- ⚠️ Validation errors (if any)
- 📋 Sample data preview

---

## Part 3: Configuring Training Jobs

Once you have a `ready` dataset, you can configure a training job.

### Step 1: Navigate to Training Configuration

**From Datasets Page:**
1. Find your ready dataset
2. Click on the dataset card
3. Click **"Start Training"** button
4. You'll be redirected to `/training/configure?datasetId=[id]`

**Direct Navigation:**
- Go to `/training/configure`
- Select dataset from dropdown

### Step 2: Choose Training Preset

**Three Presets Available:**

#### 🐢 Conservative (Fast, Lower Cost)
- **Use when:** Quick experiments, small datasets, testing
- **Learning Rate:** 0.0001
- **Batch Size:** 4
- **Epochs:** 3
- **LoRA Rank:** 8
- **Estimated Time:** ~30 min - 2 hours (depending on dataset size)
- **Cost Estimate:** $1.25 - $5.00

#### ⚖️ Balanced (Recommended)
- **Use when:** Production training, medium datasets, balanced quality
- **Learning Rate:** 0.0002
- **Batch Size:** 8
- **Epochs:** 5
- **LoRA Rank:** 16
- **Estimated Time:** ~1-4 hours
- **Cost Estimate:** $2.50 - $10.00

#### 🚀 Aggressive (High Quality, Higher Cost)
- **Use when:** Maximum quality, large datasets, production-critical
- **Learning Rate:** 0.0003
- **Batch Size:** 16
- **Epochs:** 10
- **LoRA Rank:** 32
- **Estimated Time:** ~2-8 hours
- **Cost Estimate:** $5.00 - $20.00

### Step 3: Select GPU Configuration

**GPU Options:**

| GPU Type | Memory | Cost/Hour | Best For |
|----------|--------|-----------|----------|
| **NVIDIA A100 40GB** | 40 GB | $2.50 | Small-medium datasets (\u003c50k pairs) |
| **NVIDIA A100 80GB** | 80 GB | $3.50 | Medium-large datasets (50k-200k pairs) |
| **NVIDIA H100** | 80 GB | $5.00 | Large datasets (\u003e200k pairs), fastest training |

### Step 4: Review Cost Estimate

- Real-time cost calculation updates as you change settings
- Shows **Estimated Total Cost** based on:
  - Selected preset epochs
  - GPU cost per hour
  - Estimated training duration
  - Dataset size

**Example Cost Estimate:**
```
Dataset: 8,000 training pairs (12 conversations)
Preset: Balanced
GPU: NVIDIA A100 40GB ($2.50/hour)
Estimated Duration: 45 minutes
Estimated Cost: $1.85
```

### Step 5: Submit Training Job

1. Review all settings
2. Click **"Start Training"** button
3. Confirm on popup dialog
4. Job enters `queued` status
5. You'll be redirected to `/training/jobs/[jobId]`

---

## Part 4: Monitoring Training Progress

### Step 1: Navigate to Job Monitor

- After submitting job: Auto-redirected to `/training/jobs/[jobId]`
- Or from notifications: Click notification link
- Or from dashboard: Click **"Training Jobs"** → select job

### Step 2: Understanding Job Status

**Status Progression:**
1. **Queued** (⏳) - Waiting for GPU resources
2. ##Initializing** (🔄) - Loading dataset, preparing environment
3. **Running** (🚀) - Training in progress
4. **Completed** (✅) - Training finished successfully
5. **Failed** (❌) - Error occurred (check error message)
6. **Cancelled** (🛑) - Manually stopped

### Step 3: Real-Time Metrics

While training (`running` status), you'll see live updates every 30 seconds:

**Progress Indicators:**
- 📊 **Overall Progress:** 0-100%
- 📈 **Current Epoch:** e.g., "Epoch 3 of 5"
- 🔢 **Current Step:** e.g., "Step 450 of 1000"
- ⏱️ **Estimated Completion:** e.g., "~45 minutes remaining"

**Training Metrics:**
- 📉 **Training Loss:** Lower is better (should decrease over time)
- 📉 **Validation Loss:** Model performance on held-out data
- 🎓 **Learning Rate:** Current learning rate value
- 🚄 **Throughput:** Tokens/second
- 🎮 **GPU Utilization:** Percentage (should be 80-100%)

**Cost Tracking:**
- 💰 **Current Cost:** Updates in real-time based on elapsed time
- 💵 **Estimated Total:** Final expected cost

### Step 4: Viewing Metrics History

- Scroll down to **"Training Metrics Chart"**
- See loss curves over time
- Identify if model is converging properly
- Download metrics as CSV (if available)

### Step 5: Cancel Training (if needed)

- Click **"Cancel Training"** button
- Confirm cancellation
- Current cost will be charged (no refund for partial training)
- Status changes to `cancelled`

---

## Part 5: Downloading Trained Models

### Step 1: Navigate to Models Page

1. From dashboard, click **"Trained Models"** button
2. Or navigate to `/models`

### Step 2: Find Your Model

- Models list shows all completed training jobs
- Filter by:
  - Status: Completed
  - Date: Sort by newest
  - Search by name

### Step 3: View Model Details

Click on a model card to see:
- 📊 **Quality Metrics:**
  - Final training loss
  - Final validation loss
  - Best epoch
  - Convergence score (1-5 stars rating)
- 📝 **Training Summary:**
  - Total epochs completed
  - Total training duration
  - GPU type used
  - Final cost
- ⚙️ **Configuration:**
  - Hyperparameters used
  - Base model
  - Dataset name

### Step 4: Download Model Files

Click **"Download Model"** button to get secure download links for:

**Artifact Files:**
1. **`adapter_model.bin`** - LoRA adapter weights (main file)
2. **`adapter_config.json`** - LoRA configuration
3. **`training_logs.txt`** - Complete training logs
4. **`metrics_chart.png`** (optional) - Loss curves visualization

**Download URLs:**
- Presigned URLs valid for 1 hour
- Secure, temporary access
- Download all files to same directory

### Step 5: Use Your Model

**Loading LoRA Adapter:**
```python
from transformers import AutoModelForCausalLM
from peft import PeftModel

# Load base model
base_model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1")

# Load LoRA adapter
model = PeftModel.from_pretrained(base_model, "path/to/downloaded/adapter")

# Use for inference
model.generate(...)
```

---

## Part 6: Cost Management

### View Cost Analytics

Navigate to `/costs` to see:

**Cost Dashboard:**
- 📊 **Total Spend:** All-time training costs
- 📅 **This Month:** Current billing period
- 📈 **Trend Chart:** Daily/weekly/monthly spending

**Cost Breakdown:**
- By training job
- By GPU type
- By date range

**Filters:**
- Time period: Today, This Week, This Month, Custom Range
- Job status: All, Completed, Failed
- Export as CSV

### Cost Optimization Tips

1. **Use Conservative preset** for testing and iteration
2. **Start with A100 40GB** unless dataset is very large
3. **Validate datasets** before training (catch errors early)
4. **Monitor early epochs:** If loss isn't decreasing, cancel and adjust hyperparameters
5. **Batch multiple datasets:** Train during off-peak hours if possible

---

## Training Time & Cost Estimates

### Small Dataset Example
**Dataset:** 8,000 training pairs (12 conversations)  

| Preset | GPU | Duration | Cost |
|--------|-----|----------|------|
| Conservative | A100 40GB | ~30 min | $1.25 |
| Balanced | A100 40GB | ~45 min | $1.85 |
| Aggressive | A100 40GB | ~90 min | $3.75 |

### Medium Dataset Example
**Dataset:** 50,000 training pairs (100 conversations)

| Preset | GPU | Duration | Cost |
|--------|-----|----------|------|
| Conservative | A100 40GB | ~1.5 hours | $3.75 |
| Balanced | A100 40GB | ~2.5 hours | $6.25 |
| Balanced | A100 80GB | ~2 hours | $7.00 |
| Aggressive | A100 80GB | ~4 hours | $14.00 |

### Large Dataset Example
**Dataset:** 200,000 training pairs (500 conversations)

| Preset | GPU | Duration | Cost |
|--------|-----|----------|------|
| Conservative | A100 80GB | ~3 hours | $10.50 |
| Balanced | A100 80GB | ~5 hours | $17.50 |
| Balanced | H100 | ~3.5 hours | $17.50 |
| Aggressive | H100 | ~7 hours | $35.00 |

**Factors Affecting Training Time:**
- Dataset size (training pairs, tokens)
- Sequence length (longer conversations = slower)
- Batch size (larger = faster, but needs more memory)
- GPU type (H100 \u003e A100 80GB \u003e A100 40GB)
- Number of epochs

---

## Dashboard Features Reference

### Homepage (`/dashboard`)

**Quick Actions:**
- ✨ **Generate Conversations** - Create training data
- 📁 **View Conversations** - Browse conversation library
- 📂 **Training Files** - Manage aggregated training files
- 📊 **LoRA Datasets** - Access LoRA training datasets (NEW)
- 🚀 **Start Training** - Configure new training job (NEW)
- 📦 **View Models** - Download trained models (NEW)
- 📈 **View Costs** - Training cost analytics (NEW)

### Datasets Page (`/datasets`)

**Features:**
- 🔍 **Search:** Find datasets by name
- 🏷️ **Filter by Status:** All, Uploading, Validating, Ready, Error
- 📊 **Statistics Summary:**
  - Total datasets count
  - Ready for training count
  - Currently validating count
  - Error count
- ➕ **Upload Dataset:** Add new training data
- 📥 **Import from Training File:** Migrate existing training files
- 🗑️ **Delete Dataset:** Remove unused datasets
- 📋 **View Details:** See validation results and sample data

### Training Configuration Page (`/training/configure`)

**Features:**
- 📂 **Dataset Selector:** Choose dataset to train on
- 🎛️ **Preset Selector:** Conservative, Balanced, Aggressive, Custom
- 🎮 **GPU Selector:** A100 40GB, A100 80GB, H100
- 🔧 **Advanced Settings** (Custom preset):
  - Learning rate
  - Batch size
  - Number of epochs
  - LoRA rank/alpha/dropout
- 💰 **Live Cost Estimate:** Updates as you change settings
- 🚀 **Start Training:** Submit job to queue

### Training Jobs Page (`/training/jobs`)

**Features:**
- 📋 **Jobs List:** All training jobs (current and past)
- 🏷️ **Filter by Status:** Queued, Running, Completed, Failed, Cancelled
- 📊 **Job Details:**
  - Real-time progress (if running)
  - Training metrics charts
  - Cost tracking
  - Error messages (if failed)
- 🛑 **Cancel Job:** Stop running jobs
- 🔄 **Retry Job:** Resubmit failed jobs (if available)

### Models Page (`/models`)

**Features:**
- 📦 **Models Library:** All trained model artifacts
- 🔍 **Search:** Find models by name or dataset
- 📊 **Quality Ratings:** 1-5 star convergence scores
- 📥 **Download:** Get secure download URLs
- 📋 **View Details:**
  - Quality metrics
  - Training summary
  - Hyperparameters used
- 🗑️ **Delete Model:** Remove old models

### Costs Page (`/costs`)

**Features:**
- 📊 **Total Spend Dashboard**
- 📈 **Trend Charts:** Daily, weekly, monthly
- 🏷️ **Filter by Date:** Today, This Week, This Month, Custom
- 💰 **Cost Breakdown:**
  - By training job
  - By GPU type
  - By status
- 📥 **Export CSV:** Download cost data

### Notifications

**Notification Types:**
- 📊 **Dataset Validated:** Dataset is ready for training
- 🚀 **Job Started:** Training has begun
- ✅ **Job Completed:** Training finished successfully
- ❌ **Job Failed:** Training encountered error
- 💰 **Cost Alert:** Spending threshold reached (if configured)

**Notification Actions:**
- Mark as read
- Click to navigate to relevant page
- View notification history

---

## Troubleshooting

### Dataset Upload Issues

**Problem:** Upload fails or gets stuck

**Solutions:**
1. Check file size (\u003c500MB limit)
2. Verify file format (must be `.jsonl`)
3. Validate JSON structure (each line must be valid JSON)
4. Check internet connection
5. Try uploading smaller batch first

### Dataset Validation Errors

**Problem:** Dataset status shows `error`

**Solutions:**
1. Click on dataset to view validation errors
2. Common issues:
   - Invalid JSON syntax
   - Missing required fields (`conversations`)
   - Empty conversations
   - Conversations with only 1 turn
   - Missing `role` or `content` fields
3. Fix errors in your source file
4. Re-upload corrected dataset

### Training Job Stuck in "Queued"

**Problem:** Job doesn't start training

**Solutions:**
1. Check if GPU cluster is available (may be at capacity)
2. Wait 5-10 minutes (jobs process every 30 seconds)
3. Check notifications for error messages
4. Verify dataset is `ready` status
5. Check Edge Function logs (admin only)

### Training Job Failed

**Problem:** Status shows `failed`

**Solutions:**
1. View error message on job details page
2. Common issues:
   - Dataset file inaccessible (re-upload dataset)
   - GPU out of memory (reduce batch size or use larger GPU)
   - Invalid hyperparameters (use preset instead of custom)
   - GPU cluster connection timeout (retry job)
3. If error persists, contact support with job ID

### Model Download Issues

**Problem:** Download links don't work

**Solutions:**
1. Check if links have expired (1 hour limit)
2. Request new download links
3. Ensure model status is `completed`
4. Check network/firewall settings
5. Try different browser

### High Training Costs

**Problem:** Costs are higher than expected

**Solutions:**
1. Review cost analytics (`/costs`) to identify expensive jobs
2. Use Conservative preset for testing
3. Start with smaller datasets to validate approach
4. Use A100 40GB instead of H100 for small/medium datasets
5. Cancel jobs early if loss isn't decreasing
6. Set up cost alerts (if available)

---

## Support

**Need Help?**
- 📧 Email: support@brighthubai.com
- 📚 Documentation: [GitHub Repo](https://github.com/jamesjordanmarketing/v4-show)
- 🐛 Report Issues: GitHub Issues
- 💬 Community: Discord (if available)

**Provide When Reporting Issues:**
- Job ID or Dataset ID
- Error messages (screenshots)
- Steps to reproduce
- Browser/device information

---

**Happy Training! 🚀**

