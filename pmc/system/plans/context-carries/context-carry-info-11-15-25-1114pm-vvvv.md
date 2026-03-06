# Context Carryover: v4-Show — Session 11

**Last Updated:** March 1, 2026 (afternoon PST)
**Document Version:** context-carry-info-11-15-25-1114pm-vvvv
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
4. Then **wait for the human to tell you what to do next**.

The human's next step is likely to **visually QA the Session 11 design palette overhaul**, fix any discovered visual bugs, and address small pathing or UI upgrades. The entire design token system was rebuilt in Session 11 — the next agent should understand this system deeply before making any changes.

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

## 🎨 Session 11 Summary: Design Palette Overhaul — Complete (Tasks A–K)

Session 11 executed the complete **"Design Palette — Tokens, Copy/Paste, Visual Upgrade"** specification. This was a comprehensive UI/CSS/JS overhaul across 22 files that:

1. **Fixed the broken CSS token chain** — CSS variables were storing hex/oklch values but `tailwind.config.js` wraps them in `hsl()`. Converted all `:root` variables to HSL triplets.
2. **Applied the MotherDuck brand palette** — Soft Cream, Deep Charcoal, Vibrant Yellow, Sky Blue, Soft Orange.
3. **Fixed copy/paste** — `user-select: auto !important` on body.
4. **Fixed keyboard shortcut conflicts** — Cmd+A modal guard, arrow key text-selection guard.
5. **Re-themed every v4-Show page** from hardcoded `zinc-*` classes to semantic design token classes.

**Specification document:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\ux-3\14-ux-containers-design-implementation-A_v1.md`

### Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| **A** | `globals.css` — Rewrote `:root` block: 30+ CSS vars converted from hex/oklch to HSL triplets. Added `user-select: auto !important` to body. Preserved `.dark` block and `@theme inline` block unchanged. | ✅ |
| **B** | `tailwind.config.js` — Added `input-background` color mapping. Added `duck` brand namespace with 6 hex colors (cream, blue, yellow, charcoal, orange, gray). | ✅ |
| **C** | `polish.css` — Focus ring changed from `ring-primary` (yellow — invisible on cream) to `ring-ring` (sky blue #3AA1EC). | ✅ |
| **D** | `button.tsx` + `badge.tsx` — Destructive variant: `text-white` → `text-destructive-foreground` (token-based). | ✅ |
| **E** | `SignInForm.tsx` + `SignUpForm.tsx` — All hardcoded `gray-*`/`blue-*` replaced with design tokens. | ✅ |
| **F** | `use-keyboard-shortcuts.ts` — Cmd+A checks for open modal before overriding. `ConversationDetailView.tsx` — arrow keys check for active input/text selection before intercepting. | ✅ |
| **G** | `home/page.tsx` + dashboard `layout.tsx` — All `zinc-*` → semantic tokens. Spinner uses `border-duck-blue`. | ✅ |
| **H** | `workbase/[id]/layout.tsx` — Sidebar re-themed: white bg, duck-blue active nav, cream hover states. | ✅ |
| **I** | All 10 workbase sub-pages re-themed — zero `zinc-*` classes remain. | ✅ |
| **J** | Deleted `src/styles/globals.css` — dead duplicate file never imported by any layout. | ✅ |
| **K** | Build verification — `npm run build` passes with zero compilation errors. | ✅ |

### Design Token System — How It Works Now

**The Token Chain (fixed in Session 11):**
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

**Duck Namespace (for brand-specific elements):**
```js
duck: { cream: '#FFFDF0', blue: '#3AA1EC', yellow: '#FFDE00', charcoal: '#383838', orange: '#FF9538', gray: '#D1D5DB' }
```

**60-30-10 Hierarchy:**
- **60% Surface:** Cream backgrounds (`bg-background`), white cards (`bg-card`)
- **30% Content:** Charcoal text (`text-foreground`), gray labels (`text-muted-foreground`)
- **10% Accent:** Yellow buttons (`bg-primary`), blue focus rings/active nav (`bg-duck-blue`), orange highlights (`bg-duck-orange`)

### Universal Zinc-to-Token Mapping Applied in Session 11

| Old Zinc Class | New Token Class |
|---------------|-----------------|
| `bg-zinc-50` | `bg-background` |
| `bg-zinc-100` | `bg-muted` |
| `bg-zinc-200` | `bg-muted` |
| `bg-white` | `bg-card` |
| `text-zinc-900` | `text-foreground` |
| `text-zinc-800` | `text-foreground` |
| `text-zinc-700` | `text-foreground` |
| `text-zinc-600` | `text-muted-foreground` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-400` | `text-muted-foreground` |
| `border-zinc-200` | `border-border` |
| `border-zinc-300` | `border-border` |
| `divide-zinc-200` | `divide-border` |
| `ring-zinc-200` | `ring-ring` |
| `hover:bg-zinc-100` | `hover:bg-muted` |
| `hover:bg-zinc-50` | `hover:bg-accent` |
| `from-zinc-50` | `from-background` |
| `via-zinc-50/80` | `via-background/80` |

**Intentionally NOT Modified:**
- Status badges (semantic colors like `bg-green-100 text-green-700`) — these are status indicators, not theme colors
- Dialog overlays (`bg-black/80`) — standard overlay pattern
- Chart tokens in oklch format — these are not used through `hsl()` wrapper
- `.dark` block in globals.css — preserved for future dark mode
- `@theme inline` block in globals.css — dead code (Tailwind v4 feature), preserved for future v4 migration

---

## 🎯 Session 9 Summary: v4-Show Bug Fixes (COMPLETED)

Session 9 implemented 10 bug fixes and feature changes. Key items:

- **Task 2**: DB Migration — rewrote two stale PG functions (`match_rag_embeddings_kb`, `search_rag_text`) — root DB-layer cause of all embedding failures ✅
- **Task 3**: Added `workbase_id` to `storeSectionsFromStructure()` and `storeExtractedFacts()` ✅
- **Task 5**: Backfilled 51 conversations with `workbase_id` ✅
- **Task 7**: New conversation generator Sheet inside workbase UI ✅
- **Task 8**: Persistent "+" create Work Base card on `/home` ✅
- **Task 9**: Archive restore flow + AlertDialog ✅
- **Task 10**: Sun Bank re-trigger script created — **NOT yet run** ⚠️

---

## 🔥 Session 10 Summary: RAG Embedding Pipeline — Full Debug & Fix

Diagnosed and resolved a persistent RAG embedding job failure. The pipeline is now confirmed working.

**Root cause:** Vercel build cache restored from old deployment + Inngest cached stale deployment-specific callback URLs.
**Resolution:** Cache clearing + Inngest re-sync.

**Key diagnostic tool created:** `POST https://v4-show.vercel.app/api/rag/test-section-insert` — calls the real `storeSectionsFromStructure()` function.

**Key lesson:** Never trust a diagnostic test that doesn't call the same code path as production.

---

## 🏗️ Current Codebase Architecture (v4-show)

The active Next.js 14 application lives at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`. Within `src/`:

```
src/
├── app/
│   ├── globals.css                       # 🎨 DESIGN TOKEN FOUNDATION (Session 11 - Task A)
│   │                                     #    :root HSL triplets, user-select fix
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # 🎨 Dashboard wrapper (Session 11 - Task G)
│   │   ├── home/page.tsx                 # 🎨 Home + workbase grid (Session 9 + 11)
│   │   └── workbase/[id]/
│   │       ├── layout.tsx                # 🎨 Sidebar nav with duck-blue active (Session 11 - Task H)
│   │       ├── page.tsx                  # 🎨 Workbase overview (Session 11 - Task I)
│   │       ├── fine-tuning/
│   │       │   ├── conversations/
│   │       │   │   ├── page.tsx          # 🎨 Conversations + Sheet generator (Session 9 + 11)
│   │       │   │   └── [convId]/page.tsx # 🎨 Conversation detail (Session 11)
│   │       │   ├── launch/page.tsx       # 🎨 Launch page (Session 11)
│   │       │   └── chat/page.tsx         # 🎨 Fine-tuning chat (Session 11)
│   │       ├── fact-training/
│   │       │   ├── documents/
│   │       │   │   ├── page.tsx          # 🎨 Documents list (Session 11)
│   │       │   │   └── [docId]/page.tsx  # 🎨 Document detail (Session 11)
│   │       │   ├── chat/page.tsx         # 🎨 Fact training chat (Session 11)
│   │       │   └── quality/page.tsx      # 🎨 Quality page (Session 11)
│   │       └── settings/page.tsx         # 🎨 Settings + archive (Session 9 + 11)
│   └── api/
│       ├── conversations/generate/route.ts
│       ├── inngest/route.ts
│       ├── rag/
│       │   ├── documents/[id]/upload/
│       │   └── test-section-insert/route.ts  # Diagnostic endpoint (Session 10)
│       └── workbases/route.ts
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx                # 🎨 Auth form tokens (Session 11 - Task E)
│   │   └── SignUpForm.tsx                # 🎨 Auth form tokens (Session 11 - Task E)
│   ├── conversations/
│   │   └── ConversationDetailView.tsx    # 🎨 Arrow key guard (Session 11 - Task F)
│   └── ui/
│       ├── button.tsx                    # 🎨 Destructive variant token (Session 11 - Task D)
│       └── badge.tsx                     # 🎨 Destructive variant token (Session 11 - Task D)
├── hooks/
│   ├── use-keyboard-shortcuts.ts         # 🎨 Cmd+A modal guard (Session 11 - Task F)
│   └── useWorkbases.ts
├── inngest/
│   ├── client.ts
│   └── functions/
│       └── process-rag-document.ts
├── lib/
│   └── rag/
│       └── services/
│           └── rag-ingestion-service.ts
├── styles/
│   └── polish.css                        # 🎨 Focus ring → sky blue (Session 11 - Task C)
│   # NOTE: globals.css was DELETED from styles/ (Session 11 - Task J)
│   #        It was a dead duplicate — only src/app/globals.css is loaded
├── tailwind.config.js                    # 🎨 Duck namespace + input-background (Session 11 - Task B)
└── types/
    └── rag.ts
```

---

## 📁 Key Files Reference

### Session 11 Modified Files (Design Palette Overhaul)

| File | Change |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\globals.css` | `:root` HSL triplets, `user-select: auto !important`, preserved `.dark` + `@theme inline` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\tailwind.config.js` | Added `input-background` mapping, added `duck` brand namespace (6 colors) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\styles\polish.css` | Focus ring: `ring-primary` → `ring-ring` (sky blue) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\button.tsx` | Destructive variant: `text-white` → `text-destructive-foreground` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\ui\badge.tsx` | Destructive variant: `text-white` → `text-destructive-foreground` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\auth\SignInForm.tsx` | All `gray-*`/`blue-*` → design tokens (`bg-background`, `text-foreground`, `text-duck-blue`, etc.) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\auth\SignUpForm.tsx` | All `gray-*`/`blue-*` → design tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\use-keyboard-shortcuts.ts` | Cmd+A checks for `[data-radix-dialog-content]` / `[role="dialog"]` before overriding |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\components\conversations\ConversationDetailView.tsx` | Arrow keys check for active INPUT/TEXTAREA/contenteditable + text selection |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\home\page.tsx` | All `zinc-*` → semantic tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\layout.tsx` | Spinner → `border-duck-blue`, `bg-background` wrapper |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\layout.tsx` | Sidebar: white bg, `bg-duck-blue text-white` active nav, cream hover |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\conversations\[convId]\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\launch\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fine-tuning\chat\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fact-training\documents\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fact-training\documents\[docId]\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fact-training\chat\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\fact-training\quality\page.tsx` | All `zinc-*` → tokens |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\workbase\[id]\settings\page.tsx` | All `zinc-*` → tokens |

### Session 11 Deleted Files

| File | Reason |
|------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\styles\globals.css` | Dead duplicate — never imported by any layout. Only `src/app/globals.css` is loaded via the root layout. |

### Session 9 + 10 Modified Files (Still Relevant)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` | `workbase_id` in section/fact inserts + build fingerprint log |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` | Finalize step guard + imports `storeSectionsFromStructure` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\conversations\generate\route.ts` | `workbaseId` field; post-gen patch; Inngest event |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\workbases\route.ts` | `?includeArchived=true` param |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\hooks\useWorkbases.ts` | `useWorkbasesArchived`, `useRestoreWorkbase` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test-section-insert\route.ts` | Diagnostic endpoint — calls real `storeSectionsFromStructure()` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\.vercelignore` | Excludes `previous-version-codebase/` + `supa-agent-ops/` |

### Key Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\verify-005-preflight.js` | Pre-flight DB verification | Already run ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\005-fix-kb-id-rename.js` | DB migration: fix stale PG functions | Already run ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\backfill-conversations-workbase.js` | Backfill 51 conversations | Already run ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\retrigger-sun-bank-embedding.js` | Re-trigger Sun Bank embedding | **NOT YET RUN** ⚠️ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\test-postgrest-schema-cache.js` | 3-vector test: local DB + deployed Vercel endpoint | Use for future pipeline verification |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\delete-rag-jobs.js` | Delete last N RAG jobs + all dependent records | Clean — safe to use |

---

## 📋 DB State (as of Session 11 end, 2026-03-01)

No database changes were made in Session 11. DB state is identical to Session 10 end.

| Entity | State |
|--------|-------|
| `workbases` (active) | 2 active: `232bea74` (`rag-KB-v2_v1`) and `4fc8fa25` (`Sun Chip Policy Doc #30`) |
| `conversations` | 51 total — all have `workbase_id = '232bea74-b987-4629-afbc-a21180fe6e84'` |
| `rag_sections` | Has `workbase_id` column — pipeline populates correctly |
| `rag_facts` | Has `workbase_id` column — pipeline populates correctly |
| Sun Bank doc `77115c6f` | Was at 0 embeddings — **re-trigger script NOT yet run** |
| PG functions | `match_rag_embeddings_kb` and `search_rag_text` fixed (Session 9) |
| RAG pipeline | ✅ FULLY WORKING (confirmed Session 10) |

---

## 🧪 What Needs Testing Next

### Session 11 Visual QA (NEW — Highest Priority)

The full design palette overhaul needs visual QA on the deployed app. Key areas to verify:

| Area | What to Check |
|------|--------------|
| **Token chain** | All `bg-background`, `text-foreground`, `bg-primary` etc. render correct MotherDuck palette colors |
| **Home page** | Cream background, charcoal text, yellow primary buttons, white cards |
| **Workbase sidebar** | White background, duck-blue active nav item, cream hover states |
| **All 10 workbase sub-pages** | No zinc gray remnants, consistent cream/white/charcoal palette |
| **Auth forms** | Sign in/sign up use design tokens, duck-blue links |
| **Focus rings** | Sky blue focus ring visible on interactive elements |
| **Copy/paste** | Text can be selected and copied throughout the app |
| **Cmd+A in modals** | Cmd+A selects text inside dialogs (not hijacked by global shortcut) |
| **Arrow keys with text selection** | Arrow keys work for cursor movement when text is selected in inputs |
| **Destructive buttons** | Red destructive variant uses `text-destructive-foreground` token |

### Remaining Session 9 Tests (Still Pending)

| Test | Description | Status |
|------|-------------|--------|
| **T6** | `/home` "+" card → opens wizard → creates workbase | ❓ Not yet UI-tested |
| **T5** | Workbase conversations page → "New Conversation" opens Sheet | ❓ Not yet UI-tested |
| **T4** | Generate conversation from Sheet → workbase_id on row | ❓ Not yet UI-tested |
| **T7** | Settings archive → AlertDialog (not browser confirm) → redirect | ❓ Not yet UI-tested |
| **T8** | `/home` archived section → Restore works | ❓ Not yet UI-tested |
| **T9** | Run Sun Bank re-trigger script → ~1298 embeddings → chat returns answers | ❓ Not yet run |

---

## 🔑 Key IDs To Know

| Name | ID |
|------|----|
| User (James) | `8d26cc10-a3c1-4927-8708-667d37a3348b` |
| Workbase: rag-KB-v2_v1 | `232bea74-b987-4629-afbc-a21180fe6e84` |
| Workbase: Sun Chip Policy Doc #30 | `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303` |
| Sun Bank document (needs re-trigger) | `77115c6f-b987-4784-985a-afb4c45d02b6` |
| RunPod endpoint | `780tauhj7c126b` |

---

## ⚠️ Important Lessons From Sessions 10–11 (For Future Debugging)

### RAG Pipeline Debugging (Session 10)
If the RAG pipeline fails with `knowledge_base_id` or similar PostgREST schema errors:
1. Run `scripts/test-postgrest-schema-cache.js` — if Test 1 fails, Supabase PostgREST cache or PG functions are stale.
2. Use diagnostic endpoint `POST https://v4-show.vercel.app/api/rag/test-section-insert` — calls the ACTUAL `storeSectionsFromStructure()`.
3. If Inngest keeps failing despite correct build — force Inngest re-sync: Dashboard → Syncs → Resync, or hit `GET https://v4-show.vercel.app/api/inngest`.
4. Never trust a diagnostic test that doesn't call the same code path as production.

### Design Token System (Session 11)
1. **CSS vars MUST hold HSL triplets** (e.g., `52 100% 50%`) — NOT hex, NOT oklch. The `hsl(var(--*))` wrapper in tailwind.config.js requires this exact format.
2. **The `@theme inline` block is dead code** — it's a Tailwind v4 feature. Tailwind v3 ignores it. Don't modify it, don't rely on it.
3. **The `.dark` block is preserved but unused** — no dark mode toggle exists yet. Don't remove it.
4. **`src/styles/globals.css` was deleted** — it was a dead duplicate. Only `src/app/globals.css` is loaded (via root layout.tsx import).
5. **The `duck.*` namespace** is for brand-specific elements that don't map to shadcn semantics (e.g., `bg-duck-blue` for active sidebar nav, `border-duck-blue` for spinners).
6. **Status badges use semantic colors** (e.g., `bg-green-100 text-green-700`) — these are intentionally NOT converted to design tokens.
7. **Zero zinc classes should remain in dashboard/workbase pages.** If new pages are added, use the zinc-to-token mapping table in this document.

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

## 🔁 Previous Session Context (Sessions 8–10)

### Session 8: Automated Adapter Deployment (COMPLETE)
Fully resolved the automated adapter deployment pipeline: RunPod GraphQL `saveEndpoint`, Hugging Face `createRepo()` + `uploadFiles()`. Adapter `e8fa481f` deployed on HF (`BrightHub2/lora-emotional-intelligence-e8fa481f`) and RunPod endpoint `780tauhj7c126b`.

### Session 9: v4-Show Bug Fixes (COMPLETE)
10 bug fixes: DB migration for stale PG functions, `workbase_id` threading through services/API/UI, conversation generator Sheet, "+" card on home, archive restore flow. Sun Bank re-trigger script created but NOT yet run.

### Session 10: RAG Embedding Pipeline Debug (COMPLETE)
Diagnosed persistent RAG embedding failure across 5 failed Inngest runs. Root cause: stale Vercel build cache + Inngest cached old deployment URLs. Fixed by cache clear + Inngest re-sync. Created diagnostic endpoint and test script.

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
