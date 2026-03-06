/**
 * E06 Database Migration
 * Adds columns for dual arc progression tracking
 */

require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Supabase URL or Service Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runMigration() {
  console.log('Starting E06 migration...');
  
  try {
    // Query to check if columns exist
    const { data: existingColumns, error: checkError } = await supabase
      .from('conversation_turns')
      .select('control_arc_progression')
      .limit(1);
    
    if (!checkError) {
      console.log('✓ Columns already exist - migration not needed');
      return;
    }
    
    console.log('Columns do not exist, will need manual migration...');
    console.log('\nPlease run this SQL in Supabase SQL Editor:\n');
    console.log('ALTER TABLE conversation_turns');
    console.log('ADD COLUMN IF NOT EXISTS control_human_emotional_state JSONB,');
    console.log('ADD COLUMN IF NOT EXISTS adapted_human_emotional_state JSONB,');
    console.log('ADD COLUMN IF NOT EXISTS control_arc_progression JSONB,');
    console.log('ADD COLUMN IF NOT EXISTS adapted_arc_progression JSONB,');
    console.log('ADD COLUMN IF NOT EXISTS conversation_winner JSONB;');
    console.log('\nAfter running the SQL, re-run this script to verify.');
    
  } catch (error) {
    console.error('Migration check failed:', error.message);
  }
}

runMigration();
