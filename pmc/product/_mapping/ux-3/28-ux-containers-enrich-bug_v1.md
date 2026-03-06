# 28 — Enrich Bug: "Invalid Request" on Batch with 108 Conversations

## Analysis Document v1

**Date:** 2026-03-03  
**Batch Job:** `ab0543ed-b076-4f9c-a667-1c48afcc8941`  
**Workbase:** `232bea74-b987-4629-afbc-a21180fe6e84`  
**Symptom:** "Enrich All" button returns "Invalid request"  
**Auto-Enrich:** Also failed (last enrich job failed)

---

## Table of Contents

1. [Root Cause Analysis](#1-root-cause-analysis)
2. [Root Cause 1 — Zod `.max(100)` Hard Limit](#2-root-cause-1--zod-max100-hard-limit)
3. [Root Cause 2 — No Request Chunking](#3-root-cause-2--no-request-chunking)
4. [Root Cause 3 — Vercel 60s Timeout](#4-root-cause-3--vercel-60s-timeout)
5. [Auto-Enrich Analysis](#5-auto-enrich-analysis)
6. [Compounding Factors](#6-compounding-factors)
7. [Solution Recommendations](#7-solution-recommendations)
8. [Immediate Fix (Quick)](#8-immediate-fix-quick)
9. [Structural Fix (Robust)](#9-structural-fix-robust)

---

## 1. Root Cause Analysis

**Three compounding issues caused the failure. Issue #1 is the DIRECT cause of the "Invalid request" error.**

| # | Root Cause | File | Line | Severity |
|---|-----------|------|------|----------|
| **1** | Zod schema `conversationIds` array has `.max(100)` — batch had 108 conversations, validation rejected the request | `bulk-enrich/route.ts` | L19 | **Critical** — direct cause |
| **2** | `handleEnrichAll` sends ALL conversation IDs in a single request — no chunking/batching logic | `batch/[jobId]/page.tsx` | L278-322 | **High** — would hit timeout even if limit raised |
| **3** | `bulk-enrich/route.ts` has no `maxDuration` export; Vercel default is 60s — 108 conversations enriched sequentially would take far longer | `vercel.json` + `bulk-enrich/route.ts` | — | **High** — would timeout even if limit raised |

---

## 2. Root Cause 1 — Zod `.max(100)` Hard Limit

### The Code

```typescript
// src/app/api/conversations/bulk-enrich/route.ts, Line 18-19
const BulkEnrichRequestSchema = z.object({
  conversationIds: z.array(z.string().uuid()).min(1).max(100),  // ← HARD LIMIT
  sequential: z.boolean().optional().default(true),
});
```

### What Happens

1. Batch job `ab0543ed` completes with 108 successful conversations
2. User clicks "Enrich All" → `handleEnrichAll()` fires
3. Frontend fetches all completed items via `GET /api/conversations/batch/${jobId}/items?status=completed`
4. Gets back 108 `conversation_id` values
5. Sends `POST /api/conversations/bulk-enrich` with `{ conversationIds: [108 UUIDs] }`
6. Zod `.max(100)` rejects: `ZodError` with issue "Array must contain at most 100 element(s)"
7. The catch block at L175-180 returns `{ success: false, error: 'Invalid request' }` with status 400

### Proof

The error response format matches exactly:

```typescript
// bulk-enrich/route.ts L174-181
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: 'Invalid request', details: error.issues },
      { status: 400 }
    );
  }
```

The frontend reads `enrichData.error` at L313 and throws it:

```typescript
// batch/[jobId]/page.tsx L312-313
if (!enrichResponse.ok) {
  throw new Error(enrichData.error || 'Enrichment failed');
}
```

This surfaces as the "Invalid request" error the user sees.

---

## 3. Root Cause 2 — No Request Chunking

### The Code

```typescript
// batch/[jobId]/page.tsx L294-308
const conversationIds =
  items.data
    ?.map((item: { conversation_id: string | null }) => item.conversation_id)
    .filter(Boolean) || [];

// Sends ALL IDs in one request — no chunking
const enrichResponse = await fetch('/api/conversations/bulk-enrich', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversationIds }),  // ← ALL 108 IDs
});
```

**Problem:** Even if the `.max(100)` limit were raised to 500, sending 108+ IDs for sequential processing in a single HTTP request is architecturally wrong because:

- Each enrichment calls `orchestrator.runPipeline()` which does: fetch raw JSON from storage → validate → enrich → normalize → store enriched JSON → update DB
- Each conversation takes ~1-3 seconds to enrich
- 108 × ~2s = ~216 seconds — far exceeding any reasonable HTTP timeout

---

## 4. Root Cause 3 — Vercel 60s Timeout

### Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/**/*": {
      "maxDuration": 60   // ← 60 seconds for ALL API routes by default
    }
  }
}
```

The `bulk-enrich/route.ts` file does **not** export a `maxDuration` constant (unlike `generate-with-scaffolding/route.ts` which exports `maxDuration = 300`). This means the bulk enrich endpoint has a hard 60-second Vercel timeout.

**Impact:** Even if the Zod limit were raised to 200, and all 108 conversations were sent successfully, the Vercel function would be killed after 60 seconds — likely after enriching only ~30-50 conversations. The response would never reach the client.

---

## 5. Auto-Enrich Analysis

### How Auto-Enrich Works

Auto-enrich fires PER CONVERSATION via Inngest, **not** as a bulk batch:

```
Conversation generated → POST /api/conversations/generate
  → inngest.send('conversation/generation.completed', { conversationId, userId })
    → autoEnrichConversation Inngest function runs (concurrency: 3, retries: 2)
      → orchestrator.runPipeline(conversationId, userId)
```

**Key difference:** Auto-enrich processes each conversation independently via Inngest. It does NOT use the `bulk-enrich` API route. The `.max(100)` limit does NOT affect auto-enrich.

### Why Auto-Enrich Also Failed

The user reported "the last enrich job failed." Based on the user's description of the circumstances, the auto-enrich failures were likely caused by:

1. **Vercel redeployments during processing** — The user "pushed several Vercel deployments between when it started and when it finished." Each deployment kills running serverless functions. The auto-enrich Inngest events would have been emitted during batch processing, but the Inngest handler runs on Vercel serverless. If a deployment happened while an enrichment was in progress, the function would be killed mid-execution.

2. **4-hour pause** — The user "left it paused for 4 hours when I turned off my computer." During this time:
   - Vercel serverless functions would have scaled to 0
   - Inngest events emitted before the pause would have been retried (up to 2 retries), but if all retries failed during deployments, they'd be marked as failed
   - Events emitted after resume would start fresh but could still hit deployment-caused failures

3. **Inngest retry exhaustion** — `autoEnrichConversation` has `retries: 2`. If the Inngest function failed twice (e.g., both retries hit a deployment window), the event is dropped permanently.

### Auto-Enrich vs Manual Enrich — Different Failure Modes

| Mechanism | Trigger | Limit | Failure Mode |
|-----------|---------|-------|-------------|
| **Auto-Enrich (Inngest)** | Per-conversation event after generation | No batch limit, concurrency: 3 | Killed by Vercel redeployments, retry exhaustion |
| **Manual "Enrich All" (API)** | User clicks button → POST to bulk-enrich | `.max(100)` hard limit + 60s Vercel timeout | Zod validation error for >100, timeout for >~40 |

---

## 6. Compounding Factors

### The Perfect Storm

The user's batch experienced a cascade of failures:

```
1. Batch generates 108 conversations (exceeds 100 limit)
2. Auto-enrich Inngest events fire per-conversation during generation
3. User pauses batch for 4 hours → Inngest retries may fail
4. User pushes Vercel deployments → kills in-flight enrichment functions
5. Some auto-enrichments succeed, some exhaust retries and fail
6. Batch completes with 108 conversations
7. User sees unenriched conversations, clicks "Enrich All"
8. Frontend sends 108 IDs in single request → Zod .max(100) rejects
9. User sees "Invalid request" error
```

### Is 108 Conversations a "Hard Limit"?

**No, 108 is not an inherent limit.** The `.max(100)` in the Zod schema was an arbitrary safety guard. The actual limits are:

| Constraint | Current Value | Actual Limit |
|-----------|--------------|-------------|
| Zod array `.max()` | 100 | Arbitrary — can be raised |
| Vercel function timeout | 60s | Plan-dependent (Pro: 300s max) |
| Enrichment per conversation | ~1-3s | Fixed — depends on Supabase + storage |
| Sequential processing limit | ~30-50 conversations per 60s | Math: 60s ÷ ~1.5s = ~40 conversations |
| Request body size | ~16KB for 108 UUIDs | Not an issue — Vercel handles up to 4.5MB |

---

## 7. Solution Recommendations

### Architecture Principle

The fundamental problem is that **bulk enrichment should not be done synchronously in a single API request**. Each enrichment involves multiple I/O operations (storage fetch, DB writes, JSON parsing). This is inherently a background job, not an HTTP request.

### Three options, increasing in robustness:

| Option | Effort | Robustness | Description |
|--------|--------|-----------|-------------|
| **A. Quick Fix** | 30 min | Low | Raise limit, add chunking, add `maxDuration` |
| **B. Inngest-Based** | 2-3 hours | High | Fire individual Inngest events from the "Enrich All" button |
| **C. Full Background Job** | 4-6 hours | Highest | Create a proper enrich batch job with progress tracking |

---

## 8. Immediate Fix (Quick) — Option A

**Changes to make right now to unblock the user:**

### A1. Raise the Zod limit

```diff
// src/app/api/conversations/bulk-enrich/route.ts L19
- conversationIds: z.array(z.string().uuid()).min(1).max(100),
+ conversationIds: z.array(z.string().uuid()).min(1).max(50),
```

Yes, LOWER it to 50 — because the real fix is chunking on the frontend.

### A2. Add chunking to `handleEnrichAll`

```typescript
// src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx
// Replace handleEnrichAll (L278-322) with:

const handleEnrichAll = async () => {
  if (!status || status.status !== 'completed') return;

  try {
    setEnriching(true);
    setEnrichResult(null);

    const response = await fetch(
      `/api/conversations/batch/${jobId}/items?status=completed`
    );
    const items = await response.json();
    if (!response.ok) throw new Error(items.error || 'Failed to fetch batch items');

    const conversationIds =
      items.data
        ?.map((item: { conversation_id: string | null }) => item.conversation_id)
        .filter(Boolean) || [];

    if (conversationIds.length === 0) {
      setEnrichResult({ successful: 0, failed: 0, skipped: 0, total: 0 });
      return;
    }

    // Process in chunks of 25 to stay under limits and timeouts
    const CHUNK_SIZE = 25;
    const chunks = [];
    for (let i = 0; i < conversationIds.length; i += CHUNK_SIZE) {
      chunks.push(conversationIds.slice(i, i + CHUNK_SIZE));
    }

    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const chunk of chunks) {
      const enrichResponse = await fetch('/api/conversations/bulk-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationIds: chunk }),
      });

      const enrichData = await enrichResponse.json();
      if (enrichData.summary) {
        totalSuccessful += enrichData.summary.successful;
        totalFailed += enrichData.summary.failed;
        totalSkipped += enrichData.summary.skipped;
      }
    }

    setEnrichResult({
      successful: totalSuccessful,
      failed: totalFailed,
      skipped: totalSkipped,
      total: conversationIds.length,
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Enrichment failed');
  } finally {
    setEnriching(false);
  }
};
```

### A3. Add `maxDuration` to bulk-enrich route

```typescript
// src/app/api/conversations/bulk-enrich/route.ts — add at top of file after imports
export const maxDuration = 120; // 2 minutes — enough for ~50 conversations
```

---

## 9. Structural Fix (Robust) — Option B

**Use the existing Inngest auto-enrich system instead of the synchronous bulk-enrich API:**

### The Idea

The "Enrich All" button should fire individual `conversation/generation.completed` Inngest events for each unenriched conversation. This reuses the existing `autoEnrichConversation` Inngest function which already has:
- Concurrency limiting (3 parallel)
- Retry logic (2 retries)
- Idempotency (skips already-enriched)
- No HTTP timeout constraints (Inngest manages execution)

### New API Route: `POST /api/conversations/trigger-enrich`

```typescript
// Accepts array of conversation IDs (no limit needed)
// Fires individual Inngest events for each
// Returns immediately — enrichment happens asynchronously

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { conversationIds } = body;
  
  // Fire all events in parallel (Inngest handles concurrency)
  await Promise.all(
    conversationIds.map(id =>
      inngest.send({
        name: 'conversation/generation.completed',
        data: { conversationId: id, userId: user.id },
      })
    )
  );
  
  return NextResponse.json({ 
    success: true, 
    queued: conversationIds.length,
    message: `${conversationIds.length} conversations queued for enrichment`
  });
}
```

### Frontend Change

Update `handleEnrichAll` to call the new route and show a "queued" message instead of waiting for completion:

```typescript
// After calling trigger-enrich:
setEnrichResult({
  successful: 0,
  failed: 0,
  skipped: 0,
  total: conversationIds.length,
  message: `${conversationIds.length} conversations queued for enrichment. They will be processed in the background.`
});
```

### Advantages of Option B

- **No timeout issues** — Inngest functions run independently, not bound by HTTP timeout
- **Built-in retry** — Failed enrichments retry automatically (up to 2×)
- **Concurrency control** — `concurrency: { limit: 3 }` prevents overload
- **Idempotent** — Skips already-enriched conversations
- **Survives deployments** — Inngest events are queued externally, not in Vercel memory
- **Reuses existing code** — No new enrichment logic needed
