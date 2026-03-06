# Build Plan: Spec 29 + Spec 30 Coordination

**Version:** 1.0  
**Date:** 2026-03-04  
**Purpose:** Sequence and conflict analysis for coordinating two parallel specs before execution

---

## 1. What Each Spec Does (Summary)

### Spec 29 — Batch Conversation Pipeline Inngest Migration
Migrates batch conversation generation from a browser-driven polling loop to Inngest-managed background processing. The browser previously had to stay open and run a `while` loop calling `POST /api/batch-jobs/[id]/process-next`. After this spec, all batch processing runs server-side via Inngest regardless of browser state.

| Prompt | Focus |
|--------|-------|
| E01 | DB columns on `batch_jobs`/`batch_items` + 3 Inngest event types + 2 new Inngest functions + register them |
| E02 | Emit Inngest events from `generate-batch` and `cancel` routes + deprecate `process-next` and `bulk-enrich` routes + remove dead code from `batch-generation-service` |
| E03 | Convert batch watcher page `batch/[jobId]/page.tsx` from processing driver to polling-only status viewer |

### Spec 30 — Training Set Build Visibility + Partial Processing Fix
Adds structured error storage when training set builds fail, creates a Training Sets monitoring page, and improves conversation discovery through cross-page selection, enrichment sorting, and an enrichment filter.

| Prompt | Focus |
|--------|-------|
| E01 | DB columns on `training_sets` + update Inngest rebuild/build functions to store errors + bypass API endpoint |
| E02 | New Training Sets monitoring page + "Training Sets" button on conversations page + dropdown `failed` state handling in ConversationTable |
| E03 | Cross-page selection (Zustand store) + page size selector + server-side enrichment sort + enrichment status filter + enrichment label fix |

---

## 2. Full File Inventory — Side by Side

| File | Spec 29 | Spec 30 |
|------|---------|---------|
| **DB: `batch_jobs`** | E01 — add `inngest_event_id` | — |
| **DB: `batch_items`** | E01 — add `processing_started_at` | — |
| **DB: `training_sets`** | — | E01 — add `last_build_error`, `failed_conversation_ids` |
| `src/inngest/client.ts` | E01 — add 3 event types | — |
| `src/inngest/functions/index.ts` | E01 — replace entire file (9→11 functions) | — |
| `src/inngest/functions/rebuild-training-set.ts` | — | E01 — update catch + success blocks |
| `src/inngest/functions/build-training-set.ts` | — | E01 — update catch + success blocks |
| `src/lib/services/batch-item-processor.ts` | E01 — **NEW** | — |
| `src/inngest/functions/process-batch-job.ts` | E01 — **NEW** | — |
| `src/inngest/functions/batch-enrich-conversations.ts` | E01 — **NEW** | — |
| `src/app/api/conversations/trigger-enrich/route.ts` | E02 — **NEW** | — |
| `src/app/api/conversations/generate-batch/route.ts` | E02 — add Inngest emit | — |
| `src/app/api/batch-jobs/[id]/cancel/route.ts` | E02 — add Inngest emit | — |
| `src/app/api/batch-jobs/[id]/process-next/route.ts` | E02 — replace with 410 Gone | — |
| `src/app/api/conversations/bulk-enrich/route.ts` | E02 — replace with 410 Gone | — |
| `src/lib/services/batch-generation-service.ts` | E02 — remove dead code | — |
| `src/app/api/workbases/[id]/training-sets/route.ts` | — | E01 — add new fields to GET map |
| `src/app/api/workbases/[id]/training-sets/[tsId]/bypass/route.ts` | — | E01 — **NEW** |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/batch/[jobId]/page.tsx` | E03 — full rewrite | — |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/training-sets/page.tsx` | — | E02 — **NEW** |
| `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | — | E02 + E03 — add button, filter, sort, page size |
| `src/components/conversations/ConversationTable.tsx` | — | E02 + E03 — dropdown failed state, selection, sort |
| `src/stores/conversation-store.ts` | — | E03 — add 2 new selection actions |
| `src/lib/services/conversation-storage-service.ts` | — | E03 — add enrichment_status filter |
| `src/app/api/conversations/route.ts` | — | E03 — pass enrichment_status |
| `src/lib/types/conversations.ts` | — | E03 — add enrichment_status to interface |

---

## 3. Overlap Analysis

**Result: Zero file-level conflicts.**

After mapping every file touched by each spec, the two specs operate on completely separate parts of the codebase. No file is modified by both specs.

The table above confirms:
- Spec 29 owns: batch pipeline files, Inngest client/index, batch watcher page, bulk-enrich deprecation
- Spec 30 owns: training sets pipeline files, conversations page, ConversationTable, conversation store, enrichment filter backend

The only potential for confusion was `src/inngest/functions/index.ts` — Spec 29 E01 replaces the entire file with a hardcoded 11-function version. However, Spec 30 adds no new Inngest functions, so the hardcoded version is complete and correct regardless of execution order.

---

## 4. Execution Order Recommendation

### **Execute Spec 30 first (E01 → E02 → E03), then Spec 29 (E01 → E02 → E03).**

### Reasoning

**Spec 30 is higher priority:**

1. **Spec 30 fixes an active, user-blocking bug** — Training sets are currently getting stuck in `failed` state with no recovery path. Users cannot add conversations, cannot see why builds fail, and cannot find unenriched conversations that are causing the failures. This is a live operational problem.

2. **Spec 29 is an architectural improvement** — Moving batch generation to Inngest eliminates the "browser must stay open" limitation, but the current batch generation *works*. It's important but not blocking anyone right now.

3. **Spec 30 unlocks the testing workflow** — Once the Training Sets monitoring page exists and the enrichment filter works, the user can identify the 4 unenriched conversations that caused the recent failure, sort/filter to find others, and recover any stuck sets. The spec 29 improvements are useful but not needed to unblock this.

4. **Spec 30 has lower deployment risk** — Spec 30 is additive (new DB columns, new page, new endpoint). The most significant change is the `ConversationTable.tsx` and `conversations/page.tsx` modifications, but these are well-scoped. Spec 29 involves deprecating routes, replacing a 756-line page, and routing all batch processing through a new Inngest function — a more significant behavioral change with more places to debug.

5. **Neither spec depends on the other** — There are no function calls, event types, or imports shared between them.

### Execution Sequence

```
Session 1: Spec 30 E01
  → DB migration (training_sets columns)
  → Modify rebuild-training-set.ts
  → Modify build-training-set.ts
  → Modify training-sets/route.ts
  → Create bypass/route.ts
  → TypeScript check

Session 2: Spec 30 E02
  → Create training-sets/page.tsx
  → Modify conversations/page.tsx (Training Sets button)
  → Modify ConversationTable.tsx (failed dropdown state)
  → TypeScript check

Session 3: Spec 30 E03
  → Modify conversation-store.ts (new selection actions)
  → Modify ConversationTable.tsx (selection, sort props, label)
  → Modify conversations/page.tsx (page size, server sort, enrichment filter)
  → Modify conversation-storage-service.ts
  → Modify conversations/route.ts
  → TypeScript check

→ Deploy to Vercel. Verify training sets monitoring, enrichment filter, cross-page selection.

Session 4: Spec 29 E01
  → DB migration (batch_jobs, batch_items columns)
  → Add 3 event types to inngest/client.ts
  → Create batch-item-processor.ts
  → Create process-batch-job.ts
  → Create batch-enrich-conversations.ts
  → Replace inngest/functions/index.ts (9→11 functions)
  → TypeScript check

Session 5: Spec 29 E02
  → Create trigger-enrich/route.ts
  → Modify generate-batch/route.ts (emit Inngest event)
  → Modify cancel/route.ts (emit Inngest cancel event)
  → Replace process-next/route.ts with 410 Gone
  → Replace bulk-enrich/route.ts with 410 Gone
  → Remove dead code from batch-generation-service.ts
  → TypeScript check

Session 6: Spec 29 E03
  → Rewrite batch/[jobId]/page.tsx (polling-only status viewer)
  → TypeScript check

→ Deploy to Vercel. Verify batch generation works with tab closed.
```

---

## 5. Execution Prompt Update Requirements

**Assessment: No execution prompt updates are required for sequencing purposes.**

Both specs are correctly written for independent execution. No file is touched by both, and no spec assumes state that the other spec creates.

### However — One Known Bug in Spec 30 E03

**File:** `30-training-set-add-execution-prompts-E03_v1.md`, Task 2e (selection banner)

**Problem:** The "(across multiple pages)" indicator uses `text-blue-500`:
```tsx
<span className="text-xs ml-1 text-blue-500">
  (across multiple pages)
</span>
```

This violates the project's strict design token rules which forbid hardcoded color classes (`zinc-*`, `slate-*`, `gray-*`, and by extension raw Tailwind color classes). The correct token is `text-duck-blue`.

**Required fix before execution of Spec 30 E03:**

The executing agent must change `text-blue-500` to `text-duck-blue` in the selection banner span:
```tsx
<span className="text-xs ml-1 text-duck-blue">
  (across multiple pages)
</span>
```

This is the only update required to either spec's execution prompts.

---

## 6. Post-Spec-30, Pre-Spec-29 Verification Gate

Before starting Spec 29, confirm that Spec 30 is fully deployed and the following work on production (`https://v4-show.vercel.app/`):

- [ ] `/workbase/[id]/fine-tuning/training-sets` loads without errors
- [ ] A failed training set shows the error panel with failed conversation IDs
- [ ] "Bypass & Rebuild" button works on a failed set
- [ ] Enrichment filter dropdown is visible on the conversations page
- [ ] Filtering by "Not Enriched" returns only unenriched conversations
- [ ] Clicking "Enrichment" column header sorts across pages
- [ ] Selecting conversations on page 1, navigating to page 2, then clicking "Select All" merges (does not replace)
- [ ] TypeScript compiles without errors after all 3 Spec 30 prompts

Only proceed to Spec 29 after all checks pass.

---

## 7. Spec 29 Deployment Verification Gate

After deploying Spec 29, verify these before considering complete:

- [ ] Create a new batch job of 3+ conversations and close the browser tab immediately
- [ ] Wait 2 minutes, return to the batch watcher page — job has progressed without the tab being open
- [ ] Inngest dashboard shows `process-batch-job` function was invoked
- [ ] "Processing in background..." badge is visible while job runs
- [ ] Cancel button works and stops Inngest processing
- [ ] After completion, "Enrich All" queues enrichment via Inngest (not synchronous)
- [ ] `POST /api/batch-jobs/[id]/process-next` returns 410 Gone
- [ ] `POST /api/conversations/bulk-enrich` returns 410 Gone

---

## 8. Risk Register

| Risk | Spec | Severity | Mitigation |
|------|------|----------|------------|
| Design token violation (`text-blue-500`) | 30-E03 | Low | Fix to `text-duck-blue` before execution |
| Spec 29 E01 `index.ts` hardcoded replacement — assumes exactly 9 original functions exist | 29-E01 | Low | Not an issue — Spec 30 adds no new Inngest functions; the 9 original names are unchanged |
| Inngest `cancelOn` behavior for Spec 29 not tested | 29-E03 | Medium | Test cancel flow explicitly in verification gate |
| Vercel timeout on long batch jobs | 29 overall | Low | Inngest solves this — it's the whole point of the migration |
| First Spec 30 deployment may need DB migration synced in Supabase | 30-E01 | Low | SAOL confirms columns before proceeding |
| Spec 30 E02 adds `useRouter` to ConversationTable — may already exist | 30-E02 | Low | E02 explicitly says "check if already present before adding" |

---

## 9. Summary

| Question | Answer |
|----------|--------|
| Which spec first? | **Spec 30** |
| Any file conflicts? | **None** |
| Any execution prompt updates needed? | **Yes — one: change `text-blue-500` to `text-duck-blue` in Spec 30 E03 Task 2e** |
| Can they be run in parallel? | **No** — Spec 30 E02 and E03 both modify `conversations/page.tsx` and `ConversationTable.tsx`; they must be sequential within Spec 30. Spec 29 and Spec 30 could theoretically be run in parallel since they share no files, but sequential deployment is recommended for easier debugging. |
| Total sessions required? | **6** (3 per spec) |
| Deployment point? | After Spec 30 E03 deploys, verify fully before starting Spec 29 E01 |
