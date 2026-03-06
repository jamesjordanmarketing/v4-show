# Pod Restart Troubleshooting Guide

**Date**: January 30, 2026  
**Last Updated**: February 3, 2026  
**Purpose**: Solutions for common issues when restarting inference pods

---

## ⚡ Quick Reference: Serverless Endpoint Info

**Last Active Serverless Endpoint**: `brightrun-inference-official-vllm`  
**Endpoint ID**: `780tauhj7c126b`  
**URL**: `https://api.runpod.ai/v2/780tauhj7c126b`  
**Status**: Disabled (V1 + LoRA crash issue)

**To Re-Enable Serverless After RunPod Fix**:
1. ✅ Update Docker image in RunPod Console: `madiatorlabs/worker-v1-vllm:v0.15.0` (or version RunPod recommends)
2. ✅ Change **TWO** Vercel env vars:
   - `INFERENCE_MODE=pods` → `INFERENCE_MODE=serverless`
   - `INFERENCE_API_URL=https://[POD_URL]` → `INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b`
3. ✅ Redeploy Vercel (automatic after env var change)
4. ✅ **NO CODE CHANGES NEEDED** - codebase already supports both modes

**See Also**: [adapter-load-re-enable-serverless_v1.md](adapter-load-re-enable-serverless_v1.md) for full re-enablement guide

---

## ✅ Expected Behavior: Script "Hangs" After Running

**This is NORMAL!** The restart scripts start a vLLM server that runs **indefinitely in the foreground**. The script will never "return to prompt" because the server is running.

**Success indicators:**
- You see `Uvicorn running on http://0.0.0.0:8000` (Control) or `8001` (Adapted)
- The terminal stays occupied (this is correct - the server is running)

**If the server gets stuck or you need to restart:**
```bash
pkill -f vllm || true
```
Then run the restart script again.

---

## Issue #1: Heredoc Command Hangs (Never Returns to Prompt)

### Symptom
When pasting the `cat > /workspace/scripts/full-restart-control.sh << 'ENDSCRIPT'` command, the terminal stays at a simple prompt (like `>`) and never returns.

### Cause
The terminal is waiting for the `ENDSCRIPT` delimiter because:
1. You may have only pasted part of the command
2. There may be invisible whitespace or formatting issues from copy/paste
3. The `ENDSCRIPT` line wasn't recognized due to trailing spaces or Windows line endings

### Solution

**Option A: Press Ctrl+C to cancel, then create the script manually:**

```bash
# Cancel the hanging command
Ctrl+C

# Create the script using nano editor instead
nano /workspace/scripts/full-restart-control.sh
```

Then paste this content in nano:
```bash
#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════"
echo "   CONTROL POD FULL RESTART SCRIPT"
echo "═══════════════════════════════════════════════════════"

echo ""; echo "▶ [1/4] Installing vLLM 0.6.6 with compatible transformers..."
pip install vllm==0.6.6 transformers==4.47.1 tokenizers==0.21.0

echo ""; echo "▶ [2/4] Adding head_dim=128 to config.json..."
python3 -c "
import json
p='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2/config.json'
c=json.load(open(p))
c['head_dim']=128
json.dump(c,open(p,'w'),indent=2)
print('Added head_dim=128')
"

echo ""; echo "▶ [3/4] Starting vLLM server on port 8000..."
echo "   Wait for: 'Uvicorn running on http://0.0.0.0:8000'"
echo "═══════════════════════════════════════════════════════"
/workspace/scripts/start-control.sh
```

Save with `Ctrl+O`, then `Enter`, then exit with `Ctrl+X`.

Then make it executable:
```bash
chmod +x /workspace/scripts/full-restart-control.sh
```

**Option B: Run individual commands instead of using the script:**

```bash
# Step 1: Install compatible versions
pip install vllm==0.6.6 transformers==4.47.1 tokenizers==0.21.0

# Step 2: Add head_dim to config
python3 -c "import json; p='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2/config.json'; c=json.load(open(p)); c['head_dim']=128; json.dump(c,open(p,'w'),indent=2); print('Added head_dim=128')"

# Step 3: Start the server
/workspace/scripts/start-control.sh
```

---

## Issue #2: TokenizersBackend AttributeError

### Error Message
```
raise AttributeError(f"{self.__class__.__name__} has no attribute {key}")
AttributeError: TokenizersBackend has no attribute all_special_tokens_extended
```

### Cause
This is a **version mismatch** between the `transformers` library and the `tokenizers` library. The `transformers==4.47.1` version expects certain tokenizer attributes that don't exist in the installed tokenizers version.

### Solution

**Fix by explicitly pinning the tokenizers version:**

```bash
pip install tokenizers==0.21.0 transformers==4.47.1 vllm==0.6.6
```

If that doesn't work, try installing in this specific order:
```bash
pip uninstall -y tokenizers transformers
pip install tokenizers==0.21.0
pip install transformers==4.47.1
pip install vllm==0.6.6
```

### Alternative: Try Older Compatible Versions

If the above doesn't work, try these known-compatible versions:
```bash
pip install vllm==0.6.6 transformers==4.46.3 tokenizers==0.20.3
```

---

## Complete Control Pod Restart (All-in-One)

After understanding the issues above, here's the complete sequence to restart the Control pod:

```bash
# 1. Kill any existing vLLM processes
pkill -f vllm || true

# 2. Install compatible package versions
pip install vllm==0.6.6 transformers==4.47.1 tokenizers==0.21.0

# 3. Ensure head_dim is set in config
python3 -c "import json; p='/workspace/models/mistralai/Mistral-7B-Instruct-v0.2/config.json'; c=json.load(open(p)); c['head_dim']=128; json.dump(c,open(p,'w'),indent=2); print('head_dim set to 128')"

# 4. Start vLLM server
python -m vllm.entrypoints.openai.api_server \
  --model /workspace/models/mistralai/Mistral-7B-Instruct-v0.2 \
  --port 8000 \
  --host 0.0.0.0 \
  --dtype float16 \
  --max-model-len 4096
```

Wait for: `Uvicorn running on http://0.0.0.0:8000`

---

## Verification

After server starts, test from another terminal or Git Bash on your local machine:

```bash
POD_ID="your_pod_id_here"
curl -X POST "https://${POD_ID}-8000.proxy.runpod.net/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model": "/workspace/models/mistralai/Mistral-7B-Instruct-v0.2", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 20}'
```

---

## Quick Reference: Package Version Compatibility

| Issue | Working Versions |
|-------|------------------|
| TokenizersBackend error | `tokenizers==0.21.0` + `transformers==4.47.1` |
| head_dim error | Add `"head_dim": 128` to model's `config.json` |
| vLLM compatibility | `vllm==0.6.6` |

---

## Dual Prompt Submission with Serverless Mode

### Overview

As of **February 2026**, the application supports **dual-prompt submission** where control and adapted engines each receive separate user messages starting from Turn 1. This architecture works seamlessly with both Pods and Serverless modes.

### How It Works

**Frontend Submission**:
```typescript
// New dual-message format (current implementation)
{
  controlUserMessage: "Hello from control",
  adaptedUserMessage: "Hello from adapted",
  enableEvaluation: true
}

// Legacy single-message format (still supported for backward compatibility)
{
  userMessage: "Hello", // Same message sent to both engines
  enableEvaluation: true
}
```

**Backend Processing**:
1. Turn API route receives either format at `/api/pipeline/conversations/[id]/turn`
2. Converts legacy format to dual format internally if needed
3. Stores both messages separately in database (`control_user_message`, `adapted_user_message`)
4. Builds separate conversation histories for each engine using their respective messages
5. Calls both endpoints in parallel using `Promise.allSettled()`

**Code Reference**: [multi-turn-conversation-service.ts](../../../src/lib/services/multi-turn-conversation-service.ts#L472)

### Serverless Mode Compatibility

**✅ Confirmed Working**: Dual prompts work correctly with serverless mode using a **single shared endpoint**.

**How Both Engines Use One Endpoint**:
```typescript
// Both calls go to the SAME serverless endpoint ID
// but with DIFFERENT parameters

// Control engine call
callInferenceEndpoint(
  controlEndpoint.runpod_endpoint_id,  // e.g., "780tauhj7c126b"
  controlPrompt,
  systemPrompt,
  false  // ❌ No adapter
)

// Adapted engine call
callInferenceEndpoint(
  adaptedEndpoint.runpod_endpoint_id,  // Same: "780tauhj7c126b"
  adaptedPrompt,
  systemPrompt,
  true,  // ✅ Use adapter
  adaptedEndpoint.adapter_path,  // e.g., "/workspace/adapters/job-abc123"
  conversation.job_id
)
```

**Why This Works**:
- Serverless workers handle adapter loading dynamically via the `enable_lora: true` flag
- The `model` parameter specifies the adapter name (e.g., `adapter-abc123de`)
- Control calls omit the adapter parameters, using base model only
- RunPod's serverless infrastructure routes both to available workers

### Error Handling: Partial Failures

**Graceful Degradation**: If one engine fails, the other still completes successfully.

**Implementation**:
```typescript
// Parallel execution with independent error handling
const [controlResult, adaptedResult] = await Promise.allSettled([
  callInferenceEndpoint(controlEndpoint, controlPrompt, ...),
  callInferenceEndpoint(adaptedEndpoint, adaptedPrompt, ...)
]);

// Process results independently
if (controlResult.status === 'fulfilled') {
  updateData.control_response = controlResult.value.response;
  updateData.control_generation_time_ms = controlResult.value.generationTimeMs;
  updateData.control_tokens_used = controlResult.value.tokensUsed;
} else {
  updateData.control_error = controlResult.reason?.message || 'Control endpoint failed';
}

if (adaptedResult.status === 'fulfilled') {
  updateData.adapted_response = adaptedResult.value.response;
  // ... same pattern
} else {
  updateData.adapted_error = adaptedResult.reason?.message || 'Adapted endpoint failed';
}
```

**Database Storage**:
- Turn status: `completed` (even if one engine failed)
- Successful responses: Stored in `control_response` and `adapted_response`
- Errors: Stored separately in `control_error` and `adapted_error`
- Each engine's metadata tracked independently (tokens, generation time)

**UI Impact**:
- Users see whichever response(s) succeeded
- Failed engines display error messages
- Evaluation only runs if BOTH engines succeeded
- Turn is still considered "completed" for conversation history

**Production Implications**:
- If adapted endpoint crashes, control response still completes
- If control endpoint fails, adapted response still completes
- No cascade failures between engines
- Each retry logic runs independently (3 retries per engine)

### Testing Checklist for Serverless Switch

When switching to serverless mode with dual prompts:

- [ ] Update both env vars: `INFERENCE_MODE=serverless` + `INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b`
- [ ] Verify adapter loading works in serverless workers
- [ ] Test control-only failure scenario
- [ ] Test adapted-only failure scenario
- [ ] Test both engines succeeding with different prompts
- [ ] Verify conversation history uses correct per-engine messages
- [ ] Confirm evaluation runs when both succeed, skips when either fails


---

## Dual Prompt Submission with Serverless Mode

### Overview

As of **February 2026**, the application supports **dual-prompt submission** where control and adapted engines each receive separate user messages starting from Turn 1. This architecture works seamlessly with both Pods and Serverless modes.

### How It Works

**Frontend Submission**:
```typescript
// New dual-message format (current implementation)
{
  controlUserMessage: "Hello from control",
  adaptedUserMessage: "Hello from adapted",
  enableEvaluation: true
}

// Legacy single-message format (still supported for backward compatibility)
{
  userMessage: "Hello", // Same message sent to both engines
  enableEvaluation: true
}
```

**Backend Processing**:
1. Turn API route receives either format at `/api/pipeline/conversations/[id]/turn`
2. Converts legacy format to dual format internally if needed
3. Stores both messages separately in database (`control_user_message`, `adapted_user_message`)
4. Builds separate conversation histories for each engine using their respective messages
5. Calls both endpoints in parallel using `Promise.allSettled()`

**Code Reference**: [multi-turn-conversation-service.ts](../../../src/lib/services/multi-turn-conversation-service.ts#L472)

### Serverless Mode Compatibility

**✅ Confirmed Working**: Dual prompts work correctly with serverless mode using a **single shared endpoint**.

**How Both Engines Use One Endpoint**:
```typescript
// Both calls go to the SAME serverless endpoint ID
// but with DIFFERENT parameters

// Control engine call
callInferenceEndpoint(
  controlEndpoint.runpod_endpoint_id,  // e.g., "780tauhj7c126b"
  controlPrompt,
  systemPrompt,
  false  // ❌ No adapter
)

// Adapted engine call
callInferenceEndpoint(
  adaptedEndpoint.runpod_endpoint_id,  // Same: "780tauhj7c126b"
  adaptedPrompt,
  systemPrompt,
  true,  // ✅ Use adapter
  adaptedEndpoint.adapter_path,  // e.g., "/workspace/adapters/job-abc123"
  conversation.job_id
)
```

**Why This Works**:
- Serverless workers handle adapter loading dynamically via the `enable_lora: true` flag
- The `model` parameter specifies the adapter name (e.g., `adapter-abc123de`)
- Control calls omit the adapter parameters, using base model only
- RunPod's serverless infrastructure routes both to available workers

### Error Handling: Partial Failures

**Graceful Degradation**: If one engine fails, the other still completes successfully.

**Implementation**:
```typescript
// Parallel execution with independent error handling
const [controlResult, adaptedResult] = await Promise.allSettled([
  callInferenceEndpoint(controlEndpoint, controlPrompt, ...),
  callInferenceEndpoint(adaptedEndpoint, adaptedPrompt, ...)
]);

// Process results independently
if (controlResult.status === 'fulfilled') {
  updateData.control_response = controlResult.value.response;
  updateData.control_generation_time_ms = controlResult.value.generationTimeMs;
  updateData.control_tokens_used = controlResult.value.tokensUsed;
} else {
  updateData.control_error = controlResult.reason?.message || 'Control endpoint failed';
}

if (adaptedResult.status === 'fulfilled') {
  updateData.adapted_response = adaptedResult.value.response;
  // ... same pattern
} else {
  updateData.adapted_error = adaptedResult.reason?.message || 'Adapted endpoint failed';
}
```

**Database Storage**:
- Turn status: `completed` (even if one engine failed)
- Successful responses: Stored in `control_response` and `adapted_response`
- Errors: Stored separately in `control_error` and `adapted_error`
- Each engine's metadata tracked independently (tokens, generation time)

**UI Impact**:
- Users see whichever response(s) succeeded
- Failed engines display error messages
- Evaluation only runs if BOTH engines succeeded
- Turn is still considered "completed" for conversation history

**Production Implications**:
- If adapted endpoint crashes, control response still completes
- If control endpoint fails, adapted response still completes
- No cascade failures between engines
- Each retry logic runs independently (3 retries per engine)

### Testing Checklist for Serverless Switch

When switching to serverless mode with dual prompts:

- [ ] Update both env vars: `INFERENCE_MODE=serverless` + `INFERENCE_API_URL=https://api.runpod.ai/v2/780tauhj7c126b`
- [ ] Verify adapter loading works in serverless workers
- [ ] Test control-only failure scenario
- [ ] Test adapted-only failure scenario
- [ ] Test both engines succeeding with different prompts
- [ ] Verify conversation history uses correct per-engine messages
- [ ] Confirm evaluation runs when both succeed, skips when either fails
