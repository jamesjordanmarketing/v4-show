# Auto-Deploy Adapter Investigation — QA v3

**Date:** February 24, 2026  
**Job ID:** `4e48e3b4-45c0-4ea6-90b2-725759fffce0`  
**User ID:** `8d26cc10-a3c1-4927-8708-667d37a3348b`  
**Inngest Function:** `auto-deploy-adapter`  
**Failed Step:** `download-and-push-to-huggingface`

---

## 1. Symptom

The adapter automation pipeline triggered successfully — the Inngest event `pipeline/adapter.ready` was received, Step 1 (`fetch-job`) passed, and the merged Step 2+3 (`download-and-push-to-huggingface`) began. The step successfully:

1. Downloaded 66,462,106 bytes from Supabase Storage ✅
2. Created/verified the HuggingFace repo `BrightHub2/lora-emotional-intelligence-4e48e3b4` ✅
3. **Crashed** when attempting to create a readable stream for tar extraction ❌

### Error

```
TypeError: Cannot read properties of undefined (reading 'from')
    at /var/task/src/.next/server/app/api/inngest/route.js:8:9059
    at new Promise (<anonymous>)
    at /var/task/src/.next/server/app/api/inngest/route.js:8:8989
```

The step failed with HTTP 400, triggering `dispatch-training-job-failure` in Inngest.

---

## 2. Root Cause

### The failing line

In `src/inngest/functions/auto-deploy-adapter.ts`, line 212:

```typescript
const streamModule = await import('stream');
// ...
const readable = streamModule.Readable.from(tarData);
```

`streamModule.Readable` is **`undefined`**, so calling `.from()` on it throws `TypeError: Cannot read properties of undefined (reading 'from')`.

### Why `streamModule.Readable` is undefined

The `stream` module is a **Node.js built-in**. When imported via dynamic `await import('stream')` inside a webpack-bundled Next.js application, webpack intercepts the import and resolves it through its own module system rather than deferring to the native Node.js runtime.

In the Vercel production bundle (webpack output at `/var/task/src/.next/server/app/api/inngest/route.js`), the dynamic import of `'stream'` returns a **webpack-wrapped module object** where the `Readable` class is not exposed as a direct named export. It may be nested under `.default.Readable` or omitted entirely by webpack's tree-shaking/polyfill logic.

This is a well-known Next.js/webpack issue: **dynamic imports of Node.js built-in modules behave differently than static imports** in webpack-bundled server code. Static imports (`import { Readable } from 'stream'`) are correctly resolved to the native Node.js module at build time, while dynamic imports go through webpack's async module loading which can mangle the export structure.

### Why it wasn't caught earlier

The merged Step 2+3 fix (from Session 6) was written but **never successfully tested in production**. The previous failure was `output_too_large`, which prevented this step from ever reaching the tar extraction code. This is the first time the code path past the download + HF repo creation has actually executed.

### Why `tarStream.extract()` and `zlib.createGunzip()` didn't fail

Looking at the code inside the Promise constructor:

```typescript
const extractor = tarStream.extract();         // line 210 — worked
const gunzip = zlib.createGunzip();            // line 211 — worked
const readable = streamModule.Readable.from(tarData);  // line 212 — CRASHED
```

- **`tarStream.extract()`** — `tar-stream` v3.x is an ESM npm package. When webpack bundles it, the `extract` function is apparently preserved as a named export. However, this is fragile and could break in other environments.
- **`zlib.createGunzip()`** — `zlib` is a Node.js built-in. Its webpack handling apparently preserves `createGunzip` as a named export from the dynamic import, but NOT `Readable.from()` on the `stream` module. The inconsistency is a webpack implementation detail.

---

## 3. Timeline from Logs

| Time (UTC) | Event |
|------------|-------|
| 23:23:45 | Inngest invokes `download-and-push-to-huggingface` step |
| 23:23:47 | `[AutoDeployAdapter] Downloaded 66462106 bytes from Supabase Storage` |
| 23:23:47 | `[AutoDeployAdapter] HuggingFace repo BrightHub2/lora-emotional-intelligence-4e48e3b4 already existed` |
| 23:23:47 | `TypeError: Cannot read properties of undefined (reading 'from')` |
| 23:23:49 | Inngest retry → same error → step returns HTTP 400 |

---

## 4. Fix

### Two changes required:

#### Fix A — `src/inngest/functions/auto-deploy-adapter.ts`

**Replace dynamic imports of Node.js built-ins with static top-level imports.**

Node.js built-in modules (`stream`, `zlib`) must be imported statically so webpack correctly resolves them to native Node.js modules during the server build. Dynamic imports of these modules go through webpack's async module loading, which can mangle the export structure.

**Before (broken):**
```typescript
// Inside the step function:
const zlib = await import('zlib');
const streamModule = await import('stream');
const tarStream = await import('tar-stream');

// ...
const extractor = tarStream.extract();
const gunzip = zlib.createGunzip();
const readable = streamModule.Readable.from(tarData);
```

**After (fixed):**
```typescript
// At the top of the file (static imports):
import { Readable } from 'stream';
import { createGunzip } from 'zlib';

// Inside the step function:
const tarStream = await import('tar-stream');

// ...
const extractor = tarStream.extract();
const gunzip = createGunzip();
const readable = Readable.from(tarData);
```

#### Fix B — `src/next.config.js`

**Add `tar-stream` to `serverComponentsExternalPackages`.**

`tar-stream` v3.x is an ESM-only package. Adding it to external packages tells Next.js to skip webpack bundling and let Node.js handle the module natively at runtime. This ensures the dynamic `import('tar-stream')` returns the correct module with all exports intact.

**Before:**
```javascript
experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'html-to-text'],
}
```

**After:**
```javascript
experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'html-to-text', 'tar-stream'],
}
```

---

## 5. Why These Fixes Are Correct

| Aspect | Explanation |
|--------|-------------|
| **Static imports for Node.js built-ins** | Webpack's server-side build correctly maps static `import { Readable } from 'stream'` to Node.js native `stream` module. This is tested and reliable — it's how every other file in the codebase uses Node.js built-ins. |
| **`tar-stream` as external** | ESM-only packages that are dynamically imported should be excluded from webpack bundling. Node.js 18+ natively supports ESM `import()` and will load `tar-stream` correctly. The `serverComponentsExternalPackages` setting applies to all server-side code (despite the name), including API routes and Inngest function handlers. |
| **No runtime behavior change** | The functions (`Readable.from()`, `createGunzip()`, `tarStream.extract()`) are identical — only the module resolution path changes from webpack-bundled to native Node.js. |
| **`tar-stream` stays as dynamic import** | It's an ESM-only package being imported from a CJS-compiled context. Dynamic `import()` is the correct way to load ESM modules from CJS. Making it external ensures Node.js handles this natively. |

---

## 6. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Static `stream`/`zlib` imports fail at build | **None** | These are standard Node.js built-in imports used throughout the codebase |
| `tar-stream` external causes module-not-found at runtime | **Low** | `tar-stream` is in `dependencies` in both `package.json` and `src/package.json`; Vercel installs it |
| Other steps affected | **None** | Steps 1, 4–7 do not use stream/zlib/tar-stream |
| Inngest step name change | **None** | Step name `download-and-push-to-huggingface` is unchanged from Session 6 |

---

## 7. Verification After Deploy

After committing, pushing, and Vercel redeploying:

1. **Inngest Sync** — Not needed (no step names changed)
2. **Reset job for re-test** — Clear `hf_adapter_path` on job `4e48e3b4`:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentUpdate({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'4e48e3b4-45c0-4ea6-90b2-725759fffce0'}],
    data: { hf_adapter_path: null }
  });
  console.log('Updated:', r);
})();"
```

3. **Trigger webhook** — Fire the webhook manually for job `4e48e3b4`:
```bash
curl -s -X POST https://v4-show.vercel.app/api/webhooks/training-complete \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET_HERE" \
  -d '{
    "type": "UPDATE",
    "table": "pipeline_training_jobs",
    "schema": "public",
    "record": {
      "id": "4e48e3b4-45c0-4ea6-90b2-725759fffce0",
      "user_id": "8d26cc10-a3c1-4927-8708-667d37a3348b",
      "status": "completed",
      "adapter_file_path": "lora-models/adapters/4e48e3b4-45c0-4ea6-90b2-725759fffce0.tar.gz",
      "hf_adapter_path": null
    }
  }'
```

4. **Watch Inngest Dashboard** — Runs → `auto-deploy-adapter` — expect all 7 steps to pass

5. **Verify DB records**:
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'4e48e3b4-45c0-4ea6-90b2-725759fffce0'}],
    select: 'id, hf_adapter_path, updated_at'
  });
  console.log('hf_adapter_path:', r.data[0]?.hf_adapter_path || 'null');
})();"
```

**Expected outcome:**
```
hf_adapter_path: BrightHub2/lora-emotional-intelligence-4e48e3b4
```

---

## 8. Summary

| # | Issue | Root Cause | Fix | File |
|---|-------|-----------|-----|------|
| 1 | `TypeError: Cannot read properties of undefined (reading 'from')` | Webpack dynamic import of Node.js `stream` built-in returns module without `Readable` as direct export | Static import: `import { Readable } from 'stream'` + `import { createGunzip } from 'zlib'` | `src/inngest/functions/auto-deploy-adapter.ts` |
| 2 | `tar-stream` ESM package bundled by webpack (fragile) | Webpack bundles ESM-only `tar-stream` v3.x, which may break export structure | Add `'tar-stream'` to `serverComponentsExternalPackages` | `src/next.config.js` |
