# Adapter Deployment — Configuration & Architecture Q&A

**Date**: February 24, 2026  
**Context**: Questions raised during Part 3 (Supabase Webhook) of `10-data-and-identity-automate-adapter-tutorial_v1.md`

---

## Question 1: What Else Do I Need to Do Besides Push to Git and Build on Vercel?

You have already completed:
- ✅ Vercel environment variables (Part 2)
- ✅ Supabase Database Webhook (Part 3)

**Remaining steps:**

1. **Sync Inngest functions** — After your next Vercel deployment, the Inngest function `auto-deploy-adapter` needs to be registered with the Inngest cloud service. Go to [https://app.inngest.com](https://app.inngest.com) → your app → click **Sync**. This tells Inngest "here are the functions this app exposes." Without this, the `pipeline/adapter.ready` event will fire but nothing will pick it up.

2. **Clean up the RunPod endpoint environment variables** — See Questions 2–5 below for what needs to change on the RunPod serverless endpoint `ei82ickpenoqlp`.

3. **Push to git and deploy** — Push your current code to `main`. Vercel will build and deploy. After deploy, sync Inngest.

4. **Test the automation** — The easiest way is to use the manual trigger command from Part 5.4 of the tutorial, which simulates the webhook payload for an already-completed job. This lets you verify the full chain (webhook → Inngest → HuggingFace → RunPod → DB) without needing to run a new training job.

Once these are done, the pipeline is live. Every future training job that completes will automatically deploy its adapter.

---

## Question 2: The "Model" Parameter on the RunPod Endpoint

> **Value**: `https://huggingface.co/qwen/qwen3-next-80b-a3b-instruct:9c7f2fbe84465e40164a94cc16cd30b6999b0cc7`

**This should be changed to `mistralai/Mistral-7B-Instruct-v0.2`.**

The "Model" parameter in the RunPod Serverless endpoint configuration tells the vLLM worker which **base model** to load. Your LoRA adapters are fine-tuned on top of Mistral-7B-Instruct-v0.2 — that's the base model the entire pipeline is built around. The code in `inference-serverless.ts` hardcodes this base model name when making control (non-adapter) inference calls:

```typescript
const modelName = (useAdapter && jobId)
    ? `adapter-${jobId.substring(0, 8)}`
    : 'mistralai/Mistral-7B-Instruct-v0.2';
```

Having a Qwen 80B model configured there is a mismatch. It may be why the endpoint was behaving unexpectedly. The Qwen model:
- Is far too large for your GPU allocation (80B parameters need ~160GB VRAM)
- Is not the model your LoRA adapters were trained on
- Would cause LoRA loading to fail (adapter weights are incompatible with Qwen architecture)

**Action**: Change the RunPod endpoint "Model" to `mistralai/Mistral-7B-Instruct-v0.2`.

---

## Question 3: Do Any of the Webhook/Vercel Values Need to Be in the RunPod Endpoint?

**No.** The Vercel environment variables and the RunPod endpoint environment variables serve completely different purposes:

| Realm | Purpose | Who reads them |
|-------|---------|----------------|
| **Vercel env vars** | Configure the *orchestrator* — the Node.js app that manages deployments, calls APIs, talks to Supabase | Your Next.js app running on Vercel |
| **RunPod endpoint env vars** | Configure the *GPU worker* — what model to load, what LoRA adapters to make available | The vLLM process running on the GPU pod |

The RunPod worker doesn't need `WEBHOOK_SECRET`, `INNGEST_EVENT_KEY`, `HF_TOKEN`, etc. Those are used by your Vercel app to *talk to* RunPod and HuggingFace — not by the RunPod worker itself.

The only environment variables your RunPod endpoint needs are the ones that tell vLLM how to run (model path, LoRA modules, cache paths, etc.).

---

## Question 4: RunPod Endpoint Environment Variables — What to Keep and Remove

Here's a decision on each existing variable:

### 4a. `NETWORK_VOLUME_ID` = `4jw1fcocwl`

**Remove it.** You are using a serverless endpoint, not a pod with fixed storage. Serverless workers are ephemeral — they spin up, do work, and spin down. They don't use persistent network volumes. This variable is from an older pod-based configuration and does nothing for serverless workers (or worse, could cause confusion during worker initialization if the volume doesn't exist).

### 4b. `MODEL_PATH` = `/workspace/models/Qwen3-Next-80B-A3B-Instruct`

**Remove it.** This points to a Qwen model path on a network volume that no longer applies. With the RunPod serverless template, the model is specified through the "Model" field in the endpoint configuration (which you're changing to `mistralai/Mistral-7B-Instruct-v0.2` per Question 2). The vLLM worker downloads the model from HuggingFace at cold-start — it doesn't need a local path.

### 4c. `TRANSFORMERS_CACHE` = `/workspace/models`

**Remove it.** Same issue — `/workspace/models` refers to a network volume path. The serverless worker uses its own ephemeral storage. The default cache location used by the serverless vLLM template is fine. Leaving this pointing to a non-existent path could cause download failures.

### 4d. `HF_HOME` = `/workspace/.cache/huggingface`

**Remove it.** Same reasoning as 4b/4c. The default location works for serverless workers.

### Summary of RunPod Endpoint Environment Variable Changes

| Variable | Action | Reason |
|----------|--------|--------|
| `NETWORK_VOLUME_ID` | **Remove** | Serverless doesn't use network volumes |
| `MODEL_PATH` | **Remove** | Points to Qwen on a volume; model is set via endpoint "Model" field |
| `TRANSFORMERS_CACHE` | **Remove** | Points to non-existent volume path |
| `HF_HOME` | **Remove** | Points to non-existent volume path |
| `LORA_MODULES` | **Add** (see Q5) | Required for the automation to append new adapters |

After cleanup, the only env var you need to manually add is `LORA_MODULES` (see next question). Everything else is configured through the endpoint's built-in "Model" field.

---

## Question 5: Does `LORA_MODULES` Need to Exist Before Automation Runs?

**Yes — you should create it now with an empty array.** Here's why:

The `auto-deploy-adapter.ts` code in Step 4b reads the existing `LORA_MODULES` value, parses it as JSON, appends the new adapter, and writes it back:

```typescript
const loraModulesEnv = currentEnv.find((e) => e.key === 'LORA_MODULES');
let loraModules: LoraModule[] = [];

if (loraModulesEnv?.value) {
    try {
        loraModules = JSON.parse(loraModulesEnv.value);
    } catch {
        console.warn('Could not parse existing LORA_MODULES — starting fresh');
    }
}

loraModules.push({ name: adapterName, path: hfUploadResult.hfPath });
```

The code handles the case where `LORA_MODULES` doesn't exist yet (it initializes an empty array). So technically it would still work. **However**, the RunPod vLLM worker template *may* expect `LORA_MODULES` to be present at startup to enable LoRA support in the vLLM engine. If the variable is completely absent, the worker might start with LoRA disabled, meaning even after the automation adds it, existing running workers won't use it until their next cold-start.

**Action**: Add this environment variable to the RunPod endpoint now:

| Key | Value |
|-----|-------|
| `LORA_MODULES` | `[]` |

That's a JSON empty array. When the automation runs, it will read `[]`, append the new adapter, and write back `[{"name":"adapter-XXXXXXXX","path":"BrightHub2/lora-emotional-intelligence-XXXXXXXX"}]`.

If you also want the existing production adapter (`6fd5ac79`) to be available, seed it with:

```json
[{"name":"adapter-6fd5ac79","path":"BrightHub2/lora-emotional-intelligence-6fd5ac79"}]
```

---

## Question 6: Is the Deployment Fully Automatic? Is There a Progress Indicator?

### Is It Automatic?

**Yes, once everything is configured, the full flow is automatic:**

```
You train a new adapter in the UI
  → RunPod training worker finishes → writes status='completed' to DB
  → Supabase Webhook fires → hits your Vercel route
  → Route sends 'pipeline/adapter.ready' event to Inngest
  → Inngest runs autoDeployAdapter (7 steps):
    1. Validates the job
    2. Downloads adapter from Supabase Storage
    3. Pushes files to HuggingFace
    4. Updates LORA_MODULES on the RunPod endpoint
    5. Attempts vLLM hot reload (non-fatal)
    6. Creates DB records for UI
    7. Marks job as deployed
  → UI shows "Test Adapter" button
```

No manual intervention required.

### Is There a Progress Bar?

**Not in the BrightRun UI itself** (yet). But there are two ways to monitor progress:

1. **Inngest Dashboard** ([https://app.inngest.com](https://app.inngest.com)) — This is the primary monitoring tool. Go to **Runs** and you'll see the `auto-deploy-adapter` run appear as soon as the webhook fires. Click into it to see each step in real-time:
   - `fetch-job` → `download-adapter` → `push-to-huggingface` → `update-runpod-lora-modules` → `vllm-hot-reload` → `update-inference-endpoints-db` → `update-job-hf-path`
   - Green checkmark = step succeeded
   - Red = step failed (click to see error + stack trace)
   - Steps in progress show a spinner

2. **Database polling** — The `pipeline_training_jobs.hf_adapter_path` column transitions from `NULL` to `BrightHub2/lora-emotional-intelligence-XXXXXXXX` when deployment is complete. This is the definitive "done" signal. You can check it with SAOL or in the Supabase dashboard.

**In the BrightRun UI**, the user experience is:
- Training starts → progress bar for training (already exists)
- Training completes → within ~30–90 seconds, the adapter deploys automatically
- "Test Adapter" button appears in the UI (this is driven by the `pipeline_inference_endpoints` DB records that Step 6 creates)

The gap between "training done" and "Test Adapter appears" is the deployment time. For a future enhancement, a progress indicator showing "Deploying adapter..." during those 30–90 seconds would improve UX, but the backend signals already exist to power it.

---

## Question 7: Multi-Tenant SaaS — How Do Customer Adapters Get Deployed?

This is an important architecture question. Here's how it works today and what it means for scale:

### Current Architecture: Shared Endpoint, Multiple LoRA Adapters

**All customers share the same RunPod serverless endpoint** (`ei82ickpenoqlp`). Each customer trains their own LoRA adapter, which gets added to the `LORA_MODULES` list on that shared endpoint.

```
RunPod Serverless Endpoint: ei82ickpenoqlp
  Base Model: mistralai/Mistral-7B-Instruct-v0.2
  LORA_MODULES:
    - adapter-6fd5ac79  (Customer A's adapter)
    - adapter-608fbb9b  (Customer B's adapter)
    - adapter-abc12345  (Customer C's adapter)
    ... etc.
```

When a customer queries their adapter, the code sends `model: "adapter-XXXXXXXX"` in the vLLM request, and vLLM dynamically applies that specific LoRA adapter on top of the base model. This is **efficient** because:

- **One base model in GPU memory** — Mistral-7B loads once (~14GB VRAM)
- **LoRA adapters are tiny** — Each adapter is ~10–50MB, loaded on demand
- **vLLM supports many LoRA adapters simultaneously** — Dozens of adapters can be registered with minimal memory overhead
- **No separate endpoint per customer** — This keeps RunPod costs low

### The Deployment Flow for a New Customer

When Customer C signs up and trains their first model:

1. Customer C creates training data and starts a training job in the UI
2. Training runs on a RunPod serverless GPU worker (training endpoint — separate from inference)
3. Training completes → adapter `.tar.gz` is stored in Supabase Storage
4. **The exact same automation you just configured** fires:
   - Webhook → Inngest → HuggingFace upload → RunPod `LORA_MODULES` update → DB records
5. Customer C sees "Test Adapter" button and can query their personalized model

**No new endpoint is created.** The adapter is simply appended to the shared endpoint's `LORA_MODULES`.

### When Would You Need Separate Endpoints?

The shared-endpoint model works well up to a certain scale. You'd create separate endpoints when:

| Scenario | Why separate |
|----------|-------------|
| **Enterprise customer with dedicated SLA** | Needs guaranteed cold-start times and worker availability |
| **Too many adapters on one endpoint** | vLLM's adapter hot-swap has diminishing performance with 50+ adapters (unlikely near-term) |
| **Different base models** | If some customers need a different base model (e.g., Llama-3, Mixtral), they need a separate endpoint |
| **Regional isolation** | Customer requires data to stay in a specific geographic region |
| **GPU type upgrade** | Premium customers might need A100/H100 instead of A40 for faster inference |

For now, the shared endpoint with per-customer LoRA adapters is the correct architecture. It's cost-effective, well-tested (this is exactly what companies like Predibase and Together AI do for multi-tenant LoRA serving), and the `auto-deploy-adapter` function handles all the orchestration.

### Data Isolation Note

Even though customers share an inference endpoint, their data is isolated:
- **Adapters**: Each customer's LoRA adapter only encodes patterns from *their* training data. Customer A's adapter cannot access Customer B's knowledge.
- **RAG/Knowledge Base**: Each customer's documents are in their own knowledge base with user-level access control (Supabase RLS).
- **Queries**: The assembled context sent to the model for each query only contains the requesting customer's documents.

The shared endpoint is a *compute* resource — not a data store.
