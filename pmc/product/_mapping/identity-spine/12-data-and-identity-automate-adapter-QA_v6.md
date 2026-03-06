# QA v6: Automated Adapter Deployment Analysis and Solution

**Date:** February 25, 2026
**Focus:** Resolving HuggingFace API Upload Failures in Vercel Serverless (Run 71/72)

---

## 1. Full Analysis of the Issue

### Why Native `FormData` Continues to Fail
The recent attempts to push the adapter using pure Node 20 `FormData` combined with `fetch` (Runs 71 & 72) failed with:
`HTTP 400: {"error":"✖ Invalid input: expected string, received undefined\n  → at value.summary"}`

This error happens because the HuggingFace `commit/main` API isn't built to blindly accept a single large `multipart/form-data` payload containing 60+ MBs. 
By hooking into the inner workings of `@huggingface/hub`, we verified that pushing a commit to Hugging Face is actually a **multi-step graph procedure**:
1. It sends a JSON POST to `/api/models/{namespace}/{repo}/preupload/main` with the names and sizes of the files.
2. The server determines which files need Git LFS (Large File Storage) chunking vs. base64 inline upload (Adapter `.safetensors` files easily exceed 10MB and require LFS).
3. The library uploads LFS files in chunks directly to S3 utilizing presigned URLs.
4. Finally, it POSTs to `commit/main` with a pure JSON body payload (not `multipart`) referencing those uploaded blobs.

Because our native `fetch` was attempting to skip the `preupload` and chunking steps, passing everything as one giant `multipart` request, the server's Zod router rejected the payload schema.

### Why `@huggingface/hub` Failed Previously (Run 70)
In Run 70, the system attempted to use the official `@huggingface/hub` package, but the function crashed at runtime with `Cannot find module '@huggingface/hub'`.

The primary reasons this failed in Vercel were:
1. **Uninstalled:** The package was abandoned and uninstalled, so it is currently missing from `src/package.json`. Vercel simply did not have the module to build.
2. **Missing Vercel Tracing:** When the library *was* installed, if the agent used dynamic imports (e.g. `await import('@huggingface/hub')`), Vercel's `nft` (Node File Trace) skips the module during the serverless final output bundling, meaning it was ripped out of the production build.
3. **ESM vs CJS Clash:** The Hub library is purely ESM, while Vercel Next.js API routes default to CJS.

---

## 2. Solution Recommendation

**We must abandon "Blind Debugging" and restore the official `@huggingface/hub` library.** Re-implementing a bespoke Git LFS multipart uploader via raw `fetch` is highly brittle. The `hugging-vercel-72.txt` documentation provides the exact fix for the original bundling issue without complicating the code.

**Proposed Solution Steps:**

1. **Re-Install the Hub Library**
   Run `npm install @huggingface/hub` inside the `src/` directory.

2. **Fix Next.js Build Configuration**
   Modify `src/next.config.js` to whitelist the package so Webpack avoids mangling the ESM logic. Wait for Vercel File Trace (`nft`) to natively package it:
   ```javascript
   // src/next.config.js
   experimental: {
     serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'html-to-text', 'tar-stream', '@huggingface/hub'],
   }
   ```

3. **Standardize the Import**
   In `src/inngest/functions/auto-deploy-adapter.ts`, switch back to a **static** import at the top of the file. This forces `nft` to trace the dependency into the Vercel function output:
   ```typescript
   import { uploadFiles } from '@huggingface/hub';
   ```

4. **Replace Fetches with `uploadFiles()`**
   Remove the native `FormData` fetching entirely and use `uploadFiles`:
   ```typescript
   await uploadFiles({
     credentials: { accessToken: HF_TOKEN },
     repo: { type: 'model', name: hfPath },
     commitTitle: `Auto-deploy adapter ${adapterName}`,
     files: extractedFiles.map((f) => ({
       path: f.name,
       content: new Blob([new Uint8Array(f.data)])
     }))
   });
   ```

### 3. Review of Current Documentation vs. Proposed Solution
*   **Vercel & Next.js Bundle Limits:** Using `@huggingface/hub` in an API route *is safe* here. Although Vercel has a 4.5MB request/response body limit, we are *fetching* directly from Supabase into memory, then initiating outbound chunked pushes. Since we do not return the 66MB artifact in our HTTP response body, we do not hit the Vercel limits. The Pro memory limit easily handles ~85MB of buffers.
*   **Inngest Limits:** Returning data from the `step.run()` is capped at 4MB, which is why Steps 2+3 are correctly merged; `uploadFiles` natively manages pulling the Buffer from memory and only returns metadata payload JSON.

**Conclusion:** The exact `hugging-vercel-72.txt` workaround is optimal. Reinstalling the package, using `serverComponentsExternalPackages`, and statically importing it removes all custom HTTP hackery and leverages the library specifically designed to upload these exact `.safetensors`.
