/**
 * Standalone Claude API Test
 * Run this directly to test Claude API connectivity without Vercel
 * 
 * Usage:
 * cd src && node ../test-claude-api.js
 * OR from root:
 * node test-claude-api.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// Try to load Anthropic SDK from src/node_modules
let Anthropic;
try {
  Anthropic = require('./src/node_modules/@anthropic-ai/sdk');
} catch {
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch {
    console.error('❌ ERROR: Could not load @anthropic-ai/sdk');
    console.error('   Run from root: node test-claude-api.js');
    console.error('   Or from src: cd src && node ../test-claude-api.js');
    process.exit(1);
  }
}

async function testClaudeAPI() {
  console.log('========================================');
  console.log('CLAUDE API DIAGNOSTIC TEST');
  console.log('========================================\n');

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: ANTHROPIC_API_KEY not found in .env.local');
    console.error('   Please ensure you have ANTHROPIC_API_KEY=sk-... in your .env.local file\n');
    return;
  }

  console.log('✓ API Key found:', apiKey.slice(0, 15) + '...' + apiKey.slice(-5));
  console.log('  Key length:', apiKey.length, 'chars\n');

  const client = new Anthropic({ apiKey });

  // ========================================
  // TEST 1: Simple connectivity test
  // ========================================
  console.log('TEST 1: Connectivity Test');
  console.log('Testing with simple prompt...');
  const test1Start = Date.now();

  try {
    const abortController = new AbortController();
    const timeout1 = setTimeout(() => {
      abortController.abort();
      console.log('⏰ Aborting after 30 seconds...');
    }, 30000);

    const response1 = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      temperature: 0,
      system: 'You are testing API connectivity. Respond quickly.',
      messages: [{
        role: 'user',
        content: 'Is this API call awake and acknowledged? Respond quickly with "YES I can see your input"'
      }],
    }, {
      signal: abortController.signal,
    });

    clearTimeout(timeout1);
    const elapsed1 = Date.now() - test1Start;

    console.log('✓ SUCCESS');
    console.log('  Response:', response1.content[0].text);
    console.log('  Time:', elapsed1, 'ms');
    console.log('  Model:', response1.model);
    console.log('  Tokens:', response1.usage.input_tokens, 'in,', response1.usage.output_tokens, 'out');
    console.log('  Stop reason:', response1.stop_reason);
    console.log('');
  } catch (error) {
    const elapsed1 = Date.now() - test1Start;
    console.error('❌ FAILED');
    console.error('  Error:', error.message);
    console.error('  Time:', elapsed1, 'ms');
    console.error('  Error name:', error.name);
    console.error('  Error type:', error.constructor.name);
    console.error('');
    
    if (error.message?.includes('model_not_found') || error.message?.includes('invalid_model')) {
      console.error('⚠️  MODEL ISSUE: The model name may be incorrect or retired.');
      console.error('   Try these models:');
      console.error('   - claude-sonnet-4-5-20250929 (current)');
      console.error('   - claude-haiku-4-5-20251001 (faster)');
      console.error('');
    }
    
    return;
  }

  // ========================================
  // TEST 2: Model verification test
  // ========================================
  console.log('TEST 2: Model Verification');
  console.log('Testing alternative models...\n');

  const modelsToTest = [
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-latest',
  ];

  for (const model of modelsToTest) {
    console.log(`  Testing model: ${model}`);
    const testStart = Date.now();

    try {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 15000);

      const response = await client.messages.create({
        model,
        max_tokens: 50,
        temperature: 0,
        messages: [{ role: 'user', content: 'Say "OK"' }],
      }, {
        signal: abortController.signal,
      });

      clearTimeout(timeout);
      const elapsed = Date.now() - testStart;

      console.log(`  ✓ Works (${elapsed}ms) - Response: "${response.content[0].text}"`);
    } catch (error) {
      const elapsed = Date.now() - testStart;
      console.log(`  ✗ Failed (${elapsed}ms) - ${error.message.slice(0, 100)}`);
    }
  }

  console.log('\n========================================');
  console.log('DIAGNOSTIC TEST COMPLETE');
  console.log('========================================\n');
}

testClaudeAPI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
