# Spec 34 — Add Bright Run Logo to Application
**Version:** v1.1  
**Date:** March 5, 2026  
**Status:** Ready for execution  
**Scope:** UI-only — no backend, no API, no DB changes  

> [!IMPORTANT]
> **User-confirmed decisions (v1.1):**
> 1. The "Welcome back, {name}" greeting is **completely removed** — not relocated.
> 2. Logo height `h-10` (40px) on home page and `h-7` (28px) in sidebar confirmed as appropriate.

---

## Agent Instructions

**Before starting any work, you MUST:**

1. **Read this entire document** — it contains pre-verified facts and explicit instructions
2. **Read the codebase** at `C:\Users\james\Master\BrightHub\BRun\v4-show\src\` to confirm file locations referenced below
3. **Execute the instructions and specifications as written** — do not re-investigate what has already been verified

---

## Platform Overview

**Bright Run LoRA Training Data Platform** — Next.js 14 (App Router) application with two product paths:

| Path | Renamed | Status | Flow |
|------|---------|--------|------|
| **LoRA Training** | "Fine Tuning" (user-facing) | Complete | Generate Conversations → Auto-Enrich → Aggregate Training Set → Train LoRA Adapter → Auto-Deploy to HF + RunPod → Worker Refresh → A/B Chat |
| **RAG Frontier** | "Fact Training" (user-facing) | Complete | Upload Document → 6-Pass Inngest Ingestion → Expert Q&A → Semantic Search → Chat with Citations → Quality Eval |

**Current Phase**: UX Refactoring live — "Work Base" architecture. All backend modules are complete. A comprehensive UX spec (`pmc\product\_mapping\ux\07-internal-ux-decisions_v4.md`) defines 12 design decisions (D1–D12), a complete route rewrite, new `workbases` table, and 5-phase implementation plan. Active bug-fix and feature work ongoing.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase Pro (PostgreSQL + pgvector, HNSW indexes) |
| Storage | Supabase Storage |
| AI — Ingestion | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) × 4 passes, Haiku 4.5 (`claude-haiku-4-5-20251001`) × 1 pass, Opus 4.6 (`claude-opus-4-6`) × 1 pass |
| AI — Retrieval | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for HyDE, response gen, self-eval, reranking |
| AI — Generation | Claude Sonnet 4.5 for conversations; Claude Sonnet 4 (`claude-sonnet-4-20250514`) for evaluation |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| UI | shadcn/UI + Tailwind CSS |
| State | React Query v5 (TanStack Query) + Zustand (2 stores) |
| Background Jobs | Inngest (4 functions: autoDeployAdapter, dispatchTrainingJob, processRAGDocument, + failure handler) |
| Deployment | Vercel (frontend + API routes) |
| Inference | RunPod Pods (current, `INFERENCE_MODE=pods`, vLLM v0.14.0) + Serverless (preserved, vLLM v0.15.0) |
| DB Operations | **SAOL (mandatory for agent terminal/script DB ops)** — `supa-agent-ops/` |

---

## Completed Modules Summary

| Module | Key Details |
|--------|-------------|
| **Conversation Generation** | Claude-powered, persona-based, emotional arcs, batch generation |
| **5-Stage Enrichment Pipeline** | Quality validation, field-by-field review, orchestrator-based |
| **LoRA Training Pipeline** | RunPod Serverless GPU, QLoRA 4-bit, hyperparameter sliders |
| **Automated Adapter Deployment** | Inngest: Supabase → HuggingFace (LFS SDK) → RunPod LORA_MODULES (GraphQL saveEndpoint). Verified with adapter `e8fa481f` on endpoint `780tauhj7c126b` |
| **Inference & A/B Testing** | Dual-mode (pods/serverless), side-by-side comparison, Claude-as-Judge, user ratings |
| **Multi-Turn Chat (E01–E11)** | 10-turn progressive conversations, dual arc progression, RQE with 6 EI dimensions |
| **RAG Frontier (E01–E10)** | 6-pass ingestion, pgvector search, HyDE, self-RAG eval, citations, 5-metric quality dashboard |
| **Adapter Download System** | tar.gz archives, on-demand generation |

---

## Current Route Structure

**Implemented route structure:** All pages under `/workbase/[id]/` with sidebar navigation. UX refactoring is live; active bug-fix and feature work ongoing.

| Route | Purpose |
|-------|---------|
| `/home` | Work Base list + QuickStart |
| `/workbase/[id]` | Overview (status cards + next-best-action CTAs) |
| `/workbase/[id]/fine-tuning/conversations` | Conversation library + Training Sets; header buttons: "Batch Jobs" (outline) + "New Conversation" (filled) |
| `/workbase/[id]/fine-tuning/conversations/generate` | Workbase-scoped bulk conversation generator (persona × arc × topic matrix) |
| `/workbase/[id]/fine-tuning/conversations/batch` | Batch jobs list — shows all batch jobs scoped to this workbase |
| `/workbase/[id]/fine-tuning/conversations/batch/[jobId]` | Live batch job watcher — auto-starts processing, progress bar, pause/cancel/enrich actions |
| `/workbase/[id]/fine-tuning/conversations/[convId]` | View-only conversation detail + feedback comments |
| `/workbase/[id]/fine-tuning/launch` | Configure + Train + Deploy (replaces 4 legacy pages) |
| `/workbase/[id]/fine-tuning/chat` | Behavior Chat (LoRA/RAG/Both, A/B testing) |
| `/workbase/[id]/fact-training/documents` | Upload + document list |
| `/workbase/[id]/fact-training/documents/[docId]` | Document detail (5 tabs) |
| `/workbase/[id]/fact-training/chat` | RAG Chat, all documents |
| `/workbase/[id]/fact-training/quality` | Quality dashboard |
| `/workbase/[id]/settings` | Work Base config |


---

## Operating Principles

- **Do not re-investigate pre-verified facts** — this document and the task spec contain verified codebase state
- **Do not make assumptions** — if something is ambiguous, ask
- **All code changes must include exact file paths** and line references
- **Human action steps** must be clearly delineated and copy-paste ready
- **The codebase may have evolved** since the specifications were written — confirm file locations exist before editing
- **RunPod GraphQL uses query param auth** (`?api_key=`), NOT Bearer header
- **RunPod `saveEndpoint` is a full PUT** — always fetch ALL original fields first, modify only what's needed
- **SAOL: ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
SAOL Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\pmct\supabase-agent-ops-library-use-instructions_v2.md`


## 1. Problem Statement

The application currently displays a text heading `"BrightHub"` and greeting `"Welcome back, {name}"` on the home page. There is no graphical logo anywhere in the app. A new **Bright Run** logo (transparent PNG) needs to be integrated into two contexts:

1. **Outside workbase** (home page) — logo replaces the text heading + greeting
2. **Inside workbase** (sidebar) — logo appears at the top of the sidebar, above the existing navigation

---

## 2. Logo Image

**Source:** `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v4-sh\build-01\bright-run-logo_v1.png`

- Transparent PNG
- Text reads "Bright" (black) + "Run" (golden/yellow)
- Small golden sphere dot above the "R"
- Wide aspect ratio (roughly 4:1)

**Deployment location:** `C:\Users\james\Master\BrightHub\BRun\v4-show\public\bright-run-logo.png`

> [!NOTE]
> The `public/` directory does **not currently exist** in the project root. It must be created. In Next.js, `public/` sits at the project root (sibling of `src/`), NOT inside `src/`. Files in `public/` are served at the root URL path: `<img src="/bright-run-logo.png">`.

**Setup commands (run before code changes):**
```bash
mkdir -p "C:/Users/james/Master/BrightHub/BRun/v4-show/public"
cp "C:/Users/james/Master/BrightHub/BRun/v4-show/pmc/product/_mapping/v4-sh/build-01/bright-run-logo_v1.png" "C:/Users/james/Master/BrightHub/BRun/v4-show/public/bright-run-logo.png"
```

---

## 3. UI Pattern Recommendation

Before specifying the exact implementation, here is a brief recommendation on logo placement patterns:

### Standard SaaS Dashboard Logo Patterns

| Pattern | Description | Used By |
|---------|-------------|---------|
| **A. Top-left sidebar** | Logo sits at the very top of the sidebar in ALL views. Clicking it navigates to home. | Notion, Linear, Vercel, Supabase |
| **B. Header bar** | Logo in a persistent top header bar spanning full width. | GitHub, Stripe |
| **C. Different per context** | Logo replaces header on landing page; appears compact in sidebar on inner pages. | Your request |

**Recommendation:** Pattern **A** (always in sidebar) is the most common SaaS pattern. However, your app currently has **no sidebar on the home page** — it's a full-width page with a header bar. So **Pattern C** (your request) is the pragmatic choice given the existing architecture. It avoids adding a sidebar to the home page, which would be a larger refactor.

**What I would suggest long-term:** Eventually, a thin persistent sidebar or top nav bar on all pages with the logo would unify the experience. But for now, Pattern C fits cleanly.

---

## 4. Proposed Changes

### 4.1 Asset Setup

#### [NEW] `public/` directory + logo file

Create the `public/` directory at the project root and copy the logo into it:

```
C:\Users\james\Master\BrightHub\BRun\v4-show\public\bright-run-logo.png
```

The image referenced as `/bright-run-logo.png` in `<img>` tags will be served automatically by Next.js.

**Next.js `<Image>` vs `<img>`:** We will use a standard `<img>` tag (not Next.js `<Image>`) because:
- The logo is a local static asset (no remote domain config needed)
- `<Image>` requires width/height props which would conflict with responsive `max-width`/`max-height` CSS
- An `<img>` tag with CSS constraints is simpler and fully sufficient for a logo

---

### 4.2 Outside Workbase: Home Page Header

#### [MODIFY] [page.tsx](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/(dashboard)/home/page.tsx)

**What changes:** Replace the text heading "BrightHub" + "Welcome back" greeting with the logo image. The greeting moves to a subtitle line below the logo.

**Current code (lines 216–221 within the header):**
```tsx
<div>
  <h1 className="text-3xl font-bold text-foreground">BrightHub</h1>
  <p className="text-muted-foreground">
    Welcome back, {profile?.full_name || user?.email}
  </p>
</div>
```

**Replacement code (exact drop-in for lines 216–221):**
```tsx
<div>
  <img
    src="/bright-run-logo.png"
    alt="Bright Run"
    className="h-10 w-auto"
  />
</div>
```

**What is removed:** Both the `<h1>BrightHub</h1>` and the `<p>Welcome back, ...</p>` are removed entirely.  
**What stays:** The surrounding `<div className="flex justify-between items-center py-6">`, the Sign Out button, and the user email display on the right side are all unchanged.

**Sizing:** `h-10` = 40px height. With the logo's ~4:1 aspect ratio, this produces a ~160px wide image — fits comfortably in the header bar (which is max 1280px wide). `w-auto` preserves the aspect ratio and will never overflow the container.

---

### 4.3 Inside Workbase: Sidebar Logo

#### [MODIFY] [layout.tsx](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/app/(dashboard)/workbase/[id]/layout.tsx)

**What changes:** Insert the logo at the very top of the `<aside>` sidebar, above the existing "All Work Bases" back link and workbase name header. The logo links to `/home`.

**Current sidebar code (lines 78–88):**
```tsx
<aside className="w-64 border-r border-border bg-card flex flex-col">
  {/* Header */}
  <div className="p-4 border-b border-border">
    <Link href="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-2">
      <ChevronLeft className="h-4 w-4" />
      All Work Bases
    </Link>
    <h2 className="font-semibold text-foreground truncate">
      {isLoading ? '...' : workbase?.name || 'Work Base'}
    </h2>
  </div>
```

**Replacement code:**
```tsx
<aside className="w-64 border-r border-border bg-card flex flex-col">
  {/* Logo */}
  <div className="px-4 pt-4 pb-2">
    <Link href="/home">
      <img
        src="/bright-run-logo.png"
        alt="Bright Run"
        className="h-7 w-auto"
      />
    </Link>
  </div>
  {/* Header */}
  <div className="p-4 border-b border-border">
    <Link href="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-2">
      <ChevronLeft className="h-4 w-4" />
      All Work Bases
    </Link>
    <h2 className="font-semibold text-foreground truncate">
      {isLoading ? '...' : workbase?.name || 'Work Base'}
    </h2>
  </div>
```

**Key decisions:**
- `h-7` (28px) keeps the logo compact in the narrower 256px (`w-64`) sidebar. `w-auto` preserves aspect ratio.
- The logo block has `px-4 pt-4 pb-2` padding — aligned horizontally with the sidebar content below, with some vertical breathing room.
- The logo is **not** inside the existing `border-b` header `<div>` — it sits above it as a separate element, exactly matching the user's screenshot annotation.
- The logo is wrapped in a `<Link href="/home">` so clicking it navigates to the home page (standard pattern).
- The existing "All Work Bases" back link, workbase name, and all nav items remain unchanged — they just shift down by the height of the logo block (~48px total with padding).

---

## 5. Responsive Behavior

| Viewport | Home Page Logo | Sidebar Logo |
|----------|---------------|--------------|
| Desktop (≥1024px) | `h-10` (40px) — centered-left in max-w-7xl container | `h-7` (28px) — top of 256px sidebar |
| Tablet (768–1023px) | Same — `max-w-7xl` constrains width, logo scales naturally | Same — sidebar still at `w-64` |
| Mobile (<768px) | Same `h-10`, `w-auto` ensures it doesn't overflow | Sidebar collapses (app doesn't currently have responsive sidebar — no change here) |

The `w-auto` + fixed height approach means the logo never stretches or distorts. It will always maintain its original aspect ratio. If the container is too narrow, the logo naturally shrinks because `w-auto` can't exceed the parent's width.

---

## 6. Files Changed Summary

| File | Change | Lines Affected |
|------|--------|----------------|
| `public/bright-run-logo.png` | **[NEW]** — Copy logo asset into Next.js `public/` directory | — |
| `src/app/(dashboard)/home/page.tsx` | Replace "BrightHub" h1 + "Welcome back" `<p>` with `<img>` logo tag | ~216–221 |
| `src/app/(dashboard)/workbase/[id]/layout.tsx` | Insert logo block above sidebar header | ~78 (insert new div) |

**Total files changed: 3** (1 new asset, 2 modified components)

---

## 7. What Is NOT Changed

| Element | Status |
|---------|--------|
| Sign-in / sign-up pages | **Untouched** — no "BrightHub" branding there currently |
| `metadata.ts` title (`"Document Categorization System"`) | **Untouched** — separate concern, can be updated in a future task |
| Sidebar navigation items | **Untouched** — only shifted down |
| "All Work Bases" back link | **Untouched** |
| Workbase name display | **Untouched** |
| All main content areas | **Untouched** |
| Sign Out button and email display | **Untouched** |

---

## 8. Verification Plan

### 8.1 TypeScript Compilation
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show"
npx tsc --noEmit --project src/tsconfig.json
```
Expected: zero errors.

### 8.2 Manual Verification — Home Page (Outside Workbase)
1. Navigate to `https://v4-show.vercel.app/home` (or `localhost:3000/home` if running locally)
2. **Verify:** The "BrightHub" text heading is gone
3. **Verify:** The "Welcome back, {name}" greeting is gone
4. **Verify:** The Bright Run logo image is visible in the header bar (left side)
5. **Verify:** The logo maintains aspect ratio and does not look stretched
6. **Verify:** The user email and "Sign Out" button are still visible on the right
7. **Verify:** Resize the browser window to ~768px width — logo should not overflow or break layout

### 8.3 Manual Verification — Workbase Page (Inside Workbase)
1. Navigate to `https://v4-show.vercel.app/workbase/232bea74-b987-4629-afbc-a21180fe6e84`
2. **Verify:** The Bright Run logo appears at the top of the left sidebar, above "All Work Bases"
3. **Verify:** The logo is smaller than on the home page (~28px height)
4. **Verify:** Clicking the logo navigates to `/home`
5. **Verify:** The "All Work Bases" back link, workbase name, and all nav items are still visible below the logo
6. **Verify:** The sidebar nav items (Overview, Conversations, Launch Tuning, etc.) have not changed position relative to each other — they all just shifted down uniformly
7. **Verify:** Navigate between different sidebar pages (Overview, Conversations, Chat, Settings) — logo stays fixed at top

### 8.4 Regression Check
- All workbase pages load correctly with the sidebar logo present
- QuickStart wizard still opens from the home page
- Workbase cards still clickable on the home page
- Sign Out still works

---

## 9. Future Considerations

- **Sign-in page logo:** Could add the logo to the sign-in/sign-up pages for brand consistency
- **Favicon:** The golden sphere from the logo could be used as the app's favicon
- **Dark mode:** The logo has "Bright" in black text — may need a white-text variant for dark mode backgrounds
- **Unified nav:** Eventually a persistent top bar or sidebar on all pages would unify the logo placement
