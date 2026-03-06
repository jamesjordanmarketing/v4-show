#!/usr/bin/env node

/*
 * 04e-merge-integration-spec_v2.js
 *
 * Purpose:
 *  - Generate a custom integration prompt from the generic meta-prompt template
 *  - Uses the template: 04e-merge-integration-spec-meta-prompt_v1.md
 *  - Interactive script that validates paths and generates ready-to-use prompts
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 04e-merge-integration-spec_v2.js "Project Name" product-abbreviation
 *
 * Examples:
 *     node 04e-merge-integration-spec_v2.js "LoRA Pipeline" pipeline
 *     node 04e-merge-integration-spec_v2.js "Bright Module Orchestrator" bmo
 *
 * The script will guide you through:
 *  1. Locating the Structured Specification document
 *  2. Locating the Infrastructure Inventory document
 *  3. Locating the Extension Strategy document
 *  4. Locating the Implementation Guide document
 *  5. Choosing output location for integrated extension spec
 *  6. Generating the customized integration prompt
 *
 * Notes:
 *  - Expects four input files (04c structured spec + three 04d documents) to exist
 *  - Generates prompt in: pmc/product/_mapping/[abbrev]/_run-prompts/
 *  - Final output: 04e-[abbrev]-integrated-extension-spec_v1.md
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Convert path to display format (full absolute path)
function toDisplayPath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  return normalized;
}

// Convert path to LLM-friendly format (workspace relative)
function toLLMPath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');

  // Find the multi-chat root and make relative to it
  const projectRoot = 'v4-show//';
  if (normalized.includes(projectRoot)) {
    return normalized.substring(normalized.indexOf(projectRoot) + projectRoot.length);
  }

  return normalized;
}

// Validate that a file exists
function validatePath(filePath, shouldExist = true) {
  const exists = fs.existsSync(filePath);

  if (shouldExist && !exists) {
    return { valid: false, message: `File does not exist: ${toDisplayPath(filePath)}` };
  }

  if (!shouldExist && exists) {
    return {
      valid: true,
      warning: `Warning: File already exists and will be overwritten: ${toDisplayPath(filePath)}`
    };
  }

  return { valid: true };
}

// Resolve various path formats to absolute paths
function resolvePath(inputPath) {
  // Handle absolute Windows paths
  if (inputPath.match(/^[A-Za-z]:\\/)) {
    return path.normalize(inputPath);
  }

  // Handle relative paths
  if (inputPath.startsWith('../') || inputPath.startsWith('./')) {
    return path.resolve(__dirname, inputPath);
  }

  // Handle paths relative to project root
  if (inputPath.startsWith('pmc/')) {
    return path.resolve(__dirname, '../..', inputPath);
  }

  // Default: treat as relative to current directory
  return path.resolve(process.cwd(), inputPath);
}

// Get a valid file path from user
async function getValidPath(promptText, defaultPath, shouldExist = true) {
  while (true) {
    const resolvedDefault = resolvePath(defaultPath);
    const validation = validatePath(resolvedDefault, shouldExist);

    console.log(`\n${promptText}`);
    console.log(`Default: ${toDisplayPath(resolvedDefault)}`);

    if (validation.warning) {
      console.log(`⚠️  ${validation.warning}`);
    }

    const input = await question('> ');

    // Use default if empty input
    if (!input.trim()) {
      if (validation.valid) {
        return resolvedDefault;
      } else {
        console.log(`❌ ${validation.message}`);
        continue;
      }
    }

    // Validate user input
    const resolvedInput = resolvePath(input.trim());
    const inputValidation = validatePath(resolvedInput, shouldExist);

    if (inputValidation.valid) {
      if (inputValidation.warning) {
        console.log(`⚠️  ${inputValidation.warning}`);
        const confirm = await question('Continue? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
          continue;
        }
      }
      return resolvedInput;
    } else {
      console.log(`❌ ${inputValidation.message}`);
    }
  }
}

// Load the template
function loadTemplate() {
  const templatePath = path.resolve(__dirname, '../_prompt_engineering/04e-merge-integration-spec-meta-prompt_v1.md');

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    console.error('Please ensure 04e-merge-integration-spec-meta-prompt_v1.md exists in pmc/product/_prompt_engineering/');
    process.exit(1);
  }

  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error('❌ Error reading template:', error.message);
    process.exit(1);
  }
}

// Save prompt to file
function savePrompt(prompt, outputPath) {
  const outputDir = path.dirname(outputPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${toDisplayPath(outputDir)}`);
  }

  try {
    fs.writeFileSync(outputPath, prompt, 'utf-8');
    console.log(`\n✅ Prompt saved to: ${toDisplayPath(outputPath)}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error saving prompt: ${error.message}`);
    process.exit(1);
  }
}

// Extract project name from spec filename or path
function extractProjectNameFromPath(inventoryPath) {
  const basename = path.basename(inventoryPath, '.md');
  const match = basename.match(/04d-(.+?)-infrastructure-inventory/);
  if (match) {
    return match[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return 'New Module';
}

// Generate metadata section
function generateMetadata(projectName, specPath, inventoryPath, strategyPath, guidePath, outputPath) {
  const date = new Date().toISOString().split('T')[0];

  return `# Integration Merge Prompt - ${projectName}

**Generated:** ${date}
**Template:** 04e-merge-integration-spec-meta-prompt_v1.md
**Purpose:** Transform structured specification into integrated extension specification

---

## PROJECT-SPECIFIC PATHS

**Structured Specification:**
\`${toLLMPath(specPath)}\`

**Infrastructure Inventory:**
\`${toLLMPath(inventoryPath)}\`

**Extension Strategy:**
\`${toLLMPath(strategyPath)}\`

**Implementation Guide:**
\`${toLLMPath(guidePath)}\`

**Output Integrated Spec:**
\`${toLLMPath(outputPath)}\`

---

`;
}

// Add execution instructions
function addExecutionInstructions(outputPath) {
  return `

---

## EXECUTION INSTRUCTIONS

When you execute this prompt, you will generate ONE document:

**\`${path.basename(outputPath)}\`**
- Integrated extension specification
- All infrastructure substitutions applied
- Ready for segmentation into execution prompts
- Expected size: ~3,000-5,000 lines

---

## HOW TO PROCEED

1. **Read all three input documents** to understand the complete context
2. **Apply the transformation rules** from the meta-prompt above
3. **Generate the integrated spec** that merges all information
4. **Ensure EXTENSION framing** throughout - this is about REUSE
5. **Make it implementation-ready** with exact patterns from Implementation Guide

**Remember:** You're creating a single unified document that combines all the extension knowledge into an implementation-ready specification.

---

**Ready to begin? Start by reading the three input documents, then generate the integrated extension specification.**

`;
}

// Main execution
async function main() {
  try {
    // Check for required command-line arguments
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      console.error('Usage: node 04e-merge-integration-spec_v2.js "Project Name" product-abbreviation');
      console.error('Example:');
      console.error('  node 04e-merge-integration-spec_v2.js "LoRA Pipeline" pipeline');
      process.exit(1);
    }

    const [projectName, productAbbreviation] = args;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║      Integration Extension Specification Generator         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Project: ${projectName} (${productAbbreviation})\n`);

    // Step 1: Get Structured Specification path
    console.log('Step 1: Locate Structured Specification');
    console.log('────────────────────────────────────────');

    const defaultSpecPath = path.resolve(__dirname, '..', '_mapping', productAbbreviation, `04c-${productAbbreviation}-structured-from-wireframe_v1.md`);
    const specPath = await getValidPath(
      'Enter path to Structured Specification document:',
      defaultSpecPath,
      true // Must exist
    );

    console.log(`✓ Using structured spec: ${toDisplayPath(specPath)}`);

    // Step 2: Get Infrastructure Inventory path
    console.log('\n\nStep 2: Locate Infrastructure Inventory');
    console.log('────────────────────────────────────────');

    const defaultInventoryPath = path.resolve(__dirname, '..', '_mapping', productAbbreviation, '_run-prompts', `04d-${productAbbreviation}-infrastructure-inventory_v1.md`);
    const inventoryPath = await getValidPath(
      'Enter path to Infrastructure Inventory document:',
      defaultInventoryPath,
      true // Must exist
    );

    console.log(`✓ Using inventory: ${toDisplayPath(inventoryPath)}`);

    // Step 3: Get Extension Strategy path
    console.log('\n\nStep 3: Locate Extension Strategy');
    console.log('──────────────────────────────────');

    const defaultStrategyPath = path.resolve(__dirname, '..', '_mapping', productAbbreviation, '_run-prompts', `04d-${productAbbreviation}-extension-strategy_v1.md`);
    const strategyPath = await getValidPath(
      'Enter path to Extension Strategy document:',
      defaultStrategyPath,
      true // Must exist
    );

    console.log(`✓ Using strategy: ${toDisplayPath(strategyPath)}`);

    // Step 4: Get Implementation Guide path
    console.log('\n\nStep 4: Locate Implementation Guide');
    console.log('────────────────────────────────────');

    const defaultGuidePath = path.resolve(__dirname, '..', '_mapping', productAbbreviation, '_run-prompts', `04d-${productAbbreviation}-implementation-guide_v1.md`);
    const guidePath = await getValidPath(
      'Enter path to Implementation Guide document:',
      defaultGuidePath,
      true // Must exist
    );

    console.log(`✓ Using guide: ${toDisplayPath(guidePath)}`);

    // Step 5: Get output path
    console.log('\n\nStep 5: Choose Output Location for Integrated Extension Spec');
    console.log('──────────────────────────────────────────────────────────────');

    const defaultOutputPath = path.resolve(__dirname, '..', '_mapping', productAbbreviation, `04e-${productAbbreviation}-integrated-extension-spec_v1.md`);

    const outputPath = await getValidPath(
      'Enter path where the integrated spec will be saved:',
      defaultOutputPath,
      false // Doesn't need to exist yet
    );

    console.log(`✓ Integrated spec will be saved to: ${toDisplayPath(outputPath)}`);

    // Step 6: Generate prompt
    console.log('\n\nStep 6: Generate Integration Prompt');
    console.log('────────────────────────────────────');

    const promptOutputDir = path.resolve(__dirname, '..', '_mapping', productAbbreviation, '_run-prompts');
    const promptFilename = `04e-${productAbbreviation}-merge-integration-prompt_v1.md`;
    const promptOutputPath = path.join(promptOutputDir, promptFilename);

    console.log(`Prompt will be saved to: ${toDisplayPath(promptOutputPath)}`);

    // Step 7: Load template
    console.log('\nLoading template...');
    const template = loadTemplate();

    // Step 8: Replace placeholders in template
    console.log('Replacing placeholders...');
    let prompt = template
      .replace(/\{\{STRUCTURED_SPEC_PATH\}\}/g, `\`${toLLMPath(specPath)}\``)
      .replace(/\{\{INFRASTRUCTURE_INVENTORY_PATH\}\}/g, `\`${toLLMPath(inventoryPath)}\``)
      .replace(/\{\{EXTENSION_STRATEGY_PATH\}\}/g, `\`${toLLMPath(strategyPath)}\``)
      .replace(/\{\{IMPLEMENTATION_GUIDE_PATH\}\}/g, `\`${toLLMPath(guidePath)}\``)
      .replace(/\{\{OUTPUT_PATH\}\}/g, `\`${toLLMPath(outputPath)}\``);

    // Step 9: Add metadata header
    console.log('Adding metadata...');
    const metadata = generateMetadata(projectName, specPath, inventoryPath, strategyPath, guidePath, outputPath);
    prompt = metadata + prompt;

    // Step 10: Add execution instructions
    console.log('Adding execution instructions...');
    const executionInstructions = addExecutionInstructions(outputPath);
    prompt = prompt + executionInstructions;

    // Step 11: Save prompt
    console.log('Saving prompt...');
    savePrompt(prompt, promptOutputPath);

    // Step 12: Display summary and instructions
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ PROMPT GENERATED                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Summary:');
    console.log('─────────');
    console.log(`Project:            ${projectName} (${productAbbreviation})`);
    console.log(`Structured Spec:    ${toDisplayPath(specPath)}`);
    console.log(`Infrastructure Inv: ${toDisplayPath(inventoryPath)}`);
    console.log(`Extension Strategy: ${toDisplayPath(strategyPath)}`);
    console.log(`Implementation Gd:  ${toDisplayPath(guidePath)}`);
    console.log(`Output Destination: ${toDisplayPath(outputPath)}`);
    console.log(`Generated Prompt:   ${toDisplayPath(promptOutputPath)}`);

    console.log('\n\n📖 Next Steps:');
    console.log('─────────────');
    console.log('1. Open the generated prompt file:');
    console.log(`   ${toDisplayPath(promptOutputPath)}`);
    console.log('');
    console.log('2. Copy the ENTIRE contents of the prompt file');
    console.log('');
    console.log('3. Paste into Claude Sonnet 4.5 (200k context window)');
    console.log('');
    console.log('4. Claude will transform the structured spec using integration knowledge');
    console.log('   - Replaces Prisma with Supabase Client');
    console.log('   - Replaces NextAuth with Supabase Auth');
    console.log('   - Replaces S3 with Supabase Storage');
    console.log('   - Applies existing patterns from Infrastructure Inventory');
    console.log('');
    console.log('5. Save Claude\'s output to:');
    console.log(`   ${toDisplayPath(outputPath)}`);
    console.log('');
    console.log('6. Review the integrated spec to ensure:');
    console.log('   - All infrastructure substitutions applied');
    console.log('   - Extension framing maintained throughout');
    console.log('   - Implementation patterns match Infrastructure Inventory');
    console.log('   - Ready for segmentation');
    console.log('');
    console.log('7. After validation, run segmentation:');
    console.log(`   node 04f-segment-integrated-spec_v2.js "${projectName}" ${productAbbreviation}`);
    console.log('');

    console.log('💡 Tips:');
    console.log('────────');
    console.log('- All four input documents MUST exist before running this script');
    console.log('- The integrated spec will be comprehensive (~3,000-5,000 lines)');
    console.log('- Claude maintains the extension mindset throughout');
    console.log('- The result is ready for immediate segmentation');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
