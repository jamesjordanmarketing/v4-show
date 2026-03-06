/**
 * Integration Merge Script
 * 
 * Purpose: Merge a structured specification with integration documents to produce
 *          an integrated extension specification using existing codebase patterns.
 * 
 * Usage:
 *   node 04e-merge-integration-spec_v1.js \
 *     --spec <path-to-structured-spec> \
 *     --inventory <path-to-infrastructure-inventory> \
 *     --strategy <path-to-extension-strategy> \
 *     --guide <path-to-implementation-guide> \
 *     --output <path-to-output-file>
 * 
 * Example:
 *   node pmc/product/_tools/04e-merge-integration-spec_v1.js \
 *     --spec "pmc/product/_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md" \
 *     --inventory "pmc/product/_mapping/pipeline/_run-prompts/04d-infrastructure-inventory_v1.md" \
 *     --strategy "pmc/product/_mapping/pipeline/_run-prompts/04d-extension-strategy_v1.md" \
 *     --guide "pmc/product/_mapping/pipeline/_run-prompts/04d-implementation-guide_v1.md" \
 *     --output "pmc/product/_mapping/pipeline/04e-integrated-extension-spec_v1.md"
 * 
 * Output: Creates a prompt file ready for AI execution that contains the meta-prompt
 *         plus all input documents, formatted for the AI to produce the integrated spec.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  
  return parsed;
}

// Validate required arguments
function validateArgs(args) {
  const required = ['spec', 'inventory', 'strategy', 'guide', 'output'];
  const missing = required.filter(arg => !args[arg]);
  
  if (missing.length > 0) {
    console.error('Error: Missing required arguments:', missing.join(', '));
    console.error('\nUsage:');
    console.error('  node 04e-merge-integration-spec_v1.js \\');
    console.error('    --spec <path> \\');
    console.error('    --inventory <path> \\');
    console.error('    --strategy <path> \\');
    console.error('    --guide <path> \\');
    console.error('    --output <path>');
    process.exit(1);
  }
}

// Read file with error handling
function readFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
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
    return absolutePath;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Extract title from markdown file
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled';
}

// Get current date in readable format
function getCurrentDate() {
  const date = new Date();
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Create the complete prompt for AI execution
function createMergePrompt(metaPrompt, spec, inventory, strategy, guide, paths) {
  const specTitle = extractTitle(spec);
  const currentDate = getCurrentDate();
  
  return `# MERGE PROMPT: Integration Specification Generator

**Date**: ${currentDate}
**Task**: Transform a structured specification into an integrated extension specification
**Method**: Apply merge meta-prompt to combine spec with integration documents

---

## INSTRUCTIONS FOR AI

You are tasked with transforming a structured specification into an integrated extension specification by merging it with integration documents that describe an existing codebase.

### Your Task

1. **Read the META-PROMPT below** - It contains all transformation rules and patterns
2. **Read the 4 INPUT DOCUMENTS below** - They provide the spec and integration knowledge
3. **Apply the transformation rules** - Transform each section and feature requirement
4. **Output the INTEGRATED EXTENSION SPECIFICATION** - Complete, ready for segmentation

### Key Points

- Replace ALL generic infrastructure (Prisma, NextAuth, S3, etc.) with actual existing patterns
- Preserve ALL business logic and feature requirements from original spec
- Follow the output structure specified in the meta-prompt
- Ensure every code example uses actual existing patterns from the inventory
- Maintain all section numbers, FR numbers, and feature names

---

## META-PROMPT

The following meta-prompt contains all transformation rules and instructions:

${metaPrompt}

---

## INPUT DOCUMENT 1: STRUCTURED SPECIFICATION

**File**: \`${paths.spec}\`
**Title**: ${specTitle}

The following is the structured specification to be transformed. Extract FEATURES and BUSINESS LOGIC from this document, but IGNORE infrastructure choices:

\`\`\`markdown
${spec}
\`\`\`

---

## INPUT DOCUMENT 2: INFRASTRUCTURE INVENTORY

**File**: \`${paths.inventory}\`

The following document describes existing infrastructure in the codebase. Use these patterns for ALL infrastructure needs:

\`\`\`markdown
${inventory}
\`\`\`

---

## INPUT DOCUMENT 3: EXTENSION STRATEGY

**File**: \`${paths.strategy}\`

The following document maps features to existing infrastructure. Follow these integration decisions:

\`\`\`markdown
${strategy}
\`\`\`

---

## INPUT DOCUMENT 4: IMPLEMENTATION GUIDE

**File**: \`${paths.guide}\`

The following document provides exact code patterns. Reference these for consistency:

\`\`\`markdown
${guide}
\`\`\`

---

## OUTPUT INSTRUCTIONS

Generate the complete integrated extension specification following the structure defined in the meta-prompt.

The output should:
1. Have all sections from the original spec
2. Have all feature requirements from the original spec
3. Replace all infrastructure with existing codebase patterns
4. Include transformed code examples using actual patterns
5. Preserve all business logic and acceptance criteria
6. Include integration notes at the end

Begin the transformation now. Output the complete integrated extension specification.
`;
}

// Main execution
function main() {
  console.log('🔄 Integration Merge Script v1.0');
  console.log('================================\n');
  
  // Parse and validate arguments
  const args = parseArgs();
  validateArgs(args);
  
  console.log('📂 Reading input files...');
  
  // Read meta-prompt
  const metaPromptPath = path.join(__dirname, '..', '_prompt_engineering', '04e-merge-integration-spec-meta-prompt_v1.md');
  console.log(`  - Meta-prompt: ${path.basename(metaPromptPath)}`);
  const metaPrompt = readFile(metaPromptPath);
  
  // Read input documents
  console.log(`  - Spec: ${path.basename(args.spec)}`);
  const spec = readFile(args.spec);
  
  console.log(`  - Inventory: ${path.basename(args.inventory)}`);
  const inventory = readFile(args.inventory);
  
  console.log(`  - Strategy: ${path.basename(args.strategy)}`);
  const strategy = readFile(args.strategy);
  
  console.log(`  - Guide: ${path.basename(args.guide)}`);
  const guide = readFile(args.guide);
  
  console.log('\n✅ All files read successfully\n');
  
  // Get file stats
  const stats = {
    spec: spec.length,
    inventory: inventory.length,
    strategy: strategy.length,
    guide: guide.length,
    metaPrompt: metaPrompt.length
  };
  
  console.log('📊 Input Statistics:');
  console.log(`  - Structured Spec: ${(stats.spec / 1024).toFixed(1)} KB`);
  console.log(`  - Infrastructure Inventory: ${(stats.inventory / 1024).toFixed(1)} KB`);
  console.log(`  - Extension Strategy: ${(stats.strategy / 1024).toFixed(1)} KB`);
  console.log(`  - Implementation Guide: ${(stats.guide / 1024).toFixed(1)} KB`);
  console.log(`  - Meta-Prompt: ${(stats.metaPrompt / 1024).toFixed(1)} KB`);
  
  const totalSize = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`  - Total Input Size: ${(totalSize / 1024).toFixed(1)} KB\n`);
  
  // Create merge prompt
  console.log('🔨 Creating merge prompt...');
  const mergePrompt = createMergePrompt(metaPrompt, spec, inventory, strategy, guide, args);
  
  // Write output
  console.log(`📝 Writing output to: ${args.output}\n`);
  const outputPath = writeFile(args.output, mergePrompt);
  
  // Success message
  console.log('✅ Merge prompt created successfully!\n');
  console.log('📋 Next Steps:');
  console.log('  1. Review the generated prompt file');
  console.log('  2. Feed the prompt to an AI (Claude, GPT-4, etc.)');
  console.log('  3. The AI will output the integrated extension specification');
  console.log('  4. Save the AI output as the integrated spec file\n');
  
  console.log('💡 Suggested AI Models:');
  console.log('  - Claude Sonnet 4.5 (recommended for large context)');
  console.log('  - GPT-4 Turbo (good alternative)');
  console.log('  - Claude Opus (highest quality, slower)\n');
  
  console.log('📄 Output file:', outputPath);
  console.log(`📊 Output size: ${(mergePrompt.length / 1024).toFixed(1)} KB\n`);
  
  console.log('✨ Done!\n');
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { parseArgs, validateArgs, readFile, writeFile, createMergePrompt };

