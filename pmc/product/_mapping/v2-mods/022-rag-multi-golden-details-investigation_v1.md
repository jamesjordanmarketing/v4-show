# 022 — RAG Quality Investigation: Cron Error & Facts Display Issue

---

| Field | Value |
|-------|-------|
| **Date** | 2026-02-20 |
| **Author** | AI Assistant |
| **Log Source** | `vercel-log-33-cron.csv` |
| **Scope** | Cron job crash investigation + UI facts count discrepancy |

---

## Investigation 1: Cron Job Error in `daily-maintenance`

### Error Location

The error fires daily at **02:00 UTC** from the Vercel Cron scheduler hitting `/api/cron/daily-maintenance`.

```
[Cron] Starting daily maintenance...
[Cron] Daily maintenance failed: TypeError: Cannot read properties of null (reading 'rpc')
    at s.detectUnusedIndexes (/var/task/src/.next/server/chunks/8130.js:1:2374)
    at l (/var/task/src/.next/server/chunks/8130.js:1:1000)
    at u (/var/task/src/...app/api/cron/daily-maintenance/route.js:1:988)
```

Note: The endpoint returns **HTTP 200** despite the error — the error is caught inside `dailyMaintenance()` and logged, but the route still responds with `{ success: true }`. This is a silent failure.

---

### Root Cause Analysis

**The crash is in `detectUnusedIndexes()` in `src/lib/services/index-monitoring-service.ts`.**

```typescript
// src/lib/services/index-monitoring-service.ts
import { supabase } from '@/lib/supabase';   // ← PROBLEM

async detectUnusedIndexes(ageDays: number = 30): Promise<UnusedIndex[]> {
  const { data, error } = await supabase
    .rpc('detect_unused_indexes', { age_days: ageDays });  // supabase is null here
```

**`@/lib/supabase`** is the **browser-side anonymous Supabase client** (uses `createClient` with `anon` key). When this module is imported in a server-side Vercel Function (the cron route), the browser-specific cookie/session code returns `null` because there is no browser context. The `.rpc(...)` call on `null` throws `TypeError: Cannot read properties of null (reading 'rpc')`.

The fix would be to use `createServerSupabaseAdminClient()` (admin/service-role client for server contexts) instead of the browser client singleton.

---

### Is This Cron Still Needed?

**Verdict: Low priority — not needed for RAG module functionality.**

The `daily-maintenance` cron runs a **performance monitoring** routine that:
1. Detects unused database indexes (`detect_unused_indexes` RPC)
2. Checks for high-bloat tables (`get_high_bloat_tables` RPC)

These are dev/ops observability features, not part of the RAG ingestion or query pipeline. The RAG module works correctly without them. They are infrastructure health-check utilities that were likely wired up during early development and have been silently crashing every night since.

**Impact of the crash:**
- No RAG functionality is affected
- No data is corrupted
- The cron returns HTTP 200 anyway (silent failure)
- No alerts or cleanup actions are taken (since the monitoring functions never complete)

---

### Fix Options

**Option A — Disable the cron (recommended for now)**

Remove `/api/cron/daily-maintenance` from `vercel.json`. The RAG module does not depend on it.

**Option B — Fix the client (if observability is wanted)**

Change `index-monitoring-service.ts` and `bloat-monitoring-service.ts` to use the server admin client:

```typescript
// BEFORE (broken in server context):
import { supabase } from '@/lib/supabase';

// AFTER (correct for server-side cron):
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
const supabase = createServerSupabaseAdminClient();
```

The `detect_unused_indexes` and related RPCs must also exist in the Supabase database schema (they may not — this was scaffolded code that was never fully wired to the DB).

**Option C — Add CRON_SECRET env var**

The second cron (`export-file-cleanup`) warns:
```
[Cron] CRON_SECRET not configured - skipping auth check
```
This means any HTTP client can trigger that cron without authentication. If keeping crons, add `CRON_SECRET` to Vercel environment variables.

---

### Second Cron: `export-file-cleanup`

This one **runs successfully** (HTTP 200, no error):
```
[Cron] Starting export file cleanup job...
[Cron] No expired exports found
[Cron] Export file cleanup complete: { found: 0, deleted: 0, failed: 0, logs_updated: 0, duration_ms: 219 }
```

This cron cleans up expired export files (24-hour retention). It is functioning correctly and can be left as-is. The only issue is missing `CRON_SECRET` — add it to secure the endpoint.

---

## Investigation 2: UI Shows 1000 Facts, Header Shows 1048

### Observations

From the new Vercel log (ingestion run at 2026-02-20 ~01:52 UTC):

```
[Inngest] PIPELINE COMPLETE: Sun-Chip-Bank-Policy-Document-v2.0.md
[Inngest]   Status: awaiting_questions
[Inngest]   Sections: 29
[Inngest]   Facts: 1048
[Inngest]   Embeddings: 1030
```

And also:
```
[RAG Embedding] WARNING: 48 facts have no embedding (1048 total facts, 1000 tier-3 embeddings generated).
Check that fact fetch uses .limit(10000).
```

### What "1000" You're Seeing in the UI

**Neither number is 1000 from a database cap.**

Here is the full picture:

| Where | Number | Source |
|-------|--------|--------|
| Page header (`{document.factCount} facts`) | **1048** | `rag_documents.fact_count` column — the authoritative count written by Inngest at pipeline completion |
| Facts card title (`Facts (N)`) | **1048 or lower** | `facts.length` — the array returned by the API, limited by `.limit(10000)` which now correctly fetches all |
| Facts displayed in the card | **max 20** | `facts.slice(0, 20)` — the `DocumentDetail.tsx` component intentionally shows only the first 20 facts with "+N more" |

**The "1000" you saw was from the previous embedding run** (before the DB SQL fix ran). The pipeline's gap-detection warning confirmed `1000 tier-3 embeddings` were generated because the old Inngest deployment (without the `.limit(10000)` fix in the code) fetched only 1000 facts to embed.

### Why There Are Still Only 1030 Embeddings (Not 1048)

The new ingestion run (at 01:52 UTC today) shows:
- **1048 facts** extracted total
- **1030 embeddings** generated
- **48 missing** (still present, warning is still firing)

The gap-detection warning says: *"Check that fact fetch uses `.limit(10000)`"*. This means the `.limit(10000)` fix **is in the deployed code** (the warning message itself was added in the fix), but the fact fetch in the Inngest `generate-embeddings` step is **still returning only 1000 rows**.

### Root Cause of the Persistent Gap

Looking at the pipeline logs for the current ingestion run (`dpl_A57pT22maJhLqTUyXeGKduNvboJ5`):

```
[Inngest] Generating enriched 3-tier embeddings...
[RAG Embedding] WARNING: 48 facts have no embedding (1048 total facts, 1000 tier-3 embeddings generated)
[Inngest] Generated 1030 embeddings (run: 18266272)
```

The 1030 total = 1000 tier-3 (facts) + 29 tier-1 (documents) + 1 tier-2 (KB) = **1030 total** — which matches. So the fact fetch is **still hitting the 1000-row limit** in Inngest.

**Why?** The code fix adds `.limit(10000)` to `process-rag-document.ts` in the `generate-embeddings` step. But Vercel Inngest functions use Inngest's **memoized step execution** — once a step has been run and its result cached, Inngest replays from the cache. However, for a **new invocation** (new document upload), all steps run fresh.

The most likely cause: **the Supabase PostgREST API itself has a server-side row limit**. By default, PostgREST limits all responses to `max_rows` rows (typically 1000) unless the request includes a `Range` header or the query explicitly requests more. The `.limit(10000)` in the JS code sets the `limit` query parameter, which PostgREST **should** respect — but only if the PostgREST `max_rows` setting is ≥ 10000.

**Check in Supabase:** Go to Settings → API → `Max rows`. If this is set to `1000` (the Supabase default), then no matter what `.limit(N)` you pass in client code, PostgREST will cap results at 1000 rows.

---

### Which Number Is Correct?

| Number | Meaning | Trust Level |
|--------|---------|-------------|
| **1048** (header) | True total facts in `rag_facts` table for this document, written by Inngest at pipeline end | ✅ Authoritative |
| **1000** (embedding count) | Facts that actually got embedded — capped by PostgREST max_rows | ⚠️ Incomplete |

**The header (1048) is correct. The embedding coverage (1000/1048 = 95.4%) is still incomplete by 48 facts.**

---

### Resolution Path

**Step 1 — Check Supabase `max_rows` setting**

In the Supabase dashboard:
1. Go to **Settings → API**
2. Find **Max Rows** (or `db_max_rows`)
3. If it is `1000`, change it to `10000` or higher

This is the most likely root cause of the persistent gap.

**Step 2 — Verify fix is deployed**

After changing `max_rows`, re-run the RAG embedding for a new ingestion. Check the Inngest logs for:
```
[Inngest] Embedding coverage: 1048 facts → 1048 tier-3 embeddings (100%)
```
(This log line is only emitted when there is zero gap — the gap-detection was wired to use the DB count vs the tier-3 count.)

**Step 3 — Confirm the UI**

After a successful 100% ingestion, the `/rag/[id]` page should show:
- Header: `1048 facts`
- Facts card: `Facts (1048)` with first 20 shown and `+1028 more facts`

---

## Summary of Findings

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| **Cron crash** (`daily-maintenance`) | Uses browser Supabase client (`@/lib/supabase`) in server context — returns null | Disable cron OR replace with `createServerSupabaseAdminClient()` |
| **Missing CRON_SECRET** | `CRON_SECRET` env var not set | Add to Vercel environment variables |
| **Facts display shows 1000** | You were looking at an old run; `.limit(10000)` is in code but PostgREST `max_rows` server setting caps at 1000 | Change Supabase API `max_rows` to 10000 in dashboard |
| **Embedding gap: 1030 vs 1048** | Same root cause — PostgREST server cap, not code limit | Same fix: raise `max_rows` in Supabase settings |

---

## Recommended Actions (Priority Order)

| Priority | Action | Effort |
|----------|--------|--------|
| **P0** | In Supabase dashboard: Settings → API → set `Max Rows` to `10000` | 2 min |
| **P0** | Re-run RAG embedding and verify 100% coverage (1048/1048) | 15 min |
| **P1** | Disable `daily-maintenance` cron in `vercel.json` (it's non-functional and noisy) | 5 min |
| **P2** | Add `CRON_SECRET` env var to Vercel for `export-file-cleanup` security | 5 min |
| **P3** | Fix `index-monitoring-service.ts` to use server admin client if observability is wanted | 30 min |
