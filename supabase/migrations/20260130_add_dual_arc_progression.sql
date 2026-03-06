-- E06: Add Dual Arc Progression Tracking
-- Adds separate tracking for control and adapted conversations

ALTER TABLE conversation_turns
ADD COLUMN IF NOT EXISTS control_human_emotional_state JSONB,
ADD COLUMN IF NOT EXISTS adapted_human_emotional_state JSONB,
ADD COLUMN IF NOT EXISTS control_arc_progression JSONB,
ADD COLUMN IF NOT EXISTS adapted_arc_progression JSONB,
ADD COLUMN IF NOT EXISTS conversation_winner JSONB;

-- Verification query (run after migration)
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'conversation_turns' 
-- ORDER BY ordinal_position;
