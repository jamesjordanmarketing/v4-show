# Context Carryover: v4-Show — Session 12

**Last Updated:** March 2, 2026
**Document Version:** context-carry-info-11-15-25-1114pm-xxxx
**Active Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Deployed App:** `https://v4-show.vercel.app`
**GitHub Repo:** `https://github.com/jamesjordanmarketing/v4-show`

---

## 🚨 CRITICAL INSTRUCTION FOR NEXT AGENT

**DO NOT start fixing anything. DO NOT write any code. DO NOT modify any files.**

Your job upon receiving this context is to:
1. Read and internalize this entire document fully.
2. Read and internalize the * *v4-Show active codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`.
3. Pay special attention to the files listed in the **Key Files** sections below.
4. Read (but do not execute) the pending specification at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md`.
5. Then **wait for the human to tell you what to do next**.

The human's most likely next action is to ask you to **implement spec 18**, **test the last codebase implementation**, **fix bugs**, or **analyze the current pathing and small upgrades** within the Conversations Module of the workbase UI.

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

## 🎯 Session 12 Summary: Conversations Module Bug Fixes + Spec Writing

### What Was Done

Session 12 executed all six fixes from specification `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\16-ux-containers-bugs-specification_v1.md`, investigated follow-up issues reported by the user, wrote a check-up document, and authored the next implementation specification.

---

### Bugs Fixed (All from Spec 16)

#### Fix A — API Response Key (`use-conversations.ts`)

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-conversations.ts`

**Change (line 117):** `return data.data || [];` → `return data.conversations || [];`

**Why:** `GET /api/conversations` returns `{ conversations: StorageConversation[], total, page, limit, totalPages }`. The key is `conversations`, not `data`. This was the root cause of all workbase conversations pages showing empty.

---

#### Fix B1 — Batch Generate API Route (`generate-batch/route.ts`)

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\generate-batch\route.ts`

**Changes:**
- Added `workbaseId: z.string().uuid().optional()` to `BatchGenerateRequestSchema` (line 30)
- Added `workbaseId: validated.workbaseId` to the `batchRequest` object (line 82)

---

#### Fix B2 — Batch Generation Service (`batch-generation-service.ts`)

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\batch-generation-service.ts`

**Changes:**
- Added `workbaseId?: string` to `BatchGenerationRequest` interface (line 67)
- Merged `workbaseId` into `sharedParameters` when creating the batch job (line 201):
  ```typescript
  sharedParameters: {
    ...(request.sharedParameters || {}),
    ...(request.workbaseId ? { workbaseId: request.workbaseId } : {}),
  }
  ```

---

#### Fix B3 — Process-Next Route (`process-next/route.ts`)

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\batch-jobs\[id]\process-next\route.ts`

**Changes (lines 317–325):** Added code to read `workbaseId` from `job.configuration.sharedParameters` and conditionally include `workbase_id` in the Supabase conversation update:
```typescript
const workbaseId = (job.configuration?.sharedParameters as any)?.workbaseId as string | undefined;
// In the update object:
...(workbaseId ? { workbase_id: workbaseId } : {}),
```

---

#### Fix C1 — Cleaned Up Workbase Conversations Page

**File modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`

**Changes:**
- Removed all Sheet-related imports (`Sheet`, `Select`, `Wand2`), state variables (`showGenerator`, `templates`, `selectedTemplateId`, `selectedTier`, `isGenerating`), the `useEffect` that fetched templates, and the `handleGenerateConversation` function
- Removed the entire `<Sheet>` JSX block
- Updated "+ New Conversation" button to navigate to `/workbase/${workbaseId}/fine-tuning/conversations/generate`
- Updated "Generate your first conversation" empty-state link to navigate to the same generate page
- Fixed table columns to use `StorageConversation` snake_case fields (`conversation_name`, `persona_key`, `starting_emotion`)
- Added `rawConversations as unknown as StorageConversation[]` type cast to bridge `useConversations` return type

---

#### Fix C2 — New Workbase-Scoped Bulk Generator Page (NEW FILE)

**File created:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\generate\page.tsx`

A new bulk generator page (`WorkbaseGeneratorPage`) that:
- Lives inside `workbase/[id]/layout.tsx` (gets sidebar nav automatically)
- Uses `useScaffoldingData()` hook to load personas, arcs, topics
- Lets user select Category (Core / Edge Case), Personas, Emotional Arcs, Training Topics
- Shows live Batch Summary: count, estimated time, estimated cost
- Submits to `POST /api/conversations/generate-batch` with `workbaseId` in the body
- On success, redirects back to the conversations list page

---

### Follow-Up Issues Investigated and Resolved

#### Issue 1 — Routing Confusion (4fc8fa25 vs 232bea74)

The user reported the sidebar menu was routing to `workbase/4fc8fa25.../fine-tuning/conversations` which showed no conversations, while expecting to see the 66 conversations in `232bea74`. **Root cause determined via SAOL:**

- Workbase `4fc8fa25` (`Sun Chip Policy Doc #30`) belongs to user `79c81162-6399-41d4-a968-996e0ca0df0c`
- Workbase `232bea74` (`rag-KB-v2_v1`) belongs to user `8d26cc10-a3c1-4927-8708-667d37a3348b`

The routing code is correct and dynamic. The user was logged in as `79c81162-...` and thus correctly seeing their own workbase `4fc8fa25`. The 66 conversations belong to a **different user** (`8d26cc10-...`). No code bug — a data ownership boundary.

---

#### Issue 2 — Conversations Showing "Pending" With No Other Data

After Fix C1, the workbase conversations page displayed rows with the conversation name visible in the title column but all other columns empty and status showing "pending review" with no styling.

**Root cause:** Type mismatch. The `useConversations` hook is typed as `Promise<Conversation[]>` but actually returns `StorageConversation[]` (snake_case) from the API. The page was passing these through a minimal table that tried to access `StorageConversation` fields directly, but then the table also used the wrong field names initially.

**Fix applied in `conversations/page.tsx`:**
- Added `rawConversations as unknown as StorageConversation[]` cast
- Updated all table field references to snake_case: `conv.conversation_name`, `conv.persona_key`, `conv.starting_emotion`, `conv.status`

**Important:** `use-conversations.ts` was NOT changed to return `StorageConversation[]` because `use-filtered-conversations.ts` and `use-keyboard-shortcuts.ts` also depend on it and expect camelCase `Conversation` fields. The type cast approach in the page is the correct fix for this scenario.

---

### Documents Written in Session 12

| Document | Purpose |
|----------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\17-ux-containers-bugs-check-up_v1.md` | Post-implementation check-up: confirmed spec 16 is 100% implemented; identified feature gap between current workbase conversations page and the full `<ConversationTable>` component |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md` | **THE NEXT SPEC** — Full specification for upgrading the workbase conversations page to use `<ConversationTable>` (see next section) |

---

## 🔜 Next Work: Spec 18 — Workbase Conversations Page Upgrade

**Specification:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md`

**Summary of what spec 18 implements:**

The current workbase conversations page (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`) is a minimal placeholder table with only 5 columns and no actions. Spec 18 replaces its entire contents with a page that:

1. Fetches conversations from `GET /api/conversations` via direct `fetch()` with `workbaseId` as a query param (matching the pattern of the legacy `/conversations` page)
2. Applies `transformStorageToConversation()` to bridge `StorageConversation` (snake_case from API) → `Conversation` (camelCase, required by components)
3. Renders `<ConversationTable conversations={...} isLoading={...} compactActions={false} />` — the full-featured table already used by the legacy `/conversations` page
4. Mounts `<ConversationDetailModal />` and `<ConfirmationDialog />` — store-driven modals that must be present in the component tree
5. Adds Status / Tier / Quality filter dropdowns
6. Adds pagination controls (Previous / Next with item count)

**The spec contains the complete replacement file contents** — the implementing agent can copy-paste the entire page file from Section 5 of the spec.

**Files the spec touches:**
- **Only one file is modified:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`

**Files NOT to touch (listed in spec):**
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\conversations\page.tsx` (legacy — must remain operational)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` (already working)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailModal.tsx` (already working)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConfirmationDialog.tsx` (already working)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-conversations.ts` (touches legacy components)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\types\conversations.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\stores\conversation-store.ts`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\generate\page.tsx`
- All Session 11 design token files

---

## 🎨 Session 11 Summary: Design Palette Overhaul — Complete (Tasks A–K)

Session 11 executed the complete **"Design Palette — Tokens, Copy/Paste, Visual Upgrade"** specification. This was a comprehensive UI/CSS/JS overhaul across 22 files that:

1. **Fixed the broken CSS token chain** — CSS variables were storing hex/oklch values but `tailwind.config.js` wraps them in `hsl()`. Converted all `:root` variables to HSL triplets.
2. **Applied the MotherDuck brand palette** — Soft Cream, Deep Charcoal, Vibrant Yellow, Sky Blue, Soft Orange.
3. **Fixed copy/paste** — `user-select: auto !important` on body.
4. **Fixed keyboard shortcut conflicts** — Cmd+A modal guard, arrow key text-selection guard.
5. **Re-themed every v4-Show page** from hardcoded `zinc-*` classes to semantic design token classes.

**Specification document:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\14-ux-containers-design-implementation-A_v1.md`

### Design Token System — How It Works

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

---

## 🏗️ Current Codebase Architecture (v4-show)

The active Next.js 14 application lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Within `src/`:

```
src/
├── app/
│   ├── globals.css                       # 🎨 Design token foundation (Session 11)
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard wrapper
│   │   ├── home/page.tsx                 # Home + workbase grid
│   │   ├── conversations/page.tsx        # Legacy conversations page (DO NOT TOUCH)
│   │   │                                 #   Uses <ConversationTable>, has transformStorageToConversation()
│   │   └── workbase/[id]/
│   │       ├── layout.tsx                # Sidebar nav (duck-blue active)
│   │       ├── page.tsx                  # Workbase overview
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx          # ⬅️ TARGET OF SPEC 18 (currently minimal table)
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
│       │   └── generate-batch/route.ts   # ✅ workbaseId plumbing added (Session 12)
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
│   └── ui/ (shadcn components)
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
│       └── ...
├── stores/
│   └── conversation-store.ts            # Zustand store: selection, modals, filters
├── styles/
│   └── polish.css                       # Focus ring → sky blue
└── tailwind.config.js                   # Duck namespace + input-background
```

---

## 📁 Key Files Reference

### Session 12 Modified Files

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-conversations.ts` | Line 117: `data.data` → `data.conversations` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\generate-batch\route.ts` | Added `workbaseId` to Zod schema + batchRequest |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\batch-generation-service.ts` | Added `workbaseId` to interface + sharedParameters merge |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\batch-jobs\[id]\process-next\route.ts` | Reads `workbaseId` from sharedParameters; writes `workbase_id` to conversation |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` | Removed Sheet generator; updated button navigation; fixed StorageConversation field names; type cast |

### Session 12 Created Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\generate\page.tsx` | New workbase-scoped bulk conversation generator page |

### Important Components Used by the Next Spec (Do Not Modify)

| File | Props / Usage |
|------|--------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationTable.tsx` | `<ConversationTable conversations={ConversationWithEnrichment[]} isLoading={boolean} compactActions={boolean} />` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailModal.tsx` | `<ConversationDetailModal />` — no props; reads from `useConversationStore` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConfirmationDialog.tsx` | `<ConfirmationDialog />` — no props; reads from `useConversationStore` |

### Critical Type Note

The `transformStorageToConversation()` function is the bridge between API data and UI components. It exists in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\conversations\page.tsx` (legacy page). Spec 18 copies this function verbatim into the workbase conversations page. Do not modify either copy.

### Session 11 Modified Files (Design Palette)

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\globals.css` | `:root` HSL triplets, `user-select: auto !important` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\tailwind.config.js` | `duck` brand namespace, `input-background` mapping |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\styles\polish.css` | Focus ring → sky blue |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\button.tsx` | Destructive: `text-white` → `text-destructive-foreground` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\badge.tsx` | Destructive: `text-white` → `text-destructive-foreground` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-keyboard-shortcuts.ts` | Cmd+A modal guard |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailView.tsx` | Arrow key text-selection guard |

---

## 📋 DB State (as of Session 12 end, 2026-03-02)

| Entity | State |
|--------|-------|
| `workbases` (active) | At least 2 active: `232bea74` (`rag-KB-v2_v1`) owned by user `8d26cc10`; `4fc8fa25` (`Sun Chip Policy Doc #30`) owned by user `79c81162` |
| `conversations` | The spec states 66 conversations total, all with `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'`. Approximately 20 new conversations may have been generated by the user during Session 12 testing (logged in as `79c81162`). **Run SAOL to verify exact count.** |
| Batch-generated conversations (future) | Now correctly receive `workbase_id` via `process-next` route — Fix B3 |
| `rag_sections` | Has `workbase_id` column — pipeline populates correctly |
| `rag_facts` | Has `workbase_id` column — pipeline populates correctly |
| Sun Bank doc `77115c6f` | Was at 0 embeddings — **re-trigger script NOT yet run** ⚠️ |
| PG functions | `match_rag_embeddings_kb` and `search_rag_text` fixed (Session 9) |
| RAG pipeline | ✅ FULLY WORKING (confirmed Session 10) |

---

## 🔑 Key IDs To Know

| Name | ID |
|------|----|
| User (James — primary) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| User (james+2-22-26@...) | `79c81162-6399-41d4-a968-996e0ca0df0c` |
| Workbase: rag-KB-v2_v1 (owned by primary user) | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 (owned by second user) | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| Sun Bank document (needs re-trigger) | `77115c6f-b987-4784-985a-afb4c45d02b6` |
| RunPod endpoint | `780tauhj7c126b` |

---

## 🧪 What Needs Doing Next (Priority Order)

### 1. Implement Spec 18 (Highest Priority)

Read `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\18-ux-containers-bugs-updated-spec_v1.md` and implement it. The spec is self-contained: it specifies replacing exactly one file (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx`) with a complete new file whose full contents are included in the spec (Section 5).

### 2. QA Checklist After Spec 18 Implementation

The spec includes a full QA checklist (Section 11). Key items:
- Conversations appear in table at `/workbase/[id]/fine-tuning/conversations` (scoped to that workbase)
- All 9 columns visible: Conversation, Tier, Status, Quality, Turns, Enrichment, Created, Actions
- Column headers are sortable (click to sort, click again to reverse)
- Filter dropdowns (status, tier, quality) work correctly
- Pagination controls work
- Row actions (approve, reject, delete with confirmation) work
- "Create Training Files" bulk action works
- Scope isolation: workbase A conversations don't appear on workbase B's page

### 3. Remaining Session 9 Tests (Still Pending)

| Test | Description | Status |
|------|-------------|--------|
| **T9** | Run Sun Bank re-trigger script → ~1298 embeddings → chat returns answers | ❓ Not yet run |
| **T6** | `/home` "+" card → opens wizard → creates workbase | ❓ Not yet UI-tested |
| **T7** | Settings archive → AlertDialog (not browser confirm) → redirect | ❓ Not yet UI-tested |
| **T8** | `/home` archived section → Restore works | ❓ Not yet UI-tested |

---

## ⚠️ Important Lessons (For Future Debugging)

### Conversations Module — Type Architecture

1. `GET /api/conversations` always returns `StorageConversation[]` (snake_case fields).
2. `useConversations()` hook is **typed** as returning `Conversation[]` but actually returns `StorageConversation[]`. Do NOT change this type — `use-filtered-conversations.ts` and `use-keyboard-shortcuts.ts` depend on the `Conversation` shape.
3. All rich UI components (`ConversationTable`, `ConversationDetailView`, etc.) expect **camelCase `Conversation`** objects. Always apply `transformStorageToConversation()` before passing data to these components.
4. The workbase conversations page uses `rawConversations as unknown as StorageConversation[]` to work around the typed-but-wrong return from the hook. This is intentional.

### Two-User Situation

The DB has conversations assigned to `workbase_id = 232bea74-...` which is owned by user `8d26cc10-...`. If you are logged in as user `79c81162-...`, you will only see workbase `4fc8fa25-...` in the UI and it will correctly show 0 conversations. This is not a bug. To see the 66 conversations, log in as `8d26cc10-...`.

### Design Token System (Session 11)

1. CSS vars MUST hold HSL triplets (e.g., `52 100% 50%`) — NOT hex, NOT oklch. The `hsl(var(--*))` wrapper in tailwind.config.js requires this exact format.
2. The `@theme inline` block is dead code (Tailwind v4 feature). Do not modify it.
3. The `.dark` block is preserved but unused. Do not remove it.
4. `src/styles/globals.css` was deleted in Session 11 — it was a dead duplicate.
5. Status badges use semantic colors (`bg-green-100 text-green-700`) — intentionally NOT converted to design tokens.
6. Zero `zinc-*` classes should remain in dashboard/workbase pages.

### RAG Pipeline Debugging (Session 10)

If the RAG pipeline fails:
1. Run `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\test-postgrest-schema-cache.js` — if Test 1 fails, PostgREST cache or PG functions are stale.
2. Use diagnostic endpoint `POST https://v4-show.vercel.app/api/rag/test-section-insert`.
3. If Inngest keeps failing despite correct build — force re-sync: Dashboard → Syncs → Resync.

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

## 🔁 Previous Session Context (Sessions 8–11)

### Session 8: Automated Adapter Deployment (COMPLETE)
Fully resolved the automated adapter deployment pipeline: RunPod GraphQL `saveEndpoint`, Hugging Face `createRepo()` + `uploadFiles()`. Adapter `e8fa481f` deployed on HF (`BrightHub2/lora-emotional-intelligence-e8fa481f`) and RunPod endpoint `780tauhj7c126b`.

### Session 9: v4-Show Bug Fixes (COMPLETE)
10 bug fixes: DB migration for stale PG functions, `workbase_id` threading through services/API/UI, conversation generator Sheet (later replaced in Session 12), "+" card on home, archive restore flow. Sun Bank re-trigger script created but NOT yet run.

### Session 10: RAG Embedding Pipeline Debug (COMPLETE)
Diagnosed persistent RAG embedding failure across 5 failed Inngest runs. Root cause: stale Vercel build cache + Inngest cached old deployment URLs. Fixed by cache clear + Inngest re-sync. Created diagnostic endpoint and test script.

### Session 11: Design Palette Overhaul (COMPLETE)
Comprehensive redesign using MotherDuck-inspired brand palette. Fixed CSS token chain, applied HSL triplets, re-themed all workbase pages from `zinc-*` to semantic tokens. Fixed copy/paste and keyboard shortcuts.

### Session 12: Conversations Module Bug Fixes (COMPLETE)
Implemented all 6 fixes from spec 16 (Fix A: API key fix; Fix B: workbaseId plumbing through batch pipeline; Fix C: Sheet replaced with dedicated generator page). Diagnosed routing confusion and type mismatch issues. Wrote check-up doc (17) and next spec (18).

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
