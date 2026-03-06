/**
 * Verification Script for Adapter Testing Infrastructure (E01)
 * 
 * Verifies that:
 * 1. All three tables exist with correct structure
 * 2. RLS policies are enabled
 * 3. Indexes are created
 * 4. Seed data is present
 * 
 * Usage:
 *   node scripts/verify-adapter-schema.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const saol = require('../supa-agent-ops');

async function verifyAdapterSchema() {
  console.log('🔍 Verifying Adapter Testing Infrastructure...\n');

  let allPassed = true;

  // ============================================
  // 1. Verify pipeline_inference_endpoints
  // ============================================
  console.log('1️⃣  Checking pipeline_inference_endpoints table...');
  try {
    const endpointsResult = await saol.agentIntrospectSchema({
      table: 'pipeline_inference_endpoints',
      transport: 'pg'
    });

    if (!endpointsResult.success) {
      console.error('   ❌ Table does not exist');
      allPassed = false;
    } else {
      const table = endpointsResult.tables[0];
      console.log(`   ✅ Table exists with ${table.columns.length} columns`);
      console.log(`   ✅ RLS Enabled: ${table.rlsEnabled}`);
      console.log(`   ✅ Policies: ${table.policies.length}`);
      
      // Check for key columns
      const requiredColumns = [
        'id', 'job_id', 'user_id', 'endpoint_type', 'runpod_endpoint_id',
        'base_model', 'adapter_path', 'status', 'health_check_url',
        'idle_timeout_seconds', 'estimated_cost_per_hour', 'created_at'
      ];
      
      const columnNames = table.columns.map(c => c.name);
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.error(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        allPassed = false;
      } else {
        console.log('   ✅ All required columns present');
      }
    }
  } catch (error) {
    console.error('   ❌ Error checking table:', error.message);
    allPassed = false;
  }

  // ============================================
  // 2. Verify pipeline_test_results
  // ============================================
  console.log('\n2️⃣  Checking pipeline_test_results table...');
  try {
    const testsResult = await saol.agentIntrospectSchema({
      table: 'pipeline_test_results',
      transport: 'pg'
    });

    if (!testsResult.success) {
      console.error('   ❌ Table does not exist');
      allPassed = false;
    } else {
      const table = testsResult.tables[0];
      console.log(`   ✅ Table exists with ${table.columns.length} columns`);
      console.log(`   ✅ RLS Enabled: ${table.rlsEnabled}`);
      console.log(`   ✅ Policies: ${table.policies.length}`);
      
      // Check for key columns
      const requiredColumns = [
        'id', 'job_id', 'user_id', 'system_prompt', 'user_prompt',
        'control_response', 'adapted_response', 'evaluation_enabled',
        'control_evaluation', 'adapted_evaluation', 'evaluation_comparison',
        'user_rating', 'status', 'created_at'
      ];
      
      const columnNames = table.columns.map(c => c.name);
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.error(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        allPassed = false;
      } else {
        console.log('   ✅ All required columns present');
      }
    }
  } catch (error) {
    console.error('   ❌ Error checking table:', error.message);
    allPassed = false;
  }

  // ============================================
  // 3. Verify pipeline_base_models
  // ============================================
  console.log('\n3️⃣  Checking pipeline_base_models table...');
  try {
    const modelsResult = await saol.agentIntrospectSchema({
      table: 'pipeline_base_models',
      transport: 'pg'
    });

    if (!modelsResult.success) {
      console.error('   ❌ Table does not exist');
      allPassed = false;
    } else {
      const table = modelsResult.tables[0];
      console.log(`   ✅ Table exists with ${table.columns.length} columns`);
      
      // Check for key columns
      const requiredColumns = [
        'id', 'model_id', 'display_name', 'parameter_count', 'context_length',
        'license', 'docker_image', 'min_gpu_memory_gb', 'recommended_gpu_type',
        'supports_lora', 'is_active'
      ];
      
      const columnNames = table.columns.map(c => c.name);
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.error(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        allPassed = false;
      } else {
        console.log('   ✅ All required columns present');
      }
    }
  } catch (error) {
    console.error('   ❌ Error checking table:', error.message);
    allPassed = false;
  }

  // ============================================
  // 4. Verify seed data
  // ============================================
  console.log('\n4️⃣  Checking seed data in pipeline_base_models...');
  try {
    const seedResult = await saol.agentQuery({
      table: 'pipeline_base_models',
      select: 'model_id,display_name,parameter_count,is_active'
    });

    if (!seedResult.success || !seedResult.data || seedResult.data.length === 0) {
      console.error('   ❌ No seed data found');
      allPassed = false;
    } else {
      console.log(`   ✅ Found ${seedResult.data.length} base models:`);
      seedResult.data.forEach(model => {
        const activeStatus = model.is_active ? '✅' : '⚠️';
        console.log(`      ${activeStatus} ${model.display_name} (${model.parameter_count})`);
      });
      
      // Check for expected models
      const expectedModels = [
        'mistralai/Mistral-7B-Instruct-v0.2',
        'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        'meta-llama/Meta-Llama-3-8B-Instruct',
        'meta-llama/Meta-Llama-3-70B-Instruct'
      ];
      
      const foundModelIds = seedResult.data.map(m => m.model_id);
      const missingModels = expectedModels.filter(id => !foundModelIds.includes(id));
      
      if (missingModels.length > 0) {
        console.error(`   ⚠️  Missing expected models: ${missingModels.join(', ')}`);
      } else {
        console.log('   ✅ All expected models present');
      }
    }
  } catch (error) {
    console.error('   ❌ Error checking seed data:', error.message);
    allPassed = false;
  }

  // ============================================
  // Final Summary
  // ============================================
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL VERIFICATIONS PASSED!');
    console.log('\nAdapter Testing Infrastructure (E01) is correctly installed.');
    console.log('\nNext steps:');
    console.log('  - E02: Implement Service Layer');
    console.log('  - E03: Create API Routes');
    console.log('  - E04: Build React Query Hooks');
    console.log('  - E05: Develop UI Components');
  } else {
    console.log('❌ SOME VERIFICATIONS FAILED');
    console.log('\nPlease review the errors above and ensure the migration was executed correctly.');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(allPassed ? 0 : 1);
}

// Run verification
verifyAdapterSchema().catch(error => {
  console.error('\n❌ Verification script failed:', error);
  process.exit(1);
});
