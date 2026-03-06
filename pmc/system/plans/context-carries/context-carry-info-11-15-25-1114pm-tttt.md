# Context Carryover: v4-Show Bug Fixes — Session 9

**Last Updated:** March 1, 2026  
**Document Version:** context-carry-info-11-15-25-1114pm-tttt  
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`  
**Previous Codebase (v2):** `C:\Users\james\Master\BrightHub\BRun\v4-show\`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`.
3. Read and internalize the * *v4-Show codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` (note: `src/` within v4-Show only contains node_modules — the application source lives at the root level `C:\Users\james\Master\BrightHub\BRun\v4-show\`).
4. Pay special attention to the files listed in the **Key Files Modified** section below.
5. Read the **Manual Test Tutorial** at the bottom of `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\12-ux-containers-spec-QA-specification_v1.md` (lines ~1113–1215).
6. Then **wait for the human to tell you what to do next**.

The human's **next step is to test the Session 9 implementation**, fix any bugs discovered during QA, and address small pathing or UI upgrades. Nothing has been tested against the live app yet.

**Do not start anything until the human tells you what to do.**

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure.
2. **Enrichment Pipeline**: 5-stage validation and enrichment for quality assurance.
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL).
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations.
5. **Download System**: Export both raw and enriched JSON formats.
6. **LoRA Training Pipeline**: Database, API routes, UI, training engine & evaluation.
7. **Adapter Download System**: Download trained adapter files as tar.gz archives.
8. **Automated Adapter Testing**: RunPod Pods (working) + Serverless (preserved).
9. **Multi-Turn Chat Testing**: A/B testing, RQE evaluation, dual progress.
10. **RAG Frontier**: Knowledge base management, document upload, multi-doc context assembly, HyDE + hybrid search, self-evaluation.
11. **Automated Adapter Deployment**: (FULLY FUNCTIONAL as of Session 8) - Pushes trained adapters to Hugging Face and hot-loads them into RunPod serverless endpoints.
12. **Work Base Architecture (v4-show)**: Every operation is scoped to a `workbase` entity. Routes at `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`.

---

## 🎯 Session 9 Summary: v4-Show Bug Fixes

This session implemented 10 bug fixes and feature changes against the * *v4-Show codebase** (`C:\Users\james\Master\BrightHub\BRun\v4-show\`). The source specification was:  
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\12-ux-containers-spec-QA-specification_v1.md`

### Verified DB State (as of 2026-03-01, confirmed by pre-flight script)

| Entity | State |
|--------|-------|
| `workbases` (active) | 2 active: `232bea74` (`rag-KB-v2_v1`) and `4fc8fa25` (`Sun Chip Policy Doc #30`) |
| `conversations` | 51 total — all now have `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'` (backfilled in Task 5) |
| `rag_sections` | Has `workbase_id` column (no `knowledge_base_id` — already renamed) |
| `rag_facts` | Has `workbase_id` column |
| Sun Bank doc `77115c6f` | 0 embeddings — needs re-trigger (Task 10 script created, not yet run) |

---

### What Was Done — 10 Tasks

#### Task 1: Pre-flight Verification Script ✅ (run and verified)
- **Script created:** `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\verify-005-preflight.js`
- Confirmed DB state matches spec before any changes.

#### Task 2: DB Migration — Fix Stale RPC Function Bodies ✅ (run and succeeded)
- **Script created and executed:** `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\005-fix-kb-id-rename.js`
- **Root cause fixed:** Two PostgreSQL stored functions (`match_rag_embeddings_kb` and `search_rag_text`) referenced `knowledge_base_id` in their bodies even after the column was renamed to `workbase_id`. This broke PostgREST's schema cache, causing `"Could not find the 'knowledge_base_id' column of 'rag_sections' in the schema cache"` errors on ALL document INSERTs, completely blocking the ingestion pipeline.
- **Fix:** `CREATE OR REPLACE FUNCTION` rewrites both functions to reference `e.workbase_id` / `d.workbase_id`. Parameter names (`filter_knowledge_base_id`) were intentionally kept unchanged — they are internal and the TypeScript calling code uses them.
- **Effect:** All document ingestion is now unblocked.

#### Task 3: Add `workbase_id` to Section and Fact Inserts ✅
- **File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts`
- Added `workbase_id: workbaseId || null` to the insert object in `storeSectionsFromStructure()` (around line 630).
- Added `workbase_id: workbaseId || null` to the insert object in `storeExtractedFacts()` (around line 876).
- Both functions already accepted `workbaseId?: string` as a parameter — the value just wasn't being passed to the DB.

#### Task 4: Guard Finalize Step Against 0 Embeddings ✅
- **File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts`
- In Step 12 (finalize), replaced the unconditional `const finalStatus = doc.fastMode ? 'ready' : 'awaiting_questions'` with a guard: if `embeddingCount === 0`, status is set to `'processing'` instead of `'ready'`.
- This prevents documents from appearing chat-ready when embeddings failed to generate.

#### Task 5: Backfill 51 Conversations With `workbase_id` ✅ (run and verified)
- **Script created and executed:** `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\backfill-conversations-workbase.js`
- Assigned all 51 existing conversations (user `8d26cc10`) to workbase `232bea74` (`rag-KB-v2_v1`).
- Post-run verification: 0 conversations with NULL `workbase_id` remaining.

#### Task 6: Thread `workbaseId` Through Generate API + Emit Inngest Event ✅
- **File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\generate\route.ts`
- Added `workbaseId: z.string().uuid().optional()` to the Zod schema.
- Added imports for `createServerSupabaseAdminClient` and `inngest`.
- After successful generation: patches `workbase_id` on the new `conversations` row using `.eq('conversation_id', result.conversation.id)`.
- After successful generation: fires `inngest.send({ name: 'conversation/generation.completed', ... })` for auto-enrichment. Both operations are non-fatal (errors are caught and logged only).

#### Task 7: New Conversation Generator Sheet Inside Workbase UI ✅
- **File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`
- Replaced the "New Conversation" button's `router.push('/conversations?workbaseId=...')` with `setShowGenerator(true)`.
- Replaced the empty-state link with the same Sheet open action.
- Added a shadcn Sheet component (slides from right) with: template selector (fetched from `GET /api/templates?limit=50`), tier selector (template / scenario / edge_case), Generate button with loading state, and success/error toast.
- On success: reloads the page to refresh the conversation list.

#### Task 8: Persistent "+" Create Work Base Card on `/home` ✅
- **File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\home\page.tsx`
- Removed the small "New Work Base" header button (lines 226–230 original) — it was reported as not visible.
- Added a dashed-border "Create New Work Base" card as the last item in the workbase grid. It always renders alongside existing cards.
- Clicking it calls `openWizard()` (same as before). The `openWizard` function and the full multi-step Dialog wizard are unchanged.

#### Task 9: Archive — Add Restore Flow + AlertDialog ✅ (4 files changed)

**9A — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\route.ts`:**
- GET handler now accepts `?includeArchived=true` query param.
- Without it: filters `status = 'active'` (default, unchanged).
- With it: returns all statuses (both active and archived) for the user.

**9B — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useWorkbases.ts`:**
- Added `useWorkbasesArchived()`: queries `/api/workbases?includeArchived=true`, filters to `status === 'archived'`, staleTime 30s.
- Added `useRestoreWorkbase()`: PATCH mutation to `/api/workbases/[id]` with `{ status: 'active' }`. On success: invalidates workbase list queries.

**9C — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\home\page.tsx`:**
- Added `useWorkbasesArchived` import and hook call.
- Added `ArchivedWorkbaseCard` component (above `HomePage` function): displays faded card with a Restore button wired to `useRestoreWorkbase()`.
- Added archived section below the main workbase grid — only renders if `archivedWorkbases.length > 0`.

**9D — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\settings\page.tsx`:**
- Removed `confirm()` call from `handleArchive`.
- Added `AlertDialogTrigger`-wrapped Archive button in the Danger Zone card.
- Dialog text: "Archive this Work Base?" with description explaining data is preserved and restoration is available from home.
- `handleArchive` now runs directly when the AlertDialog action is confirmed.

#### Task 10: Re-trigger Sun Bank Embedding Script ✅ (created, NOT yet run)
- **Script created (not yet executed):** `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\retrigger-sun-bank-embedding.js`
- Fires `rag/document.uploaded` Inngest event for document `77115c6f-b987-4784-985a-afb4c45d02b6`.
- **Run this AFTER** verifying Task 2 fixed the ingestion pipeline (upload a test doc first).
- Expected outcome: ~1298 embeddings generated for Sun Bank document.

---

## 📋 What The Next Agent Should Understand

### The Main Active Codebase Is v4-Show
All Session 9 work was done in `C:\Users\james\Master\BrightHub\BRun\v4-show\`. The v4-Show codebase (`C:\Users\james\Master\BrightHub\BRun\v4-show\`) is the prior iteration and contains the SAOL library that is used by v4-Show scripts.

### SAOL Is Shared Between Both Codebases
- v4-Show scripts use SAOL at: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`
- v4-Show scripts use SAOL at: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`
- They point to the same Supabase project (same `.env.local` values).

### Key env file
- v4-Show: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`
- v4-Show: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`

### Key IDs To Know
| Name | ID |
|------|----|
| User (James) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| Workbase: rag-KB-v2_v1 | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| Sun Bank document | `77115c6f-b987-4784-985a-afb4c45d02b6` |
| RunPod endpoint | `780tauhj7c126b` |

---

## 🧪 What Needs Testing Next

The full test tutorial is in:  
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\12-ux-containers-spec-QA-specification_v1.md`  
(Section: **Manual Test Tutorial**, starting around line 1113)

**Ordered test priority:**
1. **T1** — Upload a new document; verify Inngest run completes without `knowledge_base_id` error; check `rag_sections` and `rag_facts` rows have `workbase_id`.
2. **T3** — Supabase check: all 51 conversations have `workbase_id`.
3. **T6** — `/home` shows "+" card in grid; clicking opens wizard; wizard creates workbase.
4. **T5** — Workbase conversations page: "New Conversation" opens Sheet; Sheet has template/tier selectors.
5. **T4** — Generate a conversation from the Sheet; verify `workbase_id` on the new row; verify Inngest event fired.
6. **T7** — Settings archive button opens AlertDialog (not browser confirm); archive redirects to `/home`.
7. **T8** — `/home` shows archived section with Restore; Restore moves card back to active grid.
8. **T9** — Run Sun Bank re-trigger script; verify ~1298 embeddings; chat returns answers.
9. **T2** — (Optional destructive) Break OpenAI key; verify failed embedding leaves doc as `processing`.

---

## 📁 Key Files Modified in Session 9

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\verify-005-preflight.js` | New — pre-flight verification |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\005-fix-kb-id-rename.js` | New — DB migration (already run) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\backfill-conversations-workbase.js` | New — backfill (already run) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\retrigger-sun-bank-embedding.js` | New — Sun Bank re-trigger (NOT yet run) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` | `workbase_id` added to section + fact inserts |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` | Finalize step guarded on embeddingCount |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\generate\route.ts` | `workbaseId` schema field; post-gen patch; Inngest event |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\route.ts` | `?includeArchived=true` support |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useWorkbases.ts` | `useWorkbasesArchived`, `useRestoreWorkbase` added |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\home\page.tsx` | "+" card; archived section; `ArchivedWorkbaseCard` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` | Sheet generator replacing old router.push |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\settings\page.tsx` | AlertDialog replacing confirm() |

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**You MUST use SAOL for ALL database operations.**

**Location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`

### Common Usage
```bash
# Query jobs
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r = await saol.agentQuery({
    table: 'pipeline_training_jobs',
    where: [{column:'id', operator:'eq', value:'e8fa481f-7507-4099-a58d-2778481429f5'}],
    select: '*'
  });
  console.log(r.data);
})();"
```

---

## 🔁 Previous Session Context (Session 8 Summary)

In Session 8, the automated adapter deployment pipeline was fully resolved:

| Component | Issue | Resolution |
|-----------|-------|------------|
| RunPod GraphQL | `400 Bad Request` on `saveEndpoint` | Fetch all endpoint fields and resubmit with updated `LORA_MODULES` |
| Hugging Face | `404 Repository not found` | Added `createRepo()` before `uploadFiles()` |
| Hugging Face | `410 Retired Endpoint` / Vercel OOM | `uploadFiles()` SDK handles 66MB adapter via LFS chunking |

**Verified adapter `e8fa481f`** is deployed on Hugging Face (`BrightHub2/lora-emotional-intelligence-e8fa481f`) and on RunPod endpoint `780tauhj7c126b` (alongside 3 earlier adapters).

### How to verify live RunPod status:
```bash
node -e '
require("dotenv").config({path:".env.local"});
fetch(`https://api.runpod.io/graphql?api_key=${process.env.RUNPOD_GRAPHQL_API_KEY}`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "{ myself { endpoint(id: \"780tauhj7c126b\") { env { key value } } } }" })
}).then(r => r.json()).then(d => {
  const envVars = d.data.myself.endpoint.env;
  console.log(JSON.stringify(JSON.parse(envVars.find(e => e.key === "LORA_MODULES").value), null, 3));
})'
```
