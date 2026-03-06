# UX Containers — Design Palette Implementation Specification

**Version:** 2.0 | **Date:** 2026-03-01
**Reference:** MotherDuck (motherduck.com) brand palette
**Status:** Implementation Specification — Ready for Execution

---

## 1. Scope

This specification implements a MotherDuck-inspired color palette using the 60-30-10 hierarchy rule across the Bright Run application. The work is **front-end only** — no database operations are required. SAOL is not applicable to this task.

### Files Modified (7)

| # | File | Change Type |
|---|------|-------------|
| 1 | `src/app/globals.css` | Rewrite `:root` token values + add new custom tokens to `@theme inline` |
| 2 | `src/tailwind.config.js` | Add `duck` color namespace to `extend.colors` |
| 3 | `src/styles/polish.css` | Fix broken `hsl()` wrapper on Firefox scrollbar + update `::selection` |
| 4 | `src/components/ui/button.tsx` | Replace hard-coded `text-white` in `destructive` variant |
| 5 | `src/components/ui/badge.tsx` | Replace hard-coded `text-white` in `destructive` variant |
| 6 | `src/components/auth/SignInForm.tsx` | Replace hard-coded `bg-blue-600 text-white` with design tokens |
| 7 | `src/components/auth/SignUpForm.tsx` | Replace hard-coded `bg-blue-600 text-white` with design tokens |

### Files Deleted (1)

| # | File | Reason |
|---|------|--------|
| 1 | `src/styles/globals.css` | Dead duplicate — never imported anywhere. Only `src/app/globals.css` is loaded via `layout.tsx`. Keeping it causes confusion. |

### Files NOT Modified (Intentional)

| File | Reason Left Unchanged |
|------|----------------------|
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` | `bg-black/80` and `bg-black/50` on overlay backdrops are the standard pattern for scrim layers. Changing these to a semantic token adds complexity with no visual benefit. |
| `src/components/ui/label.tsx` | `select-none` on labels is correct UX — labels are not content, they are form chrome. |
| `src/components/ui/slider.tsx`, `scroll-area.tsx`, `command.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `menubar.tsx`, `sidebar.tsx`, `select.tsx` | All `select-none` instances are on interactive controls (menu items, drag handles, scroll thumbs). These are correct and must remain. |
| `src/components/rag/ExpertQAPanel.tsx` | Hard-coded impact level colors (`bg-red-600`, `bg-yellow-600`, `bg-gray-500`) are semantic status colors, not brand colors. These follow a different design axis (red=danger, yellow=warning, gray=neutral) and should not be mapped to the brand palette. |
| `src/components/rag/DocumentStatusBadge.tsx` | Same reasoning — semantic status colors for document processing states. |
| `src/app/(dashboard)/batch-jobs/page.tsx`, `[id]/page.tsx`, `training/jobs/page.tsx`, `[jobId]/page.tsx` | Status badge colors (green=success, red=failure, blue=processing, yellow=queued) are semantic. The `text-white` on these is correct because the backgrounds are saturated Tailwind palette colors where white provides proper contrast. |
| `src/app/(dashboard)/training/jobs/[jobId]/page.tsx` | Recharts `stroke="#f97316"` and `stroke="#3b82f6"` are JSX props on SVG chart elements. These cannot reference CSS variables and are chart-specific data visualization colors. |

---

## 2. Verified Color Palette

These hex codes are sampled from the MotherDuck brand. Do not modify them.

| Name | Hex | 60-30-10 Layer | Token |
|------|-----|---------------|-------|
| Soft Cream | `#FFFDF0` | 60% Surface | `--background`, `--color-bg-main` |
| Sky Blue | `#3AA1EC` | 60% Surface | `--color-bg-secondary`, `--ring`, `--color-focus-ring` |
| Pure White | `#FFFFFF` | 60% Surface | `--card`, `--color-surface` |
| Deep Charcoal | `#383838` | 30% Content | `--foreground`, `--color-text-primary` |
| Soft Gray | `#666666` | 30% Content | `--muted-foreground`, `--color-text-muted` |
| Slightly Darker Cream | `#F5F5F0` | 30% Content | `--muted`, `--input-background` |
| Vibrant Yellow | `#FFDE00` | 10% Accent | `--primary`, `--color-primary` |
| Darkened Yellow | `#E6C800` | 10% Accent | `--color-primary-hover` |
| Soft Orange | `#FF9538` | 10% Accent | `--accent`, `--color-accent` |
| Light Gray | `#D1D5DB` | Contrast | `--border`, `--input`, `--color-border` |

### Prohibited Colors

- **`#000000` (pure black):** Never use for text. Use `#383838` (Deep Charcoal).
- **`#FFFFFF` (pure white) for page backgrounds:** Use `#FFFDF0` (Soft Cream). White is permitted only for card surfaces (`--card`) and input backgrounds.

### WCAG Accessibility Compliance

| Combination | Ratio | WCAG AA |
|-------------|-------|---------|
| Charcoal `#383838` on Cream `#FFFDF0` | ~12.5:1 | Pass (all sizes) |
| Charcoal `#383838` on White `#FFFFFF` | ~13.5:1 | Pass (all sizes) |
| White `#FFFFFF` on Sky Blue `#3AA1EC` | ~3.3:1 | Pass (large text 18px+ only) |
| Charcoal `#383838` on Yellow `#FFDE00` | ~8.2:1 | Pass (all sizes) |
| Soft Gray `#666666` on Cream `#FFFDF0` | ~5.7:1 | Pass (all sizes) |

---

## 3. File-by-File Changes

### 3.1 `src/app/globals.css` — Theme Token Rewrite

**What changes:** The `:root` block values are updated to the new palette. The `.dark` block, `@theme inline` block, `@layer base` blocks, and typography rules are preserved structurally — only values change.

#### 3.1.1 `:root` Block — Current → New

| Variable | Current Value | New Value | Notes |
|----------|---------------|-----------|-------|
| `--background` | `#ffffff` | `#FFFDF0` | Cream replaces pure white |
| `--foreground` | `oklch(0.145 0 0)` | `#383838` | Charcoal replaces near-black |
| `--card` | `#ffffff` | `#ffffff` | **No change** — cards stay white to lift off cream |
| `--card-foreground` | `oklch(0.145 0 0)` | `#383838` | Charcoal |
| `--popover` | `oklch(1 0 0)` | `#ffffff` | White (same visual, now hex for consistency) |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#383838` | Charcoal |
| `--primary` | `#030213` | `#FFDE00` | **Major change:** near-black → Vibrant Yellow |
| `--primary-foreground` | `oklch(1 0 0)` | `#383838` | **Major change:** white → charcoal (text ON yellow buttons) |
| `--secondary` | `oklch(0.95 0.0058 264.53)` | `#3AA1EC` | Sky Blue |
| `--secondary-foreground` | `#030213` | `#ffffff` | White text on blue |
| `--muted` | `#ececf0` | `#F5F5F0` | Slightly warmer cream-tinted muted |
| `--muted-foreground` | `#717182` | `#666666` | Soft Gray |
| `--accent` | `#e9ebef` | `#FF9538` | **Major change:** light gray → Soft Orange |
| `--accent-foreground` | `#030213` | `#ffffff` | White text on orange |
| `--destructive` | `#d4183d` | `#d4183d` | **No change** — red stays red |
| `--destructive-foreground` | `#ffffff` | `#ffffff` | **No change** |
| `--border` | `rgba(0, 0, 0, 0.1)` | `#D1D5DB` | Solid light gray (more visible on cream) |
| `--input` | `transparent` | `#D1D5DB` | **Major change:** inputs get visible borders |
| `--input-background` | `#f3f3f5` | `#ffffff` | White input backgrounds (stand out on cream) |
| `--switch-background` | `#cbced4` | `#D1D5DB` | Aligned with border gray |
| `--ring` | `oklch(0.708 0 0)` | `#3AA1EC` | Sky Blue focus ring |
| `--sidebar` | `oklch(0.985 0 0)` | `#FFFDF0` | Cream to match page |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `#383838` | Charcoal |
| `--sidebar-primary` | `#030213` | `#FFDE00` | Yellow |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `#383838` | Charcoal on yellow |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `#FF9538` | Orange |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `#ffffff` | White on orange |
| `--sidebar-border` | `oklch(0.922 0 0)` | `#D1D5DB` | Light gray |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `#3AA1EC` | Sky Blue |

**New variables to add** (inside `:root`, after existing variables):

```css
/* ===== MotherDuck Brand Tokens ===== */
--color-bg-main: #FFFDF0;
--color-bg-secondary: #3AA1EC;
--color-surface: #FFFFFF;
--color-text-primary: #383838;
--color-text-muted: #666666;
--color-text-on-dark: #FFFFFF;
--color-primary-hover: #E6C800;
--color-input-bg: #FFFFFF;
--color-focus-ring: #3AA1EC;
```

#### 3.1.2 `@theme inline` Block — New Entries to Add

Add these after the existing `--color-sidebar-ring` line:

```css
--color-bg-main: var(--color-bg-main);
--color-bg-secondary: var(--color-bg-secondary);
--color-surface: var(--color-surface);
--color-text-primary: var(--color-text-primary);
--color-text-muted: var(--color-text-muted);
--color-text-on-dark: var(--color-text-on-dark);
--color-primary-hover: var(--color-primary-hover);
--color-input-bg: var(--color-input-bg);
--color-focus-ring: var(--color-focus-ring);
```

**Important:** The existing `@theme inline` entries (`--color-primary`, `--color-accent`, `--color-border`, etc.) remain unchanged — they already alias the `:root` tokens, and updating the `:root` values propagates automatically.

#### 3.1.3 `.dark` Block

**No changes.** The dark mode palette remains as-is. This specification applies to light mode only. A dark mode adaptation can be specced separately if needed.

#### 3.1.4 `@layer base` Body Rule — Add Selectability

Current:
```css
body {
  @apply bg-background text-foreground;
}
```

New:
```css
body {
  @apply bg-background text-foreground;
  user-select: auto !important;
}
```

This ensures content selectability across the application.

---

### 3.2 `src/tailwind.config.js` — Add Duck Color Namespace

Add the `duck` color namespace inside the existing `extend.colors` block. Do not modify or remove any existing shadcn color mappings.

**Current `extend.colors`:**
```javascript
colors: {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
  // ... etc
},
```

**Add after the `card` entry (before the closing `},` of `colors`):**

```javascript
duck: {
  cream:    '#FFFDF0',
  blue:     '#3AA1EC',
  yellow:   '#FFDE00',
  charcoal: '#383838',
  orange:   '#FF9538',
  gray:     '#D1D5DB',
},
```

**Note on `hsl()` wrappers:** The existing `hsl(var(--border))` patterns were written for a shadcn/ui setup where CSS variables held HSL triplets (e.g., `210 40% 98%`). The current `:root` already uses hex and oklch values — not HSL triplets — so these `hsl()` wrappers produce incorrect colors at runtime. However, the `@theme inline` block overrides these Tailwind config values with correct direct aliases. Therefore: **do not fix the `hsl()` wrappers** — they are effectively dead code overridden by `@theme inline`, and changing them risks breaking the override chain. This can be cleaned up in a future config migration task.

---

### 3.3 `src/styles/polish.css` — Fix Firefox Scrollbar + Selection

#### 3.3.1 Firefox Scrollbar Color (Line 37)

**Current:**
```css
scrollbar-color: hsl(var(--muted-foreground) / 0.2) hsl(var(--muted) / 0.3);
```

**Problem:** `--muted-foreground` will be `#666666` (hex), not an HSL triplet. `hsl(#666666 / 0.2)` is invalid CSS.

**New:**
```css
scrollbar-color: color-mix(in srgb, var(--muted-foreground) 20%, transparent) color-mix(in srgb, var(--muted) 30%, transparent);
```

This uses `color-mix()` which works correctly with any color format (hex, oklch, named). It has 96%+ browser support as of 2026.

#### 3.3.2 Selection Highlight (Line 144-146)

**Current:**
```css
::selection {
  @apply bg-primary/20 text-primary-foreground;
}
```

**After palette change:** `--primary` becomes `#FFDE00` (yellow), so `bg-primary/20` will produce a 20%-opacity yellow highlight. `--primary-foreground` becomes `#383838` (charcoal text). This produces a subtle yellow selection highlight with charcoal text — **this is correct and desirable.** No change needed.

#### 3.3.3 Focus Ring (Line 7-9)

**Current:**
```css
*:focus-visible {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}
```

**After palette change:** `ring-primary` resolves to `#FFDE00` (yellow). A yellow focus ring on cream background is hard to see. Change to use the blue ring:

**New:**
```css
*:focus-visible {
  @apply outline-none ring-2 ring-ring ring-offset-2;
}
```

`ring-ring` resolves to `--ring` which will be `#3AA1EC` (Sky Blue) — a clearly visible focus indicator.

---

### 3.4 `src/components/ui/button.tsx` — Fix Destructive Variant

**Current `destructive` variant classes:**
```
bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60
```

**Change:** Replace `text-white` with `text-destructive-foreground`.

**New:**
```
bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60
```

Since `--destructive-foreground` is `#ffffff`, the visual output is identical — but now it goes through the token system.

---

### 3.5 `src/components/ui/badge.tsx` — Fix Destructive Variant

**Current `destructive` variant classes:**
```
border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60
```

**Change:** Replace `text-white` with `text-destructive-foreground`.

**New:**
```
border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60
```

---

### 3.6 `src/components/auth/SignInForm.tsx` — Use Design Tokens

The submit button currently bypasses the design system entirely:

**Current:**
```
text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500
```

**New:**
```
bg-primary text-primary-foreground border border-foreground hover:bg-primary/90 focus:ring-ring
```

This produces: yellow background, charcoal text, charcoal 1px border, darkened yellow on hover, blue focus ring.

---

### 3.7 `src/components/auth/SignUpForm.tsx` — Use Design Tokens

Same change as SignInForm. Replace:

**Current:**
```
text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500
```

**New:**
```
bg-primary text-primary-foreground border border-foreground hover:bg-primary/90 focus:ring-ring
```

---

### 3.8 `src/styles/globals.css` — Delete

This file is never imported. It was identified as a dead duplicate of `src/app/globals.css`. The only difference is an extra `@custom-variant dark (&:is(.dark *));` line at the top.

**Action:** Delete `src/styles/globals.css`.

If the `@custom-variant dark` declaration is needed (for Tailwind v4 dark mode processing), add it to `src/app/globals.css` instead — above the `:root` block.

---

## 4. Component Design Rules

These rules apply to all future component development. They do not require immediate code changes — they govern how new code is written.

### 4.1 Primary Buttons

- Background: `bg-primary` (Yellow `#FFDE00`)
- Text: `text-primary-foreground` (Charcoal `#383838`)
- Border: `border border-foreground` — required on all yellow buttons to prevent them from disappearing against the cream background
- Hover: `hover:bg-primary/90`
- **Never use yellow for decoration, backgrounds, or non-interactive elements**

### 4.2 Inputs & Form Elements

- Background: `bg-input-background` (White `#FFFFFF`)
- Border: `border-input` (Light Gray `#D1D5DB`) — inputs must always have a visible border
- Focus: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` (Sky Blue ring — already defined in the base input component)
- Placeholder: `placeholder:text-muted-foreground` (Soft Gray)

### 4.3 Text

- Body text: `text-foreground` (Charcoal `#383838`) — the global default via `@layer base`
- Secondary text: `text-muted-foreground` (Soft Gray `#666666`)
- Text on dark/blue backgrounds: `text-secondary-foreground` or direct `text-white`
- **Never use `text-black` or `text-[#000000]`**

### 4.4 Cards & Containers

- Card background: `bg-card` (White `#FFFFFF`)
- Card border: `border` (resolves to `border-border` = Light Gray)
- Page sections: alternate between `bg-background` (cream) and `bg-secondary` (blue) for visual rhythm

### 4.5 Selectability

- `user-select: auto !important` is enforced on `body` via globals.css
- Do not add `select-none` to content areas
- Existing `select-none` on shadcn UI chrome (labels, menu items, scroll thumbs) is correct and must remain

---

## 5. Visual Impact Summary

| Area | Before | After |
|------|--------|-------|
| Page background | Pure white `#ffffff` | Soft cream `#FFFDF0` |
| Body text | Near-black `oklch(0.145 0 0)` ≈ `#252525` | Charcoal `#383838` |
| Primary buttons | Near-black bg, white text | Yellow bg, charcoal text, charcoal border |
| Accent color | Light gray `#e9ebef` | Soft orange `#FF9538` |
| Input borders | Transparent (invisible) | Light gray `#D1D5DB` (clearly defined) |
| Focus rings | Gray `oklch(0.708 0 0)` | Sky Blue `#3AA1EC` |
| Sidebar | Near-white | Cream, matching page |
| Auth buttons | Hard-coded blue-600 | Yellow, matching design system |
| Muted areas | Cool gray `#ececf0` | Warm cream-tinted `#F5F5F0` |

---

## 6. Execution Checklist

The implementing agent must execute these steps in order:

- [ ] **Step 1:** Delete `src/styles/globals.css`
- [ ] **Step 2:** Update `src/app/globals.css` `:root` values per Section 3.1.1
- [ ] **Step 3:** Add new custom variables to `:root` per Section 3.1.2 (brand tokens)
- [ ] **Step 4:** Add new entries to `@theme inline` block per Section 3.1.2
- [ ] **Step 5:** Add `user-select: auto !important;` to `@layer base` body rule per Section 3.1.4
- [ ] **Step 6:** Add `duck` colors to `src/tailwind.config.js` per Section 3.2
- [ ] **Step 7:** Fix Firefox scrollbar in `src/styles/polish.css` per Section 3.3.1
- [ ] **Step 8:** Fix focus ring in `src/styles/polish.css` per Section 3.3.3
- [ ] **Step 9:** Fix `text-white` → `text-destructive-foreground` in `src/components/ui/button.tsx` per Section 3.4
- [ ] **Step 10:** Fix `text-white` → `text-destructive-foreground` in `src/components/ui/badge.tsx` per Section 3.5
- [ ] **Step 11:** Update `src/components/auth/SignInForm.tsx` submit button per Section 3.6
- [ ] **Step 12:** Update `src/components/auth/SignUpForm.tsx` submit button per Section 3.7
- [ ] **Step 13:** Run `npm run build` to verify no TypeScript or Tailwind compilation errors
- [ ] **Step 14:** Visual QA — open the app and verify cream background, yellow buttons with charcoal borders, blue focus rings, visible input borders

---

## 7. What This Specification Does NOT Cover

- **Dark mode palette adaptation** — The `.dark` block is unchanged. A separate spec is needed if the brand palette should extend to dark mode.
- **Semantic status colors** — Red (destructive/error), green (success), amber (warning) remain as standard Tailwind palette colors in components that use them for status indication (batch jobs, document processing, RAG quality).
- **Chart/data visualization colors** — The `--chart-1` through `--chart-5` variables and Recharts inline `stroke` props are data visualization concerns, not brand identity. They remain unchanged.
- **New page layouts** — This spec only applies the palette to the existing component and token infrastructure. The UX route refactoring (workbase architecture) is a separate effort.
