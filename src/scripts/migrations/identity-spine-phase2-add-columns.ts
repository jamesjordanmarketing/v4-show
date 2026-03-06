/**
 * Identity Spine — Phase 2: Add user_id and audit columns to legacy tables
 *
 * Run via SAOL from terminal (dry-run first, then apply):
 *   cd supa-agent-ops && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:PHASE2_SQL,dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
 *
 * Columns added are NULLABLE initially — Phase 3 backfills, Phase 7 (E04) adds NOT NULL.
 * All ALTER TABLE statements use IF NOT EXISTS for idempotency.
 */

const PHASE2_SQL = `
-- 1. Legacy tables: add user_id alongside existing created_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE failed_generations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Standardize documents table (currently has author_id, no user_id)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add updated_by audit columns where missing
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE training_files ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_knowledge_bases ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 4. Add created_by audit column to tables that only have user_id
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE pipeline_training_jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
`;

export default PHASE2_SQL;
