/**
 * Upgrade All Evaluation Prompts to Latest Claude Model
 * 
 * Updates all evaluator prompts from Claude Sonnet 4 (legacy) to Claude Sonnet 4.5 (latest)
 * Model: claude-sonnet-4-5-20250929 (released Sept 29, 2025)
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const saol = require('.');

const OLD_MODEL = 'claude-sonnet-4-20250514';  // Legacy Sonnet 4 (May 2025)
const NEW_MODEL = 'claude-sonnet-4-5-20250929'; // Latest Sonnet 4.5 (Sept 2025)

async function upgradeClaudeModel() {
  console.log('='.repeat(80));
  console.log('CLAUDE MODEL UPGRADE');
  console.log('='.repeat(80));
  console.log('\n');
  console.log(`Upgrading from: ${OLD_MODEL} (Legacy Sonnet 4)`);
  console.log(`Upgrading to:   ${NEW_MODEL} (Latest Sonnet 4.5)`);
  console.log('\n');

  // Step 1: Check current state
  console.log('📋 Step 1: Checking current evaluation prompts...\n');
  
  const currentState = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'id,name,model,is_active,updated_at'
  });

  if (currentState.success) {
    console.log(`Found ${currentState.data.length} evaluation prompts:\n`);
    currentState.data.forEach((prompt, idx) => {
      const needsUpgrade = prompt.model === OLD_MODEL ? '⚠️  NEEDS UPGRADE' : '✅ OK';
      console.log(`   ${idx + 1}. ${prompt.name}`);
      console.log(`      Model: ${prompt.model} ${needsUpgrade}`);
      console.log(`      Active: ${prompt.is_active}`);
      console.log(`      Last updated: ${prompt.updated_at}\n`);
    });

    const upgradeCount = currentState.data.filter(p => p.model === OLD_MODEL).length;
    
    if (upgradeCount === 0) {
      console.log('✅ All prompts are already using the latest model!');
      console.log('\n' + '='.repeat(80));
      return;
    }

    console.log(`📊 Summary: ${upgradeCount} prompt(s) need upgrading\n`);
  } else {
    console.error('❌ Failed to query current state:', currentState.summary);
    return;
  }

  console.log('-'.repeat(80) + '\n');

  // Step 2: Perform upgrade
  console.log('🔄 Step 2: Upgrading all prompts to latest Claude model...\n');

  const upgradeResult = await saol.agentExecuteSQL({
    sql: `
      UPDATE evaluation_prompts
      SET 
        model = '${NEW_MODEL}',
        updated_at = NOW()
      WHERE model = '${OLD_MODEL}'
      RETURNING id, name, model, updated_at;
    `,
    transport: 'pg',
    transaction: true
  });

  if (upgradeResult.success && upgradeResult.rows && upgradeResult.rows.length > 0) {
    console.log(`✅ Successfully upgraded ${upgradeResult.rows.length} prompt(s):\n`);
    upgradeResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.name}`);
      console.log(`      New model: ${row.model}`);
      console.log(`      Updated: ${row.updated_at}\n`);
    });
  } else {
    console.error('❌ Upgrade failed:', upgradeResult);
    if (upgradeResult.error) {
      console.error('   Error details:', upgradeResult.error);
    }
    return;
  }

  console.log('-'.repeat(80) + '\n');

  // Step 3: Verify upgrade
  console.log('🔍 Step 3: Verifying upgrade...\n');

  const verifyState = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'name,model,updated_at'
  });

  if (verifyState.success) {
    console.log(`Verification complete:\n`);
    verifyState.data.forEach((prompt, idx) => {
      const status = prompt.model === NEW_MODEL ? '✅' : '⚠️';
      console.log(`   ${idx + 1}. ${status} ${prompt.name}`);
      console.log(`      Model: ${prompt.model}\n`);
    });

    const stillOldModel = verifyState.data.filter(p => p.model === OLD_MODEL).length;
    
    if (stillOldModel === 0) {
      console.log('✅ SUCCESS: All prompts are now using Claude Sonnet 4.5!\n');
    } else {
      console.warn(`⚠️  WARNING: ${stillOldModel} prompt(s) still using old model\n`);
    }
  } else {
    console.error('❌ Verification failed:', verifyState.summary);
  }

  console.log('='.repeat(80));
  console.log('UPGRADE COMPLETE');
  console.log('='.repeat(80));
  console.log('\n📌 Next Steps:');
  console.log('   1. Test evaluation with a conversation turn');
  console.log('   2. Verify logs show model: claude-sonnet-4-5-20250929');
  console.log('   3. Compare evaluation quality vs. previous model');
  console.log('\n💡 Benefits of Claude Sonnet 4.5:');
  console.log('   - Better intelligence & reasoning');
  console.log('   - Same pricing ($3 input / $15 output per MTok)');
  console.log('   - 64K max output (vs 32K in Sonnet 4)');
  console.log('   - Extended thinking support');
  console.log('   - Knowledge through January 2025\n');
}

// Run the upgrade
upgradeClaudeModel().catch(error => {
  console.error('\n❌ UPGRADE FAILED:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});
