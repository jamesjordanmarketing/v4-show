# Spec 33 — Remove Chat Evaluation Comment Badges
**Version:** v1  
**Date:** March 5, 2026  
**Status:** Ready for implementation  
**Scope:** UI-only presentation change — no backend, no API, no DB changes  

---

## 1. Problem Statement

Both chat interfaces display **model response evaluation comments** as colored badge-style banners above
the response text. These comments include:

- `"Based on available information..."` (amber badge, `selfEvalScore` between 0.50 and 0.80)
- `"I couldn't find a confident answer. Here's what I found..."` (red badge, `selfEvalScore` < 0.50)

These comments are **not wanted in the UI**. Only the **self-evaluation score** displayed in the footer bar
(`Self-eval: 72% ✓`) is to be kept.

The generation logic that computes the confidence label **stays in the codebase**. Only the
presentation (render path) must be turned off.

---

## 2. Scope of Changes

### 2.1 Affected Routes

| Route | Component Responsible |
|---|---|
| `/workbase/[id]/fact-training/chat` | `RAGChat.tsx` |
| `/workbase/[id]/fine-tuning/chat` | `MultiTurnChat` → `ChatMain` → `ChatMessageList` → `ChatTurn` → `DualResponsePanel` |

### 2.2 Investigation Summary

**`/fact-training/chat` (RAGChat)** — comments ARE rendered here.  
The entire comment block (confidence qualifier badge) lives in
`src/components/rag/RAGChat.tsx` at the IIFE block starting at line 205.

**`/fine-tuning/chat` (MultiTurnChat)** — comments are NOT rendered here.  
The `DualResponsePanel.tsx` and `DualArcProgressionDisplay.tsx` components contain no evaluation comment badges.
The self-eval score is not displayed in this chat path at all (that data lives on the RAG side only).

**Conclusion:** The only file change required is `RAGChat.tsx`.

---

## 3. Proposed Change

### 3.1 File to Modify

#### [MODIFY] [RAGChat.tsx](file:///C:/Users/james/Master/BrightHub/BRun/v4-show/src/components/rag/RAGChat.tsx)

**What to change:** Comment out (do NOT delete) the confidence qualifier badge render block.

**Location:** Lines 204–217 (within the bot response `<div>` in the `.map()` loop).

**Current code (lines 204–217):**
```tsx
{/* Confidence qualifier */}
{(() => {
  const confidence = getConfidenceDisplay(query.selfEvalScore);
  if (!confidence.showBadge) return null;
  return (
    <div className={cn(
      'mb-2 px-3 py-1.5 rounded-md text-sm font-medium',
      confidence.color === 'amber' && 'bg-amber-50 text-amber-700 border border-amber-200',
      confidence.color === 'red' && 'bg-red-50 text-red-700 border border-red-200',
    )}>
      {confidence.label}
    </div>
  );
})()}
```

**Replacement code:**
```tsx
{/* Confidence qualifier — DISABLED (Spec 33: comment badges turned off; generation logic preserved) */}
{/* {(() => {
  const confidence = getConfidenceDisplay(query.selfEvalScore);
  if (!confidence.showBadge) return null;
  return (
    <div className={cn(
      'mb-2 px-3 py-1.5 rounded-md text-sm font-medium',
      confidence.color === 'amber' && 'bg-amber-50 text-amber-700 border border-amber-200',
      confidence.color === 'red' && 'bg-red-50 text-red-700 border border-red-200',
    )}>
      {confidence.label}
    </div>
  );
})()} */}
```

**What is NOT changed:**
- The `getConfidenceDisplay()` function definition (lines 84–101) — stays intact.
- The `selfEvalScore` display in the footer bar (lines 221–225) — stays intact:
  ```tsx
  {query.selfEvalScore !== null && (
    <span className="text-xs text-muted-foreground">
      Self-eval: {(query.selfEvalScore * 100).toFixed(0)}%
      {query.selfEvalPassed ? ' ✓' : ' ✗'}
    </span>
  )}
  ```
- No changes to any API routes, hooks, services, types, or other components.

---

## 4. What is Preserved

| Element | Location | Action |
|---|---|---|
| `getConfidenceDisplay()` logic | `RAGChat.tsx` lines 84–101 | **Kept** — function stays in file |
| Self-eval score badge `Self-eval: 72% ✓` | `RAGChat.tsx` lines 221–225 | **Kept** — unchanged |
| All feedback buttons (👍 👎) | `RAGChat.tsx` lines 238–260 | **Kept** — unchanged |
| RAG source citations | `SourceCitation` component | **Kept** — unchanged |
| Fine-tuning chat arc progression display | `DualArcProgressionDisplay.tsx` | **Kept** — unchanged |
| TypeScript compilation | All files | **Zero errors expected** |

---

## 5. Files Changed

| File | Change | Lines |
|---|---|---|
| `src/components/rag/RAGChat.tsx` | Comment out confidence qualifier badge IIFE render block | 204–217 |

**Total files changed: 1**  
**Total lines modified: 14** (all commented out — zero deletions)

---

## 6. Verification Plan

### 6.1 TypeScript Compilation
```bash
cd "C:\Users\james\Master\BrightHub\BRun\v4-show"
npx tsc --noEmit
```
Expected: zero errors.

### 6.2 Manual Verification — Fact Training Chat
1. Navigate to `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fact-training/chat`
2. Send a question to the RAG chat. Try one that typically triggers low confidence (e.g., an obscure or off-topic question).
3. **Verify the amber/red badge text is NOT shown** above the response text.
4. **Verify the `Self-eval: XX% ✓/✗` text IS still shown** in the footer bar below the response, to the left of the Evaluate button.
5. **Verify the 👍 / 👎 feedback buttons are still visible** next to the self-eval score.

### 6.3 Manual Verification — Fine-Tuning Chat
1. Navigate to `/workbase/232bea74-b987-4629-afbc-a21180fe6e84/fine-tuning/chat`
2. Start a new conversation and send a message.
3. **Verify no changes to this chat** — the fact-training change should have zero effect on fine-tuning chat, since `RAGChat.tsx` is not used here.

### 6.4 Regression Check
Confirm the following still render correctly in RAGChat after the change:
- Response text (`query.responseText`)
- Source citations (`SourceCitation`)
- Self-eval score and pass/fail marker
- Evaluate button
- Feedback thumbs buttons
- Response time display

---

## 7. Rollback Plan

To re-enable the badges, simply uncomment lines 204–217 in `RAGChat.tsx`. No DB changes, no API changes — instant revert.
