#!/usr/bin/env node

/*
 * 04d-generate-wireframe-integration-plan_v1.js
 *
 * Purpose:
 *  - Generate integration analysis prompt for existing codebase
 *  - Loads meta-prompt from 04d-integrate-existing-codebase_v1.md
 *  - Replaces placeholders with project-specific paths
 *  - Outputs customized prompt to _run-prompts/
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 04d-generate-wireframe-integration-plan_v1.js "Project Name" project-abbreviation
 *  
 * Examples:
 *     node 04d-generate-wireframe-integration-plan_v1.js "LoRA Pipeline" pipeline
 *     node 04d-generate-wireframe-integration-plan_v1.js "Bright Module Orchestrator" bmo
 *
 * Notes:
 *  - Interactive mode will prompt for missing paths
 *  - Default structured spec: _mapping/[abbrev]/04c-[abbrev]-structured-from-wireframe_v1.md
 *  - Default codebase: ../../../src
 *  - Prompts saved to: _mapping/[abbrev]/_run-prompts/
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration for integration analysis prompt generation
const INTEGRATION_CONFIG = {
  type: "codebase-integration",
  meta_prompt_path: "_prompt_engineering/04d-integrate-existing-codebase_v1.md",
  required_placeholders: {
    "STRUCTURED_SPEC_PATH": null,  // User-provided
    "CODEBASE_PATH": null,          // User-provided
    "OUTPUT_PATH": null             // Generated from project
  },
  defaults: {
    codebase_path: "src",
    output_subdir: "_run-prompts"
  }
};

// Utility function to ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Input handling functions
function isQuit(input) {
  return /^(q|quit|exit)$/i.test(input);
}

// Parse command line arguments (positional)
function parseArguments() {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { help: true };
  }

  // Expect: "Project Name" project-abbreviation
  if (args.length < 2) {
    console.error('\n❌ Error: Missing required arguments\n');
    displayHelp();
    process.exit(1);
  }

  return {
    projectName: args[0],
    projectAbbreviation: args[1],
    help: false
  };
}

// Display help message
function displayHelp() {
  console.log(`
Usage: node 04d-generate-wireframe-integration-plan_v1.js "Project Name" project-abbreviation

Generate integration analysis prompt for existing codebase integration.

Arguments:
  "Project Name"        Full project name (in quotes if contains spaces)
  project-abbreviation  Short project identifier (e.g., pipeline, bmo)

Examples:
  node 04d-generate-wireframe-integration-plan_v1.js "LoRA Pipeline" pipeline
  node 04d-generate-wireframe-integration-plan_v1.js "Bright Module Orchestrator" bmo

Interactive Mode:
  The script will interactively prompt for:
  - Structured specification path (default: _mapping/[abbrev]/04c-[abbrev]-structured-from-wireframe_v1.md)
  - Codebase directory path (default: ../../../src)

Output:
  The script generates a customized prompt file at:
  → _mapping/[abbrev]/_run-prompts/04d-[abbrev]-integration-analysis_v1-build.md
  
  When executed by an AI agent, this prompt will produce three integration documents:
  1. 04d-codebase-discovery_v1.md - What exists in current codebase
  2. 04d-integration-strategy_v1.md - How to integrate new module
  3. 04d-implementation-deltas_v1.md - Specific modifications required

Workflow:
  1. Run this generator script to create the prompt
  2. Copy the generated prompt from _run-prompts/
  3. Provide the prompt to an AI agent in a new session
  4. AI agent will analyze codebase and generate 3 integration documents
  5. Use the integration documents alongside structured spec during development
`);
}

// Helper function to normalize paths
function normalizePath(inputPath, fromToolsDir = true) {
  try {
    // Handle Windows backslashes
    let normalized = inputPath.replace(/\\/g, '/');

    // If it starts with pmc/, resolve from project root
    if (normalized.startsWith('pmc/')) {
      // Go up from _tools to project root
      return path.resolve(__dirname, '../../../', normalized);
    }

    // If it starts with _mapping/, it's relative to product directory (parent of _tools)
    if (normalized.startsWith('_mapping/')) {
      return path.resolve(__dirname, '../', normalized);
    }

    // If it starts with ../, it's relative to _tools
    if (normalized.startsWith('../')) {
      return path.resolve(__dirname, normalized);
    }

    // If fromToolsDir is true, resolve from _tools directory
    if (fromToolsDir) {
      return path.resolve(__dirname, normalized);
    }

    // Otherwise resolve from current directory
    return path.resolve(normalized);
  } catch (error) {
    console.error('Path normalization error:', error);
    return null;
  }
}

// Convert absolute path to LLM-friendly format
function toLLMPath(absolutePath) {
  try {
    if (!absolutePath) return '';

    const normalized = absolutePath.replace(/\\/g, '/');

    // Try to extract from pmc/ onwards
    const pmcIndex = normalized.indexOf('pmc/');
    if (pmcIndex !== -1) {
      return normalized.substring(pmcIndex);
    }

    // Try to extract from src/ onwards (for codebase path)
    const srcIndex = normalized.indexOf('src/');
    if (srcIndex !== -1) {
      return normalized.substring(srcIndex);
    }

    // For paths with multi-chat, extract from there
    const projectIndex = normalized.indexOf('v4-show//');
    if (projectIndex !== -1) {
      const afterProject = normalized.substring(projectIndex + 'v4-show//'.length);
      return afterProject;
    }

    return normalized;
  } catch (error) {
    console.error('Path conversion error:', error);
    return absolutePath;
  }
}

// Validate file exists
function validateFilePath(filePath, description) {
  const fullPath = normalizePath(filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Error: ${description} not found`);
    console.error(`   Path: ${fullPath}`);
    console.error(`   LLM Path: ${toLLMPath(fullPath)}`);
    return null;
  }

  if (!fs.statSync(fullPath).isFile()) {
    console.error(`\n❌ Error: ${description} is not a file`);
    console.error(`   Path: ${fullPath}`);
    return null;
  }

  return fullPath;
}

// Validate directory exists
function validateDirectoryPath(dirPath, description) {
  const fullPath = normalizePath(dirPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ Error: ${description} not found`);
    console.error(`   Path: ${fullPath}`);
    console.error(`   LLM Path: ${toLLMPath(fullPath)}`);
    return null;
  }

  if (!fs.statSync(fullPath).isDirectory()) {
    console.error(`\n❌ Error: ${description} is not a directory`);
    console.error(`   Path: ${fullPath}`);
    return null;
  }

  return fullPath;
}

// Get valid file path with user interaction
async function getValidFilePath(description, defaultPath, isDirectory = false) {
  const validator = isDirectory ? validateDirectoryPath : validateFilePath;

  // First try the default path
  const defaultFullPath = normalizePath(defaultPath);
  const defaultExists = fs.existsSync(defaultFullPath);

  while (true) {
    console.log(`\n${description}`);
    console.log(`Default: ${defaultPath}`);
    console.log(`Full path: ${defaultFullPath}`);
    console.log(`Exists: ${defaultExists ? '✓ TRUE' : '✗ FALSE'}`);

    const input = await question('Press Enter to use default, or enter new path (type "quit" to exit): ');

    if (isQuit(input)) {
      console.log('Exiting...');
      process.exit(0);
    }

    const chosenPath = input.trim() || defaultPath;
    const validatedPath = validator(chosenPath, description);

    if (validatedPath) {
      return chosenPath; // Return original format, not full path
    }

    console.log('\n⚠️  Path validation failed. Please try again.');
  }
}

// Display header
function displayHeader() {
  const header = '='.repeat(70);
  console.log(header);
  console.log('  Codebase Integration Analysis Prompt Generator');
  console.log('  Generate integration documentation for existing codebase');
  console.log(header);
}

// Get all required paths
async function getRequiredPaths(projectAbbreviation) {
  console.log('\n📋 Gathering required paths...\n');

  const paths = {};

  // 1. Structured Specification Path
  console.log('Step 1: Structured Specification File');
  const defaultSpecPath = `_mapping/${projectAbbreviation}/04c-${projectAbbreviation}-structured-from-wireframe_v1.md`;
  paths.STRUCTURED_SPEC_PATH = await getValidFilePath(
    '📄 Structured Specification File',
    defaultSpecPath,
    false
  );

  // 2. Codebase Directory Path
  console.log('\nStep 2: Existing Codebase Directory');
  paths.CODEBASE_PATH = await getValidFilePath(
    '📁 Existing Codebase Directory (where new module will integrate)',
    '../../../src',
    true
  );

  // 3. Output Path (destination for 3 integration documents)
  paths.OUTPUT_PATH = `pmc/product/_mapping/${projectAbbreviation}/${INTEGRATION_CONFIG.defaults.output_subdir}`;

  console.log(`\n✓ Output will be saved to: ${paths.OUTPUT_PATH}`);

  return paths;
}

// Generate the customized prompt
async function generatePrompt(paths) {
  try {
    const templatePath = path.resolve(__dirname, '../_prompt_engineering/04d-integrate-existing-codebase_v1.md');

    console.log(`\n📖 Loading meta-prompt template...`);
    console.log(`   Template: ${toLLMPath(templatePath)}`);

    if (!fs.existsSync(templatePath)) {
      console.error(`\n❌ Template file not found: ${templatePath}`);
      return null;
    }

    let prompt = fs.readFileSync(templatePath, 'utf-8');
    console.log(`   ✓ Template loaded (${prompt.length} characters)`);

    // Replace placeholders with actual paths
    console.log('\n🔄 Replacing placeholders...');

    const placeholders = {
      '{{STRUCTURED_SPEC_PATH}}': paths.STRUCTURED_SPEC_PATH,
      '{{CODEBASE_PATH}}': paths.CODEBASE_PATH,
      '{{OUTPUT_PATH}}': paths.OUTPUT_PATH
    };

    for (const [placeholder, value] of Object.entries(placeholders)) {
      const pattern = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      const replacementCount = (prompt.match(pattern) || []).length;

      if (replacementCount > 0) {
        prompt = prompt.replace(pattern, value);
        console.log(`   ✓ ${placeholder}: ${replacementCount} occurrence(s) replaced`);
      }
    }

    // Verify no unreplaced placeholders remain
    const remainingPlaceholders = prompt.match(/\{\{[A-Z_]+\}\}/g);
    if (remainingPlaceholders && remainingPlaceholders.length > 0) {
      console.warn('\n⚠️  Warning: Some placeholders were not replaced:');
      remainingPlaceholders.forEach(p => console.warn(`   - ${p}`));
    }

    return prompt;
  } catch (error) {
    console.error('\n❌ Error generating prompt:', error.message);
    return null;
  }
}

// Save prompt to file
function savePromptToFile(prompt, projectAbbrev) {
  try {
    const outputDir = path.resolve(__dirname, `../_mapping/${projectAbbrev}/_run-prompts`);

    // Create directory if it doesn't exist
    ensureDirectoryExists(outputDir);

    const filename = `04d-${projectAbbrev}-integration-analysis_v1-build.md`;
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, prompt, 'utf-8');

    console.log(`\n✅ Integration analysis prompt saved successfully!`);
    console.log(`   File: ${toLLMPath(filePath)}`);

    return filePath;
  } catch (error) {
    console.error('\n❌ Error saving prompt:', error.message);
    return null;
  }
}

// Display next steps
function displayNextSteps(savedPath, projectAbbrev, outputPath) {
  const header = '='.repeat(70);
  console.log(`\n${header}`);
  console.log('  ✅ SUCCESS - Integration Analysis Prompt Generated');
  console.log(header);

  console.log('\n📋 NEXT STEPS:\n');

  console.log('1️⃣  OPEN THE GENERATED PROMPT:');
  console.log(`   File: ${toLLMPath(savedPath)}`);

  console.log('\n2️⃣  COPY PROMPT TO NEW AI AGENT SESSION:');
  console.log('   - Open a NEW AI agent session (fresh context window)');
  console.log('   - Copy the ENTIRE prompt file content');
  console.log('   - Paste into the AI agent');

  console.log('\n3️⃣  AI AGENT WILL ANALYZE AND GENERATE:');
  console.log('   The AI will analyze your codebase and create 3 documents:');
  console.log(`   → ${outputPath}/04d-codebase-discovery_v1.md`);
  console.log(`   → ${outputPath}/04d-integration-strategy_v1.md`);
  console.log(`   → ${outputPath}/04d-implementation-deltas_v1.md`);

  console.log('\n4️⃣  USE INTEGRATION DOCUMENTS DURING DEVELOPMENT:');
  console.log('   Primary Reference:');
  console.log(`   → Structured Spec (what to build)`);
  console.log('   Integration References:');
  console.log(`   → Codebase Discovery (what exists)`);
  console.log(`   → Integration Strategy (how to integrate)`);
  console.log(`   → Implementation Deltas (modifications required)`);

  console.log('\n5️⃣  IMPLEMENTATION WORKFLOW:');
  console.log('   For each section in the structured spec:');
  console.log('     a) Read structured spec section');
  console.log('     b) Check corresponding delta section');
  console.log('     c) Apply deltas (skip/use/extend/create as indicated)');
  console.log('     d) Test both new features AND existing features');

  console.log(`\n${header}`);
  console.log('  📚 For detailed workflow, see: pmc/pmct/scratch/04d-integrate-codebase-analysis.md');
  console.log(header);
}

// Main execution function
async function main() {
  try {
    const args = parseArguments();

    // Display help if requested
    if (args.help) {
      displayHelp();
      process.exit(0);
    }

    displayHeader();

    console.log(`\n🎯 Project: ${args.projectName} (${args.projectAbbreviation})`);
    console.log(`📦 Integration Type: ${INTEGRATION_CONFIG.type}`);

    // Get all required paths (with interactive prompts)
    const paths = await getRequiredPaths(args.projectAbbreviation);

    // Generate the customized prompt
    console.log('\n🔨 Generating integration analysis prompt...');
    const prompt = await generatePrompt(paths);

    if (!prompt) {
      console.error('\n❌ Failed to generate prompt');
      process.exit(1);
    }

    // Save the prompt to file
    const savedPath = savePromptToFile(prompt, args.projectAbbreviation);

    if (!savedPath) {
      console.error('\n❌ Failed to save prompt');
      process.exit(1);
    }

    // Display next steps
    displayNextSteps(savedPath, args.projectAbbreviation, paths.OUTPUT_PATH);

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack trace:', error.stack);
    rl.close();
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Unhandled error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
}

module.exports = { generatePrompt, normalizePath, toLLMPath };

