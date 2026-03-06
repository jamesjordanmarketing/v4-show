#!/usr/bin/env node

/**
 * LoRA Training Foundation Verification Script
 * 
 * This script verifies that all database tables, indexes, and RLS policies
 * were created successfully for the LoRA Training Module foundation.
 * 
 * Uses SAOL (Supabase Agent Ops Library) for safe database operations.
 */

require('dotenv').config({ path: '../.env.local' });
const path = require('path');

// Import SAOL from the supa-agent-ops directory
const saolPath = path.join(__dirname, '../supa-agent-ops');
const saol = require(saolPath);

const EXPECTED_TABLES = [
  'datasets',
  'training_jobs',
  'metrics_points',
  'model_artifacts',
  'cost_records',
  'notifications'
];

const EXPECTED_INDEXES = {
  datasets: ['idx_datasets_user_id', 'idx_datasets_status', 'idx_datasets_created_at'],
  training_jobs: ['idx_training_jobs_user_id', 'idx_training_jobs_status', 'idx_training_jobs_dataset_id'],
  metrics_points: ['idx_metrics_points_job_id', 'idx_metrics_points_timestamp'],
  model_artifacts: ['idx_model_artifacts_user_id', 'idx_model_artifacts_job_id'],
  cost_records: ['idx_cost_records_user_id', 'idx_cost_records_billing_period'],
  notifications: ['idx_notifications_user_id', 'idx_notifications_read']
};

const EXPECTED_RLS_TABLES = ['datasets', 'training_jobs', 'model_artifacts'];

async function verifyTables() {
  console.log('\n🔍 Verifying LoRA Training Tables...\n');
  
  let allTablesExist = true;
  
  for (const tableName of EXPECTED_TABLES) {
    try {
      const result = await saol.agentIntrospectSchema({
        table: tableName,
        transport: 'pg'
      });
      
      if (result.success) {
        console.log(`✅ ${tableName} - EXISTS`);
        
        // Show column count
        const columnCount = result.data.columns.length;
        console.log(`   └─ Columns: ${columnCount}`);
        
        // Check for primary key
        if (result.data.primaryKey && result.data.primaryKey.length > 0) {
          console.log(`   └─ Primary Key: ${result.data.primaryKey.join(', ')}`);
        }
        
      } else {
        console.log(`❌ ${tableName} - MISSING`);
        console.log(`   └─ Error: ${result.error}`);
        allTablesExist = false;
      }
    } catch (error) {
      console.log(`❌ ${tableName} - ERROR`);
      console.log(`   └─ ${error.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function verifyIndexes() {
  console.log('\n🔍 Verifying Indexes...\n');
  
  let allIndexesExist = true;
  
  for (const [tableName, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
    try {
      const result = await saol.agentIntrospectSchema({
        table: tableName,
        transport: 'pg'
      });
      
      if (result.success && result.data.indexes) {
        const indexNames = result.data.indexes.map(idx => idx.name);
        const foundIndexes = expectedIndexes.filter(idx => indexNames.includes(idx));
        const missingIndexes = expectedIndexes.filter(idx => !indexNames.includes(idx));
        
        console.log(`📊 ${tableName}:`);
        console.log(`   ├─ Expected: ${expectedIndexes.length}`);
        console.log(`   ├─ Found: ${foundIndexes.length}`);
        
        if (missingIndexes.length > 0) {
          console.log(`   └─ Missing: ${missingIndexes.join(', ')}`);
          allIndexesExist = false;
        } else {
          console.log(`   └─ ✅ All indexes present`);
        }
      }
    } catch (error) {
      console.log(`❌ ${tableName} - Error checking indexes: ${error.message}`);
      allIndexesExist = false;
    }
  }
  
  return allIndexesExist;
}

async function verifyRLS() {
  console.log('\n🔍 Verifying Row-Level Security (RLS)...\n');
  
  let allRLSEnabled = true;
  
  for (const tableName of EXPECTED_RLS_TABLES) {
    try {
      const result = await saol.agentIntrospectSchema({
        table: tableName,
        transport: 'pg'
      });
      
      if (result.success) {
        const rlsEnabled = result.data.rlsEnabled;
        const policyCount = result.data.policies ? result.data.policies.length : 0;
        
        if (rlsEnabled && policyCount > 0) {
          console.log(`✅ ${tableName}:`);
          console.log(`   ├─ RLS Enabled: Yes`);
          console.log(`   └─ Policies: ${policyCount}`);
          
          // Show policy names
          if (result.data.policies) {
            result.data.policies.forEach(policy => {
              console.log(`      - ${policy.name} (${policy.command})`);
            });
          }
        } else if (rlsEnabled && policyCount === 0) {
          console.log(`⚠️  ${tableName}: RLS enabled but no policies found`);
          allRLSEnabled = false;
        } else {
          console.log(`❌ ${tableName}: RLS not enabled`);
          allRLSEnabled = false;
        }
      }
    } catch (error) {
      console.log(`❌ ${tableName} - Error checking RLS: ${error.message}`);
      allRLSEnabled = false;
    }
  }
  
  return allRLSEnabled;
}

async function verifyForeignKeys() {
  console.log('\n🔍 Verifying Foreign Key Relationships...\n');
  
  const tablesWithFKs = ['datasets', 'training_jobs', 'model_artifacts', 'cost_records', 'notifications'];
  
  for (const tableName of tablesWithFKs) {
    try {
      const result = await saol.agentIntrospectSchema({
        table: tableName,
        transport: 'pg'
      });
      
      if (result.success && result.data.foreignKeys) {
        const fkCount = result.data.foreignKeys.length;
        console.log(`📎 ${tableName}: ${fkCount} foreign key(s)`);
        
        result.data.foreignKeys.forEach(fk => {
          console.log(`   └─ ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
        });
      }
    } catch (error) {
      console.log(`❌ ${tableName} - Error checking foreign keys: ${error.message}`);
    }
  }
  
  return true;
}

async function checkDatasetTableStructure() {
  console.log('\n🔍 Detailed Check: datasets Table Structure...\n');
  
  try {
    const result = await saol.agentIntrospectSchema({
      table: 'datasets',
      transport: 'pg'
    });
    
    if (result.success) {
      console.log('📋 Columns:');
      result.data.columns.forEach(col => {
        const nullable = col.isNullable ? 'NULL' : 'NOT NULL';
        const defaultVal = col.defaultValue ? ` DEFAULT ${col.defaultValue}` : '';
        console.log(`   - ${col.name}: ${col.type} ${nullable}${defaultVal}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   LoRA Training Module - Foundation Verification           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    const tablesOk = await verifyTables();
    const indexesOk = await verifyIndexes();
    const rlsOk = await verifyRLS();
    await verifyForeignKeys();
    await checkDatasetTableStructure();
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 VERIFICATION SUMMARY:\n');
    
    console.log(`Tables:        ${tablesOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Indexes:       ${indexesOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`RLS Policies:  ${rlsOk ? '✅ PASS' : '⚠️  PARTIAL'}`);
    
    if (tablesOk && indexesOk && rlsOk) {
      console.log('\n✅ All verification checks passed!');
      console.log('   The LoRA Training foundation is ready.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some checks failed. Please review the output above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
main();

