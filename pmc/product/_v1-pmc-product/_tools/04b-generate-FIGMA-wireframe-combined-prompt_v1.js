/**
 * FIGMA Combined Wireframe Prompt Generator (v1)
 *
 * Purpose: Generates stage-customized prompts that will create combined FIGMA wireframes
 * 
 * Input:
 * - Combined prompt template: product/_prompt_engineering/04b-FR-wireframes-FIGMA-combined-prompts_v1.md
 * - Existing wireframe output files: product/_mapping/fr-maps/04-{abbrev}-FIGMA-wireframes-output-E[XX].md
 * - FR specification files: product/_mapping/fr-maps/04-{abbrev}-FR-wireframes-E[XX].md
 * 
 * Output:
 * - Stage-customized prompts: product/_mapping/{abbrev}/figma-combined/04b-FIGMA-combined-prompt-E[XX].md
 * - These prompts, when executed by AI agent, will generate:
 *   product/_mapping/{abbrev}/figma-combined/04b-FIGMA-combined-prompt-E[XX]-output.md
 * 
 * Flow:
 * 1. Script reads template and existing files
 * 2. Script generates customized prompt (replaces placeholders with actual paths)
 * 3. AI agent executes customized prompt
 * 4. AI agent writes final combined FIGMA prompt to output file with "-output" suffix
 */

const fs = require('fs');
const path = require('path');

function resolveProjectPath(relativePath) {
  const scriptDir = __dirname; // .../pmc/product/_tools
  const projectRoot = path.resolve(scriptDir, '../..');
  return path.join(projectRoot, relativePath);
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function parseFunctionalRequirementsFile(requirementsContent) {
  const lines = requirementsContent.split(/\r?\n/);
  const sections = {};
  let currentSection = null;
  let currentContent = [];
  let inHeader = true;
  let headerContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^##\s+\d+\.\s+.+$/.test(trimmed)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n');
        currentContent = [];
      } else {
        inHeader = false;
        headerContent = lines.slice(0, i);
      }
      const sectionNumber = trimmed.match(/^##\s+(\d+)\./)[1];
      currentSection = `E${sectionNumber.padStart(2, '0')}`;
      currentContent.push(line);
    } else if (currentSection) {
      currentContent.push(line);
    } else if (inHeader) {
      headerContent.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentContent.join('\n');
  sections['header'] = headerContent.join('\n');
  return sections;
}

function extractSectionHeader(sectionContent) {
  const lines = sectionContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+\d+\.\s+.+$/.test(trimmed)) return trimmed;
  }
  return 'Unknown Section';
}

function getSectionNumberAndTitle(sectionHeader) {
  const m = sectionHeader.match(/^##\s+(\d+)\.\s+(.+)$/);
  if (!m) return { number: '0', title: 'Unknown' };
  return { number: m[1], title: m[2] };
}

function fillCombinedPromptTemplate(template, params) {
  const {
    stageNumber,
    stageName,
    sectionId,
    productAbbr,
    projectName,
    currentDate,
    inputWireframesFilePath,
    frSpecFilePath,
    finalFigmaOutputFilePath,
    overviewFilePath,
    userStoriesFilePath,
    userJourneyFilePath,
    functionalRequirementsFilePath,
    analysisFilePath,
  } = params;

  let out = template;

  // Replace all placeholders
  out = out.replace(/\[STAGE_NUMBER\]/g, stageNumber);
  out = out.replace(/\[STAGE_NAME\]/g, stageName);
  out = out.replace(/\[SECTION_ID\]/g, sectionId);
  out = out.replace(/\[PRODUCT_ABBR\]/g, productAbbr);
  out = out.replace(/\[PROJECT_NAME\]/g, projectName);
  out = out.replace(/\[CURRENT_DATE\]/g, currentDate);
  out = out.replace(/\[INPUT_WIREFRAMES_FILE_PATH\]/g, inputWireframesFilePath);
  out = out.replace(/\[FR_SPEC_FILE_PATH\]/g, frSpecFilePath);
  out = out.replace(/\[FINAL_FIGMA_OUTPUT_FILE_PATH\]/g, finalFigmaOutputFilePath);
  out = out.replace(/\[OVERVIEW_FILE_PATH\]/g, overviewFilePath);
  out = out.replace(/\[USER_STORIES_FILE_PATH\]/g, userStoriesFilePath);
  out = out.replace(/\[USER_JOURNEY_FILE_PATH\]/g, userJourneyFilePath);
  out = out.replace(/\[FUNCTIONAL_REQUIREMENTS_FILE_PATH\]/g, functionalRequirementsFilePath);
  out = out.replace(/\[ANALYSIS_FILE_PATH\]/g, analysisFilePath);

  // Safety second pass to catch any remaining placeholders
  out = out.replace(/\[STAGE_NUMBER\]/g, stageNumber);
  out = out.replace(/\[STAGE_NAME\]/g, stageName);
  out = out.replace(/\[SECTION_ID\]/g, sectionId);
  out = out.replace(/\[PRODUCT_ABBR\]/g, productAbbr);
  out = out.replace(/\[PROJECT_NAME\]/g, projectName);
  out = out.replace(/\[CURRENT_DATE\]/g, currentDate);
  out = out.replace(/\[INPUT_WIREFRAMES_FILE_PATH\]/g, inputWireframesFilePath);
  out = out.replace(/\[FR_SPEC_FILE_PATH\]/g, frSpecFilePath);
  out = out.replace(/\[FINAL_FIGMA_OUTPUT_FILE_PATH\]/g, finalFigmaOutputFilePath);
  out = out.replace(/\[OVERVIEW_FILE_PATH\]/g, overviewFilePath);
  out = out.replace(/\[USER_STORIES_FILE_PATH\]/g, userStoriesFilePath);
  out = out.replace(/\[USER_JOURNEY_FILE_PATH\]/g, userJourneyFilePath);
  out = out.replace(/\[FUNCTIONAL_REQUIREMENTS_FILE_PATH\]/g, functionalRequirementsFilePath);
  out = out.replace(/\[ANALYSIS_FILE_PATH\]/g, analysisFilePath);

  // Remove the "Template Usage Instructions" section (not needed for executing agent)
  const usageInstructionsMarker = '## Template Usage Instructions for Script. Not to be included to execute the above prompt';
  const usageIndex = out.indexOf(usageInstructionsMarker);
  if (usageIndex !== -1) {
    // Find the previous "---" separator before this section
    const beforeUsage = out.substring(0, usageIndex);
    const lastSeparator = beforeUsage.lastIndexOf('---');
    if (lastSeparator !== -1) {
      out = out.substring(0, lastSeparator).trimEnd();
    } else {
      // Fallback: just remove from the marker onwards
      out = out.substring(0, usageIndex).trimEnd();
    }
  }

  return out;
}

function generateCombinedPromptForSection(
  sectionId,
  sectionContent,
  promptTemplate,
  outputDir,
  projectName,
  productAbbreviation
) {
  const sectionHeader = extractSectionHeader(sectionContent);
  const { number: stageNumber, title: stageTitle } = getSectionNumberAndTitle(sectionHeader);
  const stageName = `Stage ${stageNumber} — ${stageTitle}`;

  // Construct absolute file paths
  const projectRoot = resolveProjectPath('');
  
  // Input files (existing wireframe outputs and FR specs)
  const inputWireframesFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `04-${productAbbreviation}-FIGMA-wireframes-output-${sectionId}.md`
  );
  
  const frSpecFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `04-${productAbbreviation}-FR-wireframes-${sectionId}.md`
  );

  // Output file (where AI will write the final combined FIGMA prompt)
  const finalFigmaOutputFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `04b-FIGMA-combined-prompt-${sectionId}-output.md`
  );

  // Reference documents
  const overviewFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `01-${productAbbreviation}-overview.md`
  );
  
  const userStoriesFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `02-${productAbbreviation}-user-stories.md`
  );
  
  const userJourneyFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `02b-${productAbbreviation}-user-journey.md`
  );
  
  const functionalRequirementsFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `03-${productAbbreviation}-functional-requirements.md`
  );

  // Analysis worksheet file
  const analysisFilePath = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    `04b-FIGMA-combined-${sectionId}-WORKSHEET.md`
  );

  // Current date
  const currentDate = new Date().toISOString().split('T')[0];

  // Check if input wireframe file exists
  if (!fs.existsSync(inputWireframesFilePath)) {
    console.warn(`Warning: Input wireframe file not found: ${inputWireframesFilePath}`);
    console.warn(`Skipping ${sectionId}. Generate wireframes first using 04a script.`);
    return;
  }

  // Fill template with actual values
  const filled = fillCombinedPromptTemplate(promptTemplate, {
    stageNumber,
    stageName,
    sectionId,
    productAbbr: productAbbreviation,
    projectName,
    currentDate,
    inputWireframesFilePath,
    frSpecFilePath,
    finalFigmaOutputFilePath,
    overviewFilePath,
    userStoriesFilePath,
    userJourneyFilePath,
    functionalRequirementsFilePath,
    analysisFilePath,
  });

  // Write customized prompt to product-specific _run-prompts directory
  const combinedPromptsDir = path.join(
    projectRoot,
    'product',
    '_mapping',
    productAbbreviation,
    '_run-prompts'
  );
  
  ensureDirectoryExists(combinedPromptsDir);
  
  const customizedPromptFilePath = path.join(
    combinedPromptsDir,
    `04b-FIGMA-combined-prompt-${sectionId}.md`
  );

  // Add header with instructions
  const header = `# ${sectionId} — Combined Wireframe Generator Prompt (v1)

**Generated:** ${currentDate}  
**Stage:** ${stageName}  
**Product:** ${projectName}  
**Section ID:** ${sectionId}

---

## Instructions for AI Agent

This prompt will guide you to:
1. Read and analyze all individual FR prompts from: ${path.basename(inputWireframesFilePath)}
2. Combine them into ONE cohesive, integrated Figma wireframe prompt
3. Remove duplicates and overlaps
4. Simplify for proof-of-concept
5. Write the final combined FIGMA prompt to: ${path.basename(finalFigmaOutputFilePath)}

**CRITICAL OUTPUT FILE:** The final combined Figma prompt MUST be written to:
\`${finalFigmaOutputFilePath}\`

---

`;

  const fullPrompt = header + filled;

  fs.writeFileSync(customizedPromptFilePath, fullPrompt, { encoding: 'utf-8' });
  console.log(`✓ Generated customized combined prompt: ${customizedPromptFilePath}`);
  console.log(`  → When executed, will create: ${path.basename(finalFigmaOutputFilePath)}`);
}

function generateFigmaCombinedPromptsV1(projectName, projectAbbreviation) {
  const functionalRequirementsFileName = `03-${projectAbbreviation}-functional-requirements.md`;
  const functionalRequirementsFilePath = resolveProjectPath(`product/_mapping/${projectAbbreviation}/${functionalRequirementsFileName}`);
  const promptTemplatePath = resolveProjectPath(
    'product/_prompt_engineering/04b-FR-wireframes-FIGMA-combined-prompts_v1.md'
  );

  const outputDir = resolveProjectPath(`product/_mapping/${projectAbbreviation}`);
  const promptsOutputDir = path.join(outputDir, '_run-prompts');

  ensureDirectoryExists(outputDir);
  ensureDirectoryExists(promptsOutputDir);

  // Ensure context-ai/pmct directory exists for analysis files
  const contextAiDir = resolveProjectPath('context-ai/pmct');
  ensureDirectoryExists(contextAiDir);

  if (!fs.existsSync(functionalRequirementsFilePath)) {
    console.error(`Error: Functional requirements file not found at ${functionalRequirementsFilePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(promptTemplatePath)) {
    console.error(`Error: Combined prompt template not found at ${promptTemplatePath}`);
    process.exit(1);
  }

  const functionalRequirementsContent = fs.readFileSync(functionalRequirementsFilePath, 'utf-8');
  const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

  const sections = parseFunctionalRequirementsFile(functionalRequirementsContent);

  console.log('\n=== Generating Combined Wireframe Prompts ===\n');

  let generatedCount = 0;
  let skippedCount = 0;

  for (const [sectionId, sectionContent] of Object.entries(sections)) {
    if (sectionId === 'header') continue;

    const sectionHeader = extractSectionHeader(sectionContent);
    console.log(`\nProcessing section: ${sectionId} - ${sectionHeader}`);

    try {
      generateCombinedPromptForSection(
        sectionId,
        sectionContent,
        promptTemplate,
        promptsOutputDir,
        projectName,
        projectAbbreviation
      );
      generatedCount++;
    } catch (error) {
      console.error(`Error processing ${sectionId}:`, error.message);
      skippedCount++;
    }
  }

  // Generate index file in the product-specific directory
  const combinedPromptsIndexDir = path.join(
    resolveProjectPath('product'),
    '_mapping',
    projectAbbreviation
  );
  ensureDirectoryExists(combinedPromptsIndexDir);
  
  const indexFilePath = path.join(combinedPromptsIndexDir, '04b-FIGMA-combined-prompts-index.md');
  const indexContent = (function () {
    const sectionIds = Object.keys(sections).filter((id) => id !== 'header');
    const timestamp = new Date().toISOString();
    let idx = `# ${projectName} — Combined FIGMA Wireframe Prompts Index\n\n`;
    idx += `**Generated:** ${timestamp}\n\n`;
    idx += `This index contains links to stage-customized prompts that generate combined FIGMA wireframes.\n\n`;
    idx += `## How to Use\n\n`;
    idx += `1. Open a prompt file from the list below\n`;
    idx += `2. Give the entire prompt to an AI agent (Claude, GPT-4, etc.)\n`;
    idx += `3. The AI agent will read existing wireframe files, analyze them, and generate ONE combined FIGMA prompt\n`;
    idx += `4. The combined prompt will be written to the output file specified in each prompt\n\n`;
    idx += `## Sections\n\n`;
    for (const sectionId of sectionIds) {
      const sectionHeader = extractSectionHeader(sections[sectionId]);
      const { number: stageNumber, title: stageTitle } = getSectionNumberAndTitle(sectionHeader);
      idx += `### ${sectionId}: ${stageTitle}\n\n`;
      idx += `- **Customized Prompt File**: [04b-FIGMA-combined-prompt-${sectionId}.md](./_run-prompts/04b-FIGMA-combined-prompt-${sectionId}.md)\n`;
      idx += `- **Will Read From**: \`product/_mapping/${projectAbbreviation}/04-${projectAbbreviation}-FIGMA-wireframes-output-${sectionId}.md\`\n`;
      idx += `- **Will Write To**: \`04b-FIGMA-combined-prompt-${sectionId}-output.md\` (in this directory)\n`;
      idx += `- **Status**: ${fs.existsSync(path.join(outputDir, `04-${projectAbbreviation}-FIGMA-wireframes-output-${sectionId}.md`)) ? '✓ Input file exists' : '⚠ Input file missing - run 04a script first'}\n\n`;
    }
    return idx;
  })();
  fs.writeFileSync(indexFilePath, indexContent, { encoding: 'utf-8' });
  console.log(`\n✓ Generated index file: ${indexFilePath}`);

  console.log('\n=== Summary ===');
  console.log(`Generated: ${generatedCount} customized combined prompts`);
  console.log(`Skipped: ${skippedCount} sections (missing input files)`);
  console.log(`\nPrompts location: product/_mapping/${projectAbbreviation}/_run-prompts/`);
  console.log('\nNext steps:');
  console.log(`1. Open a customized prompt from: product/_mapping/${projectAbbreviation}/_run-prompts/`);
  console.log('2. Give it to an AI agent to execute');
  console.log('3. The AI will create the final combined FIGMA prompt with "-output" suffix in the _mapping/${projectAbbreviation}/ directory');
  console.log('\nSuccessfully generated all customized combined prompts.');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node product/_tools/04b-generate-FIGMA-wireframe-combined-prompt_v1.js "<Project Name>" <project-abbreviation>');
    console.error('Example:');
    console.error('  node product/_tools/04b-generate-FIGMA-wireframe-combined-prompt_v1.js "LoRA Pipeline" pipeline');
    process.exit(1);
  }
  const [projectName, projectAbbreviation] = args;
  generateFigmaCombinedPromptsV1(projectName, projectAbbreviation);
}

module.exports = {
  generateFigmaCombinedPromptsV1,
  fillCombinedPromptTemplate,
  generateCombinedPromptForSection,
};
