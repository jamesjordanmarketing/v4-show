#!/usr/bin/env node

/*
 * 04c-wireframe-to-app-progression-prompts_v1.js
 *
 * Purpose:
 *  - Generate progressive build prompts from unstructured specifications
 *  - Uses the 04c-wireframe-to-prompts template
 *  - Produces a single prompt that Claude executes to generate all build prompts
 *  - Handles any specification document (wireframes, requirements, architecture docs)
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 04c-wireframe-to-app-progression-prompts_v1.js "Project Name" project-abbreviation
 *
 * Examples:
 *     node 04c-wireframe-to-app-progression-prompts_v1.js "LoRA Training Pipeline" lora
 *     node 04c-wireframe-to-app-progression-prompts_v1.js "Project Memory Core" pmc
 *
 * Output:
 *  - Generates a prompt file that contains the meta-prompt template
 *  - User copies/pastes the prompt into Claude Sonnet 4.5 (200k window)
 *  - Claude analyzes the spec and generates progressive build prompts
 *  - Final output location: pmc/product/_mapping/[abbrev]/_run-prompts/04c-wireframe-to-prompts_v1-output.md
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

// Convert absolute path to LLM-friendly format (relative to project root)
function toLLMPath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');

  // Try to find common project markers
  const markers = [
    'v4-show//',
    'pmc/',
    'src/',
    'Master/BrightHub/'
  ];

  for (const marker of markers) {
    const index = normalized.indexOf(marker);
    if (index !== -1) {
      return normalized.substring(index);
    }
  }

  // If no marker found, return the normalized path
  return normalized;
}

// Convert path for display (no conversion, just normalize slashes)
function toProjectPath(absolutePath) {
  return absolutePath.replace(/\\/g, '/');
}

// Process and resolve all types of paths
function processPath(inputPath, projectAbbrev, projectName, defaultDir) {
  // First, replace all placeholders
  let processedPath = inputPath
    .replace(/\{\{project_abbreviation\}\}/g, projectAbbrev || '')
    .replace(/\{\{project_name\}\}/g, projectName || '');

  // Convert Windows backslashes to forward slashes
  processedPath = processedPath.replace(/\\/g, '/');

  // Handle absolute paths (Windows or Unix style)
  if (processedPath.match(/^([A-Za-z]:)?\//) || processedPath.match(/^[A-Za-z]:\\/)) {
    return path.normalize(processedPath);
  }

  // Handle relative paths
  if (processedPath.startsWith('../')) {
    return path.resolve(__dirname, processedPath);
  } else if (processedPath.startsWith('./')) {
    return path.resolve(process.cwd(), processedPath);
  }

  // Fallback - treat as project-relative path
  return path.resolve(__dirname, '../..', processedPath);
}

// Validate path exists
function validatePath(filePath, description, silent = false) {
  const exists = fs.existsSync(filePath);
  if (!exists && !silent) {
    console.warn(`⚠️  Warning: ${description} does not exist: ${toProjectPath(filePath)}`);
  }
  return exists;
}

// Get valid file path with user interaction
async function getValidFilePath(description, defaultPath, required = false) {
  const displayPath = toProjectPath(defaultPath);
  const fileExists = validatePath(defaultPath, description, true);

  while (true) {
    console.log(`\n${description}:`);
    console.log(`  Default: ${displayPath}`);
    console.log(`  Exists:  ${fileExists ? '✅ TRUE' : '❌ FALSE'}`);

    const response = await question(required
      ? `> (required) `
      : `> (optional, press Enter to skip) `);

    // If user just hits enter
    if (!response.trim()) {
      if (required && !fileExists) {
        console.log('❌ This path is required and must exist. Please enter a valid path.');
        continue;
      }
      return fileExists ? defaultPath : null;
    }

    // Process and validate the user-provided path
    const processedPath = processPath(response.trim(), '', '', '');
    if (validatePath(processedPath, description, true)) {
      return processedPath;
    }

    console.log('❌ Entered path does not exist. Please try again.');
  }
}

// Load the meta-prompt template
function loadTemplate() {
  const templatePath = path.resolve(__dirname, '../_prompt_engineering/04c-wireframe-to-app-progressive-prompts_v1.md');
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error('❌ Error loading meta-prompt template:', error.message);
    console.error('   Expected location:', toProjectPath(templatePath));
    process.exit(1);
  }
}

// Ensure output directory exists and save prompt to file
function savePromptToFile(prompt, filename, projectAbbrev) {
  const outputDir = path.resolve(__dirname, `../_mapping/${projectAbbrev}/_run-prompts`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`\n📁 Created output directory: ${toProjectPath(outputDir)}`);
  }

  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, prompt, 'utf-8');

  console.log(`\n✅ Generation prompt saved to:`);
  console.log(`   ${toProjectPath(filePath)}`);
  console.log(`\n📋 Next Steps:`);
  console.log(`   1. Open the file above`);
  console.log(`   2. Copy the entire prompt`);
  console.log(`   3. Paste into Claude Sonnet 4.5 (200k context window)`);
  console.log(`   4. Claude will analyze the spec and generate progressive build prompts`);
  console.log(`   5. Save Claude's output to the location specified in the prompt`);

  return filePath;
}

// Generate the execution prompt
function generateExecutionPrompt(template, config) {
  const {
    projectName,
    projectAbbrev,
    specPath,
    wireframePath,
    codebasePath,
    relatedDocsPaths,
    outputPath
  } = config;

  // Build the paths section
  let pathsSection = `**REQUIRED INPUTS:**

1. **Specification Document**: \`${toLLMPath(specPath)}\`
   - This is the unstructured specification you will analyze
   - Read this document completely before proceeding`;

  if (wireframePath) {
    pathsSection += `

2. **Existing Wireframe/Prototype**: \`${toLLMPath(wireframePath)}\`
   - Review this to understand current implementation patterns
   - Use this to inform migration/conversion strategy`;
  }

  if (codebasePath) {
    pathsSection += `

${wireframePath ? '3' : '2'}. **Current Codebase**: \`${toLLMPath(codebasePath)}\`
   - Review existing code structure and patterns
   - Identify components to reuse or refactor
   - Maintain consistency with established patterns`;
  }

  if (relatedDocsPaths && relatedDocsPaths.length > 0) {
    const startNum = [wireframePath, codebasePath].filter(Boolean).length + 2;
    relatedDocsPaths.forEach((docPath, index) => {
      pathsSection += `

${startNum + index}. **Related Documentation ${index + 1}**: \`${toLLMPath(docPath)}\`
   - Additional context and requirements`;
    });
  }

  pathsSection += `

**OUTPUT LOCATION:**
\`${toLLMPath(outputPath)}\`

Save your complete progressive build specification to this exact location.`;

  // Build the main prompt
  const prompt = `# Generate Progressive Build Prompts: ${projectName}

You are a senior technical architect and prompt engineering specialist. Your task is to analyze the provided specification document and generate a complete set of progressive build prompts following the meta-prompt template below.

---

## Project Information

**Project Name:** ${projectName}
**Project Abbreviation:** ${projectAbbrev}
**Generation Date:** ${new Date().toISOString()}

---

## Input Documents

${pathsSection}

---

## Your Mission

Execute the meta-prompt template below to:

1. **Phase 1: Analyze** the specification document thoroughly
   - Document structure, complexity, dependencies
   - Feature inventory and risk assessment

2. **Phase 2: Plan** the optimal prompt sequence
   - Determine appropriate number of prompts (typically 3-12)
   - Choose architectural pattern (Layer-Based, Vertical Slice, or Migration-Based)
   - Define clear boundaries and integration points

3. **Phase 3: Generate** each individual build prompt
   - Use the detailed prompt template structure
   - Ensure progressive integration (each prompt builds on previous)
   - Include explicit references to previous prompts' deliverables

4. **Phase 4: Validate** the complete sequence
   - Check for completeness, redundancy, integration
   - Verify dependencies and ordering

---

## Meta-Prompt Template

${template}

---

## Execution Instructions

1. **Read all input documents** listed above completely
2. **Execute Phase 1**: Analyze the specification
   - Document your analysis findings
   - Create dependency map
   - Assess complexity and risks

3. **Execute Phase 2**: Plan the prompt sequence
   - Determine total number of prompts needed
   - Choose and justify architectural pattern
   - Define each prompt's scope and dependencies

4. **Execute Phase 3**: Generate all build prompts
   - Follow the detailed prompt template structure
   - Ensure each prompt references previous work explicitly
   - Include complete technical specifications

5. **Execute Phase 4**: Validate the sequence
   - Check completeness and integration
   - Verify no redundancy
   - Confirm logical ordering

6. **Output the complete specification** in the format shown in the template
   - Include build overview, dependency graph
   - Include all individual prompts
   - Include completion checklist and appendices

---

## Quality Requirements

Your output must:
- ✅ Cover ALL features in the specification
- ✅ Have NO redundant implementations
- ✅ Define clear integration between prompts
- ✅ Include specific, actionable tasks
- ✅ Provide complete acceptance criteria
- ✅ Enable standalone execution in fresh Claude windows
- ✅ Build progressively without rework

---

## Output Format

Save your complete output to: \`${toLLMPath(outputPath)}\`

Use the exact structure defined in the "Output Format" section of the meta-prompt template.

---

**Begin Analysis and Generation Now**

Start by reading the specification document and executing Phase 1 analysis.`;

  return prompt;
}

// Main execution
async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Progressive Build Prompt Generator v1.0                      ║');
    console.log('║  Converts specifications → executable build prompts           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get project details from command-line arguments
    const projectName = process.argv[2];
    const projectAbbrev = process.argv[3];

    if (!projectName || !projectAbbrev) {
      console.log('❌ Missing required arguments\n');
      console.log('Usage: node 04c-wireframe-to-app-progression-prompts_v1.js "Project Name" project-abbreviation\n');
      console.log('Examples:');
      console.log('  node 04c-wireframe-to-app-progression-prompts_v1.js "LoRA Training Pipeline" lora');
      console.log('  node 04c-wireframe-to-app-progression-prompts_v1.js "Project Memory Core" pmc\n');
      process.exit(1);
    }

    console.log(`📦 Project Name: ${projectName}`);
    console.log(`🏷️  Project Abbreviation: ${projectAbbrev}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Load the meta-prompt template
    console.log('📖 Loading meta-prompt template...');
    const template = loadTemplate();
    console.log('✅ Template loaded successfully\n');

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📝 Input Document Collection\n');
    console.log('Please provide paths to the following documents:');
    console.log('(Press Enter to use default, or enter custom path)\n');

    // Get required specification document
    const defaultSpecPath = path.resolve(__dirname,
      `../_mapping/${projectAbbrev}/iteration-8-LoRA-${projectAbbrev}-figma-conversion.md`);
    const specPath = await getValidFilePath(
      '📄 Specification Document (REQUIRED)',
      defaultSpecPath,
      true // required
    );

    // Get optional wireframe path
    const defaultWireframePath = path.resolve(__dirname,
      `../_mapping/${projectAbbrev}/P01-wireframe`);
    const wireframePath = await getValidFilePath(
      '🎨 Wireframe/Prototype Path (OPTIONAL)',
      defaultWireframePath,
      false // optional
    );

    // Get optional codebase path
    const defaultCodebasePath = path.resolve(__dirname,
      `../../../src`);
    const codebasePath = await getValidFilePath(
      '💻 Current Codebase Path (OPTIONAL)',
      defaultCodebasePath,
      false // optional
    );

    // Ask about related documentation
    console.log('\n📚 Additional Related Documentation:');
    const addDocs = await question('Add related documentation paths? (y/n) > ');
    const relatedDocsPaths = [];

    if (addDocs.toLowerCase() === 'y') {
      let addMore = true;
      let docCount = 1;

      while (addMore) {
        const docPath = await question(`\nRelated Doc ${docCount} path (or Enter to finish): `);
        if (!docPath.trim()) {
          addMore = false;
        } else {
          const processedPath = processPath(docPath.trim(), projectAbbrev, projectName, '');
          if (validatePath(processedPath, `Related Doc ${docCount}`, true)) {
            relatedDocsPaths.push(processedPath);
            console.log(`✅ Added: ${toProjectPath(processedPath)}`);
            docCount++;
          } else {
            console.log('❌ Path does not exist, skipping...');
          }
        }
      }
    }

    // Define output path
    const outputPath = path.resolve(__dirname,
      `../_mapping/${projectAbbrev}/_run-prompts/04c-wireframe-to-prompts_v1-output.md`);

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('📊 Configuration Summary:\n');
    console.log(`Project:          ${projectName} (${projectAbbrev})`);
    console.log(`Specification:    ${toProjectPath(specPath)}`);
    if (wireframePath) console.log(`Wireframe:        ${toProjectPath(wireframePath)}`);
    if (codebasePath) console.log(`Codebase:         ${toProjectPath(codebasePath)}`);
    if (relatedDocsPaths.length > 0) {
      relatedDocsPaths.forEach((p, i) => {
        console.log(`Related Doc ${i + 1}:    ${toProjectPath(p)}`);
      });
    }
    console.log(`Output Location:  ${toProjectPath(outputPath)}`);

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    const proceed = await question('Generate execution prompt? (y/n) > ');

    if (proceed.toLowerCase() !== 'y') {
      console.log('\n❌ Generation cancelled by user\n');
      process.exit(0);
    }

    console.log('\n⚙️  Generating execution prompt...\n');

    // Generate the prompt
    const config = {
      projectName,
      projectAbbrev,
      specPath,
      wireframePath,
      codebasePath,
      relatedDocsPaths,
      outputPath
    };

    const executionPrompt = generateExecutionPrompt(template, config);

    // Save the prompt
    const filename = `04c-wireframe-to-prompts-generation-prompt.md`;
    const savedPath = savePromptToFile(executionPrompt, filename, projectAbbrev);

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✨ Generation Complete!\n');
    console.log('The execution prompt is ready for Claude Sonnet 4.5 (200k context)');
    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
