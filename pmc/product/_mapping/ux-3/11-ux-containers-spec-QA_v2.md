# v4-Show First Build Bug Audit — Solutions Spec
**Version:** v2
**Date:** 2026-03-01
**Scope:** 6 confirmed runtime bugs in the v4-Show Work Base architecture — root causes verified, solutions chosen.
**Status:** Solutions chosen — ready for implementation spec

---

## App Background (For New Agent Context)

**BrightHub BRun** is a Next.js 14 (App Router) platform with two product tracks:

| Track | User-Facing Name | Purpose |
|-------|-----------------|---------|
| LoRA Training | "Fine Tuning" | Generate conversations → enrich → train LoRA adapter → deploy to RunPod → A/B chat |
| RAG Frontier | "Fact Training" | Upload documents → 6-pass Inngest ingestion → semantic search → chat with citations |

The v4-Show refactor introduced a **Work Base** architecture. A new `workbases` table was added. Routes moved to `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`. The column `knowledge_base_id` was renamed to `workbase_id` on `rag_documents`, `rag_embeddings`, `rag_sections`, and `rag_facts`. **However, two stored PostgreSQL functions that reference the old column names were not updated.** This is the root cause of the complete RAG ingestion failure.

**Key DB tables:**
- `workbases` — new; owns conversations and RAG documents
- `conversations` — has `workbase_id` column (all 51 existing rows have it as NULL)
- `rag_documents`, `rag_sections`, `rag_facts`, `rag_embeddings` — RAG tables; all have `workbase_id`
- `rag_embedding_runs` — tracks embedding passes; Sun Bank shows `status: failed`

**Two stale stored database functions (the core bug):**
- `match_rag_embeddings_kb()` — references `e.knowledge_base_id` (column was renamed to `e.workbase_id`)
- `search_rag_text()` — references `d.knowledge_base_id` (column was renamed to `d.workbase_id`)

**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

---

## Issue 1: Conversations Not Showing on New Dashboard

### Root Cause
All 51 conversations have `workbase_id = NULL` in the database. The new dashboard hook `useConversations({ workbaseId })` appends the filter to the API call, which applies `query.eq('workbase_id', filters.workbase_id)`. Since all rows have NULL, zero conversations are returned.

The conversation generation routes (`POST /api/conversations/generate`, all batch routes) never accept or persist `workbase_id` — it is missing from the route validation schema, the storage service insert, and every call chain between them.

**DB evidence (SAOL, 2026-03-01):**
```
Total conversations: 51  |  Conversations with workbase_id set: 0
4 newest conversations (Feb 28 batch): workbase_id = null on all 4
```

### Chosen Solution

**Part A — Backfill existing 51 conversations:**
Run a SAOL script to `UPDATE conversations SET workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84' WHERE workbase_id IS NULL AND user_id = '[user_id]'`. This assigns all existing conversations to the workbase `rag-KB-v2_v1` (the only active workbase). No other functionality breaks — `workbase_id` is additive and the old `/conversations` page ignores it.

**Part B — New conversation generator inside the workbase UI:**
Build a new conversation generation page at `/workbase/[id]/fine-tuning/conversations/generate` (or as a modal/drawer on the conversations page). This replaces the "Generate your first conversation" CTA that currently redirects to the old `/conversations?workbaseId=[id]` page. The new generator must:
- Accept `workbaseId` from the URL param `[id]`
- Pass it to `POST /api/conversations/generate` (and batch routes) as `workbaseId` in the request body
- The API route stores it as `workbase_id` on the `conversations` row at insert time

**Part C — Keep old generation page:**
The old `/conversations` and `/batch-jobs` pages remain intact and are not removed. They continue to function as the legacy workflow.

---

## Issue 2: "New Work Base" Button Not Visible on `/home`

### Root Cause
James confirmed the button is not visible despite existing in the source code. The code at `home/page.tsx` line 226–229 renders `<Button onClick={openWizard} size="sm">New Work Base</Button>` in a secondary header row. The button is present but is either rendered off-screen, obscured by a layout layer, or the `useWorkbases()` hook is failing (returning 0 workbases) which may suppress part of the rendering, creating a layout conflict.

The `GET /api/workbases` route filters by `status = 'active'`. Both existing workbases are `status: 'active'` and should be returned. However, the page also renders a "Your Work Bases" heading section that always renders — if that section is outside the viewport or has overflow issues, the button may be inaccessible.

### Chosen Solution
Replace the current subtle inline button with a **persistent, always-visible "+" Create Work Base card** that sits alongside the existing workbase cards in the grid. The card should:
- Match the visual style of workbase cards but with a dashed border and a large `+` icon
- Always render regardless of whether workbases exist or the API result
- Trigger the same 4-step wizard (`openWizard()`) on click
- Text: "Create New Work Base"

Remove the current small `size="sm"` button from the secondary header. The wizard itself stays unchanged. The large QuickStart center tile remains for the empty-state case.

---

## Issue 3: Auto-Enrichment Never Fires

### Root Cause
The `autoEnrichConversation` Inngest function (`src/inngest/functions/auto-enrich-conversation.ts`) listens for the `conversation/generation.completed` event. This event is defined as a type in `src/inngest/client.ts` at line 118. **No API route ever calls `inngest.send({ name: 'conversation/generation.completed', ... })`.**

Code grep result: zero occurrences of `conversation/generation.completed` in `src/app/api/`.

### Chosen Solution
Add `inngest.send` calls to **both** conversation generation entry points, emitting the event immediately after each conversation is saved to the database:

1. **`POST /api/conversations/generate/route.ts`** — after `service.createConversation()` succeeds, add:
   ```typescript
   await inngest.send({
     name: 'conversation/generation.completed',
     data: { conversationId: conversation.id, userId: user.id },
   });
   ```

2. **`POST /api/conversations/batch/[id]/process-next/route.ts`** (or whichever route saves individual conversations during batch processing) — same pattern.

The `autoEnrichConversation` function already handles idempotency (skips if `enrichment_status === 'completed'`), retries (2x), and concurrency (limit 3). No changes needed to the Inngest function itself. Dependency: this fix delivers full value only after Part B of Issue 1 is implemented, so conversations have a `workbase_id` when enriched.

---

## Issue 4 & 5: RAG Ingestion Completely Broken (Embedding Failure)

This is the highest-priority issue. Issues 4 (multi-doc chat) and 5 (Sun Bank single-doc chat) are both caused by the same root cause. Issue 5 is a data symptom; the underlying code bug is the same as what broke Venus Bank.

---

### Deep Root Cause Analysis

#### What the Inngest Log Proves

The Inngest log for Venus Bank document `714845cf` (uploaded 2026-03-01) shows the failure occurs at the **first step** of `processRAGDocument`:

```
Event: rag/document.uploaded
  documentId: 714845cf-f241-4e39-9aba-4c3517d408c6

Error: Failed to store sections: Could not find the 'knowledge_base_id' column 
of 'rag_sections' in the schema cache
  at /var/task/src/.next/server/app/api/inngest/route.js
```

The "Failed to store sections:" prefix is thrown by `storeSectionsFromStructure()` in `rag-ingestion-service.ts` (line 654):
```typescript
throw new Error(`Failed to store sections: ${error.message}`);
```

The underlying Supabase/PostgREST error is:
> `Could not find the 'knowledge_base_id' column of 'rag_sections' in the schema cache`

#### Why This Error Occurs During a Plain INSERT

The `storeSectionsFromStructure()` function executes a straightforward INSERT into `rag_sections` with NO reference to `knowledge_base_id`. The PostgREST error is not caused by the insert payload itself — it is caused by **PostgREST's schema cache becoming inconsistent** due to stale stored database functions.

#### The Stale Function Bodies

Two stored PostgreSQL functions were created by migrations 002 and 004 when the column was named `knowledge_base_id`. The v4-Show migration renamed the column to `workbase_id` on the actual tables, but **these function definitions were never updated:**

**`match_rag_embeddings_kb()` body (line 203 of migration 004):**
```sql
AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
```
`e` is `rag_embeddings`. The column `rag_embeddings.knowledge_base_id` was renamed to `workbase_id`. This line now references a non-existent column.

**`search_rag_text()` body (lines 146–158 of migration 004):**
```sql
-- rag_facts branch:
AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
  SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
))
-- rag_sections branch:
AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
  SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
))
```
`d` is `rag_documents`. The column `rag_documents.knowledge_base_id` was renamed to `workbase_id`. Both branches reference a non-existent column.

#### How Stale Functions Break INSERT

When PostgREST loads its schema cache at startup (or reloads on schema change), it **validates all registered RPC functions by inspecting their bodies** alongside the live table schemas. If a function body references a column that no longer exists (`knowledge_base_id`), PostgREST marks the function as invalid. The schema cache becomes partially inconsistent: PostgREST knows the column was referenced but cannot resolve it against the current schema.

When any subsequent PostgREST operation touches a table that the invalid function also references — including `rag_sections`, `rag_facts`, or `rag_embeddings` — PostgREST surfaces the validation error from its cache:
> `Could not find the 'knowledge_base_id' column of 'rag_sections' in the schema cache`

The error attributes itself to `rag_sections` because `search_rag_text` queries `FROM rag_sections s` in its body, and `rag_sections` is the table being actively written to. PostgREST associates the stale column reference with the table in scope.

#### Why Sun Bank Has Sections/Facts But No Embeddings

Sun Bank (`77115c6f`) was uploaded **before** the v4-Show column rename migration was applied. Its sections (29) and facts (1268) were stored successfully under the old schema. When the column rename migration ran, the `storeSectionsFromStructure` step succeeded for Sun Bank (already complete). However, the embedding generation step was retried after the rename migration (or the first attempt failed for another reason), and the retry failed because PostgREST was now in an inconsistent state. The `rag_embedding_runs` record confirms this:

```
status: "failed"   embedding_count: 1298 (attempted)
started_at:  2026-02-26T20:43:34
completed_at: 2026-02-26T20:43:50  ← 16 seconds = failed on first API call
```

The Inngest `processRAGDocument` function marks the `rag_embedding_runs` record as `failed` but the `finalize` step still ran (it runs unconditionally after `generate-embeddings` whether or not it succeeded), setting `rag_documents.status = 'ready'`. This is a silent failure — document shows as ready but has no embeddings.

#### Secondary Code Gaps Found During Investigation

Beyond the stale functions, two application-code gaps were found that must also be fixed:

1. **`storeSectionsFromStructure()` does not insert `workbase_id`** — The insert record (lines 630–644 of `rag-ingestion-service.ts`) does not include `workbase_id`. The `rag_sections` table has this column. Sections are stored with `workbase_id = NULL`, making them invisible to any future workbase-scoped section query.

2. **`storeExtractedFacts()` does not insert `workbase_id`** — The insert record (lines 876–889 of `rag-ingestion-service.ts`) also omits `workbase_id`. Same consequence for `rag_facts`.

---

### Chosen Solution

#### Fix 1 (Critical — Unblocks ALL ingestion): Update the Two Stored DB Functions

Execute a new migration script using SAOL that replaces both functions with updated bodies using `workbase_id`:

**`match_rag_embeddings_kb()` — change ONE line:**
```sql
-- OLD:
AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
-- NEW:
AND (filter_knowledge_base_id IS NULL OR e.workbase_id = filter_knowledge_base_id)
```

**`search_rag_text()` — change TWO subqueries (one in facts branch, one in sections branch):**
```sql
-- OLD:
SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
-- NEW (both occurrences):
SELECT d.id FROM rag_documents d WHERE d.workbase_id = filter_knowledge_base_id
```

The function parameter names (`filter_knowledge_base_id`) can stay unchanged — they are internal to the function signature and the calling TypeScript code (`rag-embedding-service.ts`) uses these exact names. Only the column references inside the function bodies need updating.

The migration script is `scripts/migrations/005-fix-kb-id-rename.js`. After it runs, PostgREST's schema cache resolves correctly and all INSERT/SELECT operations on RAG tables will succeed.

#### Fix 2: Update Application Code — Include `workbase_id` in Section Insert

In `src/lib/rag/services/rag-ingestion-service.ts`, `storeSectionsFromStructure()`, add `workbase_id` to the record map:

```typescript
// Line ~630, inside sectionRecords.map():
return {
  document_id: documentId,
  user_id: userId,
  workbase_id: workbaseId || null,   // ADD THIS
  section_index: index,
  title: section.title,
  original_text: sectionText,
  summary: section.summary,
  token_count: Math.ceil(sectionText.length / 4),
  section_metadata: { ... },
};
```

The `workbaseId` parameter is already accepted by the function signature (line 617: `workbaseId?: string`). The Inngest caller at `process-rag-document.ts` passes `doc.workbaseId` but the value was never propagated into the insert.

#### Fix 3: Update Application Code — Include `workbase_id` in Facts Insert

In `src/lib/rag/services/rag-ingestion-service.ts`, `storeExtractedFacts()`, add `workbase_id` to the record map:

```typescript
// Line ~876, inside facts.map():
const records = facts.map(fact => ({
  document_id: documentId,
  user_id: userId,
  section_id: sectionId,
  workbase_id: workbaseId || null,   // ADD THIS
  fact_type: ...,
  // ... rest unchanged
}));
```

The `workbaseId` parameter is already in the function signature (line 861: `workbaseId?: string`). Same issue as Fix 2 — value accepted but never used.

#### Fix 4 (Data Recovery): Re-trigger Sun Bank Embedding

After Fix 1 is applied, re-trigger the `processRAGDocument` Inngest function for document `77115c6f`. The function's `generate-embeddings` step calls `deleteDocumentEmbeddings(documentId)` first, making it safe to retry with existing sections/facts. The sections (29) and facts (1268) are already stored — only the embedding generation needs to run.

Re-trigger via: call the existing API route `POST /api/rag/documents/77115c6f-b987-4784-985a-afb4c45d02b6/process` (which emits `rag/document.uploaded` to Inngest). This can be done from the document detail page in the Diagnostics tab — confirm the "Reprocess" button exists there. If it does not, use a one-time admin script.

**Do not build a permanent "re-process" button** — Fix 1 prevents the failure from recurring.

#### Fix 5: Add Embedding Hardening (Prevent Future Silent Failures)

The finalize step in `processRAGDocument` currently runs unconditionally after `generate-embeddings`, even if embeddings failed. This results in documents showing `status: 'ready'` with zero embeddings. Fix: check the embedding result before finalizing status.

In `src/inngest/functions/process-rag-document.ts`, the finalize step should set `status: 'embedding_failed'` (or remain at `status: 'processing'`) if `embeddingCount === 0`:

```typescript
// In the finalize step:
const finalStatus = embeddingCount === 0 
  ? 'processing'  // Keep as processing so the user sees it hasn't completed
  : (doc.fastMode ? 'ready' : 'awaiting_questions');
```

This ensures a failed embedding doesn't silently produce a "ready" document that has no chat capability.

---

### Complete Fix Summary for Issues 4 & 5

| Fix | What | Where | Blocks What |
|-----|------|-------|-------------|
| 1 | Update `match_rag_embeddings_kb()` and `search_rag_text()` function bodies | SAOL migration `scripts/migrations/005-fix-kb-id-rename.js` | Unblocks ALL document ingestion |
| 2 | Add `workbase_id` to section insert | `rag-ingestion-service.ts:storeSectionsFromStructure()` | Sections gain proper workbase association |
| 3 | Add `workbase_id` to facts insert | `rag-ingestion-service.ts:storeExtractedFacts()` | Facts gain proper workbase association |
| 4 | Re-trigger Sun Bank embedding | `POST /api/rag/documents/77115c6f.../process` | Restores Sun Bank chat |
| 5 | Guard finalize step on embedding success | `process-rag-document.ts` finalize step | Prevents future silent failures |

---

## Issue 6: Archive Settings Functionality

### Confirmed Behavior
- Archive sets `workbases.status = 'archived'` only. No data is deleted.
- The home page list filters `status = 'active'`, so archived workbases disappear from home.
- Archived workbases remain accessible at their direct URL (`GET /api/workbases/[id]` does not filter by status).
- No restore path exists in the UI. The PATCH handler technically accepts `{ status: 'active' }` but there is no UI element that sends it.

### Chosen Solution

**6a — Archive behavior (keep as-is for testing):** No changes to the archive functionality itself. The current soft-delete behavior is correct and useful for testing.

**6b — Add Restore capability:**
- On `/home`, add a toggle/section: "Archived Work Bases (X)" that expands to show archived workbases
- Each archived workbase card shows a "Restore" button that calls `PATCH /api/workbases/[id]` with `{ status: 'active' }`
- The home page `GET /api/workbases` route currently only returns `status = 'active'`. Add a separate call for archived ones, or accept an optional `?includeArchived=true` query param.

**6c — Replace confirm() with a modal:**
Replace the browser-native `confirm('Are you sure you want to archive this Work Base?')` with a shadcn/ui `AlertDialog` that:
- Explains: "This Work Base will be hidden from your home list. Your data is preserved. You can restore it from the home page."
- Has a red "Archive" confirm button and a "Cancel" button
- No name-typing required (James did not request that level of friction)

**6d — Archive intent (access via URL):** Confirmed: archived workbases remain accessible at their direct URL. The `GET /api/workbases/[id]` route should stay as-is (no status filter on single-item fetch). This matches James's stated intent.

---

## Implementation Order

| Priority | Issue | Fix | Complexity |
|----------|-------|-----|------------|
| 1 — CRITICAL | 4/5 — RAG broken | Fix 1: DB migration (005-fix-kb-id-rename.js) | Small |
| 2 — CRITICAL | 4/5 — RAG broken | Fix 2+3: Add `workbase_id` to section/fact inserts | Small |
| 3 — CRITICAL | 4/5 — RAG broken | Fix 4: Re-trigger Sun Bank processing | Small (admin action) |
| 4 — HIGH | 1 — Conversations null | Backfill existing 51 conversations (SAOL script) | Small |
| 5 — HIGH | 1 — Conversations null | New generator UI inside workbase route | Medium |
| 6 — HIGH | 1 — Conversations null | Pass `workbase_id` in generate API routes | Small |
| 7 — HIGH | 3 — Auto-enrich | Emit `conversation/generation.completed` from generate routes | Small |
| 8 — MEDIUM | 2 — Create WB button | Add persistent "+" card to workbase grid | Small |
| 9 — MEDIUM | 6 — Archive | Add Restore flow + AlertDialog | Medium |
| 10 — MEDIUM | 4/5 — RAG | Fix 5: Guard finalize on embedding count | Small |

---

## DB State Reference (Verified 2026-03-01)

```
workbases:
  232bea74-b987-4629-afbc-a21180fe6e84 | rag-KB-v2_v1    | active | doc_count=2
  4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303 | Sun Chip Policy | active | doc_count=2

conversations: 51 total — all workbase_id=NULL

rag_documents (workbase 232bea74):
  77115c6f | Sun-Chip-Bank-Policy-Document-v2.0.md | ready | facts=1268 | embeddings=0 ❌
  a8f5a781 | Moon-Banc-Policy-Document_v1.md        | ready | facts=650  | embeddings=679 ✅

rag_embedding_runs:
  77115c6f: status=failed,  count=1298 attempted, duration=16s ❌
  a8f5a781: status=completed, count=679, duration=11s ✅

Total rag_embeddings rows: 2530 (across all workbases/documents)
```

---

## Specification Readiness

- [x] All root causes confirmed by evidence (DB queries, Inngest log, code grep)
- [x] Chosen solution for each issue — no rejected alternatives remain
- [x] RAG embedding failure root cause fully identified (stale stored function bodies)
- [x] Implementation order defined
- **Next step:** Follow the next prompts instructions to create the specification document.
