# RQE Bug Analysis & Solutions

**Date:** February 1, 2026  
**Conversation ID:** `3faffadb-9bb8-4a2d-be86-3744a4cf285c`  
**Status:** Critical — Evaluation System Non-Functional  
**Root Cause:** Wrong Evaluator Selected + Missing UI Guardrails

---

## Executive Summary

The RQE system is failing because the **pairwise comparison evaluator** was selected as the primary evaluator in the UI, when it should only be called internally by the system. This caused evaluation failures, resulting in:
- Turn 1: 0% progress, "no clear arc detected", tie
- Turn 2: No measurements displayed at all

**Impact:** 100% evaluation failure rate  
**Severity:** Critical  
**Fix Complexity:** Low (UI change + documentation)

---

## What Happened

### User Actions
1. Selected evaluator: **"Response Quality Pairwise Comparison (v1)"** ❌
2. Sent Turn 1 with same prompt to both models
3. Result: Both showed 0%, "no clear arc detected"
4. Sent Turn 2 with same prompt to both models
5. Result: No measurements displayed

### Database Evidence

```
Turn 1:
  Evaluation Prompt ID: 4edb8708-12f2-46f5-a229-6dc51a794b56 (pairwise)
  Control evaluation: null
  Adapted evaluation: null
  Winner: "tie"

Turn 2:
  Evaluation Prompt ID: 4edb8708-12f2-46f5-a229-6dc51a794b56 (pairwise)
  Control evaluation: null
  Adapted evaluation: null
  Winner: undefined
```

### Error Logs

```
Evaluation failed: SyntaxError: Unexpected token 'I', "I need to "... is not valid JSON
    at JSON.parse (<anonymous>)
    at evaluateWithClaude (/var/task/src/.next/server/chunks/6895.js:58:734)
```

**Analysis:** Claude returned prose instead of JSON, indicating the prompt was malformed.

---

## Root Cause Analysis

### Bug #1: Wrong Evaluator Selected (User Error)

**What Should Have Been Selected:**
```
✅ Response Quality Evaluator (Multi-Turn v1)
   ID: 6670c6b0-6185-4bc3-be4d-c6ea46f29da5
   Purpose: Primary evaluator with 6 EI dimensions
```

**What Was Actually Selected:**
```
❌ Response Quality Pairwise Comparison (v1)
   ID: 4edb8708-12f2-46f5-a229-6dc51a794b56
   Purpose: Internal comparison tool (NOT for direct use)
```

### Bug #2: Pairwise Evaluator Exposed in UI (System Bug)

The pairwise evaluator should **NOT** be visible in the dropdown. It's an internal utility called by the RQE system during Turn evaluation, not a standalone evaluator.

**Current Behavior:**
```javascript
// All active evaluators appear in dropdown
const evaluators = await getAvailableEvaluators();
// Returns ALL with is_active = true
```

**Problem:** The pairwise evaluator has `is_active = true`, so it appears in the UI.

### Bug #3: Pairwise Prompt Format Mismatch

The pairwise evaluator expects these variables:
```
{conversation_history}
{current_turn}
{user_message}
{response_a}  ← NOT PROVIDED when used as primary evaluator
{response_b}  ← NOT PROVIDED when used as primary evaluator
```

When used as the primary evaluator in `evaluateWithClaude()`, it receives:
```
{user_message}   ✅
{response}       ✅ (but prompt expects response_a and response_b)
{conversation_history}  ✅
{current_turn}   ✅
```

**Result:** The prompt is malformed, Claude gets confused, and returns prose instead of JSON.

### Bug #4: No Fallback for Invalid JSON

When Claude returns prose, `JSON.parse()` throws an error, which is caught but:
- No evaluation data is stored
- No user-friendly error message
- UI shows 0% or nothing

---

## Detailed Bug Breakdown

### Bug #1: Pairwise Evaluator Should Be Hidden

**Location:** Database `evaluation_prompts` table

**Current State:**
```sql
SELECT name, display_name, is_active, is_default
FROM evaluation_prompts
WHERE name = 'response_quality_pairwise_v1';

-- Result:
-- name: response_quality_pairwise_v1
-- display_name: Response Quality Pairwise Comparison (v1)
-- is_active: true       ← PROBLEM
-- is_default: false
```

**Expected State:**
```sql
-- Option A: Set is_active = false
is_active: false

-- Option B: Add new column is_user_selectable
is_user_selectable: false
```

**Impact:** High  
**Priority:** P0 (blocks correct usage)  
**Fix:** Database update

---

### Bug #2: Evaluation Failure Not Handled Gracefully

**Location:** `src/lib/services/multi-turn-conversation-service.ts`

**Current Code:**
```typescript
try {
  // Evaluation logic...
  const evaluation = await evaluateWithClaude(...);
  // Assumes evaluation always returns valid JSON
} catch (evalError) {
  console.error('Evaluation failed:', evalError);
  // Continue without evaluation - don't fail the turn
}
```

**Problem:** When evaluation fails:
1. Error is logged but not surfaced to user
2. No data is stored in `control_evaluation` or `adapted_evaluation`
3. UI shows 0% or nothing
4. Winner defaults to "tie" (misleading)

**Expected Behavior:**
1. Surface error to user in UI: "Evaluation failed: Invalid response from Claude"
2. Store error details in database for debugging
3. Show clear "Evaluation Error" state in UI instead of 0%

**Impact:** Medium  
**Priority:** P1  
**Fix:** Error handling + UI feedback

---

### Bug #3: JSON Parsing Lacks Validation

**Location:** `src/lib/services/test-service.ts` → `evaluateWithClaude()`

**Current Code:**
```typescript
// Strip markdown code blocks
responseText = responseText
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

return JSON.parse(responseText) as ClaudeEvaluation;
```

**Problem:**
- No validation that Claude actually returned JSON
- If Claude returns prose, `JSON.parse()` throws
- No retry mechanism

**Expected Behavior:**
```typescript
// Validate JSON before parsing
if (!responseText.startsWith('{')) {
  throw new Error(`Claude returned invalid format: ${responseText.substring(0, 100)}...`);
}

const parsed = JSON.parse(responseText);

// Validate structure
if (!parsed.responseQuality || !parsed.predictedArcImpact) {
  throw new Error('Claude returned incomplete evaluation data');
}

return parsed as RQEEvaluation;
```

**Impact:** Medium  
**Priority:** P1  
**Fix:** Add validation

---

### Bug #4: UI Doesn't Distinguish Evaluator Types

**Location:** UI evaluator dropdown (likely `src/components/pipeline/chat/`)

**Problem:** All active evaluators appear in dropdown without categorization:
```
- Response Quality Pairwise Comparison (v1)  ← Should be hidden
- Response Quality Evaluator (Multi-Turn v1)  ✅
- Legacy Evaluator (v1)  ✅
- Arc-Aware Evaluator (v1)  ✅
```

**Expected Behavior:**
- Only show user-selectable evaluators
- Filter out internal-use evaluators (pairwise)
- Add tooltips/descriptions to help users choose

**Impact:** High (causes user errors)  
**Priority:** P0  
**Fix:** UI filtering logic

---

## Solutions

### Solution #1: Hide Pairwise Evaluator (Immediate)

**Database Fix via SAOL:**
```javascript
// Mark pairwise evaluator as inactive for user selection
await saol.agentExecuteSQL({
  sql: `
    UPDATE evaluation_prompts
    SET is_active = false
    WHERE name = 'response_quality_pairwise_v1';
  `,
  transport: 'pg'
});
```

**Verification:**
```javascript
// Check available evaluators
const evaluators = await getAvailableEvaluators();
// Should NOT include pairwise
```

**Status:** Ready to execute  
**Estimated Time:** 1 minute  
**Risk:** None (pairwise is still called internally)

---

### Solution #2: Add Better Column for UI Filtering (Long-term)

**Database Schema Addition:**
```sql
-- Add column to distinguish user-selectable vs internal evaluators
ALTER TABLE evaluation_prompts
ADD COLUMN is_user_selectable BOOLEAN DEFAULT true;

-- Mark pairwise as internal-only
UPDATE evaluation_prompts
SET is_user_selectable = false
WHERE name = 'response_quality_pairwise_v1';
```

**Code Update:**
```typescript
// src/lib/services/test-service.ts
export async function getAvailableEvaluators() {
  const { data } = await supabase
    .from('evaluation_prompts')
    .select('*')
    .eq('is_active', true)
    .eq('is_user_selectable', true)  // NEW: Only user-selectable
    .order('display_name');
  
  return data;
}
```

**Status:** Recommended for next iteration  
**Estimated Time:** 15 minutes  
**Risk:** Low (requires migration)

---

### Solution #3: Add Evaluation Error UI Feedback

**Code Location:** `src/components/pipeline/chat/DualArcProgressionDisplay.tsx`

**Add Error State:**
```typescript
interface DualArcProgressionDisplayProps {
  // ... existing props
  evaluationError?: string | null;  // NEW
}

// In component:
{evaluationError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
    <div className="font-medium text-red-700 text-sm mb-1">
      Evaluation Failed
    </div>
    <div className="text-xs text-red-600">
      {evaluationError}
    </div>
  </div>
)}
```

**Status:** Recommended  
**Estimated Time:** 20 minutes  
**Risk:** Low

---

### Solution #4: Improve JSON Validation

**Code Location:** `src/lib/services/test-service.ts`

**Add Validation Function:**
```typescript
function validateClaudeResponse(
  responseText: string,
  evaluatorType: 'primary' | 'pairwise'
): void {
  // Check if response is JSON
  if (!responseText.trim().startsWith('{')) {
    throw new Error(
      `Claude returned prose instead of JSON. First 200 chars: ${responseText.substring(0, 200)}...`
    );
  }
  
  // Check if parseable
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    throw new Error(
      `Claude returned invalid JSON: ${(e as Error).message}. Response: ${responseText.substring(0, 200)}...`
    );
  }
  
  // Validate structure based on evaluator type
  if (evaluatorType === 'primary') {
    if (!parsed.responseQuality) {
      throw new Error('Missing responseQuality in Claude response');
    }
    if (!parsed.predictedArcImpact) {
      throw new Error('Missing predictedArcImpact in Claude response');
    }
  } else if (evaluatorType === 'pairwise') {
    if (!parsed.preferred) {
      throw new Error('Missing preferred in pairwise response');
    }
  }
}

// Use in evaluateWithClaude:
validateClaudeResponse(responseText, 'primary');
return JSON.parse(responseText) as ClaudeEvaluation;
```

**Status:** Recommended  
**Estimated Time:** 30 minutes  
**Risk:** Low

---

## Immediate Action Plan

### Step 1: Hide Pairwise Evaluator (NOW)
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops"
node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{await saol.agentExecuteSQL({sql:'UPDATE evaluation_prompts SET is_active = false WHERE name = \\'response_quality_pairwise_v1\\';',transport:'pg'});console.log('✓ Pairwise evaluator hidden');})();"
```

### Step 2: Test with Correct Evaluator
1. Refresh the app
2. Create NEW conversation
3. Select: **"Response Quality Evaluator (Multi-Turn v1)"** ✅
4. Send Turn 1
5. Verify evaluation works (dimension scores, PAI, winner)

### Step 3: Document for Users
Add to UI near evaluator dropdown:
```
ℹ️ Select "Response Quality Evaluator (Multi-Turn v1)" for RQE system.
   Other evaluators are for backward compatibility.
```

---

## Why This Happened

### Design Gap
The RQE system was designed with:
- **Primary evaluator** (user-selectable)
- **Pairwise evaluator** (internal-only)

But the implementation didn't distinguish between them in the database or UI.

### Missing Guardrails
1. No `is_user_selectable` column
2. No UI filtering based on evaluator purpose
3. No validation that pairwise can't be used as primary

### Documentation Gap
The RQE documentation didn't clearly state:
> ⚠️ IMPORTANT: Only select "Response Quality Evaluator (Multi-Turn v1)" as the primary evaluator. The "Pairwise Comparison" evaluator is for internal use only.

---

## Testing After Fixes

### Test Case 1: Correct Evaluator Selection
1. Create new conversation
2. Select "Response Quality Evaluator (Multi-Turn v1)"
3. Send Turn 1: "I lost my job and feel like a failure"
4. **Expected:**
   - Control shows dimension scores + PAI (not 0%)
   - Adapted shows dimension scores + PAI (not 0%)
   - Winner declared based on PAI/RQS/Pairwise
   - Badges show "Strong EI" or "Baseline EI"

### Test Case 2: Pairwise Not Visible
1. Open evaluator dropdown
2. **Expected:** "Response Quality Pairwise Comparison" does NOT appear

### Test Case 3: Turn 2 Continuity
1. Continue conversation from Test Case 1
2. Send Turn 2: "How do I tell my family?"
3. **Expected:**
   - Dimension 6 (Conversational Continuity) has score > 0
   - Progress updates from Turn 1 values
   - Winner may change based on Turn 2 responses

---

## Lessons Learned

1. **Internal vs External APIs:** When a component is internal-only, enforce it with code and database flags, not just documentation.

2. **Graceful Degradation:** When Claude fails to return valid JSON, surface the error clearly rather than showing misleading 0% values.

3. **UI Guardrails:** Prevent user errors by hiding invalid options, not just documenting them.

4. **Validation is Key:** Always validate external API responses (even from Claude) before parsing.

---

## Appendix: Evaluator Comparison

| Evaluator | Purpose | User-Selectable? | Used For |
|-----------|---------|------------------|----------|
| **Response Quality Evaluator (Multi-Turn v1)** | Primary RQE with 6 dimensions | ✅ Yes | Multi-turn conversations |
| **Response Quality Pairwise Comparison (v1)** | A/B comparison | ❌ No (internal) | Called by RQE internally |
| **Multi-Turn Arc-Aware Evaluator (v1)** | Legacy (replaced by RQE) | ✅ Yes | Backward compat |
| **Legacy Evaluator (v1)** | Original evaluator | ✅ Yes | Single-turn tests |
| **Arc-Aware Evaluator (v1)** | Arc detection | ✅ Yes | Single-turn with arcs |

---

## Next Steps

1. ✅ Execute Solution #1 (hide pairwise) — Ready now
2. ⏳ Test with correct evaluator
3. ⏳ Implement Solution #3 (error UI) — Recommended
4. ⏳ Implement Solution #4 (JSON validation) — Recommended
5. 📋 Consider Solution #2 (schema change) — Next iteration

---

**Status:** Analysis Complete | Ready for Implementation  
**Critical Fix:** Hide pairwise evaluator from UI (1-minute fix)  
**Follow-up:** Add error handling and validation (1-hour work)
