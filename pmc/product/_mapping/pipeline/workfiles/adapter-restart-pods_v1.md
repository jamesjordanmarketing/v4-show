# Pod Restart Guide: Control & Adapted Inference Pods

**Updated**: January 23, 2026  
**Purpose**: Quick reference for starting/stopping RunPod inference pods

---

## Quick Reference Table

| Pod | Volume Name | Port | Restart Script |
|-----|-------------|------|----------------|
| Control | `brightrun-inference-control-pod` | 8000 | `/workspace/scripts/full-restart-control.sh` |
and
pkill -f vllm; pip install transformers==4.44.2 && /workspace/scripts/full-restart-control.sh if issue not fixed yet

| Adapted | `brightrun-inference-adapter-pod` | 8001 | `/workspace/scripts/full-restart-adapted.sh` |

---

## Starting Pods (Full Process)

### Step 1: Create Pod in RunPod Console

1. Go to: https://www.runpod.io/console/pods
2. Click **"+ Deploy"**
3. **Select GPU**: A100 80GB, H100, or RTX 4090 (NOT Blackwell or 6000 GPUs)
4. **Select Template**: `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04`
5. **Container Disk**: `20GB`
6. **Attach Network Volume**:
   - Control Pod: `brightrun-inference-control-pod`
   - Adapted Pod: `brightrun-inference-adapter-pod`
7. **Edit Template** → Set ports:
   - Control: HTTP `8000, 8080` | TCP `22`
   - Adapted: HTTP `8001, 8080` | TCP `22`
8. Click **Deploy**

### Step 2: Run Full Restart Script

Connect via **Web Terminal**, then run **one command** on each pod:

**Control Pod:**
```bash
/workspace/scripts/full-restart-control.sh
```

**Adapted Pod:**
```bash
/workspace/scripts/full-restart-adapted.sh
```

Wait for: `Uvicorn running on http://0.0.0.0:800X`

### Step 3: Note the New Pod ID

The Pod ID is in the proxy URL shown in RunPod Console:
```
https://[POD_ID]-8000.proxy.runpod.net  (Control)
https://[POD_ID]-8001.proxy.runpod.net  (Adapted)
```

### Step 4: Test Endpoints (Git Bash)

**Control:**
```bash
POD_ID="your_control_pod_id"
curl -X POST "https://${POD_ID}-8000.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model": "/workspace/models/mistralai/Mistral-7B-Instruct-v0.2", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 20}'
```

**Adapted:**
```bash
POD_ID="your_adapted_pod_id"
curl -X POST "https://${POD_ID}-8001.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model": "adapter-6fd5ac79", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 20}'
```

### Step 5: Update Vercel Environment Variables

**Location**: https://vercel.com → Project → Settings → Environment Variables

| Variable | New Value | Notes |
|----------|-----------|-------|
| `INFERENCE_API_URL` | `https://[CONTROL_POD_ID]-8000.proxy.runpod.net` | Control Pod URL |
| `INFERENCE_API_URL_ADAPTED` | `https://[ADAPTED_POD_ID]-8001.proxy.runpod.net` | Adapted Pod URL |

**After updating**: Vercel will auto-redeploy, or trigger manually.

> **Note**: `INFERENCE_MODE` should already be set to `pods` -

---

## Stopping Pods

### Terminate (Only Option with Network Volumes)

Pods with Network Volumes attached do NOT have a Stop/Pause button.

1. Go to: https://www.runpod.io/console/pods
2. Find your pod
3. Click **Terminate** or **Delete**

**What happens**:
- Container is deleted (vLLM uninstalled)
- Network Volume persists (model, adapters, scripts all saved)
- Next time: Just run the restart script (it reinstalls vLLM)

---

## Quick Restart Checklist

After creating new pod on existing volume:

- [ ] Run restart script: `/workspace/scripts/full-restart-{control|adapted}.sh`
- [ ] Wait for "Uvicorn running on..."
- [ ] Note new Pod ID from proxy URL
- [ ] Test endpoint from Git Bash
- [ ] Update Vercel env vars with new URLs (Step 5 above)

---

## Environment Variables Reference

### Vercel (Update when Pod IDs change)

| Variable | Purpose | Example |
|----------|---------|---------|
| `INFERENCE_MODE` | Selects inference backend | `pods` |
| `INFERENCE_API_URL` | Control Pod endpoint | `https://abc123-8000.proxy.runpod.net` |
| `INFERENCE_API_URL_ADAPTED` | Adapted Pod endpoint | `https://xyz789-8001.proxy.runpod.net` |

### RunPod (No changes needed on restart)

Pod configuration is set during creation. No environment variables to update in RunPod console for these inference pods.

---

## Current Endpoint URLs

```
Control:  https://[POD_ID]-8000.proxy.runpod.net
Adapted:  https://[POD_ID]-8001.proxy.runpod.net
```

**Last Known IDs** (January 23, 2026):
- Control: `[UPDATE_AFTER_RESTART]`
- Adapted: `[UPDATE_AFTER_RESTART]`
