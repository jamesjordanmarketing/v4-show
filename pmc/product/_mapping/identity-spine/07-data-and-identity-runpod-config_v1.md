# BRun RunPod Configuration — Diagnosis & Fix Instructions

**Document:** `07-data-and-identity-runpod-config_v1.md`  
**Date:** 2026-02-24  
**Status:** Active — Requires Human Action on RunPod

---

## Part 1 — What Actually Happened (Full Diagnosis)

### 1.1 The Only Successful Training Job

The only adapter that ever completed is `job 6fd5ac79-c54b-4927-8138-ca159108bcae` (Jan 13, 2026):

```
job_name:             Batch-6-thru-12_v1
runpod_endpoint_id:   ei82ickpenoqlp
runpod_job_id:        7c31ab73-e014-4711-8836-d5cf8e5867dc-u1
adapter_file_path:    lora-models/adapters/6fd5ac79...tar.gz
created_at:           2026-01-13T22:20:52Z
completed_at:         2026-01-13T22:49:41Z  (29 minutes)
```

That job used `BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'`. The worker downloaded Mistral-7B (~14 GB) fresh from HuggingFace each time. **The network volume was never used for this job.**

### 1.2 The Legacy System Was Never Used

- The `training_jobs` table (legacy path from `lora-lookback`) is **empty** — zero rows ever
- The `process-training-jobs` Edge Function (pg_cron job #4) has been running every minute but has never dispatched a job because `training_jobs` is always empty
- The `lora-lookback` codebase was a research/exploration snapshot, not a deployed system

### 1.3 The Network Volume Has Always Been Misconfigured

Network volume `4jw1fcocwl` was never correctly wired up. Evidence:

| Item | Configured Value | Actual Reality |
|------|-----------------|----------------|
| `MODEL_PATH` env var on RunPod | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` | This path does NOT exist on the volume |
| `HF_HOME` env var on RunPod | `/workspace/.cache/huggingface` | Model is at `/workspace/huggingface-cache/` (different path) |
| `TRANSFORMERS_CACHE` env var | `/workspace/models` | Directory does not exist |
| Qwen model actual location | — | `/workspace/huggingface-cache/hub/models--Qwen--Qwen3-Next-80B-A3B-Instruct/snapshots/<hash>/` |

The volume has had Qwen downloaded to it since January (Jan 3 and Jan 18) but the env vars never matched the actual filesystem layout, so `os.path.exists(MODEL_PATH)` always returned `False`.

### 1.4 How the Feb 24 Failure Happened

In this session, `BASE_MODEL` was updated from `mistralai/Mistral-7B-Instruct-v0.2` to `Qwen/Qwen3-Next-80B-A3B-Instruct` (based on the `MODEL_PATH` env var). This caused:

1. `os.path.exists('/workspace/models/Qwen3-Next-80B-A3B-Instruct')` → `False`
2. Worker fell back to downloading Qwen (80B model, ~40 files × 4 GB each)
3. The network volume's CAS storage service hit a disk/quota limit
4. `CAS service error: IO Error: No space left on device (os error 28)`

---

## Part 2 — Two Paths Forward

### Path A — Revert to Mistral (Immediate, Proven)

Use `mistralai/Mistral-7B-Instruct-v0.2` as before. Worker downloads it fresh (~14 GB) from HuggingFace each job. No network volume dependency. This is what worked in January.

**Pro:** Works immediately, no RunPod configuration changes needed.  
**Con:** Downloading 14 GB at the start of every training job (~5–10 min overhead). Not using the Qwen model you have invested in.

### Path B — Fix Qwen Setup (Correct Long-Term)

Create a symlink on the volume so `MODEL_PATH` resolves correctly. Worker loads Qwen directly from the volume — no download, no disk pressure. Training starts in seconds instead of minutes.

**Pro:** Uses the Qwen model already on the volume. Faster start time for every future job.  
**Con:** Requires one-time setup on a RunPod pod (you already have one open).

---

## Part 3 — Path A: Revert to Mistral (Quick Fix)

### Step A1 — Update Code (two files in `v2-modules`)

**File 1:** `supabase/functions/process-pipeline-jobs/index.ts` — change line 18:
```typescript
// Change FROM:
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
// Change TO:
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
```

**File 2:** `src/inngest/functions/dispatch-training-job.ts` — change the constant near the top:
```typescript
// Change FROM:
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
// Change TO:
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
```

### Step A2 — Deploy Edge Function
```bash
supabase functions deploy process-pipeline-jobs
```

### Step A3 — Push to Vercel and test
Training should complete in ~35–45 minutes (5–10 min download + 29 min training, as before).

---

## Part 4 — Path B: Fix Qwen Setup (Recommended Long-Term)

### Step B1 — Find the Snapshot Hash (in your open pod terminal)

```bash
ls /workspace/huggingface-cache/hub/models--Qwen--Qwen3-Next-80B-A3B-Instruct/snapshots/
```

This will show a single directory with a long hash, e.g.:
```
abc123def456...
```

### Step B2 — Create the Symlink

```bash
SNAPSHOT=$(ls /workspace/huggingface-cache/hub/models--Qwen--Qwen3-Next-80B-A3B-Instruct/snapshots/)
echo "Snapshot: $SNAPSHOT"

mkdir -p /workspace/models

ln -sf \
  "/workspace/huggingface-cache/hub/models--Qwen--Qwen3-Next-80B-A3B-Instruct/snapshots/$SNAPSHOT" \
  "/workspace/models/Qwen3-Next-80B-A3B-Instruct"

echo "Symlink created:"
ls -la /workspace/models/
```

### Step B3 — Verify the symlink resolves to model files

```bash
ls /workspace/models/Qwen3-Next-80B-A3B-Instruct/ | head -10
```

Expected output: `config.json`, `tokenizer_config.json`, `model-*.safetensors`, etc.  
If you see these files the fix is complete.

### Step B4 — Update RunPod Serverless Endpoint Environment Variables

In the RunPod dashboard → Serverless → `brightrun-lora-trainer-qwen` → Edit Endpoint → Environment Variables:

| Variable | Old Value | Correct Value |
|----------|-----------|---------------|
| `MODEL_PATH` | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` | `/workspace/models/Qwen3-Next-80B-A3B-Instruct` ✅ (no change needed after symlink) |
| `HF_HOME` | `/workspace/.cache/huggingface` | `/workspace/huggingface-cache` |
| `TRANSFORMERS_CACHE` | `/workspace/models` | `/workspace/huggingface-cache` |

The `MODEL_PATH` stays the same — the symlink makes it work. Only `HF_HOME` and `TRANSFORMERS_CACHE` need updating (to prevent any future HuggingFace cache operations going to the wrong path).

### Step B5 — Keep BASE_MODEL as Qwen in code (no change needed)

The code already has `BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct'`. This is correct for Path B. No code changes needed.

### Step B6 — Deploy Edge Function
```bash
supabase functions deploy process-pipeline-jobs
```

### Step B7 — Test

Training should now start within seconds of the worker picking up the job. In the RunPod worker log you should see:
```
Using cached model from: /workspace/models/Qwen3-Next-80B-A3B-Instruct
```
instead of `Downloading model from HuggingFace`.

---

## Part 5 — RunPod Endpoint Configuration Reference

### Serverless Endpoint: `brightrun-lora-trainer-qwen`

| Setting | Value |
|---------|-------|
| Endpoint ID | `ei82ickpenoqlp` |
| Docker Image | `brighthub/brightrun-trainer:v19` |
| Network Volume ID | `4jw1fcocwl` |
| Network Volume Mount | `/workspace` |

### Environment Variables (Correct Values for Path B)

```
HF_HOME=/workspace/huggingface-cache
TRANSFORMERS_CACHE=/workspace/huggingface-cache
MODEL_PATH=/workspace/models/Qwen3-Next-80B-A3B-Instruct
SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
S3_ENDPOINT_URL=https://s3api-eu-ro-1.runpod.io
S3_ACCESS_KEY_ID=user_2yeQQngSXy8MEUkSznEQbeoHzf0
S3_SECRET_ACCESS_KEY=rps_9PN2B309M0OWC1BGR1CAVN3YHRN190BMAUN6K6YU1k1cnv
NETWORK_VOLUME_ID=4jw1fcocwl
```

### Supabase Edge Function Secrets (Required)

```bash
supabase secrets set GPU_CLUSTER_API_URL=https://api.runpod.ai/v2/ei82ickpenoqlp
supabase secrets set GPU_CLUSTER_API_KEY=<your-runpod-api-key>
supabase secrets set SUPABASE_URL=https://hqhtbxlgzysfbekexwku.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## Part 6 — Network Volume Layout (Actual State)

```
/workspace/
├── huggingface-cache/
│   └── hub/
│       ├── models--Qwen--Qwen3-Next-80B-A3B-Instruct/    (Jan 3 download)
│       │   ├── blobs/
│       │   ├── refs/
│       │   └── snapshots/
│       │       └── <hash>/     ← ACTUAL MODEL FILES HERE
│       │           ├── config.json
│       │           ├── tokenizer_config.json
│       │           └── model-*.safetensors
│       └── models--qwen--qwen3-next-80b-a3b-instruct/    (Jan 18 download)
│
└── models/                     ← DOES NOT EXIST (must create + symlink)
    └── Qwen3-Next-80B-A3B-Instruct → [symlink to snapshot above]
```

---

## Part 7 — Decision

**Recommendation: Path B (Qwen fix).**

You have the model on the volume already. The symlink is a one-time, two-command fix. After that, every future training job starts in seconds rather than waiting for a 14 GB download. The endpoint name `brightrun-lora-trainer-qwen` makes clear the intent is always to use Qwen.

Path A is the safe fallback if Path B has any issues (e.g., snapshot is incomplete, symlink doesn't resolve correctly on new pods).

---

## Part 8 — pg_cron Summary (All Active Jobs)

Four Supabase pg_cron jobs run every minute. All are active and correctly configured:

| Job ID | Edge Function | Purpose | Status |
|--------|--------------|---------|--------|
| 1 | `validate-datasets` | Validates dataset files | Active, working |
| 2 | `create-model-artifacts` | Post-training artifact creation | Active |
| 4 | `process-training-jobs` | Legacy path (training_jobs table — empty, never used) | Active, harmless |
| 8 | `process-pipeline-jobs` | **Current training dispatch** (pipeline_training_jobs table) | Active, this is the one |

Job #8 is the trigger for all current training jobs. It runs once per minute and picks up any `pending` jobs. The Inngest function (`dispatch-training-job`) added in this session provides an immediate trigger on job creation so you don't have to wait up to 60 seconds for the pg_cron to fire.

---

## Part 9 — February 24 Follow-Up: Mistral is Required, Qwen Must Be Removed

**Date:** 2026-02-24 (Session 5)

### 9.1 The Key Insight: Adapter Compatibility is Architecture-Locked

Yes — this is correct and it is the decisive point:

> **A LoRA adapter trained on Mistral-7B only works with Mistral-7B. You CANNOT use it with any other model architecture (Qwen, Llama, Falcon, etc.). They are architecturally incompatible.**

Proof from the codebase:

- `src/lib/services/inference-service.ts` line 54: `defaultBaseModel: 'mistralai/mistral-7b-instruct-v0.2'`
- The only working adapter (`job 6fd5ac79`) was trained on `mistralai/Mistral-7B-Instruct-v0.2`
- That adapter is what the live system uses today at `virtual-inference-6fd5ac79-adapted`

Therefore: **training on Qwen was never valid for this system.** The switch to `Qwen/Qwen3-Next-80B-A3B-Instruct` earlier in this session was based on misread env vars, not a real requirement.

### 9.2 Fix Applied: BASE_MODEL Reverted to Mistral

Both code files have been updated:

**`src/inngest/functions/dispatch-training-job.ts`**
```typescript
// Before:
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
// After:
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
```

**`supabase/functions/process-pipeline-jobs/index.ts`**
```typescript
// Before:
const BASE_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';
// After:
const BASE_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
```

### 9.3 The Network Volume Is No Longer Needed

With Mistral as base model and the **download-each-time** approach (proven working in January):

- The worker downloads Mistral-7B (~14 GB) from HuggingFace into **ephemeral container storage** (not the network volume)
- The network volume is **not used** during training
- The `NETWORK_VOLUME_ID=4jw1fcocwl` env var on the endpoint is irrelevant to Mistral operation
- The adapter output goes to **S3 (RunPod storage)**, not to the volume

This means the 240 GB network volume has been costing money every month for storage that was never used.

### 9.4 Deleting the Qwen Models — YES, Delete Both

Yes, you can safely delete both Qwen directories from the volume. They will never be used.

**On your open pod terminal:**

```bash
# Verify what's there first
ls -la /workspace/huggingface-cache/hub/

# Delete both Qwen directories (this is permanent)
rm -rf /workspace/huggingface-cache/hub/models--Qwen--Qwen3-Next-80B-A3B-Instruct
rm -rf /workspace/huggingface-cache/hub/models--qwen--qwen3-next-80b-a3b-instruct

# Verify they are gone
ls /workspace/huggingface-cache/hub/
```

After deletion, the volume should be nearly empty.

### 9.5 Can You Shrink the 240 GB Volume?

**RunPod network volumes cannot be resized smaller.** Your options are:

1. **Option 1 (Simplest):** Delete the Qwen model files (above), leave the empty 240 GB volume. You continue paying for 240 GB of empty space.

2. **Option 2 (Save money, recommended):** Detach the network volume from the `brightrun-lora-trainer-qwen` endpoint entirely. With Mistral download-on-demand, the worker doesn't need the volume at all.

3. **Option 3 (Cleanest):** Delete the 240 GB volume entirely. Recreate at 20–30 GB only if you later want to pre-cache Mistral to speed up cold starts. Right now not needed.

**Recommendation: Option 2 or 3.**

To detach the volume without deleting it:
- RunPod Dashboard → Serverless → `brightrun-lora-trainer-qwen` → Edit Endpoint → remove the Network Volume attachment

To delete the volume permanently:
- Ensure no pod or endpoint is mounted to it first
- RunPod Dashboard → Storage → `4jw1fcocwl` → Delete

### 9.6 Updated Action Checklist

| Action | Where | Status |
|--------|--------|--------|
| `BASE_MODEL` reverted to Mistral in `dispatch-training-job.ts` | Code | ✅ Done |
| `BASE_MODEL` reverted to Mistral in `process-pipeline-jobs/index.ts` | Code | ✅ Done |
| Push to Vercel | Vercel | Pending — do this |
| Deploy updated Edge Function | `supabase functions deploy process-pipeline-jobs` | Pending — do this |
| Delete Qwen model files from volume | RunPod pod terminal | Recommended |
| Detach or delete the 240 GB volume | RunPod dashboard | Recommended (save cost) |

### 9.7 Expected Training Behaviour After Fix

1. User submits training job from `/pipeline/configure`
2. Inngest `dispatch-training-job` fires immediately (no cron delay)
3. RunPod worker starts, checks `MODEL_PATH` — path doesn't exist on ephemeral container, falls back to HuggingFace
4. Worker log shows: `Downloading model from HuggingFace: mistralai/Mistral-7B-Instruct-v0.2`
5. Download takes ~5–10 minutes, then training runs ~29 minutes
6. Adapter uploaded to S3 at `lora-models/adapters/<job-id>.tar.gz`
7. Supabase record updated to `status: completed` with `adapter_file_path`

Total expected time: ~35–45 minutes, matching the January successful run.

---
