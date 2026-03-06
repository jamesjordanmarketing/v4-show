/**
 * Identity Spine — Phase 7: NOT NULL constraints on user_id columns
 *
 * MUST run AFTER Phase 3 backfill is complete AND verified.
 * MUST run AFTER Phase 4-6 code changes are deployed (so new writes include user_id).
 *
 * Post-E03.5 state: conversations=0, batch_jobs=0, generation_logs=0, documents=0 — all empty.
 * training_files=1 (preserved artifact, verified clean). Constraints apply with zero risk.
 */

const PHASE7_CONSTRAINTS_SQL = `
-- Enforce NOT NULL on user_id columns
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE training_files ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE batch_jobs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE generation_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
`;

export default PHASE7_CONSTRAINTS_SQL;
