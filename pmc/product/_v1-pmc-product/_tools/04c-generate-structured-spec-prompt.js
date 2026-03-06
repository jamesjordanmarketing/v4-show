#!/usr/bin/env node

/*
 * 04c-generate-structured-spec-prompt.js
 *
 * Purpose:
 *  - Generate a progressive structured specification prompt from any unstructured input
 *  - Uses the template: 04c-build-structured-with-wireframe-spec_v1.md
 *  - Interactive script that validates paths and generates ready-to-use prompts
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 04c-generate-structured-spec-prompt.js "Project Name" project-abbreviation
 *
 * Examples:
 *     node 04c-generate-structured-spec-prompt.js "LoRA Pipeline" pipeline
 *     node 04c-generate-structured-spec-prompt.js "Bright Module Orchestrator" bmo
 *
 * The script will guide you through:
 *  1. Selecting the unstructured specification file
 *  2. Choosing output location for structured specification
 *  3. Generating the customized prompt
 *  4. Saving to file for use in Claude
 *
 * Notes:
 *  - Prompts are saved to: pmc/product/_mapping/[abbrev]/_run-prompts/
 *  - Final output location: pmc/product/_mapping/[abbrev]/04c-[abbrev]-structured-from-wireframe_v1.md
 *  - Default input: pmc/product/_mapping/[abbrev]/iteration-8-multi-chat-figma-conversion.md
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
  const templatePath = path.resolve(__dirname, '../_prompt_engineering/04c-build-structured-with-wireframe-spec_v1.md');

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    console.error('Please ensure 04c-build-structured-with-wireframe-spec_v1.md exists in pmc/product/_prompt_engineering/');
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

// Generate a timestamped filename
function generateOutputFilename(baseDir, prefix = 'structured-spec-prompt') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return path.join(baseDir, `${prefix}-${timestamp}.md`);
}

// Main execution
async function main() {
  try {
    // Check for required command-line arguments
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      console.error('Usage: node 04c-generate-structured-spec-prompt.js "Project Name" project-abbreviation');
      console.error('Example:');
      console.error('  node 04c-generate-structured-spec-prompt.js "LoRA Pipeline" pipeline');
      process.exit(1);
    }

    const [projectName, projectAbbreviation] = args;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   Progressive Structured Specification Prompt Generator    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Project: ${projectName} (${projectAbbreviation})\n`);

    // Step 1: Get unstructured specification path
    console.log('Step 1: Locate Unstructured Specification');
    console.log('─────────────────────────────────────────');

    const defaultUnstructuredPath = path.resolve(__dirname, '..', '_mapping', projectAbbreviation, 'iteration-8-multi-chat-figma-conversion.md');
    const unstructuredPath = await getValidPath(
      'Enter path to unstructured specification:',
      defaultUnstructuredPath,
      true // Must exist
    );

    console.log(`✓ Using unstructured spec: ${toDisplayPath(unstructuredPath)}`);

    // Step 2: Get output specification path
    console.log('\n\nStep 2: Choose Output Location for Structured Specification');
    console.log('──────────────────────────────────────────────────────────');

    const defaultOutputPath = path.resolve(__dirname, '..', '_mapping', projectAbbreviation, `04c-${projectAbbreviation}-structured-from-wireframe_v1.md`);

    const outputSpecPath = await getValidPath(
      'Enter path where Claude will save the structured specification:',
      defaultOutputPath,
      false // Doesn't need to exist yet
    );

    console.log(`✓ Structured spec will be saved to: ${toDisplayPath(outputSpecPath)}`);

    // Step 3: Generate prompt filename
    console.log('\n\nStep 3: Generate Prompt');
    console.log('───────────────────────');

    const promptOutputDir = path.resolve(__dirname, '..', '_mapping', projectAbbreviation, '_run-prompts');
    const promptFilename = `04c-${projectAbbreviation}-build-structured-with-wireframe_v1-build.md`;
    const promptOutputPath = path.join(promptOutputDir, promptFilename);

    console.log(`Prompt will be saved to: ${toDisplayPath(promptOutputPath)}`);

    // Step 4: Load template and replace placeholders
    console.log('\nLoading template...');
    const template = loadTemplate();

    console.log('Replacing placeholders...');
    let prompt = template
      .replace(/\{UNSTRUCTURED_SPEC_PATH\}/g, `\`${toLLMPath(unstructuredPath)}\``)
      .replace(/\{OUTPUT_SPEC_PATH\}/g, `\`${toLLMPath(outputSpecPath)}\``);

    // Step 5: Save prompt
    console.log('Saving prompt...');
    savePrompt(prompt, promptOutputPath);

    // Step 6: Display summary and instructions
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ PROMPT GENERATED                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Summary:');
    console.log('─────────');
    console.log(`Project:            ${projectName} (${projectAbbreviation})`);
    console.log(`Unstructured Input: ${toDisplayPath(unstructuredPath)}`);
    console.log(`Output Destination: ${toDisplayPath(outputSpecPath)}`);
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
    console.log('4. Claude will analyze the unstructured spec and create');
    console.log('   a progressive, cumulative structured specification');
    console.log('');
    console.log('5. Save Claude\'s output to:');
    console.log(`   ${toDisplayPath(outputSpecPath)}`);
    console.log('');
    console.log('6. Review the structured spec to ensure:');
    console.log('   - Each section builds on previous sections');
    console.log('   - No redundant functionality');
    console.log('   - Explicit cross-section references');
    console.log('   - Wireframe-level UI detail');
    console.log('');

    console.log('💡 Tips:');
    console.log('────────');
    console.log('- The unstructured spec can be ANY format (markdown, text, etc.)');
    console.log('- Claude will automatically determine the optimal number of sections');
    console.log('- Each section will explicitly reference components/APIs from previous sections');
    console.log('- The result will be comprehensive and implementation-ready');
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
