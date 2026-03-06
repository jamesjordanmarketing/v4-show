# 10 — UX Containers: Spec Left To Do

**Date:** February 28, 2026
**References:** `08-ux-containers-spec_v1.md` (original spec), `09-ux-containers-execution-prompts-E01–E05` (what was built)
**Purpose:** Gap analysis — features specified in `08-ux-containers-spec_v1.md` that are NOT yet implemented in `src/`

---

## Status Summary

**Last updated: 2026-02-28 — All code gaps closed.**

| Phase | Code Status | DB Status |
|-------|-------------|-----------|
| Phase 0 — Pre-Work | ✅ Complete | N/A |
| Phase 1 — Database + Foundation (code) | ✅ Complete | ✅ Confirmed applied via SAOL |
| Phase 1 — Database + Foundation (schema) | ✅ Confirmed applied via SAOL | — |
| Phase 2 — Route Structure + Layout | ✅ Complete | N/A |
| Phase 3 — Fine Tuning Pages | ✅ Complete — JSONL build via Inngest `buildTrainingSet` | N/A |
| Phase 4 — Fact Training Pages | ✅ Complete | N/A |
| Phase 5 — Polish + Testing | ✅ Code complete — runtime verification pending (Gap 6) | N/A |

---

## ~~Gap 1 — Database Schema Migrations~~ ✅ CONFIRMED COMPLETE

**Verified via SAOL on 2026-02-28.** All schema changes from Spec §4.1–4.5 are already applied to the live Supabase database:

| Table / Change | Status |
|---------------|--------|
| `workbases` table (9 cols, RLS, 5 policies, index) | ✅ Exists |
| `conversation_comments` table (6 cols, RLS, 5 policies) | ✅ Exists |
| `conversations.workbase_id` column | ✅ Exists |
| `training_files.workbase_id` column | ✅ Exists |
| `pipeline_training_jobs.workbase_id` column | ✅ Exists |
| `rag_documents.workbase_id` (renamed from `knowledge_base_id`) | ✅ Confirmed |
| `rag_embeddings.workbase_id` | ✅ Confirmed |
| `rag_facts.workbase_id` | ✅ Confirmed |
| `rag_sections.workbase_id` | ✅ Confirmed |
| `rag_queries.workbase_id` | ✅ Confirmed |
| `rag_knowledge_bases` table dropped | ✅ Confirmed (does not exist) |

**This is not a gap. Remove from the to-do list.**

---

## ~~Gap 2 — `training_sets` Database Table~~ ✅ COMPLETE

**Applied via SAOL on 2026-02-28.** 12 columns, RLS enabled, 5 policies, 2 indexes.

## Gap 2 — `training_sets` Database Table (historical record)

**Why it's missing:** The spec defined the `TrainingSet` TypeScript type (§4.7) and described the API route behavior (§6.1), but never explicitly listed the DDL for a `training_sets` table in the Phase 1 checklist. The API route at `src/app/api/workbases/[id]/training-sets/route.ts` queries `.from('training_sets')` — if this table doesn't exist in Supabase, all training set operations will fail.

**Required DDL:**

```sql
CREATE TABLE IF NOT EXISTS training_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workbase_id UUID NOT NULL REFERENCES workbases(id),
  name TEXT NOT NULL,
  conversation_ids UUID[] NOT NULL DEFAULT '{}',
  conversation_count INTEGER NOT NULL DEFAULT 0,
  training_pair_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  jsonl_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_sets_select_own" ON training_sets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "training_sets_insert_own" ON training_sets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "training_sets_update_own" ON training_sets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "training_sets_delete_own" ON training_sets FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "training_sets_service_all" ON training_sets FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_training_sets_workbase_id ON training_sets(workbase_id);
CREATE INDEX idx_training_sets_user_id ON training_sets(user_id);
```

---

## ~~Gap 3 — Training Set JSONL Creation Is a Stub~~ ✅ COMPLETE

**Implemented 2026-02-28.** New `buildTrainingSet` Inngest function (`src/inngest/functions/build-training-set.ts`), `training/set.created` event type in `inngest/client.ts`, registered in `inngest/functions/index.ts`. POST route emits the event after DB insert.

## Gap 3 — Training Set JSONL Creation (historical record)

**Spec requirement:** The `POST /api/workbases/[id]/training-sets` route should:
1. Validate all conversations belong to the workbase user ✅ (done)
2. **Aggregate training pairs from selected conversations** ❌ (not done)
3. **Create a JSONL file in Supabase Storage** ❌ (not done)
4. Update `jsonl_path` and `training_pair_count` on the record ❌ (not done)

**Current state:** The route inserts a `training_sets` record with `status: 'processing'` and `training_pair_count: 0`, then returns immediately. No JSONL file is ever created. The record stays in `'processing'` state indefinitely, meaning the Launch Tuning page will show the training set as always "processing" and never "ready".

**What needs to be built:**

### Option A — Synchronous (in the API route, blocking)

After creating the DB record, the route should:
1. Fetch training pairs from the selected conversations (query `conversations` table for `turns` or use the existing enrichment data)
2. Format each conversation as JSONL (OpenAI fine-tuning format: `{"messages": [...]}` per line)
3. Upload the JSONL blob to Supabase Storage bucket (e.g., `training-files/training-sets/{id}.jsonl`)
4. Update the `training_sets` record with `jsonl_path`, `training_pair_count`, `status: 'ready'`

### Option B — Asynchronous (Inngest function, non-blocking)

Create a new Inngest function `buildTrainingSet` triggered by a new event `training/set.created`:

```typescript
// New event in inngest/client.ts
'training/set.created': {
  data: {
    trainingSetId: string;
    workbaseId: string;
    conversationIds: string[];
    userId: string;
  };
};
```

The API route emits this event after creating the DB record. The Inngest function:
1. Fetches conversation turns
2. Builds and uploads JSONL to Supabase Storage
3. Updates `training_sets` record to `status: 'ready'` with `jsonl_path` and `training_pair_count`

**Recommended approach:** Option B (asynchronous) to avoid blocking the API response.

---

## ~~Gap 4 — `useDeleteTrainingSet` Hook Missing~~ ✅ COMPLETE

**Implemented 2026-02-28.** Added `useDeleteTrainingSet` to `src/hooks/useTrainingSets.ts`. Created `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` with DELETE handler.

## Gap 4 — `useDeleteTrainingSet` (historical record)

**Spec requirement:** The spec states the `useTrainingSets.ts` hook should export:
- `useTrainingSets(workbaseId)` ✅
- `useCreateTrainingSet(workbaseId)` ✅
- `useDeleteTrainingSet(workbaseId)` ❌ — not implemented

**File:** `src/hooks/useTrainingSets.ts`

**What to add:**

```typescript
export function useDeleteTrainingSet(workbaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trainingSetId: string) => {
      const res = await fetch(`/api/workbases/${workbaseId}/training-sets/${trainingSetId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingSetKeys.list(workbaseId) });
    },
  });
}
```

This also requires a `DELETE /api/workbases/[id]/training-sets/[tsId]/route.ts` API endpoint (not yet created).

---

## ~~Gap 5 — QuickStart Wizard Not Implemented~~ ✅ COMPLETE

**Implemented 2026-02-28.** Replaced the simple 2-field dialog in `src/app/(dashboard)/home/page.tsx` with a 4-step wizard: Name → Upload → Processing (polls every 5s) → Ready (navigates to fact-training/chat). Inline upload uses `useCreateDocument` + `useUploadDocument` hooks to capture `documentId` for polling.

## Gap 5 — QuickStart Wizard (historical record)

**Spec requirement (Section 8.1):** The "Get Started" button on the Home page should launch a **4-step wizard** (modal/drawer), not a simple 2-field create dialog:

| Step | Content |
|------|---------|
| 1 — Name | Input field for Work Base name |
| 2 — Upload | `DocumentUploader` component inside the wizard |
| 3 — Processing | Shows document processing progress — polls `rag_documents.status` |
| 4 — Chat | Redirects to `/workbase/[id]/fact-training/chat` when document reaches `status: 'ready'` |

**Current state:** The home page (`src/app/(dashboard)/home/page.tsx`) has a simple `Dialog` that collects `name` and `description`, creates the workbase, and navigates to the workbase overview. Steps 2–4 are completely absent.

**What needs to be built:**

A multi-step dialog component (can be inline in `home/page.tsx` or extracted to `src/components/workbase/QuickStartWizard.tsx`) with:

```typescript
// Step state machine
type QuickStartStep = 'name' | 'upload' | 'processing' | 'ready';

// State
const [step, setStep] = useState<QuickStartStep>('name');
const [workbaseId, setWorkbaseId] = useState<string | null>(null);
const [documentId, setDocumentId] = useState<string | null>(null);

// Step 1 → 2: Create workbase, then show DocumentUploader
// Step 2 → 3: After DocumentUploader triggers upload, poll rag_documents status
// Step 3 → 4: When status === 'ready', show "Chat now" button
// Step 4: router.push(`/workbase/${workbaseId}/fact-training/chat`)
```

**Polling logic for Step 3:**

```typescript
// Poll every 5 seconds while step === 'processing'
useEffect(() => {
  if (step !== 'processing' || !documentId) return;
  const interval = setInterval(async () => {
    const res = await fetch(`/api/rag/documents/${documentId}`);
    const json = await res.json();
    if (json.data?.document?.status === 'ready' || json.data?.document?.status === 'awaiting_questions') {
      setStep('ready');
      clearInterval(interval);
    }
  }, 5000);
  return () => clearInterval(interval);
}, [step, documentId]);
```

---

## Gap 6 — Runtime / Deployment Verifications (Spec §8.3, §8.4, P0-4, P5-3, P5-4)

These are not code gaps but required validation steps that haven't been executed:

| Item | Spec Ref | What To Do |
|------|----------|-----------|
| P0-4 | §4.18 | Run `npx tsx scripts/test-worker-refresh.ts` against live RunPod endpoint to validate worker cycling |
| P5-2 | §8.3 | E2E deployment test: trigger `node scripts/retrigger-adapter-deploy.js`, watch Inngest dashboard for `auto-deploy-adapter` → `emit-worker-refresh` → `refresh-inference-workers` → DB status `'ready'` |
| P5-3 | §9 | Identity Spine audit: spot-check all new API routes confirm `requireAuth()`, `user_id` filter, 404 (not 403) on not-found |
| P5-4 | §9 | Vercel deployment build — confirm no compilation errors in production build (`npm run build`) |

---

## ~~Gap 7 — Conversations Page `workbaseId` Filter Not Applied~~ ✅ COMPLETE

**Implemented 2026-02-28.** Added `workbase_id?` to `StorageConversationFilters` and `workbaseId?` to `FilterConfig`. Updated `conversation-storage-service.ts` to filter by `workbase_id`, API route to extract `workbaseId` param, `use-conversations.ts` to pass it in URL, and conversations page to pass `{ workbaseId }` in its filter.

## Gap 7 — Conversations workbaseId filter (historical record)

**Spec requirement (Section 6.1):**
> Section A: `useConversations()` hook (existing, **add `workbaseId` filter when FK migration is complete**)

**Current state:** The conversations page at `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` fetches all conversations for the user, not just those belonging to the current workbase. This is because:
1. The `workbase_id` column on the `conversations` table may not exist yet (see Gap 1c)
2. Even if the column exists, the `useConversations()` hook and the conversations API don't filter by `workbase_id`

**What needs to be done (after Gap 1c is applied):**

Update `GET /api/conversations` to accept an optional `workbaseId` query param and filter:
```typescript
// In src/app/api/conversations/route.ts
const workbaseId = searchParams.get('workbaseId');
if (workbaseId) {
  query = query.eq('workbase_id', workbaseId);
}
```

Update the conversations page to pass `workbaseId` when calling the hook:
```typescript
// Adjust useConversations call to pass workbaseId
const { data: conversations } = useConversations({ workbaseId });
```

Similarly, new conversations created from this page should automatically have `workbase_id` set.

---

## ~~Gap 8 — Minor: One `knowledge_base` String Remnant in `rag.ts`~~ ✅ COMPLETE

**Fixed 2026-02-28.** Changed `queryScope: 'document' | 'knowledge_base'` to `'document' | 'workbase'` in `src/types/rag.ts`. Updated `rag-db-mappers.ts` to translate legacy DB value `'knowledge_base'` → `'workbase'` at the mapping layer.

## Gap 8 — `knowledge_base` remnant (historical record)

**File:** `src/types/rag.ts`, line 193

```typescript
queryScope: 'document' | 'knowledge_base';  // tracks whether query was doc-level or KB-level
```

The value `'knowledge_base'` in the union type still uses the old terminology. This doesn't break anything at runtime (it's a string value in a type union), but for consistency the spec called for complete removal of KB terminology:

```typescript
// Suggested update:
queryScope: 'document' | 'workbase';  // tracks whether query was doc-level or workbase-level
```

---

## Implementation Priority Order

**All code gaps are closed as of 2026-02-28.** Only Gap 6 (runtime verifications) remains — these are manual execution steps.

1. ~~**Gap 2 (`training_sets` table)**~~ ✅
2. ~~**Gap 7 (Conversations workbaseId filter)**~~ ✅
3. ~~**Gap 3 (Training Set JSONL creation)**~~ ✅
4. ~~**Gap 4 (`useDeleteTrainingSet`)**~~ ✅
5. ~~**Gap 5 (QuickStart Wizard)**~~ ✅
6. **Gap 6 (Runtime verifications)** — Execute manually after deployment.
7. ~~**Gap 8 (Minor remnant)**~~ ✅

---

## Files Created or Modified

| # | File | Action | Gap | Status |
|---|------|--------|-----|--------|
| 1 | ~~Supabase: `workbases` table~~ | ~~CREATE via SAOL~~ | Gap 1 | ✅ Done |
| 2 | ~~Supabase: `conversation_comments` table~~ | ~~CREATE via SAOL~~ | Gap 1 | ✅ Done |
| 3 | ~~Supabase: `workbase_id` columns on 3 tables~~ | ~~ALTER via SAOL~~ | Gap 1 | ✅ Done |
| 4 | ~~Supabase: rename `knowledge_base_id` on 5 RAG tables~~ | ~~ALTER via SAOL~~ | Gap 1 | ✅ Done |
| 5 | ~~Supabase: drop `rag_knowledge_bases`~~ | ~~DROP via SAOL~~ | Gap 1 | ✅ Done |
| 6 | ~~Supabase: `training_sets` table~~ | ~~CREATE via SAOL~~ | Gap 2 | ✅ Done |
| 7 | `src/app/api/workbases/[id]/training-sets/route.ts` | MODIFIED — POST emits `training/set.created` event | Gap 3 | ✅ Done |
| 8 | `src/inngest/functions/build-training-set.ts` | NEW — `buildTrainingSet` Inngest function | Gap 3 | ✅ Done |
| 9 | `src/inngest/client.ts` | MODIFIED — added `training/set.created` event type | Gap 3 | ✅ Done |
| 10 | `src/inngest/functions/index.ts` | MODIFIED — registered `buildTrainingSet` | Gap 3 | ✅ Done |
| 11 | `src/app/api/workbases/[id]/training-sets/[tsId]/route.ts` | NEW — DELETE endpoint | Gap 4 | ✅ Done |
| 12 | `src/hooks/useTrainingSets.ts` | MODIFIED — added `useDeleteTrainingSet` | Gap 4 | ✅ Done |
| 13 | `src/app/(dashboard)/home/page.tsx` | MODIFIED — 4-step QuickStart wizard | Gap 5 | ✅ Done |
| 14 | `src/app/api/conversations/route.ts` | MODIFIED — added `workbaseId` filter param | Gap 7 | ✅ Done |
| 15 | `src/hooks/use-conversations.ts` | MODIFIED — passes `workbaseId` in URL params | Gap 7 | ✅ Done |
| 16 | `src/lib/types/conversations.ts` | MODIFIED — added `workbaseId?` to `FilterConfig` and `workbase_id?` to `StorageConversationFilters` | Gap 7 | ✅ Done |
| 17 | `src/lib/services/conversation-storage-service.ts` | MODIFIED — filters by `workbase_id` | Gap 7 | ✅ Done |
| 18 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | MODIFIED — passes `{ workbaseId }` to `useConversations` | Gap 7 | ✅ Done |
| 19 | `src/types/rag.ts` | MODIFIED — `'knowledge_base'` → `'workbase'` in `queryScope` type | Gap 8 | ✅ Done |
| 20 | `src/lib/rag/services/rag-db-mappers.ts` | MODIFIED — translates legacy `'knowledge_base'` DB value to `'workbase'` | Gap 8 | ✅ Done |

---

*End of gap analysis*
