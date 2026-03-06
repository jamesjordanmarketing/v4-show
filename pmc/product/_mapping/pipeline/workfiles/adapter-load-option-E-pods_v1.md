# Option E: RunPod Pods with Manual vLLM Setup for LoRA Inference

**Created**: January 19, 2026  
**Purpose**: Set up RunPod Pods (dedicated GPU instances) with manual vLLM configuration to enable LoRA adapter inference, bypassing the Serverless vLLM V1 engine crash issue.

---

## Executive Summary

RunPod Serverless vLLM workers cannot be used for LoRA adapter inference because:
- **Older workers** (vLLM 0.5.1): Stable V0 engine, but don't read `LORA_MODULES` environment variable
- **Newer workers** (vLLM 0.6+): Support `LORA_MODULES`, but crash with `EngineDeadError` on V1 engine

**Solution**: Use RunPod Pods with manual vLLM CLI startup, passing `--lora-modules` directly as a command-line argument.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Bright Run Application                    │
│                    (Vercel / Next.js)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RunPod Pod                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ vLLM OpenAI-Compatible Server                       │    │
│  │ - Base Model: Mistral-7B-Instruct-v0.2              │    │
│  │ - LoRA Adapter: adapter-6fd5ac79                    │    │
│  │ - Endpoint: http://{POD_IP}:8000/v1/chat/completions│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  GPU: NVIDIA A100 80GB / H100 80GB                          │
│  Network: RunPod Proxy or Direct SSH Tunnel                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   HuggingFace Hub                            │
│  - BrightHub2/lora-emotional-intelligence-6fd5ac79          │
│  - Auto-downloaded by vLLM on startup                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Setup Instructions

### Step 1: Create a RunPod Pod

1. Navigate to: https://www.runpod.io/console/pods
2. Click **"+ Deploy"** or **"Create Pod"**
3. Select GPU:
   - **Recommended**: NVIDIA A100 80GB SXM or H100 80GB
   - **Alternative**: RTX 4090 24GB (for smaller adapters only)
   - **Minimum**: RTX 3090 24GB

4. Select Template:
   - **Option A (Recommended)**: `runpod/pytorch:2.1.0-py3.10-cuda12.1.0-devel-ubuntu22.04`
   - **Option B**: Any CUDA 12.x base image

5. Configure Disk:
   - Container Disk: `50GB` minimum
   - Volume Disk: `100GB` (for model caching)

6. Configure Network:
   - **Enable HTTP Ports**: `8000, 8080, 22`
   - **Enable TCP Ports**: `22`

7. Click **"Deploy"** and wait for pod to start.

---

### Step 2: Connect to the Pod

#### Via SSH (Recommended)
```bash
# Get SSH command from RunPod console
ssh root@{POD_IP} -p {SSH_PORT} -i ~/.ssh/runpod_key
```

#### Via Web Terminal
- Click **"Connect"** → **"Web Terminal"** in RunPod console

---

### Step 3: Install vLLM and Dependencies

```bash
# Update pip
pip install --upgrade pip

# Install vLLM with LoRA support
pip install vllm>=0.4.0

# Install HuggingFace Hub CLI (for adapter download)
pip install huggingface_hub

# Login to HuggingFace (required for private repos)
# Get HF_TOKEN from: .secrets/deployment-secrets.md
huggingface-cli login --token $HF_TOKEN
```

---

### Step 4: Start vLLM Server with LoRA Adapter

#### Basic Command (Single Adapter)

```bash
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules adapter-6fd5ac79=BrightHub2/lora-emotional-intelligence-6fd5ac79 \
  --max-loras 1 \
  --max-lora-rank 16 \
  --gpu-memory-utilization 0.90 \
  --dtype bfloat16
```

#### Production Command (With All Options)

```bash
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --revision 63a8b081895390a26e140280378bc85ec8bce07a \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules adapter-6fd5ac79=BrightHub2/lora-emotional-intelligence-6fd5ac79 \
  --max-loras 1 \
  --max-lora-rank 16 \
  --gpu-memory-utilization 0.90 \
  --dtype bfloat16 \
  --disable-log-requests \
  --trust-remote-code
```

#### Multiple Adapters (For A/B Testing)

```bash
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules \
    adapter-6fd5ac79=BrightHub2/lora-emotional-intelligence-6fd5ac79 \
    adapter-control=none \
  --max-loras 2 \
  --max-lora-rank 16 \
  --gpu-memory-utilization 0.90 \
  --dtype bfloat16
```

> **Note**: For control (base model), omit the `--lora-modules` entry or use the model name directly.

---

### Step 5: Run as Background Service (Optional)

#### Using Screen
```bash
# Start a screen session
screen -S vllm

# Run the vLLM server
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules adapter-6fd5ac79=BrightHub2/lora-emotional-intelligence-6fd5ac79 \
  --gpu-memory-utilization 0.90

# Detach: Ctrl+A, then D
# Reattach: screen -r vllm
```

#### Using Systemd Service
```bash
# Create service file
cat > /etc/systemd/system/vllm.service << 'EOF'
[Unit]
Description=vLLM OpenAI Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment="HF_TOKEN=<see .secrets/deployment-secrets.md>"
ExecStart=/usr/bin/python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules adapter-6fd5ac79=BrightHub2/lora-emotional-intelligence-6fd5ac79 \
  --gpu-memory-utilization 0.90
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl daemon-reload
systemctl enable vllm
systemctl start vllm

# Check status
systemctl status vllm
journalctl -u vllm -f
```

---

### Step 6: Access the API

#### Via RunPod Proxy (Recommended)

RunPod provides an HTTPS proxy for exposed ports:

```
https://{POD_ID}-8000.proxy.runpod.net/v1/chat/completions
```

**Example**:
```
https://abc123xyz-8000.proxy.runpod.net/v1/chat/completions
```

#### Via Direct IP (If allowed)

```
http://{POD_IP}:8000/v1/chat/completions
```

---

### Step 7: Test the Endpoint

#### Test with Base Model

```bash
curl -X POST "https://{POD_ID}-8000.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.2",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 100
  }'
```

#### Test with LoRA Adapter

```bash
curl -X POST "https://{POD_ID}-8000.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "adapter-6fd5ac79",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 100
  }'
```

> **Note**: Use the adapter NAME as the `model` field, not the full HuggingFace path.

---

## Integration with Bright Run Application

### Environment Variable Update

Update Vercel environment variables:

```
INFERENCE_API_URL=https://{POD_ID}-8000.proxy.runpod.net
INFERENCE_ENDPOINT_TYPE=pods
```

### Code Changes Required

#### 1. Update `inference-service.ts`

The existing `callInferenceEndpoint` function needs to support Pods:

```typescript
// Detect endpoint type from URL
const isRunPodPod = INFERENCE_API_URL.includes('.proxy.runpod.net');

if (isRunPodPod) {
  // Direct OpenAI-compatible API call
  const response = await fetch(`${INFERENCE_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization needed for Pod proxy
    },
    body: JSON.stringify({
      model: adapterName, // e.g., "adapter-6fd5ac79"
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });
  
  return await response.json();
} else {
  // Existing Serverless logic
  // ...
}
```

#### 2. Simplified Request Format

Pods use standard OpenAI API format (no RunPod wrapper):

```json
{
  "model": "adapter-6fd5ac79",
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "max_tokens": 100
}
```

**NOT** the RunPod format:

```json
{
  "input": {
    "model": "adapter-6fd5ac79",
    "messages": [...],
    "max_tokens": 100
  }
}
```

---

## Cost Analysis

### RunPod Serverless vs Pods

| Metric | Serverless | Pods |
|--------|------------|------|
| **A100 80GB Rate** | ~$0.0011/sec (~$3.96/hour) | ~$1.99/hour |
| **Cold Start** | 2-3 minutes | Always ready |
| **Minimum Cost** | Pay per request | Minimum 1 hour |
| **Best For** | Production (many short requests) | Development/Testing |

### Cost Optimization

1. **Use Spot Pods**: ~30-50% cheaper than On-Demand
2. **Stop Pod when idle**: Don't leave running overnight
3. **Use smaller GPU** for testing: RTX 4090 (~$0.74/hour)

---

## Startup Script (run.sh)

Create a startup script for convenience:

```bash
#!/bin/bash
# run.sh - Start vLLM with LoRA adapter

MODEL="mistralai/Mistral-7B-Instruct-v0.2"
ADAPTER_NAME="adapter-6fd5ac79"
ADAPTER_PATH="BrightHub2/lora-emotional-intelligence-6fd5ac79"
PORT=8000

echo "Starting vLLM server..."
echo "Model: $MODEL"
echo "Adapter: $ADAPTER_NAME -> $ADAPTER_PATH"
echo "Port: $PORT"

python -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --host 0.0.0.0 \
  --port "$PORT" \
  --max-model-len 4096 \
  --enable-lora \
  --lora-modules "$ADAPTER_NAME=$ADAPTER_PATH" \
  --max-loras 1 \
  --max-lora-rank 16 \
  --gpu-memory-utilization 0.90 \
  --dtype bfloat16
```

---

## Troubleshooting

### Issue: "Could not find adapter"

**Cause**: HuggingFace token not set or adapter repo is private.

**Solution**:
```bash
# Get HF_TOKEN from: .secrets/deployment-secrets.md
export HF_TOKEN=<your-token-here>
huggingface-cli login --token $HF_TOKEN
```

### Issue: "CUDA out of memory"

**Cause**: Model + LoRA exceeds GPU memory.

**Solution**:
```bash
# Reduce memory utilization
--gpu-memory-utilization 0.85

# Or reduce context length
--max-model-len 2048
```

### Issue: Connection refused

**Cause**: Port not exposed or firewall blocking.

**Solution**:
1. Check pod configuration exposes port 8000
2. Use RunPod proxy URL instead of direct IP
3. Verify vLLM is running: `ps aux | grep vllm`

### Issue: Slow response times

**Cause**: Cold model load or insufficient GPU.

**Solution**:
1. Wait for model to fully load (~1-2 min on first request)
2. Check GPU utilization: `nvidia-smi`
3. Ensure using A100/H100 for best performance

---

## Dynamic Adapter Loading (Advanced)

For testing multiple adapters without restarting vLLM, use the `/v1/loras` API (vLLM 0.6+):

### Load New Adapter at Runtime

```bash
curl -X POST "https://{POD_ID}-8000.proxy.runpod.net/v1/load_lora_adapter" \
  -H "Content-Type: application/json" \
  -d '{
    "lora_name": "adapter-new",
    "lora_path": "BrightHub2/lora-new-adapter"
  }'
```

### List Loaded Adapters

```bash
curl "https://{POD_ID}-8000.proxy.runpod.net/v1/models"
```

---

## Rollback Plan

If Pods don't work:
1. Return to Serverless with older worker (base model only, no LoRA)
2. Contact RunPod support about V1 engine fix
3. Consider alternative inference providers (Together.ai, Replicate, Anyscale)

---

## Quick Reference

| Item | Value |
|------|-------|
| **Base Model** | `mistralai/Mistral-7B-Instruct-v0.2` |
| **Adapter** | `adapter-6fd5ac79` |
| **Adapter HF Path** | `BrightHub2/lora-emotional-intelligence-6fd5ac79` |
| **HF Token** | See `.secrets/deployment-secrets.md` |
| **RunPod API Key** | See `.secrets/deployment-secrets.md` |
| **Default Port** | `8000` |
| **API Endpoint** | `https://{POD_ID}-8000.proxy.runpod.net/v1/chat/completions` |
| **GPU Recommendation** | NVIDIA A100 80GB SXM |

---

## Next Steps After Setup

1. ✅ Create Pod and start vLLM server
2. ✅ Test endpoint with curl commands above
3. ✅ Update `INFERENCE_API_URL` in Vercel
4. ✅ Modify `inference-service.ts` to support Pods format
5. ✅ Test via web UI at `/pipeline/jobs/{jobId}/test`
6. ✅ Run A/B comparison testing
7. ✅ Monitor costs and optimize as needed
