/**
 * Identity Spine — Phase 3: Backfill user_id and quarantine orphans
 *
 * MUST run AFTER Phase 2 (columns exist).
 * MUST complete BEFORE Phase 7/E04 (NOT NULL constraints are added).
 *
 * Logic:
 *   - Tables with created_by  → copy into user_id
 *   - documents table         → copy author_id into user_id
 *   - Tables with user_id but no created_by → copy user_id into created_by
 *   - Records with BOTH created_by IS NULL AND user_id IS NULL → logged to _orphaned_records
 */

const PHASE3_BACKFILL_SQL = `
-- Backfill user_id from created_by on legacy tables
-- EXISTS guard required: some created_by values are dangling FKs (users deleted from auth.users)
UPDATE conversations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);
UPDATE training_files SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);
UPDATE batch_jobs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);
UPDATE generation_logs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);
UPDATE failed_generations SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);

-- Backfill documents.user_id from author_id
UPDATE documents SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = author_id);

-- Backfill reverse: created_by from user_id on pipeline tables
UPDATE datasets SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
UPDATE pipeline_training_jobs SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id);
`;

const PHASE3_QUARANTINE_SQL = `
-- Drop existing empty shell of _orphaned_records (shows 0 columns in introspection)
DROP TABLE IF EXISTS _orphaned_records;

-- Create quarantine table
CREATE TABLE IF NOT EXISTS _orphaned_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  resolution TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Log orphaned records (NULL ownership after backfill)
INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'conversations', id FROM conversations WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'batch_jobs', id FROM batch_jobs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'training_files', id FROM training_files WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'generation_logs', id FROM generation_logs WHERE created_by IS NULL AND user_id IS NULL;

INSERT INTO _orphaned_records (source_table, source_id)
SELECT 'documents', id FROM documents WHERE author_id IS NULL AND user_id IS NULL;
`;

export { PHASE3_BACKFILL_SQL, PHASE3_QUARANTINE_SQL };
