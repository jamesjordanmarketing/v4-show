# Context Carryover: v4-Show — Session 13

**Last Updated:** March 2, 2026
**Document Version:** context-carry-info-11-15-25-1114pm-yyyy
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`.
3. Pay special attention to the files listed in the **Key Files** sections below — especially the Session 13 modified files.
4. Understand the current state of the Conversations Module, the batch job auto-enrichment flow, and the modal styling fix.
5. Then **wait for the human to tell you what to do next**.

The human's most likely next action is to ask you to **test the last codebase implementation**, **fix bugs**, **analyze the current pathing and small upgrades**, or **continue QA** on the Conversations Module of the workbase UI.

**Do not start anything until the human tells you what to do.**

---

## Project Functional Context

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

## Session 13 Summary: Spec 18 Implementation + Auto-Enrich + Modal Fix

### What Was Done

Session 13 completed three items:
1. **Spec 18 — Workbase Conversations Page Upgrade** (full implementation)
2. **Auto-Enrich After Batch Job Completion** (new feature)
3. **Modal Input Visibility Fix** (design token bug fix in dialog + alert-dialog)

---

### Item 1: Spec 18 — Workbase Conversations Page Upgrade (COMPLETE)

**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md`

**File replaced:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`

The old minimal placeholder page (5-column hand-written table, text search, `useConversations` hook, `useTrainingSets`/`useCreateTrainingSet` hooks, "Training Sets" card) was **completely replaced** with a full-featured page that:

1. **Fetches directly via `fetch()`** with `workbaseId` as a query param to `GET /api/conversations` — does NOT use the `useConversations` React Query hook (avoids the type mismatch issue).
2. **Applies `transformStorageToConversation()`** — an exact copy of the function from the legacy `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\conversations\page.tsx` page. Bridges `StorageConversation` (snake_case from API) to `Conversation` (camelCase for components).
3. **Renders `<ConversationTable>`** — the full-featured sortable table with 9 columns (Checkbox, Conversation, Tier, Status, Quality Score, Turns, Enrichment Status, Created At, Actions), row actions (approve/reject/delete/enrich/download), and "Create Training Files" bulk action.
4. **Mounts `<ConversationDetailModal />` and `<ConfirmationDialog />`** — store-driven modals that must be present in the component tree.
5. **Adds filter dropdowns** — Status, Tier, Quality minimum.
6. **Adds pagination controls** — Previous / Next with item count display ("Showing 1–25 of 66 conversations").

**Verification:**
- TypeScript check (`tsc --noEmit`): Zero errors
- Next.js lint: Zero errors (one benign `react-hooks/exhaustive-deps` warning matching the legacy page pattern)
- All imports verified against actual file paths
- `transformStorageToConversation` return type matches `ConversationWithEnrichment` exactly (verified in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` line 60)
- API contract confirmed: `GET /api/conversations` reads `workbaseId` from searchParams (line 21 of `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\route.ts`)

**User confirmed:** "the screen and functionality are much better"

---

### Item 2: Auto-Enrich After Batch Job Completion (COMPLETE)

**Problem:** When a Conversations Batch Job finished, the user had to manually click "Enrich All" on the batch job page to trigger the enrichment pipeline for all generated conversations. The spec at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\12-ux-containers-spec-QA-specification_v1.md` (Task 6) described auto-enrichment via Inngest events, but this was never implemented.

**Solution:** Instead of adding Inngest event plumbing (which would require new Inngest function definitions, event schemas, and deployment sync), the fix adds client-side auto-triggering of the existing `handleEnrichAll()` function when the batch job processing loop completes.

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx`

**Three changes made:**

1. **Added two refs** (line 63–64):
   ```typescript
   const didProcessRef = useRef(false); // Tracks if processing ran this page visit
   const autoEnrichTriggeredRef = useRef(false); // Prevent duplicate auto-enrich
   ```

2. **Set flag when processing starts** (line 184):
   ```typescript
   didProcessRef.current = true;
   ```
   This is set inside `startProcessing()`, so it's only true when processing actively ran on this page visit.

3. **Added auto-enrich `useEffect`** (lines 252–268):
   ```typescript
   useEffect(() => {
     if (
       status?.status === 'completed' &&
       status.progress.successful > 0 &&
       !processingActive &&
       didProcessRef.current &&
       !autoEnrichTriggeredRef.current &&
       !enriching &&
       !enrichResult
     ) {
       console.log('[BatchJob] Auto-triggering enrichment after batch completion');
       autoEnrichTriggeredRef.current = true;
       handleEnrichAll();
     }
   }, [status?.status, processingActive]);
   ```

**Safety guarantees:**
- Visiting an old completed batch job page will NOT auto-enrich (because `didProcessRef` stays `false`)
- If the user cancels/stops the job, status won't be `completed`, so enrichment won't trigger
- The existing `handleEnrichAll()` fetches completed item IDs from `GET /api/conversations/batch/${jobId}/items?status=completed`, then calls `POST /api/conversations/bulk-enrich` with those IDs
- The bulk-enrich API (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\bulk-enrich\route.ts`) already skips conversations with `enrichment_status === 'completed'` (idempotent)

**This feature has NOT yet been tested by the user.** The next batch job run will be the first live test.

---

### Item 3: Modal Input Visibility Fix (COMPLETE)

**Problem:** Input boxes inside modals (Dialog and AlertDialog) had white backgrounds with white text — text was invisible when typing. This affected the "Create New Training File" modal and all other modals across the app.

**Root cause:** Two shadcn/ui components had hardcoded dark-theme `zinc-*` classes that were missed during Session 11's design token migration:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\dialog.tsx` line 60: `bg-zinc-900 text-zinc-50 border-zinc-700`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\alert-dialog.tsx` line 57: `bg-zinc-900 text-zinc-50 border-zinc-700`

The `text-zinc-50` (white text) cascaded into all child elements including `<Input>` and `<Textarea>`, which have `bg-input-background` (white/cream). White text on white background = invisible.

**Fix applied in both files:**
```
BEFORE: bg-zinc-900 text-zinc-50 border-zinc-700
AFTER:  bg-card text-foreground border-border
```

**Result:** All modals now use design tokens:
- Background: `bg-card` → white (#FFFFFF)
- Text: `text-foreground` → deep charcoal (#383838)
- Border: `border-border` → light gray (#D1D5DB)
- Input text inherits `text-foreground` → clearly visible on white/cream input backgrounds

**Verified:** Zero `zinc-*` classes remain in either file. Zero remaining `zinc-*` classes across all `src/components/ui/` files. Only one `zinc-*` usage remains in the entire `src/` directory: `text-zinc-500` in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\chat\MultiTurnChat.tsx` (not a modal, low priority).

---

## Current Codebase Architecture (v4-show)

The active Next.js 14 application lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Within `src/`:

```
src/
├── app/
│   ├── globals.css                       # Design token foundation (Session 11)
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard wrapper
│   │   ├── home/page.tsx                 # Home + workbase grid
│   │   ├── conversations/page.tsx        # Legacy conversations page (DO NOT TOUCH)
│   │   │                                 #   Uses <ConversationTable>, has transformStorageToConversation()
│   │   ├── batch-jobs/[id]/page.tsx      # ✅ Auto-enrich added (Session 13)
│   │   └── workbase/[id]/
│   │       ├── layout.tsx                # Sidebar nav (duck-blue active)
│   │       ├── page.tsx                  # Workbase overview
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx          # ✅ UPGRADED to full ConversationTable (Session 13 — Spec 18)
│   │       │   │   ├── generate/page.tsx # Bulk generator (created Session 12, DO NOT TOUCH)
│   │       │   │   └── [convId]/page.tsx # Conversation detail
│   │       │   ├── launch/page.tsx
│   │       │   └── chat/page.tsx
│   │       ├── fact-training/
│   │       │   ├── documents/page.tsx
│   │       │   ├── documents/[docId]/page.tsx
│   │       │   ├── chat/page.tsx
│   │       │   └── quality/page.tsx
│   │       └── settings/page.tsx
│   └── api/
│       ├── conversations/
│       │   ├── route.ts                  # GET /api/conversations (supports workbaseId param)
│       │   ├── generate/route.ts
│       │   ├── generate-batch/route.ts   # ✅ workbaseId plumbing added (Session 12)
│       │   └── bulk-enrich/route.ts      # POST — enriches array of conversation IDs (used by auto-enrich)
│       ├── batch-jobs/[id]/
│       │   └── process-next/route.ts     # ✅ writes workbase_id to conversation (Session 12)
│       ├── workbases/route.ts
│       └── rag/ ...
├── components/
│   ├── conversations/
│   │   ├── ConversationTable.tsx         # Full-featured sortable table (9 cols, actions, bulk)
│   │   ├── ConversationDetailModal.tsx   # Store-driven detail modal
│   │   ├── ConfirmationDialog.tsx        # Store-driven delete confirmation
│   │   ├── ConversationDetailView.tsx
│   │   ├── conversation-actions.tsx      # Enrich/download actions per row
│   │   └── ... (other conversation components)
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   └── ui/
│       ├── dialog.tsx                    # ✅ Fixed: bg-card text-foreground border-border (Session 13)
│       ├── alert-dialog.tsx              # ✅ Fixed: bg-card text-foreground border-border (Session 13)
│       ├── button.tsx
│       ├── badge.tsx
│       ├── input.tsx                     # Uses bg-input-background, inherits text color from parent
│       ├── textarea.tsx                  # Uses bg-input-background, inherits text color from parent
│       └── ... (other shadcn components)
├── hooks/
│   ├── use-conversations.ts              # ✅ data.conversations fix (Session 12 Fix A)
│   │                                     #    Returns Conversation[] typed but actually StorageConversation[]
│   │                                     #    DO NOT change its return type — breaks other hooks
│   ├── use-filtered-conversations.ts     # Depends on Conversation type from use-conversations
│   ├── use-keyboard-shortcuts.ts         # Depends on Conversation type from use-conversations
│   ├── use-scaffolding-data.ts           # Used by generator page
│   └── useWorkbases.ts
├── lib/
│   ├── types/
│   │   └── conversations.ts             # StorageConversation (snake_case) + Conversation (camelCase)
│   └── services/
│       ├── batch-generation-service.ts  # ✅ workbaseId in sharedParameters (Session 12 Fix B2)
│       ├── enrichment-pipeline-orchestrator.ts  # Used by bulk-enrich API
│       └── ...
├── stores/
│   └── conversation-store.ts            # Zustand store: selection, modals, filters
├── styles/
│   └── polish.css                       # Focus ring → sky blue
└── tailwind.config.js                   # Duck namespace + input-background
```

---

## Key Files Reference

### Session 13 Modified Files

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` | **COMPLETE REWRITE** — Spec 18 implemented. Old minimal table replaced with full `<ConversationTable>`, direct `fetch()` with workbaseId, `transformStorageToConversation()`, filter dropdowns, pagination, store-driven modals |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx` | Added `didProcessRef` + `autoEnrichTriggeredRef` refs; set flag in `startProcessing()`; added `useEffect` that auto-triggers `handleEnrichAll()` when batch completes |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\dialog.tsx` | Line 60: `bg-zinc-900 text-zinc-50 border-zinc-700` → `bg-card text-foreground border-border` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\alert-dialog.tsx` | Line 57: `bg-zinc-900 text-zinc-50 border-zinc-700` → `bg-card text-foreground border-border` |

### Important Components (Do Not Modify Unless Asked)

| File | Props / Usage |
|------|--------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` | `<ConversationTable conversations={ConversationWithEnrichment[]} isLoading={boolean} compactActions={boolean} />` — type `ConversationWithEnrichment` defined on line 60 |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailModal.tsx` | `<ConversationDetailModal />` — no props; reads from `useConversationStore` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConfirmationDialog.tsx` | `<ConfirmationDialog />` — no props; reads from `useConversationStore` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\bulk-enrich\route.ts` | `POST` with `{ conversationIds: string[] }` — enrichment pipeline for multiple conversations, sequential, idempotent (skips already-completed) |

### Critical Type Note

The `transformStorageToConversation()` function is the bridge between API data and UI components. It now exists in **two places** (both must remain identical):
1. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\conversations\page.tsx` (legacy page)
2. `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` (workbase page — Session 13)

Do not modify either copy independently. If a change is needed in the transform logic, update both.

---

## Design Token System — How It Works

**The Token Chain:**
```
globals.css :root { --primary: 52 100% 50%; }
       ↓
tailwind.config.js { primary: "hsl(var(--primary))" }
       ↓
JSX: className="bg-primary" → CSS: background-color: hsl(52 100% 50%)
```

**Brand Palette (MotherDuck-inspired):**

| Name | Hex | HSL Triplet | Tailwind Class |
|------|-----|-------------|----------------|
| Soft Cream | `#FFFDF0` | `52 100% 97%` | `bg-background` |
| Deep Charcoal | `#383838` | `0 0% 22%` | `text-foreground` |
| White | `#FFFFFF` | `0 0% 100%` | `bg-card`, `bg-popover` |
| Vibrant Yellow | `#FFDE00` | `52 100% 50%` | `bg-primary` |
| Muted Cream | `#F5F5F0` | `60 33% 95%` | `bg-secondary`, `bg-muted`, `bg-accent` |
| Soft Gray | `#666666` | `0 0% 40%` | `text-muted-foreground` |
| Light Gray | `#D1D5DB` | `216 12% 84%` | `border-border`, `border-input` |
| Sky Blue | `#3AA1EC` | `205 82% 58%` | `bg-duck-blue`, `ring-ring` |
| Soft Orange | `#FF9538` | `28 100% 61%` | `bg-duck-orange` |

**Design Token Rules — Mandatory for all new/modified code:**
- Backgrounds: `bg-background` (cream), `bg-card` (white), `bg-muted` (muted cream)
- Text: `text-foreground` (charcoal), `text-muted-foreground` (gray)
- Borders: `border-border`
- Brand accent: `text-duck-blue`, `bg-duck-blue`
- Primary action: `bg-primary` (yellow), `text-primary-foreground`
- **Zero `zinc-*` or hardcoded `gray-*` color classes permitted in any new or modified code**
- Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT design tokens

---

## DB State (as of Session 13 end, 2026-03-02)

| Entity | State |
|--------|-------|
| `workbases` (active) | At least 2 active: `232bea74` (`rag-KB-v2_v1`) owned by user `8d26cc10`; `4fc8fa25` (`Sun Chip Policy Doc #30`) owned by user `79c81162` |
| `conversations` | 66+ conversations with `workbase_id = '232bea74-...'` (owned by `8d26cc10`). User ran a new batch job (ID `91c985f9-5167-4ba8-ae16-608bd17952c1`) during Session 13 (logged in as `79c81162`) — those conversations are in workbase `4fc8fa25`. **Run SAOL to verify exact counts.** |
| Batch job `91c985f9` | Completed successfully. Enrichment may or may not have been triggered manually by user before auto-enrich was deployed. Verify with SAOL. |
| `rag_sections` | Has `workbase_id` column — pipeline populates correctly |
| `rag_facts` | Has `workbase_id` column — pipeline populates correctly |
| Sun Bank doc `77115c6f` | Was at 0 embeddings — **re-trigger script NOT yet run** |
| PG functions | `match_rag_embeddings_kb` and `search_rag_text` fixed (Session 9) |
| RAG pipeline | FULLY WORKING (confirmed Session 10) |

---

## Key IDs To Know

| Name | ID |
|------|----|
| User (James — primary) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| User (james+2-22-26@...) | `79c81162-6399-41d4-a968-996e0ca0df0c` |
| Workbase: rag-KB-v2_v1 (owned by primary user) | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 (owned by second user) | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| Sun Bank document (needs re-trigger) | `77115c6f-b987-4784-985a-afb4c45d02b6` |
| Batch job (Session 13) | `91c985f9-5167-4ba8-ae16-608bd17952c1` |
| RunPod endpoint | `780tauhj7c126b` |

---

## What Needs Doing Next (Priority Order)

### 1. QA Test: Spec 18 Conversations Page (User confirmed "much better" but full QA not done)

The spec includes a full QA checklist at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md` Section 11. Key items:
- Conversations appear in table at `/workbase/[id]/fine-tuning/conversations` (scoped to that workbase)
- All 9 columns visible: Conversation, Tier, Status, Quality, Turns, Enrichment, Created, Actions
- Column headers are sortable (click to sort, click again to reverse)
- Filter dropdowns (status, tier, quality) work correctly
- Pagination controls work
- Row actions (approve, reject, delete with confirmation) work
- "Create Training Files" bulk action works
- Scope isolation: workbase A conversations don't appear on workbase B's page

### 2. QA Test: Auto-Enrich After Batch Completion (NOT YET TESTED)

Run a new batch job from the workbase generator page and verify:
- After all items process, enrichment starts automatically (no manual "Enrich All" click needed)
- The "Enriching..." spinner appears in the Completion card
- After enrichment finishes, the result summary shows (e.g., "3 enriched, 0 skipped, 0 failed")
- The "Enrich All" button does NOT appear (since auto-enrich already ran)

### 3. QA Test: Modal Input Visibility (NOT YET TESTED on deployed build)

- Open the "Create New Training File" modal (select conversations → "Create Training Files" → "Create New Training File")
- Verify text is visible (dark charcoal) when typing in the Name and Description inputs
- Test any other modal with inputs (e.g., delete confirmation) — all should show correct text colors

### 4. Remaining Session 9 Tests (Still Pending)

| Test | Description | Status |
|------|-------------|--------|
| **T9** | Run Sun Bank re-trigger script → ~1298 embeddings → chat returns answers | Not yet run |
| **T6** | `/home` "+" card → opens wizard → creates workbase | Not yet UI-tested |
| **T7** | Settings archive → AlertDialog (not browser confirm) → redirect | Not yet UI-tested |
| **T8** | `/home` archived section → Restore works | Not yet UI-tested |

### 5. Known Limitations (From Spec 18, Section 12)

| Limitation | Notes |
|-----------|-------|
| Row click does not open detail modal | `ConversationTable` does not fire `openConversationDetail` on row click. The modal is mount-ready but has no trigger. A future spec should add `onClick` to `TableRow` in `ConversationTable.tsx`. |
| Text search removed | The old minimal page had a text search input. `ConversationTable` does not have inline search. Can be added as a future enhancement. |
| "Training Sets" card removed | The old page had a "Training Sets" section calling `useCreateTrainingSet(workbaseId)`. The new page uses `ConversationTable`'s built-in "Create Training Files" action which calls a different API (`/api/training-files`). |
| One remaining `zinc-*` in non-modal code | `text-zinc-500` in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\pipeline\chat\MultiTurnChat.tsx` — low priority |

---

## Important Lessons (For Future Debugging)

### Conversations Module — Type Architecture

1. `GET /api/conversations` always returns `StorageConversation[]` (snake_case fields).
2. `useConversations()` hook is **typed** as returning `Conversation[]` but actually returns `StorageConversation[]`. Do NOT change this type — `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-filtered-conversations.ts` and `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-keyboard-shortcuts.ts` depend on the `Conversation` shape.
3. All rich UI components (`ConversationTable`, `ConversationDetailView`, etc.) expect **camelCase `Conversation`** objects. Always apply `transformStorageToConversation()` before passing data to these components.
4. The **workbase** conversations page (Session 13) uses direct `fetch()` instead of `useConversations` hook, avoiding the type mismatch entirely.

### Two-User Situation

The DB has conversations assigned to `workbase_id = 232bea74-...` which is owned by user `8d26cc10-...`. If you are logged in as user `79c81162-...`, you will only see workbase `4fc8fa25-...` in the UI and it will correctly show only conversations from that workbase. This is not a bug. To see the 66+ conversations, log in as `8d26cc10-...`.

### Design Token System (Session 11 + Session 13 Modal Fix)

1. CSS vars MUST hold HSL triplets (e.g., `52 100% 50%`) — NOT hex, NOT oklch. The `hsl(var(--*))` wrapper in tailwind.config.js requires this exact format.
2. The `@theme inline` block is dead code (Tailwind v4 feature). Do not modify it.
3. The `.dark` block is preserved but unused. Do not remove it.
4. `src/styles/globals.css` was deleted in Session 11 — it was a dead duplicate.
5. Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT converted to design tokens.
6. **Zero `zinc-*` classes should remain in dashboard/workbase/modal pages.** Session 13 fixed the last two offenders: `dialog.tsx` and `alert-dialog.tsx`.
7. `<Input>` and `<Textarea>` components inherit text color from their parent. If a parent sets white text (like the old dark-theme modals did), input text becomes invisible on light backgrounds. The fix is always to use `text-foreground` on the container.

### Batch Job Auto-Enrich Flow (Session 13)

The enrichment auto-trigger depends on:
1. The batch-jobs page component (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\batch-jobs\[id]\page.tsx`) running the processing loop
2. `didProcessRef.current` being set to `true` during `startProcessing()`
3. A `useEffect` watching for `status?.status === 'completed'` + `!processingActive`
4. The existing `handleEnrichAll()` function calling `POST /api/conversations/bulk-enrich`
5. The bulk-enrich API (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\bulk-enrich\route.ts`) processing each conversation through the `enrichment-pipeline-orchestrator`

If auto-enrich fails or doesn't trigger, the manual "Enrich All" button still appears as a fallback (it's only hidden when `enrichResult` is set).

### RAG Pipeline Debugging (Session 10)

If the RAG pipeline fails:
1. Run `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\test-postgrest-schema-cache.js` — if Test 1 fails, PostgREST cache or PG functions are stale.
2. Use diagnostic endpoint `POST https://v4-show.vercel.app/api/rag/test-section-insert`.
3. If Inngest keeps failing despite correct build — force re-sync: Dashboard → Syncs → Resync.

---

## Supabase Agent Ops Library (SAOL) Quick Reference

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

## Previous Session Context (Sessions 8–12)

### Session 8: Automated Adapter Deployment (COMPLETE)
Fully resolved the automated adapter deployment pipeline: RunPod GraphQL `saveEndpoint`, Hugging Face `createRepo()` + `uploadFiles()`. Adapter `e8fa481f` deployed on HF (`BrightHub2/lora-emotional-intelligence-e8fa481f`) and RunPod endpoint `780tauhj7c126b`.

### Session 9: v4-Show Bug Fixes (COMPLETE)
10 bug fixes: DB migration for stale PG functions, `workbase_id` threading through services/API/UI, conversation generator Sheet (later replaced in Session 12), "+" card on home, archive restore flow. Sun Bank re-trigger script created but NOT yet run.

### Session 10: RAG Embedding Pipeline Debug (COMPLETE)
Diagnosed persistent RAG embedding failure across 5 failed Inngest runs. Root cause: stale Vercel build cache + Inngest cached old deployment URLs. Fixed by cache clear + Inngest re-sync. Created diagnostic endpoint and test script.

### Session 11: Design Palette Overhaul (COMPLETE)
Comprehensive redesign using MotherDuck-inspired brand palette. Fixed CSS token chain, applied HSL triplets, re-themed all workbase pages from `zinc-*` to semantic tokens. Fixed copy/paste and keyboard shortcuts. Specification: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\14-ux-containers-design-implementation-A_v1.md`

### Session 12: Conversations Module Bug Fixes (COMPLETE)
Implemented all 6 fixes from spec 16 (Fix A: API key fix; Fix B: workbaseId plumbing through batch pipeline; Fix C: Sheet replaced with dedicated generator page). Diagnosed routing confusion and type mismatch issues. Wrote check-up doc (17) and next spec (18).

### Session 13: Spec 18 + Auto-Enrich + Modal Fix (COMPLETE)
Implemented Spec 18 (full ConversationTable on workbase conversations page). Added auto-enrichment after batch job completion. Fixed invisible text in modal inputs by replacing `zinc-*` classes with design tokens in `dialog.tsx` and `alert-dialog.tsx`.

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
})}'
```
