# QA v1: Hugging Face Upload Success & RunPod 401 Error Analysis

**Date:** February 25, 2026
**Focus:** Analyzing the outcome of test Run 73 and resolving the subsequent pipeline failure.

---

## 1. Analysis of Test Run 73

Based on `Inngest-Log-73.txt` and `vercel-73.csv`, **the Hugging Face integration refactoring is a complete success.**

### The Good News (Hugging Face Upload)
The Vercel logs confirm that the `@huggingface/hub` package successfully negotiated the multipart chunking and pushed the `.tar.gz` contents to the hub natively:
*   `[AutoDeployAdapter] Downloaded 66462106 bytes from Supabase Storage`
*   `[AutoDeployAdapter] Extracted 8 files from tar.gz: README.md, adapter_config.json, adapter_model.safetensors, chat_template.jinja...`
*   `[AutoDeployAdapter] Committed 8 files to BrightHub2/lora-emotional-intelligence-4e48e3b4`

The `uploadFiles()` method functioned identically to the Python equivalent, circumventing the previous Node 20 `FormData` limitations.

### The Point of Failure (RunPod GraphQL Update)
Immediately after the Hugging Face upload, the Inngest function proceeded to **Step 4: Update RunPod inference endpoint LORA_MODULES**. 

This step crashed the pipeline:
`Error: [AutoDeployAdapter] RunPod GraphQL fetch failed: HTTP 401`

**Why this happened:**
An HTTP `401 Unauthorized` response from `api.runpod.io/graphql` means the API key provided in the fetch request is actively rejected by RunPod. 
The code currently resolves the key via:
`const RUNPOD_API_KEY = process.env.GPU_CLUSTER_API_KEY || process.env.RUNPOD_API_KEY!;`

Because the pipeline did *not* throw the internal "env var is not set" error, we know Vercel *does* have a value mapped to this variable. However, the value itself is invalid.

---

## 2. Root Cause
The `GPU_CLUSTER_API_KEY` (or `RUNPOD_API_KEY`) configured in your Vercel Environment Variables is either:
1.  **Expired or Revoked** on the RunPod dashboard.
2.  **Mismatched:** It belongs to a different RunPod account than the one hosting `RUNPOD_INFERENCE_ENDPOINT_ID`.
3.  **Permissions:** If RunPod introduced scoped API keys, this key might lack endpoint mutation privileges.

---

## 3. Solution

We cannot simply replace the existing `GPU_CLUSTER_API_KEY` (or `RUNPOD_API_KEY`) because it is actively used by other microservices in the pipeline (like `dispatch-training-job.ts`) for different endpoints. 

Instead, a dedicated environment variable has been introduced to the codebase specifically for the GraphQL mutation: `RUNPOD_GRAPHQL_API_KEY`.

### Action Plan
1.  **Generate a new Key:** Log into the RunPod account that owns the Serverless Inference Endpoint.
2.  Navigate to **Settings -> API Keys** and create a new key (Named **"adapter-push_v1"**).
3.  **Permissions Required:** Ensure this new key has **Read and Write** access (specifically to "Endpoints" or "Serverless" if RunPod scopes are enabled), because it must execute `myself { endpoints }` (Read) and `saveEndpoint` (Write).
4.  **Update Vercel:** Go to your Vercel Project Dashboard -> **Settings -> Environment Variables**.
5.  Add a *new* variable named `RUNPOD_GRAPHQL_API_KEY`, paste the newly generated string, and **Save**.
6.  **Update Local:** Add `RUNPOD_GRAPHQL_API_KEY=your_new_key` to your local `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` file for testing.
7.  **Re-deploy / Re-trigger:** You do not need to push new code to Vercel. Simply go to the Inngest dashboard and replay the failed Run 73, or trigger a new test. The function will seamlessly resume and authenticate with RunPod!

---

## 4. Analysis of Test Runs 74 & 75 (GraphQL Syntax Error)

After applying the new `adapter-push_v1` API key, the `update-runpod-lora-modules` step threw an `HTTP 400 Bad Request` instead of `401 Unauthorized`. 

By adding raw JSON error tracing to the pipeline (Test Run 75), the exact rejection from RunPod's GraphQL API was revealed:
```json
"errors": [
  {"message": "Unknown argument \"filters\" on field \"User.endpoints\"."},
  {"message": "Field \"env\" of type \"[EnvironmentVariable]\" must have a selection of subfields. Did you mean \"env { ... }\"?"}
]
```

### The Fix
RunPod's serverless GraphQL schema does not use `filters: { id }` for endpoints. It exposes an `endpoint(id: String!)` query directly. Furthermore, the `env` field is not a scalar array of strings, it is an array of objects requiring `{ key value }` subselection.

The syntax in `auto-deploy-adapter.ts` has been updated to strictly comply with the RunPod schema:
```graphql
query GetEndpointEnv($id: String!) {
  endpoint(id: $id) {
    id
    env { key value }
  }
}
```
*The `saveEndpoint` mutation was identically updated to subselect `env { key value }`.*
