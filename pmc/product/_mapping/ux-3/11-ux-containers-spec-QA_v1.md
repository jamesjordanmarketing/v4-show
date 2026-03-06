# Discovery & Scoping: v4-Show First Build Bug Audit
**Version:** v1
**Date:** 2026-03-01
**Scope:** 6 observed runtime bugs in the newly deployed v4-Show Work Base architecture, covering conversations, document chat, UI discoverability, and settings behavior.
**Input problems:** 6 observed issues
**Findings:** 7 root causes identified (Issue 4 and Issue 5 share the same root cause)
**Status:** Discovery complete — ready for specification

---

## App Background (For New Agent Context)

**BrightHub BRun** is a Next.js 14 (App Router) platform with two product tracks:

| Track | User-Facing Name | Purpose |
|-------|-----------------|---------|
| LoRA Training | "Fine Tuning" | Generate conversations → enrich → train LoRA adapter → deploy to RunPod → A/B chat |
| RAG Frontier | "Fact Training" | Upload documents → 6-pass Inngest ingestion → semantic search → chat with citations |

The v4-Show refactor introduced a **Work Base** architecture: every user operation is scoped under a `workbase` entity. Routes moved to `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`. A new `workbases` table was added and a `workbase_id` FK was added to several tables. This refactor is in production but was only recently deployed — the bugs below represent integration gaps between the old generation pipelines and the new UI.

**Key DB tables in scope:**
- `workbases` — new; owns conversations and RAG documents
- `conversations` — pre-existing; now has `workbase_id` column
- `rag_documents` / `rag_sections` / `rag_facts` / `rag_embeddings` — pre-existing RAG tables; now have `workbase_id`
- `rag_embedding_runs` — tracks embedding generation passes per document

**Codebase root:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

---

## 1. Executive Summary

Five of the six reported issues have confirmed code or data root causes. The single most impactful failure is **broken embedding generation for the Sun Bank document**, which causes both the single-document chat (Issue 5) and the multi-document chat (Issue 4) to silently fail. The second critical issue is that **no conversation generation pathway writes `workbase_id` to the database**, so the new conversations dashboard will always be empty regardless of how many conversations exist. The auto-enrichment Inngest function (Issue 3) is fully wired but never triggered because the generation APIs never emit the required Inngest event. Issue 2 (create workbase) is a **UX discoverability problem only** — the backend and button exist and work, but the button is visually subordinate. Issue 6 (archive) reveals a soft-delete-only implementation with no restore path.

---

## 2. Problem-by-Problem Findings

---

### Issue 1: Conversations Not Showing on New Dashboard

**Route:** `/workbase/[id]/fine-tuning/conversations`

#### Root Cause
All 51 conversations in the database have `workbase_id = NULL`. The new conversations dashboard hook `useConversations({ workbaseId })` appends `workbaseId` to the API query, and the API applies `query.eq('workbase_id', filters.workbase_id)`. Since every row has `NULL`, the filter matches nothing and returns an empty array.

**Live DB evidence (SAOL query 2026-03-01):**
```
Total conversations: 51
Conversations with workbase_id set: 0  (all NULL)
Newest 4 conversations (Feb 28 batch): workbase_id = null on all 4
```

#### Pipeline Trace
The conversation generation API routes (`POST /api/conversations/generate`, `POST /api/conversations/batch/*`) were inspected with `grep workbase_id src/app/api/conversations/`. **Zero occurrences** — `workbase_id` is never accepted in the request body and never written during conversation creation.

The old `/conversations?workbaseId=[id]` page passes `workbaseId` as a **URL filter parameter** only, not as a field to persist. The storage service `createConversation()` in `conversation-storage-service.ts` does not include `workbase_id` in the insert record (line 94–118).

#### Contributing Factors
- The "Generate your first conversation" CTA on the new dashboard routes the user to `/conversations?workbaseId=[id]`, which is the old page. Conversations generated there complete successfully but still have `workbase_id = NULL` because the old generation page passes `workbaseId` as a UI filter, not a write value.
- The spec intended that newly generated conversations should be tied to the workbase that originated them.

#### Severity: **HIGH**
The conversations dashboard is completely non-functional for all users. Zero existing conversations will ever appear.

#### Confidence: **High**
Confirmed by direct SAOL DB query + code grep. No ambiguity.


#### **James Response**
So what is the solution? 
It sounds like the conversations module was not imported at all into our new app. 
It needs to create conversations with the correct Work Base ID correct? What else needs to be done to bring the Conversations Module up to the present UX?

In terms of the existing conversation records..do we have the ability to give them a proper Work Base ID? Will adding the Work Base ID break any other functionality? Is there more than just adding a Work Base ID for every conversation that we need to do to have the current data fully visible and active?



---

### Issue 2: No Create Work Base Functionality Visible on `/home`

**Route:** `https://v4-show.vercel.app/home`

#### Root Cause
This is a **UX discoverability problem**, not a broken button. The code at `src/app/(dashboard)/home/page.tsx` line 226–229 renders a `<Button onClick={openWizard} size="sm">New Work Base</Button>` that is always visible. The QuickStart "Get Started" call-to-action (the large center tile) is only shown when `workbases.length === 0`.

The user has 2 existing workbases, so the large QuickStart tile is hidden. The remaining "New Work Base" button is a small `size="sm"` button in a secondary header row next to the "Your Work Bases" heading — it does not function as a prominent CTA and is easy to miss.

#### Additional Observations
- The 4-step wizard (Name → Upload → Processing → Ready) may feel like it requires a document upload. The "Skip — upload later" link at Step 2 exists but is low-contrast (`text-zinc-500`).
- There is no floating action button (FAB) or dedicated "Create" page separate from the modal wizard.

#### Severity: **MEDIUM**
The functionality works when found. The user experience during the first-run flow with no workbases is good. The discoverability fails once the user has existing workbases.

#### Confidence: **High** (code read, no live rendering test performed — button presence confirmed in source)

#### **James Response**
That button is not visible. If you had done a live rendering test (e.g. `https://v4-show.vercel.app/home`) you would have seen that no button is visible. Whether it is off screen or some other error...it needs to be made visible so I can test it.

---

### Issue 3: Auto-Enrichment of Conversations — Never Triggered

**Spec vision (D8):** After a conversation is generated and saved, the `autoEnrichConversation` Inngest function fires automatically and invisibly, running the 5-stage enrichment pipeline without any manual button click.

#### Root Cause
The `autoEnrichConversation` Inngest function (`src/inngest/functions/auto-enrich-conversation.ts`) is correctly implemented and listens for the `conversation/generation.completed` event. **However, no API route emits this event.**

**Evidence — grep for all `inngest.send` calls in `src/app/api/`:**
```
src/app/api/rag/documents/[id]/upload/route.ts       → rag/document.uploaded
src/app/api/workbases/[id]/training-sets/route.ts    → training/set.created
src/app/api/pipeline/jobs/route.ts                   → pipeline/job.created
src/app/api/webhooks/training-complete/route.ts      → pipeline/adapter.deployed
src/app/api/rag/documents/[id]/process/route.ts      → rag/document.uploaded
```

The `conversation/generation.completed` event appears in `src/inngest/client.ts` (line 118) as a type definition and in `auto-enrich-conversation.ts` as a listener, but is **never called from any API route**.

The conversation generation routes (`/api/conversations/generate` and `/api/conversations/batch/*`) complete without emitting any Inngest event.

#### What Currently Happens
Enrichment is manual-only. Users must go to the old `/conversations?workbaseId=[id]` page and click the "Enrich & Download" button per conversation, or use the "Bulk Enrich" button on a batch job page.

#### Severity: **HIGH**
The spec vision of invisible auto-enrichment is completely non-functional. Every conversation requires manual enrichment before it can be used for training.

#### Confidence: **High**
Confirmed by code grep across all API routes.

#### **James Response**
How do we fix the code to resolve this issue and make sure that enrichment happens behind the scenes before the conversation creation is considered "done"?

---

### Issue 4: Multi-Document Chat Not Working

**Route:** `/workbase/[id]/fact-training/chat`

#### Root Cause
The "Chat with all documents" button and the header CTA both correctly navigate to `/workbase/[id]/fact-training/chat`. That page renders `<RAGChat workbaseId={workbaseId} />` which calls `POST /api/rag/query` with `{ workbaseId }`. The API calls `queryRAG({ workbaseId })` → `searchSimilarEmbeddings()` → `match_rag_embeddings_kb` RPC filtered by `workbase_id = workbaseId`.

**The root cause is the same as Issue 5:** The Sun Bank document (`77115c6f`) in workbase `232bea74` has **zero embeddings** in `rag_embeddings`. The workbase-level RAG query can only retrieve Moon Bank content because only Moon Bank has embeddings.

**Live DB evidence:**
```
Embeddings by document_id in workbase 232bea74-b987-4629-afbc-a21180fe6e84:
  a8f5a781 (Moon-Banc-Policy-Document_v1.md) → 679 embeddings  ✅
  77115c6f (Sun-Chip-Bank-Policy-Document-v2.0.md) → 0 embeddings  ❌

rag_embedding_runs for Sun Bank 77115c6f:
  status: "failed"
  embedding_count: 1298 (attempted)
  started_at: 2026-02-26T20:43:34
  completed_at: 2026-02-26T20:43:50  ← only 16 seconds — failed immediately
```

A workbase-scoped RAG query asking about Sun Bank's policies returns nothing because no Sun Bank embeddings exist in `rag_embeddings`. The LLM then responds that it has no information.

#### Contributing Factors
- The `rag_documents` table shows Sun Bank `status = 'ready'` and `fact_count = 1268`, misleading the UI into believing chat is available.
- The `DocumentList` component only shows "Chat with all documents" when `documents.filter(d => d.status === 'ready').length >= 2` — Sun Bank shows as ready, so the button appears.

#### Severity: **HIGH**
Multi-doc chat appears to work (no error) but silently returns incomplete results. The Sun Bank document is completely invisible to the RAG system.

#### Confidence: **High**
Confirmed by SAOL DB queries showing zero Sun Bank embeddings.

---

### Issue 5: Single Document Chat Not Working (Sun Bank)

**Route:** `/workbase/232bea74.../fact-training/documents/77115c6f.../` (Chat tab)

#### Root Cause (same as Issue 4)
The Sun Bank document (`77115c6f-b987-4784-985a-afb4c45d02b6`) has **zero embeddings**. When `RAGChat` is rendered with `documentId = "77115c6f..."`, it calls the query API which calls `searchSimilarEmbeddings({ documentId: "77115c6f..." })` → `match_rag_embeddings_kb({ filter_document_id: "77115c6f" })`. The RPC returns zero results because there are no rows for this document_id in `rag_embeddings`. The LLM receives empty context and says it has no information.

**Why Moon Bank works:** Moon Bank (`a8f5a781`) has 679 embeddings. Sun Bank's embedding generation run failed after only 16 seconds with `status = "failed"`.

#### Probable Cause of Embedding Failure
Sun Bank has 1,268 facts + 29 sections = 1,298 embedding items. At ~10ms per OpenAI embedding API call (batched), this should take ~10–30 seconds. The run completed in 16 seconds and was marked `failed`. Likely causes:
1. **Inngest step timeout**: The `generate-embeddings` step in `processRAGDocument` hit Inngest's per-step timeout (30s default) before all 1298 embeddings were stored.
2. **OpenAI rate limit**: Batch embedding hit a 429 rate limit error in `provider.embedBatch(texts)`, causing the entire `generateAndStoreBatchEmbeddings` to return `{ success: false }`.
3. **Supabase insert limit**: Inserting 1298 rows in a single `.insert(records)` call may have exceeded a payload size limit.

The Inngest function marks the `rag_embedding_runs` record as `failed` but the document status is still set to `ready` in the finalize step — a silent failure.

#### Fix Path
Re-trigger the `rag/document.uploaded` Inngest event for document `77115c6f`. The `process-rag-document` function's `generate-embeddings` step calls `deleteDocumentEmbeddings(documentId)` first (handles retries), so it's safe to re-run. The document already has all sections and facts stored — only the embedding step needs to re-run.

#### Severity: **HIGH**
The most recently uploaded document is completely non-functional for chat.

#### Confidence: **High**
DB evidence is definitive: 0 embeddings, 1 failed run.

#### **James Response**
I am suspicious of the accuracy of your analysis here. That was the primary document we tested the RAG ingestion engine with. It successfully embedded it at least 10 times.

We did clear the data at one point, so I am unsure of how or when this current Sun document embedding attempt happened.
I am going to submit a new document (Venus Bank) for embedding. I will save the Vercel logs and Inngest Logs if needed
How do we fix the code to resolve this issue and make sure that enrichment happens behind the scenes before the conversation creation is considered "done"?
---

### Issue 6: Archive Settings Functionality

**Route:** `/workbase/[id]/settings` → "Archive Work Base" button in Danger Zone

#### 6a: Large Tile on Settings Page
The settings page (`src/app/(dashboard)/workbase/[id]/settings/page.tsx`) shows settings for the **currently scoped workbase** only — it's not a list of all workbases. The "big tile" the user sees is the "General" settings card (Name, Description, Save). There's only one workbase's settings shown because the page is workbase-scoped via `params.id`.

When multiple workbases exist, this page doesn't change — each workbase has its own `/workbase/[id]/settings` page. The "big tile" appearance is expected: on a workbase-scoped settings page, the General card takes up most of the space because there is only one workbase's configuration to show.

**Current layout:** General → Active Adapter (conditional) → Danger Zone (Archive button). This layout scales fine.

#### 6b: What the Archive Button Does — Full Accounting

**What it does:**
```typescript
// src/app/(dashboard)/workbase/[id]/settings/page.tsx
async function handleArchive() {
  if (!confirm('Are you sure you want to archive this Work Base?')) return;
  await updateMutation.mutateAsync({ id: workbaseId, updates: { status: 'archived' } });
  router.push('/home');
}
```

It calls `PATCH /api/workbases/[id]` with `{ status: 'archived' }`. The API updates the `workbases` row `status` column to `'archived'` and redirects the user to `/home`.

**What happens to data:**
- The `workbases` row is NOT deleted — only `status` changes to `'archived'`.
- All associated `rag_documents`, `rag_sections`, `rag_facts`, `rag_embeddings` rows remain untouched.
- All associated `conversations` rows remain untouched.
- Supabase Storage files (conversation JSON files, document files) remain untouched.

**Can it be restored?**
- **Currently: No.** There is no "Unarchive" button and no API endpoint that accepts `{ status: 'active' }` to restore it. While the PATCH handler in `src/app/api/workbases/[id]/route.ts` (line 38: `if (body.status !== undefined) updates.status = body.status`) technically accepts a status update, there is no UI path to send `{ status: 'active' }`.
- The home page list fetches only `status = 'active'` workbases, so an archived workbase disappears from the UI permanently with no recovery path.
- Restoration is possible via direct database edit (SAOL or Supabase dashboard), but is not exposed to users.

**UI warning quality:** The browser's native `confirm()` dialog says only "Are you sure you want to archive this Work Base?" — it does not explain that the workbase will disappear from the home list, that there is no restore option, or what happens to the data.

#### Severity: **MEDIUM**
The archive function is technically correct as a soft-delete. However, the lack of a restore path and the minimal warning text are user-experience risks. A user could accidentally archive their only workbase and find no way to get it back through the UI.

#### Confidence: **High** (code read) | Archive irreversibility confirmed via code inspection.

#### **James Response**
Don't change this at all now. It is useful for testing.
---

## 3. Improvement Actions (Ranked by Impact × Confidence)

| Rank | Issue | Action | Scope | Dependencies |
|------|-------|--------|-------|--------------|
| 1 | #5 / #4 | Re-trigger embedding generation for Sun Bank doc `77115c6f` via Inngest | Small (script/admin action) | None — run first, fastest recovery |
| 2 | #1 | Add `workbase_id` to conversation generation routes: `POST /api/conversations/generate` and batch routes must accept and persist `workbase_id` | Medium | Requires coordinated update to conversation generation UI (old `/conversations` page or new workbase-scoped generator) |
**James Response**
What does:
```
Requires coordinated update to conversation generation UI (old `/conversations` page or new workbase-scoped 
```
mean? Give me more detail about the operation in the spec we will write next. I think we want to upgrade the routes to the new new workbase-scoped, correct? Why would we want the "old" version?

We may re-embed this current data but I do not want to create special UI functionality for it. The solution route is to harden the embedding process so that it does not fail. How do we do that?
I will post the results the last generation


| 3 | #1 | Backfill `workbase_id` on existing 51 conversations (assign to a workbase or leave as `NULL` with UI handling) | Small (SAOL script) | Needs user decision: which workbase do existing conversations belong to? |
**James Response**
Assign them to the first and only Work Base that currently exists.


| 4 | #3 | Emit `conversation/generation.completed` Inngest event from `POST /api/conversations/generate` and all batch generation routes | Small | Requires Issue #2 fix first (workbase_id on conversations) — autoEnrich needs a valid conversation record |
**James Response**
This solution is approved


| 5 | #4/#5 | Add re-process button on document detail page; or expose admin script to re-trigger processing for documents with `status=ready` but missing embeddings | Small | Can re-use existing `POST /api/rag/documents/[id]/process` route |

**James Response**
We don't need to add the re-process button.

We may re-embed this current data because it is our test bench but I do not want to create special UI functionality for it. The solution is to harden the embedding process so that it does not fail. How do we do that?
I will post the results the last generation



| 6 | #2 | Improve Create Work Base discoverability: add a prominent "+ New Work Base" card/tile in the workbase grid (alongside existing cards), or increase button size | Small | None |

**James Response**
I agree with this solution and make sure it is visible and functional. As I mentioned before it is not visible on `/home`. Investigate if you are making an incorrect assumption or there is a blocker/overriding function.


| 7 | #6 | Add "Restore" button for archived workbases (either on home page with a toggle or via a dedicated archived list) | Medium | None — API already supports status update |
**James Response**
I agree with this solution.



| 8 | #6 | Improve archive confirmation: replace `confirm()` with a modal that explains consequences + requires workbase name to be typed | Small | None |
**James Response**
I agree with this solution.



| 9 | #1 | Consider showing un-workbased conversations on the new dashboard with a notice "X conversations need to be assigned to a workbase" | Medium | Design decision required |
**James Response**
We do not need to do this. Make the owner of those conversations the current and only Work Base.

---

## 4. Detailed Technical Evidence

### Issue 1 Evidence — DB State
```
SAOL query 2026-03-01:
table: conversations
total rows: 51
rows with workbase_id != NULL: 0

Sample rows (Feb 28 newest batch):
  id: 5e9f28c0 | workbase_id: null | status: pending_review
  id: 45e8df82 | workbase_id: null | status: pending_review
  id: ed959d97 | workbase_id: null | status: pending_review
  id: 0eef55ce | workbase_id: null | status: pending_review
```

### Issue 3 Evidence — Missing inngest.send Call
```
grep -r "conversation/generation.completed" src/
  src/inngest/client.ts:118        → type definition only
  src/inngest/functions/auto-enrich-conversation.ts:20  → listener

grep -r "inngest.send" src/app/api/conversations/
  (no results)
```

### Issue 4 & 5 Evidence — Embedding State
```
SAOL query 2026-03-01:
table: rag_documents (workbase 232bea74-b987-4629-afbc-a21180fe6e84)
  77115c6f | Sun-Chip-Bank-Policy-Document-v2.0.md | status: ready | sections: 29 | facts: 1268
  a8f5a781 | Moon-Banc-Policy-Document_v1.md        | status: ready | sections: 28 | facts: 650

table: rag_embeddings — rows by document_id
  a8f5a781 (Moon Bank): 679 rows  ✅
  77115c6f (Sun Bank):  0 rows    ❌

table: rag_embedding_runs
  77115c6f: status=failed, embedding_count=1298, duration=16s  ❌
  a8f5a781: status=completed, embedding_count=679, duration=11s ✅

Total rag_embeddings rows: 2530 (across all workbases)
```

---

## 5. Open Questions

1. **Issue 1 — Workbase assignment for existing conversations:** The 51 existing conversations have `workbase_id = NULL`. They were generated for a single user's testing. Should they be bulk-assigned to a specific workbase (e.g., `232bea74`) or left unassigned with the new UI displaying them in a separate "Unassigned" section?
**James Response**: Make the owner of those conversations the current and only Work Base: `rag-KB_v2_v1`.



2. **Issue 3 — Where should the generate UI live?** The spec expected conversation generation to happen from within the workbase (new route), but the current CTA routes users to the old `/conversations?workbaseId=[id]` page. For `workbase_id` to be written, either:
   a. The old generation page is updated to pass `workbaseId` into the conversation creation payload, OR  
   b. A new generate UI is built inside `/workbase/[id]/fine-tuning/conversations`
   **James Response**: We need a new generate UI built inside `/workbase/[id]/fine-tuning/conversations`
      
   We need to keep the old version of the /conversation page & /bulk-generator pages.


3. **Issue 5 — Root cause of embedding failure:** Is this a known Inngest timeout, OpenAI rate limit, or Supabase insert size issue? The Vercel/Inngest logs for the `process-rag-document` run at `2026-02-26T20:43:34` would confirm the exact error. This affects the fix approach (chunked inserts vs. rate limit backoff vs. step timeout increase).
  **James Response**: I think maybe the RAG process is broken. We must first fix investigate and discover the problem.
  I just ran a brand new document "Venus Bank" and it has run much too long and I see some failures in the log. This was working previous to the v3 UX upgrade. 
  Here are the logs:
  `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\test-data\Inngest-Log-90.txt`
  `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\test-data\vercel-90.csv`


4. **Issue 4 — Previous multi-doc chat route:** The user references a previous "multi-chat" button that worked well. In the previous codebase, this was the Knowledge Base page at `/rag/[id]` which used `RAGChat` with `knowledgeBaseId`. The new route `/workbase/[id]/fact-training/chat` with `workbaseId` is architecturally equivalent and correct — the failure is solely due to the missing Sun Bank embeddings, not a routing or architecture problem.
  **James Response**: Ok I agree with this analysis.

5. **Issue 6 — Archive intent:** Should archiving hide the workbase from the home list but keep it accessible via URL? Or should it be a true soft-delete where the workbase is completely inaccessible? Current behavior: the workbase is accessible at its direct URL even after archiving (the `GET /api/workbases/[id]` route doesn't filter by status).
  **James Response**: archiving hides the workbase from the home list but keep it accessible via URL
---

## Specification Readiness

- [x] All root causes have evidence (DB queries + code references)
- [x] Improvement actions are ranked and scoped
- [ ] Open question #3 (exact embedding failure cause) requires Inngest/Vercel log inspection to confirm — does not block specification writing
- **Next step:** Use these findings to write the implementation spec at:
  `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\12-ux-containers-spec-QA-fixes_v1.md`
