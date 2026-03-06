#!/usr/bin/env node

/**
 * Integration Spec Merger
 * 
 * This script merges a structured specification with integration knowledge
 * to produce an integrated extension specification.
 * 
 * Usage:
 *   node 04e-merge-integration-spec_v1.js \
 *     --spec "path/to/structured-spec.md" \
 *     --inventory "path/to/infrastructure-inventory.md" \
 *     --strategy "path/to/extension-strategy.md" \
 *     --guide "path/to/implementation-guide.md" \
 *     --output "path/to/output.md"
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  
  return parsed;
}

// Read file with error handling
function readFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    console.log(`Reading: ${absolutePath}`);
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Write file with error handling
function writeFile(filePath, content) {
  try {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`\n✅ Output written to: ${absolutePath}`);
    console.log(`   File size: ${(content.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Build the merge prompt
function buildMergePrompt(metaPrompt, specContent, inventoryContent, strategyContent, guideContent) {
  const prompt = `${metaPrompt}

---

## INPUT FILES PROVIDED

### Input 1: Structured Specification

\`\`\`markdown
${specContent}
\`\`\`

---

### Input 2: Infrastructure Inventory

\`\`\`markdown
${inventoryContent}
\`\`\`

---

### Input 3: Extension Strategy

\`\`\`markdown
${strategyContent}
\`\`\`

---

### Input 4: Implementation Guide

\`\`\`markdown
${guideContent}
\`\`\`

---

## YOUR TASK

Using the transformation rules and guidance provided in this meta-prompt, transform the Structured Specification (Input 1) into an Integrated Extension Specification.

For each section:
1. Extract the features and requirements
2. Apply the transformation rules to replace generic infrastructure with Supabase patterns
3. Reference the Infrastructure Inventory (Input 2) for exact code patterns
4. Reference the Extension Strategy (Input 3) for infrastructure decisions
5. Reference the Implementation Guide (Input 4) for implementation examples
6. Output the integrated section following the output structure template

**Start with Section 1 and proceed through Section 7 sequentially.**

**Output the complete integrated specification as a single markdown document.**
`;

  return prompt;
}

// Main execution
function main() {
  console.log('\n🚀 Integration Spec Merger v1.0\n');
  console.log('=' .repeat(60));
  
  // Parse arguments
  const args = parseArgs();
  
  // Validate required arguments
  const required = ['spec', 'inventory', 'strategy', 'guide', 'output'];
  const missing = required.filter(key => !args[key]);
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing required arguments: ${missing.join(', ')}\n`);
    console.log('Usage:');
    console.log('  node 04e-merge-integration-spec_v1.js \\');
    console.log('    --spec "path/to/structured-spec.md" \\');
    console.log('    --inventory "path/to/infrastructure-inventory.md" \\');
    console.log('    --strategy "path/to/extension-strategy.md" \\');
    console.log('    --guide "path/to/implementation-guide.md" \\');
    console.log('    --output "path/to/output.md"\n');
    process.exit(1);
  }
  
  console.log('\n📂 Input Files:');
  console.log('  - Structured Spec:', args.spec);
  console.log('  - Infrastructure Inventory:', args.inventory);
  console.log('  - Extension Strategy:', args.strategy);
  console.log('  - Implementation Guide:', args.guide);
  console.log('\n📝 Output File:', args.output);
  console.log('\n' + '='.repeat(60));
  
  // Read meta-prompt
  console.log('\n📖 Reading meta-prompt...');
  const metaPromptPath = path.join(__dirname, '../_prompt_engineering/04e-merge-integration-spec-meta-prompt_v1.md');
  const metaPrompt = readFile(metaPromptPath);
  
  // Read input files
  console.log('\n📖 Reading input files...');
  const specContent = readFile(args.spec);
  const inventoryContent = readFile(args.inventory);
  const strategyContent = readFile(args.strategy);
  const guideContent = readFile(args.guide);
  
  console.log('\n✅ All input files loaded successfully');
  console.log(`   - Structured Spec: ${(specContent.length / 1024).toFixed(2)} KB`);
  console.log(`   - Infrastructure Inventory: ${(inventoryContent.length / 1024).toFixed(2)} KB`);
  console.log(`   - Extension Strategy: ${(strategyContent.length / 1024).toFixed(2)} KB`);
  console.log(`   - Implementation Guide: ${(guideContent.length / 1024).toFixed(2)} KB`);
  
  // Build merge prompt
  console.log('\n🔨 Building merge prompt...');
  const mergePrompt = buildMergePrompt(
    metaPrompt,
    specContent,
    inventoryContent,
    strategyContent,
    guideContent
  );
  
  console.log(`   - Total prompt size: ${(mergePrompt.length / 1024).toFixed(2)} KB`);
  
  // Write prompt to temporary file for manual execution
  const promptOutputPath = args.output.replace('.md', '-MERGE-PROMPT.md');
  writeFile(promptOutputPath, mergePrompt);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 NEXT STEPS:\n');
  console.log('The merge prompt has been generated and saved to:');
  console.log(`   ${path.resolve(promptOutputPath)}\n`);
  console.log('To complete the merge, you have two options:\n');
  console.log('OPTION 1: Use AI Assistant (Recommended)');
  console.log('  1. Open the prompt file in your AI assistant (Claude, GPT-4, etc.)');
  console.log('  2. The AI will read all inputs and generate the integrated spec');
  console.log('  3. Save the output to:', path.resolve(args.output));
  console.log('\nOPTION 2: Manual Processing');
  console.log('  1. Review the prompt file');
  console.log('  2. Manually transform each section following the rules');
  console.log('  3. Save the result to:', path.resolve(args.output));
  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Merge prompt generation complete!\n');
}

// Run main function
main();

