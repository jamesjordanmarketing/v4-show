# E01 Addendum: Legacy Conversation System Coexistence Strategy

**Version:** 4.0 Addendum  
**Date:** January 29, 2026  
**Critical Issue:** Legacy `conversation_turns` table conflict  
**Impact:** BREAKING CHANGE if not handled properly

---

## 🚨 CRITICAL FINDING: Active Legacy System in Production

### Scope of Impact

The SAOL audit revealed that the legacy `conversation_turns` table is **heavily used throughout the production codebase**:

**Database Usage:**
- ✅ **14 direct queries** to `conversation_turns` table
- ✅ **141 references** to parent `conversations` table across 44 files
- ✅ **Active in production** conversation generation system

**Affected Systems:**

| System | Files | Impact |
|--------|-------|--------|
| **Conversation Storage** | `conversation-storage-service.ts` | Stores turns when creating conversations |
| **Export System** | `export/conversations/route.ts`, `export/download/[id]/route.ts` | Exports include turn data |
| **API Routes** | `api/conversations/[id]/turns/route.ts` | CRUD endpoints for turns |
| **UI Components** | `ConversationTurns.tsx` | Displays conversation turns |
| **Conversation Service** | `conversation-service.ts` | Core CRUD operations |
| **Training Files** | `training-file-service.ts` | Generates training data from turns |
| **Batch Processing** | Multiple scripts | Bulk operations on conversations |

---

## ⚠️ Why We Can't Just Drop the Old Table

### Legacy `conversation_turns` Table Structure

```sql
CREATE TABLE conversation_turns (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id),  -- ❌ WRONG PARENT
  turn_number integer NOT NULL,
  role text NOT NULL,  -- 'user' | 'assistant'
  content text NOT NULL,
  
  -- Emotional analysis fields
  detected_emotion varchar,
  emotion_confidence numeric,
  emotional_intensity numeric,
  primary_strategy varchar,
  tone varchar,
  
  -- Stats
  word_count integer,
  sentence_count integer,
  created_at timestamptz DEFAULT NOW()
);
```

**Key Conflicts:**
1. ❌ References `conversations` table (not `multi_turn_conversations`)
2. ❌ Different schema (role/content vs user_message/control_response/adapted_response)
3. ❌ Different purpose (single conversation generation vs A/B testing)
4. ✅ BUT: Empty table (0 rows) - safe to drop IF we handle code references

---

## 🎯 Solution: Coexistence Strategy

### Recommended Approach: Rename + Update (Phase 1)

**Phase 1: Keep Legacy System Running**
1. Rename legacy table: `conversation_turns` → `legacy_conversation_turns`
2. Create new multi-turn table: `conversation_turns` (with A/B testing schema)
3. Update all code references to use `legacy_conversation_turns`
4. Both systems coexist peacefully

**Phase 2: Migration (Future - E06+)**
- Gradually migrate legacy conversations to new multi-turn system
- Deprecate legacy table once migration complete
- Remove legacy code references

---

## 📝 Implementation Plan

### Step 1: SQL Schema Changes (Execute First)

```sql
-- ============================================
-- STEP 1: RENAME LEGACY TABLE
-- ============================================

-- Rename the legacy conversation_turns table
ALTER TABLE IF EXISTS public.conversation_turns 
  RENAME TO legacy_conversation_turns;

-- Update the foreign key constraint name to reflect legacy status
-- (This is cosmetic but helps with clarity)
ALTER TABLE public.legacy_conversation_turns
  RENAME CONSTRAINT conversation_turns_conversation_id_fkey 
  TO legacy_conversation_turns_conversation_id_fkey;

-- Update index names to reflect legacy status
ALTER INDEX IF EXISTS conversation_turns_pkey 
  RENAME TO legacy_conversation_turns_pkey;
ALTER INDEX IF EXISTS idx_conversation_turns_conv_turn 
  RENAME TO idx_legacy_conversation_turns_conv_turn;
ALTER INDEX IF EXISTS idx_conversation_turns_conversation_id 
  RENAME TO idx_legacy_conversation_turns_conversation_id;
ALTER INDEX IF EXISTS idx_conversation_turns_role 
  RENAME TO idx_legacy_conversation_turns_role;
ALTER INDEX IF EXISTS idx_turns_conversation_id 
  RENAME TO idx_legacy_turns_conversation_id;
ALTER INDEX IF EXISTS idx_turns_conversation_turn 
  RENAME TO idx_legacy_turns_conversation_turn;
ALTER INDEX IF EXISTS idx_turns_role 
  RENAME TO idx_legacy_turns_role;
ALTER INDEX IF EXISTS unique_conversation_turn 
  RENAME TO legacy_unique_conversation_turn;

-- Update RLS policy names
DROP POLICY IF EXISTS "Users can create own conversation turns" 
  ON public.legacy_conversation_turns;
DROP POLICY IF EXISTS "Users can insert turns for their conversations" 
  ON public.legacy_conversation_turns;
DROP POLICY IF EXISTS "Users can view own conversation turns" 
  ON public.legacy_conversation_turns;
DROP POLICY IF EXISTS "Users can view turns for their conversations" 
  ON public.legacy_conversation_turns;

-- Recreate policies with legacy naming
CREATE POLICY "Users can create legacy conversation turns"
  ON public.legacy_conversation_turns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = legacy_conversation_turns.conversation_id 
      AND conversations.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view legacy conversation turns"
  ON public.legacy_conversation_turns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = legacy_conversation_turns.conversation_id 
      AND conversations.created_by = auth.uid()
    )
  );

-- Add comment explaining this is legacy
COMMENT ON TABLE public.legacy_conversation_turns IS 
  'LEGACY: Original conversation turns table from conversation generation system. 
   Being phased out in favor of multi_turn_conversations system. 
   Do not use for new features.';

-- ============================================
-- STEP 2: CREATE NEW MULTI-TURN TABLE
-- ============================================
-- (This is the same SQL from E01_v3 - conversation_turns section)

CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.multi_turn_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  
  -- User input
  user_message TEXT NOT NULL,
  
  -- Control endpoint response
  control_response TEXT,
  control_generation_time_ms INTEGER,
  control_tokens_used INTEGER,
  control_error TEXT,
  
  -- Adapted endpoint response
  adapted_response TEXT,
  adapted_generation_time_ms INTEGER,
  adapted_tokens_used INTEGER,
  adapted_error TEXT,
  
  -- Per-turn evaluation
  evaluation_enabled BOOLEAN NOT NULL DEFAULT false,
  evaluation_prompt_id UUID REFERENCES public.evaluation_prompts(id),
  control_evaluation JSONB,
  adapted_evaluation JSONB,
  evaluation_comparison JSONB,
  
  -- Multi-turn arc-aware evaluation fields
  human_emotional_state JSONB,
  arc_progression JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint
  CONSTRAINT unique_turn_per_conversation UNIQUE(conversation_id, turn_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id 
  ON public.conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_status 
  ON public.conversation_turns(status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_number 
  ON public.conversation_turns(conversation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_evaluator 
  ON public.conversation_turns(evaluation_prompt_id);

-- Enable RLS
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage turns of own conversations"
  ON public.conversation_turns
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.multi_turn_conversations
      WHERE user_id = auth.uid()
    )
  );

-- Add column comments
COMMENT ON COLUMN public.conversation_turns.human_emotional_state IS 
  'Measured emotional state from human message: { primaryEmotion, intensity, valence, ... }';
COMMENT ON COLUMN public.conversation_turns.arc_progression IS 
  'Arc progression data: { detectedArc, progressionPercentage, onTrack, ... }';
COMMENT ON COLUMN public.conversation_turns.user_message IS
  'The user''s input message for this turn';
COMMENT ON COLUMN public.conversation_turns.control_response IS
  'Response from control (base model) endpoint';
COMMENT ON COLUMN public.conversation_turns.adapted_response IS
  'Response from adapted (LoRA) endpoint';
COMMENT ON COLUMN public.conversation_turns.status IS
  'Turn status: pending, generating, completed, failed';

COMMENT ON TABLE public.conversation_turns IS
  'NEW: Multi-turn A/B testing conversation turns. References multi_turn_conversations. 
   Use this for all new multi-turn features.';

-- ============================================
-- STEP 3: SEED EVALUATOR (from E01_v3)
-- ============================================

INSERT INTO public.evaluation_prompts (
  name, 
  display_name, 
  description, 
  prompt_template, 
  includes_arc_context, 
  is_default,
  model,
  max_tokens,
  is_active
)
VALUES (
  'multi_turn_arc_aware_v1',
  'Multi-Turn Arc-Aware Evaluator (v1)',
  'Measures actual human emotional progression across conversation turns.',
  E'You are an expert evaluator specializing in therapeutic communication and emotional intelligence. You are analyzing a MULTI-TURN conversation to measure the human''s actual emotional progression.

## CONTEXT: KNOWN EMOTIONAL ARCS

This advisor was trained to facilitate the following emotional transitions:

{emotional_arcs}

These arcs represent healthy emotional progressions in financial conversations.

## CONVERSATION HISTORY

Turn Count: {turn_count}

{conversation_history}

## CURRENT TURN TO EVALUATE

HUMAN''S MESSAGE (Turn {current_turn}):
{user_message}

ADVISOR''S RESPONSE:
{response}

## EVALUATION TASK

You have TWO distinct tasks:

### Task 1: Measure the Human''s ACTUAL Emotional State

Analyze the human''s message to determine their ACTUAL emotional state right now. This is ground truth data, not a projection. Look for:
- Explicit emotional language ("I feel...", "This is scary...")
- Implicit emotional indicators (hesitation, relief, frustration)
- Emotional intensity markers (qualifiers, emphasis, length)
- Valence indicators (positive vs negative framing)

### Task 2: Evaluate the Advisor''s Facilitation

Assess how well the advisor''s response helps the human move toward a healthier emotional state. Consider:
- Did it acknowledge the human''s emotions?
- Did it create movement or stagnation?
- Was the movement in a healthy direction?

## IMPORTANT CONTEXT

{previous_evaluation_summary}

## RESPONSE FORMAT

Respond in JSON format:

{
  "humanEmotionalState": {
    "turnNumber": {current_turn},
    "primaryEmotion": "<detected primary emotion from human''s message>",
    "secondaryEmotions": ["<additional emotions detected>"],
    "intensity": <0.0-1.0>,
    "valence": "negative" | "mixed" | "neutral" | "positive",
    "confidence": <0.0-1.0>,
    "evidenceQuotes": ["<direct quotes supporting this assessment>"],
    "stateNotes": "<brief explanation of emotional state detection>"
  },
  
  "emotionalMovement": {
    "comparedToTurn": <turn number being compared to, typically turn 1 or previous turn>,
    "valenceShift": "improved" | "maintained" | "worsened",
    "intensityChange": "reduced" | "unchanged" | "increased",
    "movementQuality": <1-5>,
    "movementNotes": "<explanation of the emotional shift since comparison point>"
  },
  
  "arcProgression": {
    "detectedArc": "<arc_key if trajectory matches, or ''none''>",
    "arcMatchConfidence": <0.0-1.0>,
    "progressionPercentage": <0-100, estimated % through the arc>,
    "onTrack": <true/false>,
    "progressionNotes": "<explanation of arc trajectory status>"
  },
  
  "advisorFacilitation": {
    "emotionsAcknowledged": <true/false>,
    "acknowledgmentQuality": <1-5>,
    "movementFacilitated": <true/false>,
    "facilitationScore": <1-5>,
    "facilitationNotes": "<how well did this response help or hinder progression>"
  },
  
  "voiceConsistency": {
    "warmthPresent": <true/false>,
    "judgmentFree": <true/false>,
    "voiceScore": <1-5>,
    "voiceNotes": "<brief explanation>"
  },
  
  "overallTurnEvaluation": {
    "humanProgressedEmotionally": <true/false>,
    "advisorHelpedProgression": <true/false>,
    "turnQualityScore": <1-5>,
    "cumulativeArcProgress": <1-5, overall arc progress from turn 1 to now>,
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "areasForImprovement": ["<improvement 1>", "<improvement 2>"],
    "summary": "<one paragraph assessment of this turn''s contribution to arc progression>"
  }
}

Respond ONLY with valid JSON, no other text.',
  true,
  false,
  'claude-sonnet-4-20250514',
  3000,
  true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'Tables renamed and created successfully!' AS status,
  '✅ legacy_conversation_turns: ' || COUNT(*) || ' rows (preserved)' AS legacy_table
FROM public.legacy_conversation_turns

UNION ALL

SELECT 
  '' AS status,
  '✅ conversation_turns (NEW): ' || COUNT(*) || ' rows' AS new_table
FROM public.conversation_turns

UNION ALL

SELECT 
  '' AS status,
  '✅ multi_turn_conversations: ' || COUNT(*) || ' conversations' AS parent_table
FROM public.multi_turn_conversations;
```

---

### Step 2: Code Updates (TypeScript/JavaScript)

**Files Requiring Updates:** 14 files with direct `conversation_turns` references

#### Update 1: `src/lib/services/conversation-storage-service.ts`

```typescript
// Line 137: Change table name
const { error: turnsError } = await this.supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .insert(turns);

// Line 342: Change table name
const { data, error } = await this.supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .select('*')
  .eq('conversation_id', conversation.id)
  .order('turn_number', { ascending: true });
```

#### Update 2: `src/app/api/export/conversations/route.ts`

```typescript
// Line 132: Change table name
const { data: turns, error: turnsError } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .select('*')
  .in('conversation_id', conversationIdsToFetch)
  .order('turn_number', { ascending: true });
```

#### Update 3: `src/app/api/export/download/[id]/route.ts`

```typescript
// Line 222: Change table name
const { data: turns, error: turnsError } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .select('*')
  .in('conversation_id', conversationIds)
  .order('turn_number', { ascending: true });
```

#### Update 4: `src/lib/conversation-service.ts`

```typescript
// Line 831: Change table name
const { data: turns, error } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .select('*')
  .eq('conversation_id', conversationId)
  .order('turn_number', { ascending: true });

// Line 867: Change table name
const { data: createdTurn, error } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .insert(insertData)
  .select()
  .single();

// Line 912: Change table name
const { data: createdTurns, error } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .insert(insertData)
  .select();
```

#### Update 5: `src/lib/services/conversation-service.ts`

```typescript
// Line 94: Change table name
const { error: turnsError } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .insert(turnRecords);

// Line 164: Change table name
const { data: turnsData, error: turnsError } = await supabase
  .from('legacy_conversation_turns')  // ← CHANGED
  .select('*')
  .eq('conversation_id', id)
  .order('turn_number', { ascending: true });
```

---

### Step 3: Create Type Alias for Legacy System

**New file:** `src/lib/types/legacy-conversations.ts`

```typescript
/**
 * Legacy Conversation System Types
 * 
 * DEPRECATED: These types support the legacy conversation generation system.
 * New features should use the multi-turn A/B testing system instead.
 * 
 * Migration: Planned for Phase 2 (E06+)
 */

// Re-export existing types but mark as legacy
export type LegacyConversationTurn = import('./conversations').StorageConversationTurn;

export type LegacyConversation = import('./conversations').StorageConversation;

/**
 * @deprecated Use multi-turn conversation system instead
 */
export const LEGACY_TURNS_TABLE = 'legacy_conversation_turns' as const;

/**
 * @deprecated Use multi_turn_conversations instead
 */
export const LEGACY_CONVERSATIONS_TABLE = 'conversations' as const;
```

**Update:** `src/lib/types/index.ts`

```typescript
// Add to exports
export * from './legacy-conversations';
export { LEGACY_TURNS_TABLE, LEGACY_CONVERSATIONS_TABLE } from './legacy-conversations';
```

---

### Step 4: Testing Strategy

#### Test 1: Verify Legacy System Still Works

```bash
# Test conversation creation
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentQuery({
    table:'legacy_conversation_turns',
    limit:5
  });
  console.log('Legacy turns table accessible:', r.success);
  console.log('Rows:', r.data?.length || 0);
})();
"
```

#### Test 2: Verify New Multi-Turn System

```bash
# Test new conversation_turns table
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol=require('.');
(async()=>{
  const r=await saol.agentIntrospectSchema({
    table:'conversation_turns',
    includeColumns:true,
    transport:'pg'
  });
  console.log('New conversation_turns schema:');
  console.log('Columns:', r.tables[0].columns.length);
  console.log('Has user_message:', r.tables[0].columns.some(c=>c.name==='user_message'));
  console.log('Has control_response:', r.tables[0].columns.some(c=>c.name==='control_response'));
})();
"
```

---

## 📊 Migration Impact Summary

### Immediate Impact (Phase 1)

| Area | Change | Breaking? | Action Required |
|------|--------|-----------|-----------------|
| Database | `conversation_turns` → `legacy_conversation_turns` | ❌ No | SQL rename executed |
| Code | 14 files updated to use `legacy_conversation_turns` | ❌ No | PRs required |
| API | No API changes (internal table name only) | ❌ No | None |
| UI | No UI changes | ❌ No | None |
| New Features | Can now use `conversation_turns` for multi-turn | ✅ Yes | Proceed with E02-E05 |

### Future Migration (Phase 2 - E06+)

| Task | Effort | Priority |
|------|--------|----------|
| Migrate existing conversations to multi-turn format | High | Medium |
| Update legacy code to use new multi-turn APIs | Medium | Low |
| Remove legacy table and code | Low | Low |
| Archive historical data | Low | Low |

---

## ✅ Recommended Execution Order

1. **Execute SQL** from Step 1 (rename + create new table)
2. **Create PR** with code updates from Step 2
3. **Run tests** from Step 4 to verify both systems work
4. **Deploy** code changes
5. **Verify** production systems still function
6. **Proceed** with E02-E05 implementation (multi-turn system)

---

## 🔮 Future State (Phase 2)

**After Migration Complete:**

- Legacy `legacy_conversation_turns` table archived/dropped
- All conversation storage uses multi-turn A/B testing schema
- Single-turn conversations are just multi-turn with max_turns=1
- Unified API for all conversation types
- Simplified codebase (no legacy code paths)

**Benefits:**
- ✅ Unified conversation system
- ✅ A/B testing built-in to all conversations
- ✅ Arc-aware evaluation for all interactions
- ✅ Cleaner codebase
- ✅ Better scalability

---

## 🚦 Decision Required

**Choose Migration Strategy:**

### Option A: Coexistence (Recommended)
- ✅ Zero breaking changes
- ✅ Legacy system continues working
- ✅ New multi-turn system can be developed in parallel
- ✅ Migration can happen gradually
- ⏱️ Requires code updates (14 files)

### Option B: Force Migration
- ❌ Breaks existing system
- ❌ Requires immediate data migration
- ❌ High risk
- ❌ Not recommended

**Recommendation: Choose Option A (Coexistence)**

---

**Document Version:** 4.0 Addendum  
**Status:** ⚠️ REQUIRES DECISION BEFORE PROCEEDING  
**Next Steps:** User approval → SQL execution → Code PRs → Testing
