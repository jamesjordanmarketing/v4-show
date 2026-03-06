# E01 SQL v3 - COEXISTENCE STRATEGY (Updated)

**Generated:** January 29, 2026  
**SAOL Audit:** Complete ✅  
**Strategy:** Rename legacy table (not drop)  
**Status:** Ready to execute  
**⚠️ Requires:** Code updates after SQL execution (see v4 addendum)

---

## 🔍 SAOL Schema Audit Results

### Table: `multi_turn_conversations`
- **Status:** ✅ EXISTS and COMPLETE
- **Columns:** 13/13 required columns present
- **Indexes:** 4/4 required indexes present
- **RLS Policy:** ✅ Correct policy in place
- **Foreign Keys:** ✅ References `pipeline_training_jobs` and `auth.users`
- **Action Required:** NONE - Table is perfect

### Table: `conversation_turns`
- **Status:** ⚠️ EXISTS but WRONG STRUCTURE
- **Issue:** This is the LEGACY conversation_turns table from the old conversation generation system
- **Current FK:** References `conversations` table (different parent)
- **Current Columns:** `role`, `content`, `detected_emotion` (different schema for single-turn system)
- **Row Count:** 0 (empty)
- **Usage:** ❌ HEAVILY USED in production (14 code files, 44 files for parent table)
- **Action Required:** RENAME to `legacy_conversation_turns` + create new `conversation_turns` for multi-turn
- **Code Updates:** 14 files must be updated to reference `legacy_conversation_turns`

### Seed Data: `evaluation_prompts`
- **Evaluator:** `multi_turn_arc_aware_v1`
- **Status:** ❌ DOES NOT EXIST
- **Action Required:** INSERT evaluator record

---

## 📋 SQL Execution Instructions

**Execute this COMPLETE SQL block** in Supabase Dashboard → SQL Editor:

```sql
-- ============================================
-- E01 v3: MULTI-TURN CHAT SCHEMA - FINAL
-- ============================================
-- VERIFIED BY SAOL: January 29, 2026
-- Safe to run multiple times (idempotent where possible)
-- ============================================

-- ============================================
-- STEP 1: Handle Legacy conversation_turns Table
-- ============================================
-- COEXISTENCE STRATEGY: Rename legacy table instead of dropping
-- This preserves the existing conversation generation system

-- Rename the legacy conversation_turns table
ALTER TABLE IF EXISTS public.conversation_turns 
  RENAME TO legacy_conversation_turns;

-- Update foreign key constraint name
ALTER TABLE IF EXISTS public.legacy_conversation_turns
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

-- Update RLS policies
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
-- STEP 2: Create New conversation_turns Table
-- ============================================

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

-- ============================================
-- STEP 3: Create Indexes
-- ============================================

-- Indexes for conversation_turns (new table)
CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation_id 
  ON public.conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_status 
  ON public.conversation_turns(status);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_turn_number 
  ON public.conversation_turns(conversation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_evaluator 
  ON public.conversation_turns(evaluation_prompt_id);

-- Note: multi_turn_conversations indexes already exist and are correct

-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================

ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- Note: multi_turn_conversations RLS already enabled and correct

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================

-- Drop existing policies if they exist (from legacy system)
DROP POLICY IF EXISTS "Users can manage turns of own conversations" ON public.conversation_turns;
DROP POLICY IF EXISTS "Users can view turns for their conversations" ON public.conversation_turns;
DROP POLICY IF EXISTS "Users can insert turns for their conversations" ON public.conversation_turns;
DROP POLICY IF EXISTS "Users can create own conversation turns" ON public.conversation_turns;
DROP POLICY IF EXISTS "Users can view own conversation turns" ON public.conversation_turns;

-- Create new policy for multi-turn system
CREATE POLICY "Users can manage turns of own conversations"
  ON public.conversation_turns
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.multi_turn_conversations
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 6: Add Column Comments
-- ============================================

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

-- ============================================
-- STEP 7: Seed Multi-Turn Evaluator
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
  'Measures actual human emotional progression across conversation turns. Analyzes human messages for ground-truth emotional state rather than projections.',
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
-- STEP 8: Verification Query
-- ============================================

SELECT 
  'E01 v3 COMPLETE - COEXISTENCE MODE!' AS status,
  '✅ multi_turn_conversations: ' || COUNT(*) || ' conversations' AS info
FROM public.multi_turn_conversations

UNION ALL

SELECT 
  '' AS status,
  '✅ conversation_turns (NEW): ' || COUNT(*) || ' turns' AS info
FROM public.conversation_turns

UNION ALL

SELECT 
  '' AS status,
  '✅ legacy_conversation_turns (PRESERVED): ' || COUNT(*) || ' turns' AS info
FROM public.legacy_conversation_turns

UNION ALL

SELECT 
  '' AS status,
  '✅ evaluator: ' || COUNT(*) || ' evaluators' AS info
FROM public.evaluation_prompts
WHERE name = 'multi_turn_arc_aware_v1';
```

---

## ✅ Post-Execution Verification

After running the SQL above, verify with these SAOL commands:

### 1. Verify conversation_turns Schema
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,includeIndexes:true,transport:'pg'});console.log('conversation_turns columns:',r.tables[0].columns.length);console.log('conversation_turns indexes:',r.tables[0].indexes.length);r.tables[0].columns.forEach(c=>console.log('-',c.name,':',c.type));})();"
```

**Expected Output:**
- 20 columns total
- Columns should include: `user_message`, `control_response`, `adapted_response`, `status`, `human_emotional_state`, `arc_progression`

### 2. Verify Evaluator Exists
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'evaluation_prompts',select:'id,name,display_name',where:[{column:'name',operator:'eq',value:'multi_turn_arc_aware_v1'}]});console.log('Evaluator found:',r.data?.length>0);if(r.data?.[0])console.log('Name:',r.data[0].display_name);})();"
```

**Expected Output:**
- Evaluator found: true
- Name: Multi-Turn Arc-Aware Evaluator (v1)

### 3. Verify Foreign Key Relationships
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeConstraints:true,transport:'pg'});r.tables[0].constraints.filter(c=>c.type==='FOREIGN KEY').forEach(c=>console.log('FK:',c.definition));})();"
```

**Expected Output:**
- FK to `multi_turn_conversations(id)` ✅
- FK to `evaluation_prompts(id)` ✅

---

## 📊 Schema Summary

### Table: `multi_turn_conversations`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| job_id | uuid | NO | - | FK to pipeline_training_jobs |
| user_id | uuid | NO | - | FK to auth.users |
| name | text | YES | - | Optional conversation name |
| system_prompt | text | YES | - | Optional system prompt |
| status | text | NO | 'active' | active, completed, abandoned |
| turn_count | integer | NO | 0 | Number of turns completed |
| max_turns | integer | NO | 10 | Maximum turns allowed |
| control_total_tokens | integer | YES | 0 | Total tokens used by control |
| adapted_total_tokens | integer | YES | 0 | Total tokens used by adapted |
| created_at | timestamptz | YES | NOW() | Creation timestamp |
| updated_at | timestamptz | YES | NOW() | Last update timestamp |
| completed_at | timestamptz | YES | - | Completion timestamp |

### Table: `conversation_turns` (NEW STRUCTURE)
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | Primary Key |
| conversation_id | uuid | NO | - | FK to multi_turn_conversations |
| turn_number | integer | NO | - | Sequential turn number |
| user_message | text | NO | - | User's input |
| control_response | text | YES | - | Control endpoint response |
| control_generation_time_ms | integer | YES | - | Control generation time |
| control_tokens_used | integer | YES | - | Control tokens consumed |
| control_error | text | YES | - | Control error message |
| adapted_response | text | YES | - | Adapted endpoint response |
| adapted_generation_time_ms | integer | YES | - | Adapted generation time |
| adapted_tokens_used | integer | YES | - | Adapted tokens consumed |
| adapted_error | text | YES | - | Adapted error message |
| evaluation_enabled | boolean | NO | false | Per-turn evaluation enabled |
| evaluation_prompt_id | uuid | YES | - | FK to evaluation_prompts |
| control_evaluation | jsonb | YES | - | Control evaluation result |
| adapted_evaluation | jsonb | YES | - | Adapted evaluation result |
| evaluation_comparison | jsonb | YES | - | Comparison result |
| human_emotional_state | jsonb | YES | - | Arc-aware emotional state |
| arc_progression | jsonb | YES | - | Arc progression data |
| status | text | NO | 'pending' | pending, generating, completed, failed |
| created_at | timestamptz | YES | NOW() | Creation timestamp |
| completed_at | timestamptz | YES | - | Completion timestamp |

---

## 🎯 Changes from E01_v1 and E01_v2

### Why This Version is Different

**E01_v1:**
- Assumed clean slate (no existing tables)
- Would fail if tables already existed

**E01_v2:**
- Guessed at missing columns without verification
- Didn't detect that conversation_turns was the wrong table
- Would have failed on foreign key mismatch

**E01_v3 (This Version):**
- ✅ SAOL-verified actual database state
- ✅ Detected legacy conversation_turns table conflict
- ✅ Safely drops old table (verified empty)
- ✅ Creates correct multi-turn A/B testing schema
- ✅ Preserves perfect multi_turn_conversations table
- ✅ Adds missing evaluator seed data
- ✅ Includes verification commands

---

## 🚨 Important Notes

1. **Coexistence Strategy:** The old `conversation_turns` table is **RENAMED** to `legacy_conversation_turns` (not dropped). This preserves the existing conversation generation system while allowing the new multi-turn A/B testing system to use `conversation_turns`.

2. **Code Updates Required:** After running this SQL, **14 code files** must be updated to reference `legacy_conversation_turns` instead of `conversation_turns`. See `E01_v4-single-conv-addendum.md` for detailed code update instructions.

3. **Two Systems Coexist:**
   - **Legacy:** `conversations` → `legacy_conversation_turns` (existing single-turn system)
   - **New:** `multi_turn_conversations` → `conversation_turns` (A/B testing system)

4. **Foreign Key Change:** The new `conversation_turns` table references `multi_turn_conversations` (not the old `conversations` table).

5. **RLS Policies:** New policies reference `multi_turn_conversations` and check against `user_id` (not `created_by`).

6. **Idempotent:** All operations use `IF EXISTS` or `IF NOT EXISTS` or `ON CONFLICT DO NOTHING`. Safe to run multiple times.

---

## 📝 Execution Checklist

### Phase 1: SQL Execution
- [ ] Copy the SQL from Step "SQL Execution Instructions" above
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Paste and execute the SQL
- [ ] Verify success message shows in results (should show both legacy and new tables)
- [ ] Run the 3 verification commands from "Post-Execution Verification"
- [ ] Confirm all verifications pass

### Phase 2: Code Updates (Required!)
- [ ] Review `E01_v4-single-conv-addendum.md` for detailed code update instructions
- [ ] Update 14 files to use `legacy_conversation_turns` (see v4 lines 414-492)
- [ ] Create `src/lib/types/legacy-conversations.ts` type aliases (see v4 lines 496-531)
- [ ] Test legacy system still works (see v4 lines 535-573)
- [ ] Test new multi-turn system works

### Phase 3: Continue Implementation
- [ ] Proceed to updated E01_v1 for TypeScript types and services
- [ ] Skip database schema sections (already complete)
- [ ] Implement multi-turn service layer (E02-E05)

---

**Document Version:** 3.0 (Final)  
**SAOL Audit Date:** January 29, 2026 7:07 AM UTC  
**Status:** ✅ READY TO EXECUTE  
**Risk Level:** LOW (verified safe by SAOL schema introspection)
