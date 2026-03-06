# Implementation Specification: Design Palette — Tokens, Copy/Paste, Visual Upgrade

**Version:** v2
**Date:** 2026-03-01
**Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

---

## Agent Instructions

**Before starting any work, you MUST:**

1. Read this entire document fully.
2. Read every file listed in the **Files Modified** section before touching it.
3. Execute tasks in the order listed — Tasks A → K.
4. After each task, run `npm run build` (inside `src/`) to check for errors before proceeding.

**No database changes are required.** SAOL is not used in this implementation. This is purely UI/CSS/JS.

---

## Background

**Bright Run** — Next.js 14 (App Router) + TypeScript SaaS application. Two product paths: **Fine Tuning** (LoRA training) and **Fact Training** (RAG).

**Platform:** BrightHub BRun — Next.js 14 App Router. Two product paths:
- **Fine Tuning** (LoRA Training): Generates AI conversations → enriches → trains LoRA adapter → deploys to RunPod
- **Fact Training** (RAG): Uploads documents → 6-pass Claude ingestion → semantic search → chat with citations

**Technology:** shadcn/UI + **Tailwind CSS 3.4.17** + `tailwindcss-animate` plugin. The project is on Tailwind v3, NOT v4.

**Work Base architecture:** Introduced in v4-Show. Every operation is scoped to a `workbase` entity. The `workbases` table exists. Routes are at `/workbase/[id]/fine-tuning/*` and `/workbase/[id]/fact-training/*`.


**Current state — the design token chain is broken:**

The `tailwind.config.js` defines colors using the standard shadcn/Tailwind v3 pattern: `hsl(var(--primary))`. This pattern requires CSS variables to hold **HSL triplets** (e.g., `222.2 47.4% 11.2%`). However, the current `globals.css` `:root` block stores values as hex (`#030213`) and oklch (`oklch(0.145 0 0)`). This means `hsl(#030213)` is **invalid CSS**.

As a result, all Tailwind token-based classes (`bg-primary`, `text-foreground`, `bg-background`, etc.) produce incorrect colors at runtime. This is why the v4-Show pages use hardcoded `bg-zinc-*` classes — to work around the broken token system.

Additionally, a `@theme inline` block exists in `globals.css`. This is a **Tailwind v4 feature** that Tailwind v3 ignores entirely during compilation. Browsers also ignore it (unknown CSS at-rule). It is dead code.

**This specification fixes the token chain, applies the MotherDuck brand palette through working tokens, fixes copy/paste, and re-themes all v4-Show pages to use semantic token classes instead of hardcoded zinc.**

---

## Design Token Reference

| Name | Hex | HSL Triplet (for CSS var) | Tailwind Class |
|------|-----|--------------------------|----------------|
| Soft Cream | `#FFFDF0` | `52 100% 97%` | `bg-background` |
| Deep Charcoal | `#383838` | `0 0% 22%` | `text-foreground` |
| White | `#FFFFFF` | `0 0% 100%` | `bg-card`, `bg-popover` |
| Vibrant Yellow | `#FFDE00` | `52 100% 50%` | `bg-primary` |
| Darkened Yellow (hover) | `#E6C800` | `52 100% 45%` | `hover:bg-primary/90` approximation |
| Muted Cream | `#F5F5F0` | `60 33% 95%` | `bg-secondary`, `bg-muted`, `bg-accent` |
| Soft Gray | `#666666` | `0 0% 40%` | `text-muted-foreground` |
| Red (destructive) | `#d4183d` | `348 80% 46%` | `bg-destructive` (unchanged) |
| Light Gray (borders) | `#D1D5DB` | `216 12% 84%` | `border-border`, `border-input` |
| Sky Blue | `#3AA1EC` | `205 82% 58%` | `bg-duck-blue`, `ring-ring` |
| Soft Orange | `#FF9538` | `28 100% 61%` | `bg-duck-orange` |

**60-30-10 hierarchy:**
- **60% Surface:** Cream backgrounds (`bg-background`), white cards (`bg-card`)
- **30% Content:** Charcoal text (`text-foreground`), gray labels (`text-muted-foreground`)
- **10% Accent:** Yellow buttons (`bg-primary`), blue focus rings, orange highlights (`bg-duck-orange`)

**Prohibited:** `#000000` for text (use charcoal `#383838`). Hardcoded hex in page components (use Tailwind token classes).

---

## Files Modified

| # | File | Task |
|---|------|------|
| 1 | `src/app/globals.css` | A |
| 2 | `src/tailwind.config.js` | B |
| 3 | `src/styles/polish.css` | C |
| 4 | `src/components/ui/button.tsx` | D |
| 5 | `src/components/ui/badge.tsx` | D |
| 6 | `src/components/auth/SignInForm.tsx` | E |
| 7 | `src/components/auth/SignUpForm.tsx` | E |
| 8 | `src/hooks/use-keyboard-shortcuts.ts` | F |
| 9 | `src/components/conversations/ConversationDetailView.tsx` | F |
| 10 | `src/app/(dashboard)/home/page.tsx` | G |
| 11 | `src/app/(dashboard)/layout.tsx` | G |
| 12 | `src/app/(dashboard)/workbase/[id]/layout.tsx` | H |
| 13 | `src/app/(dashboard)/workbase/[id]/page.tsx` | I |
| 14 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx` | I |
| 15 | `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/[convId]/page.tsx` | I |
| 16 | `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx` | I |
| 17 | `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx` | I |
| 18 | `src/app/(dashboard)/workbase/[id]/fact-training/documents/page.tsx` | I |
| 19 | `src/app/(dashboard)/workbase/[id]/fact-training/documents/[docId]/page.tsx` | I |
| 20 | `src/app/(dashboard)/workbase/[id]/fact-training/chat/page.tsx` | I |
| 21 | `src/app/(dashboard)/workbase/[id]/fact-training/quality/page.tsx` | I |
| 22 | `src/app/(dashboard)/workbase/[id]/settings/page.tsx` | I |

### Files Deleted

| File | Reason |
|------|--------|
| `src/styles/globals.css` | Dead duplicate. Never imported. Only `src/app/globals.css` is loaded via `layout.tsx`. |

### Files NOT Modified (Intentional)

| File | Reason |
|------|--------|
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` | `bg-black/80` overlay scrims are standard. No brand palette concern. |
| `src/components/ui/label.tsx`, `slider.tsx`, `scroll-area.tsx`, `command.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `menubar.tsx`, `select.tsx` | `select-none` on interactive chrome (menu items, drag handles, scroll thumbs, labels) is correct UX. |
| `src/components/rag/ExpertQAPanel.tsx`, `DocumentStatusBadge.tsx` | Semantic status colors (red=danger, green=ok, amber=warning) follow a different design axis, not brand palette. |
| `src/app/(dashboard)/batch-jobs/**`, `training/jobs/**` | Status badges use semantic status colors. Same reasoning. |

---

## Task A — Fix `globals.css` Token Foundation

**File:** `src/app/globals.css`

**What changes:** Convert all `:root` CSS variable values from hex/oklch to **HSL triplets**. This fixes the `hsl(var(--*))` pattern in `tailwind.config.js` so that Tailwind token classes (`bg-primary`, `text-foreground`, etc.) produce valid CSS for the first time.

Also: add `user-select: auto !important` to the body rule to fix copy/paste globally.

**Replace the entire `:root { ... }` block** (lines 5–44) with:

```css
:root {
  --font-size: 16px;

  /* ── Core Palette (HSL triplets for Tailwind hsl(var(--*)) pattern) ── */
  --background: 52 100% 97%;          /* #FFFDF0  Soft Cream */
  --foreground: 0 0% 22%;             /* #383838  Deep Charcoal */
  --card: 0 0% 100%;                  /* #FFFFFF  White */
  --card-foreground: 0 0% 22%;        /* #383838 */
  --popover: 0 0% 100%;              /* #FFFFFF */
  --popover-foreground: 0 0% 22%;    /* #383838 */
  --primary: 52 100% 50%;             /* #FFDE00  Vibrant Yellow */
  --primary-foreground: 0 0% 22%;     /* #383838  Charcoal text on yellow */
  --secondary: 60 33% 95%;            /* #F5F5F0  Muted Cream */
  --secondary-foreground: 0 0% 22%;   /* #383838 */
  --muted: 60 33% 95%;                /* #F5F5F0  Muted Cream */
  --muted-foreground: 0 0% 40%;       /* #666666  Soft Gray */
  --accent: 60 33% 95%;               /* #F5F5F0  Hover backgrounds */
  --accent-foreground: 0 0% 22%;      /* #383838 */
  --destructive: 348 80% 46%;         /* #d4183d  Red (unchanged) */
  --destructive-foreground: 0 0% 100%; /* #ffffff */
  --border: 216 12% 84%;              /* #D1D5DB  Light Gray */
  --input: 216 12% 84%;               /* #D1D5DB  Visible input borders */
  --input-background: 0 0% 100%;      /* #FFFFFF  White input backgrounds */
  --switch-background: 216 12% 84%;   /* #D1D5DB */
  --ring: 205 82% 58%;                /* #3AA1EC  Sky Blue focus ring */
  --radius: 0.625rem;

  /* ── Chart tokens (unchanged) ── */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* ── Sidebar tokens ── */
  --sidebar: 0 0% 100%;               /* White sidebar */
  --sidebar-foreground: 0 0% 22%;     /* Charcoal */
  --sidebar-primary: 52 100% 50%;     /* Yellow */
  --sidebar-primary-foreground: 0 0% 22%; /* Charcoal */
  --sidebar-accent: 52 100% 97%;      /* Cream */
  --sidebar-accent-foreground: 0 0% 22%;
  --sidebar-border: 216 12% 84%;      /* Light Gray */
  --sidebar-ring: 205 82% 58%;        /* Sky Blue */

  /* ── Font weight tokens (unchanged) ── */
  --font-weight-medium: 500;
  --font-weight-normal: 400;
}
```

**Note on chart tokens:** Chart colors remain in oklch format because they are never referenced through the `hsl(var(--*))` pattern. They are used directly by Recharts.

**Note on `.dark` block:** Preserve it unchanged. Dark mode is not actively used. It uses oklch values which would not work with the `hsl()` wrapper, but this is acceptable for now. A dark mode palette adaptation is a separate future task.

**Keep the `@theme inline` block unchanged.** It is dead code in Tailwind v3 (browsers and Tailwind both ignore it), but removing it would create unnecessary churn. It can be cleaned up in a future Tailwind v4 migration.

**Update the `@layer base` body rule** (lines 124–132):

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    user-select: auto !important;
  }
}
```

**Keep unchanged:** Typography `@layer base` block (lines 137–186), `html` rule (lines 189–191).

---

## Task B — Fix `tailwind.config.js` Token Chain + Add Duck Namespace

**File:** `src/tailwind.config.js`

**What changes:** The existing `hsl(var(--*))` color mappings now work correctly because Task A converted CSS vars to HSL triplets. Add the `duck` brand color namespace for colors that don't map to shadcn semantics (sky blue, orange). Also add `input-background` to Tailwind.

**Replace the entire file with:**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "input-background": "hsl(var(--input-background))",
        duck: {
          cream:    '#FFFDF0',
          blue:     '#3AA1EC',
          yellow:   '#FFDE00',
          charcoal: '#383838',
          orange:   '#FF9538',
          gray:     '#D1D5DB',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Changes from current:**
- Added `"input-background"` color mapping (existing custom CSS variable, now accessible as `bg-input-background`)
- Added `duck` namespace with 6 brand hex colors for direct use in components
- All existing shadcn mappings preserved unchanged

**How to use `duck.*` vs shadcn tokens:**
- Use shadcn token classes (`bg-primary`, `bg-background`, `text-foreground`, `bg-card`, `border-border`) for all standard UI elements
- Use `duck.*` classes (`bg-duck-blue`, `bg-duck-orange`, `text-duck-charcoal`) only for brand-specific elements where no shadcn token matches (e.g., active nav highlight = `bg-duck-blue`, accent badges = `bg-duck-orange`)

---

## Task C — Fix `polish.css`

**File:** `src/styles/polish.css`

### C.1 — Fix Firefox Scrollbar (line 37)

**Current:**
```css
scrollbar-color: hsl(var(--muted-foreground) / 0.2) hsl(var(--muted) / 0.3);
```

This now works correctly with HSL triplets after Task A. No change needed — the `hsl(0 0% 40% / 0.2)` syntax is valid CSS.

**Verdict: No change required.**

### C.2 — Fix Focus Ring Color (line 8)

**Current:**
```css
*:focus-visible {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}
```

**Problem:** `ring-primary` resolves to yellow (`#FFDE00`). A yellow focus ring on cream background is nearly invisible.

**Replace with:**
```css
*:focus-visible {
  @apply outline-none ring-2 ring-ring ring-offset-2;
}
```

`ring-ring` resolves to `--ring` = `#3AA1EC` (Sky Blue) — a clearly visible accessibility indicator.

### C.3 — Selection Highlight (lines 144-146)

**Current:**
```css
::selection {
  @apply bg-primary/20 text-primary-foreground;
}
```

**After Task A:** `bg-primary/20` = 20% opacity yellow highlight, `text-primary-foreground` = charcoal. This produces a subtle gold selection highlight — acceptable and on-brand. **No change needed.**

---

## Task D — Fix Hard-coded `text-white` in shadcn Components

### D.1 — `src/components/ui/button.tsx`

In the `destructive` variant string, find `text-white` and replace with `text-destructive-foreground`.

**Find:**
```
bg-destructive text-white hover:bg-destructive/90
```

**Replace:**
```
bg-destructive text-destructive-foreground hover:bg-destructive/90
```

Since `--destructive-foreground` is `0 0% 100%` (white), the visual output is identical — but now flows through the token system.

**All other button variants remain unchanged.** After Task A, the existing variant classes work correctly:
- `default`: `bg-primary text-primary-foreground` → yellow bg + charcoal text
- `outline`: `border bg-background text-foreground hover:bg-accent` → cream bg, charcoal text, muted hover
- `secondary`: `bg-secondary text-secondary-foreground` → muted cream bg, charcoal text
- `ghost`: `hover:bg-accent hover:text-accent-foreground` → muted cream hover
- `link`: `text-primary` → yellow text (may want to be blue — see Note below)

**Note on link variant:** `text-primary` will resolve to yellow. If link text should be blue instead, change the `link` variant to `text-duck-blue underline-offset-4 hover:underline`. This is a design decision — leave as-is for now unless the user requests it.

### D.2 — `src/components/ui/badge.tsx`

Same change in the `destructive` variant. Find `text-white`, replace with `text-destructive-foreground`.

---

## Task E — Fix Auth Forms

### E.1 — `src/components/auth/SignInForm.tsx`

This file completely bypasses the design system. Apply these replacements:

**Page wrapper (line 31):**
- Find: `bg-gray-50`
- Replace: `bg-background`

**Heading (line 34):**
- Find: `text-gray-900`
- Replace: `text-foreground`

**Input fields (lines 54, 67):**
- Find: `border-gray-300 placeholder-gray-500 text-gray-900 ... focus:ring-blue-500 focus:border-blue-500`
- Replace: `border-input placeholder-muted-foreground text-foreground ... focus:ring-ring focus:border-ring`

**Submit button (line 77):**
- Find: `text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`
- Replace: `text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-ring border border-foreground`

**Sign-up link (line 86):**
- Find: `text-blue-600 hover:text-blue-500`
- Replace: `text-duck-blue hover:text-duck-blue/80`

### E.2 — `src/components/auth/SignUpForm.tsx`

Apply the same class replacements as E.1. Read the file first to identify the exact line numbers — it follows the same pattern.

---

## Task F — Fix Copy/Paste JavaScript Blockers

### F.1 — `src/hooks/use-keyboard-shortcuts.ts` (HIGH PRIORITY)

**Problem:** `Cmd/Ctrl+A` is intercepted globally on `window` and replaced with "select all table rows." The `isInputFocused()` guard only checks for `INPUT`, `TEXTAREA`, and `contenteditable` elements. If a user tries to `Cmd+A` to select text inside a `<div>` or `<p>` (e.g., conversation turn content in the detail modal), the shortcut fires and prevents native select-all behavior.

**Fix:** Scope the shortcut to only fire when the conversations table is the relevant context. Add a check for a container element.

**Replace lines 35-39:**

```typescript
// Current (broken):
// Cmd/Ctrl+A: Select all conversations
if (modKey && key === 'a') {
  event.preventDefault();
  selectAllConversations(conversations.map(c => c.conversationId));
  return;
}
```

**With:**

```typescript
// Cmd/Ctrl+A: Select all conversations (only when table is visible, not in modals)
if (modKey && key === 'a') {
  // Don't override native select-all when a modal/dialog is open
  const modalOpen = document.querySelector('[data-radix-dialog-content]') ||
                    document.querySelector('[role="dialog"]');
  if (modalOpen) return; // Let native Cmd+A work inside modals

  event.preventDefault();
  selectAllConversations(conversations.map(c => c.conversationId));
  return;
}
```

This preserves the Cmd+A = "select all rows" behavior on the conversations table page, but allows native text selection inside any open modal (conversation detail, export, etc.).

### F.2 — `src/components/conversations/ConversationDetailView.tsx` (MEDIUM PRIORITY)

**Problem:** ArrowLeft/ArrowRight are intercepted globally with no input guard. If the user clicks inside conversation text and presses arrow keys to move the text cursor, those keystrokes navigate to the previous/next conversation instead.

**Replace lines 41-48:**

```typescript
// Current (broken):
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' && hasPrevious) {
    e.preventDefault();
    handlePrevious();
  } else if (e.key === 'ArrowRight' && hasNext) {
    e.preventDefault();
    handleNext();
  }
};
```

**With:**

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Don't intercept arrows when user is in an input or selecting text
  const active = document.activeElement;
  if (
    active?.tagName === 'INPUT' ||
    active?.tagName === 'TEXTAREA' ||
    active?.getAttribute('contenteditable') === 'true' ||
    window.getSelection()?.toString()
  ) {
    return;
  }

  if (e.key === 'ArrowLeft' && hasPrevious) {
    e.preventDefault();
    handlePrevious();
  } else if (e.key === 'ArrowRight' && hasNext) {
    e.preventDefault();
    handleNext();
  }
};
```

The `window.getSelection()?.toString()` check ensures arrow keys work normally when the user has selected text (e.g., to extend/shrink the selection).

---

## Task G — Re-theme Home Page + Dashboard Layout

### G.0 — Universal Zinc-to-Token Class Mapping

Use this table for **all** page re-theming in Tasks G, H, and I. Always prefer the token class over hardcoded hex.

| Old (zinc dark) | New (token-based) | Resolves To |
|---|---|---|
| `bg-zinc-950` | `bg-background` | Cream `#FFFDF0` |
| `bg-zinc-900` | `bg-card` | White `#FFFFFF` |
| `bg-zinc-900/50` | `bg-background` | Cream |
| `bg-zinc-800` | `bg-muted` | Muted Cream `#F5F5F0` |
| `bg-zinc-800/30` | `bg-background` | Cream |
| `bg-zinc-800/50` | `bg-muted/50` | 50% Muted Cream |
| `border-zinc-800` | `border-border` | Light Gray `#D1D5DB` |
| `border-zinc-700` | `border-border` | Light Gray |
| `border-zinc-800/50` | `border-border` | Light Gray |
| `text-zinc-50` | `text-foreground` | Charcoal `#383838` |
| `text-zinc-200` | `text-foreground` | Charcoal |
| `text-zinc-300` | `text-foreground` | Charcoal |
| `text-zinc-400` | `text-muted-foreground` | Soft Gray `#666666` |
| `text-zinc-500` | `text-muted-foreground` | Soft Gray |
| `text-zinc-600` | `text-muted-foreground` | Soft Gray |
| `hover:text-zinc-200` | `hover:text-foreground` | Charcoal |
| `hover:text-zinc-300` | `hover:text-foreground` | Charcoal |
| `hover:bg-zinc-800` | `hover:bg-muted` | Muted Cream |
| `hover:bg-zinc-800/30` | `hover:bg-background` | Cream |
| `hover:border-primary` | `hover:border-duck-blue` | Sky Blue `#3AA1EC` |
| `border-b-2 border-primary` (spinners) | `border-b-2 border-duck-blue` | Sky Blue |
| `text-primary` (on icons/links) | `text-duck-blue` | Sky Blue |

**Important:** After applying this table, do a visual scan of the file. If any zinc class remains that is not in this table, apply the closest match based on the luminance tier (950/900 → background/card, 800 → muted, 50-300 → foreground, 400-600 → muted-foreground).

### G.1 — Dashboard Layout

**File:** `src/app/(dashboard)/layout.tsx`

Find the loading spinner wrapper and add background:
- Find: `<div className="min-h-screen flex items-center justify-center">`
- Replace: `<div className="min-h-screen flex items-center justify-center bg-background">`

Find the spinner border:
- Find: `border-b-2 border-primary`
- Replace: `border-b-2 border-duck-blue`

### G.2 — Home Page

**File:** `src/app/(dashboard)/home/page.tsx`

Read the entire file, then apply the universal mapping table from G.0 to every zinc class. Specific high-confidence replacements:

| Find | Replace | Context |
|------|---------|---------|
| `bg-zinc-950` | `bg-background` | Page wrapper |
| `border-zinc-800 bg-zinc-950` | `border-border bg-card` | Header bar |
| `text-zinc-50` | `text-foreground` | H1 heading, card titles |
| `text-zinc-400` | `text-muted-foreground` | Subtitles, descriptions, email display |
| `text-zinc-500` | `text-muted-foreground` | Metadata text, counter text |
| `border-dashed border-zinc-700 bg-zinc-900` | `border-dashed border-border bg-card` | Empty state card |
| `bg-zinc-900 border-zinc-800` | `bg-card border-border` | Workbase cards |
| `hover:border-primary` | `hover:border-duck-blue` | Card hover |
| `bg-zinc-900/50` | `bg-background` | Create new card, archived cards |
| `border-zinc-700 hover:border-primary` | `border-border hover:border-duck-blue` | Create new card |
| `text-zinc-400 hover:text-zinc-200` | `text-duck-blue hover:text-duck-blue/80` | Links inside empty states |

---

## Task H — Re-theme Workbase Sidebar Layout

**File:** `src/app/(dashboard)/workbase/[id]/layout.tsx`

Read the entire file. Apply the universal mapping table G.0 to every zinc class. Additionally, for the active sidebar navigation item, use:

- Active nav link: `bg-duck-blue text-white font-medium`
- Inactive nav link: `text-foreground hover:bg-muted hover:text-foreground`
- Section title labels: `text-muted-foreground`
- "All Work Bases" back link: `text-muted-foreground hover:text-foreground`
- Sidebar background: `bg-card` (white to lift off cream)
- Main content area: `bg-background` (cream)
- Page container: `bg-background` on the outermost flex wrapper
- Loading spinner: `border-duck-blue`

---

## Task I — Re-theme All Workbase Sub-Pages

For each of the following pages, read the file first, then apply the universal mapping table from G.0 to every zinc class found. Ensure the outermost wrapper of each page has `bg-background min-h-full` to prevent white flash.

### I.1 — Workbase Overview

**File:** `src/app/(dashboard)/workbase/[id]/page.tsx`

Apply G.0 mapping. Additional specific changes:
- Page wrapper: add `bg-background min-h-full`
- Module cards (Fine Tuning, Fact Training, Chat): `bg-card border-border`
- Icon accent color: `text-duck-blue` (replaces `text-primary`)
- Empty state cards: `border-dashed border-border bg-card`

### I.2 — Conversations Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/page.tsx`

Apply G.0 mapping. Additional specific changes:
- Breadcrumb active link: `text-duck-blue font-medium`
- Table headers: `text-muted-foreground`
- Table rows: `border-b border-border` with `hover:bg-muted/50`
- Conversation title text: `text-foreground`
- Selected row action bar: `bg-muted`
- Sheet (sidebar overlay): `bg-card border-border`
- Sheet title: `text-foreground`
- Sheet description: `text-muted-foreground`
- Training set rows: `bg-muted`

### I.3 — Conversation Detail

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/conversations/[convId]/page.tsx`

Apply G.0 mapping. Ensure conversation turn text content is fully selectable.

### I.4 — Launch Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/launch/page.tsx`

Read file, apply G.0 mapping. Page wrapper: `bg-background min-h-full`.

### I.5 — Chat Page

**File:** `src/app/(dashboard)/workbase/[id]/fine-tuning/chat/page.tsx`

Apply G.0 mapping. Specific:
- Page wrapper: `bg-background`
- Header bar: `border-b border-border bg-card`
- Chat heading: `text-foreground`
- Subtitle: `text-muted-foreground`
- Empty state: `text-muted-foreground`

### I.6 — Documents Page

**File:** `src/app/(dashboard)/workbase/[id]/fact-training/documents/page.tsx`

Read file, apply G.0 mapping. Page wrapper: `bg-background min-h-full`.

### I.7 — Document Detail

**File:** `src/app/(dashboard)/workbase/[id]/fact-training/documents/[docId]/page.tsx`

Read file, apply G.0 mapping. Ensure document content text is selectable.

### I.8 — RAG Chat Page

**File:** `src/app/(dashboard)/workbase/[id]/fact-training/chat/page.tsx`

Apply G.0 mapping. Same pattern as I.5.

### I.9 — Quality Page

**File:** `src/app/(dashboard)/workbase/[id]/fact-training/quality/page.tsx`

Read file, apply G.0 mapping.

### I.10 — Settings Page

**File:** `src/app/(dashboard)/workbase/[id]/settings/page.tsx`

Apply G.0 mapping. Specific:
- Page wrapper: `bg-background min-h-full`
- Section cards: `bg-card border-border`
- Danger zone card: `border-red-200 bg-card` (keep red border for danger semantics)
- Danger zone title: `text-red-600`

---

## Task J — Delete Dead CSS File

**Action:** Delete `src/styles/globals.css`.

This file is never imported anywhere. Only `src/app/globals.css` is loaded via `layout.tsx` (confirmed at `src/app/layout.tsx` line 3). The dead file's only unique content — `@custom-variant dark (&:is(.dark *));` — is a Tailwind v4 directive that Tailwind v3 does not recognize.

---

## Task K — Verify Build + Visual QA

### K.1 — Build Check

```bash
cd src && npm run build
```

Must complete with zero errors. Warnings are acceptable if pre-existing.

### K.2 — Visual QA Checklist

Start the dev server (`npm run dev` in `src/`) and verify at `http://localhost:3000`:

| Check | Expected Result |
|-------|----------------|
| `/home` background | Soft cream (not pure white, not dark) |
| `/home` card surfaces | White cards with visible light gray borders, lifted off cream |
| `/home` "Get Started" button | Yellow with charcoal border and charcoal text |
| Any input field | White bg, gray border visible at rest, sky blue glow on focus |
| Sidebar (`/workbase/[id]`) | White background, charcoal text, sky-blue active item |
| Main content area | Cream background |
| Text selection | All body text, conversation turns, and modal content is selectable with mouse |
| `Cmd/Ctrl+A` in modal | Selects text in the modal (NOT "select all rows") |
| Arrow keys in text | Move caret normally when text is selected, not navigate conversations |
| No pure black text | All text is charcoal, not `#000000` |
| No zinc surfaces | Zero `bg-zinc-*` classes remain on visible elements |
| Destructive buttons | Still red background, white text (unchanged) |
| Status badges (batch jobs etc.) | Still use semantic colors (green/red/amber) — unchanged |

---

## Implementation Order Summary

```
A → globals.css          (fix token foundation — HSL triplets)
B → tailwind.config.js   (duck.* namespace, input-background)
C → polish.css           (focus ring → blue)
D → button.tsx, badge.tsx (text-white → text-destructive-foreground)
E → auth forms           (blue-600 → design tokens)
F → keyboard shortcuts   (fix Cmd+A and ArrowLeft/Right copy/paste blockers)
G → home + dashboard layout (zinc → tokens)
H → workbase sidebar     (zinc → tokens)
I → all workbase pages   (zinc → tokens)
J → delete dead globals.css
K → build + visual QA
```
