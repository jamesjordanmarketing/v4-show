/**
 * Investigation Script: Evaluation Prompts Analysis
 * 
 * Queries the evaluation_prompts table to analyze:
 * 1. Pairwise prompt status (is_active, is_default)
 * 2. All RQE-related prompts
 * 3. Token limits and model configurations
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const saol = require('.');

async function investigateEvaluatorPrompts() {
  console.log('='.repeat(80));
  console.log('EVALUATION PROMPTS INVESTIGATION');
  console.log('='.repeat(80));
  console.log('\n');

  // Query 1: Get all RQE-related prompts
  console.log('📋 Query 1: All RQE-related evaluation prompts\n');
  const rqePrompts = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'id,name,is_active,is_default,max_tokens,model,created_at',
    where: [{ column: 'name', operator: 'like', value: '%response_quality%' }]
  });

  if (rqePrompts.success) {
    console.log('✅ Found RQE prompts:');
    rqePrompts.data.forEach((prompt, idx) => {
      console.log(`\n   ${idx + 1}. ${prompt.name}`);
      console.log(`      ID:         ${prompt.id}`);
      console.log(`      is_active:  ${prompt.is_active}`);
      console.log(`      is_default: ${prompt.is_default}`);
      console.log(`      max_tokens: ${prompt.max_tokens}`);
      console.log(`      model:      ${prompt.model}`);
      console.log(`      created_at: ${prompt.created_at}`);
    });
  } else {
    console.error('❌ Failed to query RQE prompts:', rqePrompts.summary);
  }

  console.log('\n' + '-'.repeat(80) + '\n');

  // Query 2: Get the pairwise prompt specifically
  console.log('📋 Query 2: Pairwise prompt details\n');
  const pairwisePrompt = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'id,name,is_active,is_default,max_tokens,model,prompt_template',
    where: [{ column: 'name', operator: '=', value: 'response_quality_pairwise_v1' }]
  });

  if (pairwisePrompt.success && pairwisePrompt.data.length > 0) {
    const p = pairwisePrompt.data[0];
    console.log('✅ Pairwise prompt found:');
    console.log(`   ID:         ${p.id}`);
    console.log(`   name:       ${p.name}`);
    console.log(`   is_active:  ${p.is_active}`);
    console.log(`   is_default: ${p.is_default}`);
    console.log(`   max_tokens: ${p.max_tokens}`);
    console.log(`   model:      ${p.model}`);
    console.log(`   Template length: ${p.prompt_template ? p.prompt_template.length : 0} characters`);
    if (p.prompt_template) {
      console.log(`   Template preview: ${p.prompt_template.substring(0, 200)}...`);
    }
  } else {
    console.error('❌ Pairwise prompt NOT found or query failed:', pairwisePrompt.summary);
  }

  console.log('\n' + '-'.repeat(80) + '\n');

  // Query 3: Get the multi-turn prompt
  console.log('📋 Query 3: Multi-turn prompt details\n');
  const multiTurnPrompt = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'id,name,is_active,is_default,max_tokens,model,prompt_template',
    where: [{ column: 'name', operator: '=', value: 'response_quality_multi_turn_v1' }]
  });

  if (multiTurnPrompt.success && multiTurnPrompt.data.length > 0) {
    const p = multiTurnPrompt.data[0];
    console.log('✅ Multi-turn prompt found:');
    console.log(`   ID:         ${p.id}`);
    console.log(`   name:       ${p.name}`);
    console.log(`   is_active:  ${p.is_active}`);
    console.log(`   is_default: ${p.is_default}`);
    console.log(`   max_tokens: ${p.max_tokens}`);
    console.log(`   model:      ${p.model}`);
    console.log(`   Template length: ${p.prompt_template ? p.prompt_template.length : 0} characters`);
    
    // Check for PAI and RQS in template
    if (p.prompt_template) {
      const hasPAI = p.prompt_template.includes('predictedArcImpact') || p.prompt_template.includes('PAI');
      const hasRQS = p.prompt_template.includes('responseQualityScore') || p.prompt_template.includes('RQS');
      const hasDimensions = p.prompt_template.includes('emotionalAttunement');
      
      console.log(`\n   Template contains:`);
      console.log(`      - PAI (Predicted Arc Impact): ${hasPAI ? '✅ YES' : '❌ NO'}`);
      console.log(`      - RQS (Response Quality Score): ${hasRQS ? '✅ YES' : '❌ NO'}`);
      console.log(`      - EI Dimensions (emotionalAttunement, etc.): ${hasDimensions ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n   Template preview (first 500 chars):`);
      console.log(`   ${p.prompt_template.substring(0, 500)}...`);
    }
  } else {
    console.error('❌ Multi-turn prompt NOT found or query failed:', multiTurnPrompt.summary);
  }

  console.log('\n' + '-'.repeat(80) + '\n');

  // Query 4: Get all evaluation prompts (broader view)
  console.log('📋 Query 4: All evaluation prompts in database\n');
  const allPrompts = await saol.agentQuery({
    table: 'evaluation_prompts',
    select: 'id,name,is_active,is_default,max_tokens,model'
  });

  if (allPrompts.success) {
    console.log(`✅ Found ${allPrompts.data.length} total evaluation prompts:\n`);
    allPrompts.data.forEach((prompt, idx) => {
      const activeMarker = prompt.is_active ? '🟢' : '🔴';
      const defaultMarker = prompt.is_default ? '⭐' : '  ';
      console.log(`   ${idx + 1}. ${activeMarker} ${defaultMarker} ${prompt.name}`);
      console.log(`      max_tokens: ${prompt.max_tokens}, model: ${prompt.model}`);
    });
    
    console.log('\n   Legend: 🟢 = Active, 🔴 = Inactive, ⭐ = Default');
  } else {
    console.error('❌ Failed to query all prompts:', allPrompts.summary);
  }

  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run the investigation
investigateEvaluatorPrompts().catch(error => {
  console.error('\n❌ INVESTIGATION FAILED:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});
