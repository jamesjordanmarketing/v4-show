#!/usr/bin/env node

/*
 * 03-generate-functional-requirements.js
 *
 * Purpose:
 *  - Interactive version that works with Cursor's AI interface
 *  - Two-step process for functional requirements:
 *    1. Preprocess (3a): Clean, deduplicate, and reorder requirements
 *    2. Enhance (3b): Expand and improve requirements, then add legacy code references (optional)
 *  - Uses 3a-preprocess-functional-requirements-prompt_v1.md for preprocessing
 *  - Uses two prompts for enhancement:
 *     a. 3b-#1-requirements-enhancement-prompt_v1.md (PRIMARY - enhance requirements for ALL projects)
 *     b. 3b-#2-functional-requirements-legacy-code-prompt_v1.md (OPTIONAL - add legacy code references)
 *  - Generates output prompt files in product/_run-prompts directory
 *  - Maintains high-quality documentation through example-based generation
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 03-generate-functional-requirements.js "Project Name" project-abbrev
 *  
 * Examples:
 *     node 03-generate-functional-requirements.js "Next.js 14 Modernization" aplio-mod-1
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load consolidated journey data
const consolidatedJourney = require('../_mapping/consolidated-journey-criteria.json');

// Function to enhance FRs with journey data
function enhanceWithJourneyData(frContent) {
  let enhanced = frContent;
  
  consolidatedJourney.forEach(ujElement => {
    // Find matching FR section
    const stageNum = ujElement.id.split('.')[0].replace('UJ', '');
    const frPattern = new RegExp(`FR${stageNum}\\.(\\d+)\\.(\\d+)`, 'g');
    
    enhanced = enhanced.replace(frPattern, (match) => {
      // Append journey criteria to matching FR
      const journeyAddition = `
      * Journey Integration: ${ujElement.name}
      * Progressive Levels: 
        - Basic: Default functionality
        - Advanced: Extended options
        - Expert: Full configuration
      `;
      return match + journeyAddition;
    });
  });
  
  return enhanced;
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Normalize path with improved handling
function normalizePath(inputPath, defaultDir) {
  try {
    // Always start from pmc/product
    const baseDir = path.resolve(__dirname, '..');
    
    // If path starts with ../, treat it as relative to _tools directory
    if (inputPath.startsWith('../')) {
      return path.resolve(__dirname, inputPath);
    }
    
    // If path doesn't contain slashes, assume it's in the default directory
    if (!inputPath.includes('/') && !inputPath.includes('\\')) {
      return path.resolve(baseDir, defaultDir, inputPath);
    }
    
    let normalizedPath = inputPath.replace(/\\/g, '/');
    return path.resolve(baseDir, normalizedPath);
  } catch (error) {
    console.error('Path normalization error:', error);
    return null;
  }
}

// Resolve script path
function resolveScriptPath(relativePath) {
  try {
    return path.resolve(__dirname, relativePath);
  } catch (error) {
    console.error('Path resolution error:', error);
    return null;
  }
}

// Validate file exists
function validateFilePath(filePath, defaultDir) {
  try {
    const normalizedPath = normalizePath(filePath, defaultDir);
    return normalizedPath && fs.existsSync(normalizedPath);
  } catch (error) {
    console.error('File validation error:', error);
    return false;
  }
}

// Convert path to LLM-friendly format
function toLLMPath(absolutePath) {
  try {
    if (!absolutePath) return '';
    
    const normalized = absolutePath.replace(/\\/g, '/');
    
    // If it's already a full path, return it
    if (normalized.startsWith('C:') || normalized.startsWith('/')) {
      return normalized;
    }
    
    // If it's a relative path starting with pmc, return as is
    if (normalized.includes('pmc/')) {
      return normalized;
    }
    
    // Otherwise, construct the full path
    return path.resolve(__dirname, '..', normalized).replace(/\\/g, '/');
  } catch (error) {
    console.error('Path conversion error:', error);
    return absolutePath;
  }
}

// Display header with step information
function displayHeader(productName, productAbbrev, step) {
  console.log('\n=== Functional Requirements Generation ===');
  console.log(`Project: ${productName} (${productAbbrev})`);
  console.log(`Step: ${step}`);
  console.log('=======================================\n');
}

// Input validation helpers
const isYes = input => /^(y|yes)$/i.test(input);
const isNo = input => /^(n|no)$/i.test(input);
const isQuit = input => /^(q|quit)$/i.test(input);

// Get valid file path with status display
async function getValidFilePath(description, defaultPath, projectAbbrev) {
  const fullDefaultPath = path.resolve(__dirname, '..', defaultPath).replace(/\\/g, '/');
  
  console.log(`\nEnter path for ${description}`);
  console.log(`Default: ${fullDefaultPath}`);
  
  while (true) {
    const input = await question('> ');
    if (isQuit(input)) process.exit(0);
    
    const pathToCheck = input.trim() || defaultPath;
    const fullPathToCheck = path.resolve(__dirname, '..', pathToCheck);
    
    if (fs.existsSync(fullPathToCheck)) {
      return pathToCheck;
    }
    
    console.log(`Path not found: ${fullPathToCheck}`);
    console.log('Please enter a valid path.');
  }
}

// Get all required paths for a specific step
async function getReferencePaths(projectAbbrev, step) {
  const paths = {
    template: await getValidFilePath(
      'FR Preprocessing Instructions',
      step === 'preprocess' 
        ? '_prompt_engineering/3a-preprocess-functional-requirements-prompt_v1.md'
        : '_prompt_engineering/3b-#1-requirements-enhancement-prompt_v1.md',
      projectAbbrev
    )
  };

  if (step === 'preprocess') {
    paths.functionalRequirements = await getValidFilePath(
      'Initial Functional Requirements',
      `_mapping/${projectAbbrev}/03-${projectAbbrev}-functional-requirements.md`,
      projectAbbrev
    );
  } else {
    paths.functionalRequirements = await getValidFilePath(
      'Functional Requirements',
      `_mapping/${projectAbbrev}/03-${projectAbbrev}-functional-requirements.md`,
      projectAbbrev
    );
  }

  paths.overview = await getValidFilePath(
    'Project Overview',
    `_mapping/${projectAbbrev}/01-${projectAbbrev}-overview.md`,
    projectAbbrev
  );
  paths.userStories = await getValidFilePath(
    'User Stories',
    `_mapping/${projectAbbrev}/02-${projectAbbrev}-user-stories.md`,
    projectAbbrev
  );
  paths.userJourney = await getValidFilePath(
    'User Journey',
    `_mapping/${projectAbbrev}/02b-${projectAbbrev}-user-journey.md`,
    projectAbbrev
  );

  // Only ask about codebase review during enhancement step
  let enableCodebase = false;
  if (step !== 'preprocess') {
    paths.example = await getValidFilePath(
      'Reference Example',
      `_examples/03-${projectAbbrev}-functional-requirements.md`,
      projectAbbrev
    );

    console.log('\nWould you like to include codebase review in the prompt?');
    const includeCodebase = await question('Include codebase review? (y/n) [default: n]: ');
    enableCodebase = isYes(includeCodebase);

    if (enableCodebase) {
      paths.codebase = await getValidFilePath(
        'Codebase Review',
        '../../../src',
        projectAbbrev
      );
    }
  }
  
  return {
    paths,
    enableCodebase
  };
}

// Modify the writePromptToFile function to ensure directory is created properly
function writePromptToFile(prompt, templatePath, projectAbbrev) {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.resolve(__dirname, '..', '_mapping', projectAbbrev, '_run-prompts');
    ensureDirectoryExists(outputDir);
    
    // Get the filename from the template path
    const templateFileName = path.basename(templatePath);
    const outputFileName = templateFileName.replace('.md', '-output.md');
    const outputPath = path.join(outputDir, outputFileName);
    
    // Write the prompt to the file
    fs.writeFileSync(outputPath, prompt);
    console.log(`Prompt saved to: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error writing prompt to file:', error);
    return null;
  }
}

// Modify the generatePrompt function to ensure all variables are properly replaced
async function generatePrompt(pathsData, step, projectAbbrev, templatePath) {
  try {
    const { paths, enableCodebase } = pathsData;
    
    // Use provided template path or default path based on step
    const promptTemplatePath = templatePath || normalizePath(paths.template, '');
    if (!promptTemplatePath || !fs.existsSync(promptTemplatePath)) {
      throw new Error(`Template file not found at path: ${promptTemplatePath}`);
    }
    
    const template = fs.readFileSync(promptTemplatePath, 'utf-8');
    
    // Create a common set of replacements that apply to all prompts
    const replacements = {
      '{FUNCTIONAL_REQUIREMENTS_PATH}': toLLMPath(paths.functionalRequirements),
      '{OVERVIEW_PATH}': toLLMPath(paths.overview),
      '{USER_STORIES_PATH}': toLLMPath(paths.userStories),
      '{USER_JOURNEY_PATH}': toLLMPath(paths.userJourney),
      '{CHANGE_LOG_PATH}': toLLMPath(`pmc/product/_mapping/${projectAbbrev}/_tools/cache/${projectAbbrev}-fr-changes.log`)
    };

    if (step !== 'preprocess') {
      // Enhancement step replacements
      replacements['{FUNCTIONAL_REQUIREMENTS_TEMPLATE_PATH}'] = toLLMPath(paths.template);
      replacements['{REFERENCE_EXAMPLE_PATH}'] = toLLMPath(paths.example);
      
      // Only add core deliverable for enhancement
      let coreDeliverable = "modern Next.js 14 design system";
      try {
        const overviewPath = normalizePath(paths.overview, '');
        if (overviewPath && fs.existsSync(overviewPath)) {
          const overview = fs.readFileSync(overviewPath, 'utf-8');
          if (overview.includes('Product Summary') || overview.includes('Core Value')) {
            coreDeliverable = "modern Next.js 14 design system with premium aesthetics";
          }
        } else {
          console.warn(`Overview file not found at: ${paths.overview}`);
        }
      } catch (error) {
        console.warn('Could not read overview file for core deliverable description:', error.message);
      }
      replacements['[core project deliverable]'] = coreDeliverable;
    }
    
    if (enableCodebase) {
      replacements['{CODEBASE_REVIEW_PATH}'] = toLLMPath(paths.codebase);
    }
    
    let prompt = template;
    
    // Handle conditional sections
    const conditionalPattern = /\[\[ if current_status\.enabled \]\]([\s\S]*?)\[\[ endif \]\]/g;
    prompt = prompt.replace(conditionalPattern, (match, content) => {
      return enableCodebase ? content : '';
    });
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    // Enhance with journey data if available
    try {
      prompt = enhanceWithJourneyData(prompt);
      console.log('Journey data integration applied');
    } catch (error) {
      console.warn('Could not apply journey data enhancement:', error.message);
    }
    
    // Write prompt to file instead of console output
    const outputPath = writePromptToFile(prompt, promptTemplatePath, projectAbbrev);
    console.log(`Prompt generated for: ${path.basename(promptTemplatePath)}`);
    
    return prompt;
  } catch (error) {
    console.error('Error generating prompt:', error);
    return null;
  }
}

// Modify the processStep function to handle missing template files gracefully
async function processStep(projectName, projectAbbrev, step) {
  displayHeader(projectName, projectAbbrev, step);
  const pathsData = await getReferencePaths(projectAbbrev, step);
  
  if (step === 'preprocess') {
    // For preprocess step, use the 3a prompt
    const preprocessTemplatePath = '_prompt_engineering/3a-preprocess-functional-requirements-prompt_v1.md';
    const preprocessTemplate = normalizePath(preprocessTemplatePath, '');
    
    if (!preprocessTemplate || !fs.existsSync(preprocessTemplate)) {
      console.error(`Error: Preprocess template file not found: ${preprocessTemplatePath}`);
      process.exit(1);
    }
    
    await generatePrompt(pathsData, step, projectAbbrev, preprocessTemplate);
    
    // Ask if ready to continue to enhancement step
    const continueToNext = await question('\nReady to continue to enhancement step? (y/n): ');
    if (!isYes(continueToNext)) {
      console.log('Please complete preprocessing before continuing.');
      process.exit(0);
    }
  } else {
    // For enhance step, generate the two focused prompts
    
    // Generate the primary enhancement prompt (3b-#1)
    // This is THE critical prompt for all projects - adds detailed acceptance criteria,
    // user journey integration, expert analysis, and identifies requirements gaps
    const enhancementTemplatePath = '_prompt_engineering/3b-#1-requirements-enhancement-prompt_v1.md';
    const enhancementTemplate = normalizePath(enhancementTemplatePath, '');
    
    if (!enhancementTemplate || !fs.existsSync(enhancementTemplate)) {
      console.error(`Error: Enhancement template file not found: ${enhancementTemplatePath}`);
      process.exit(1);
    }
    
    await generatePrompt(pathsData, step, projectAbbrev, enhancementTemplate);
    
    // Then the optional legacy code reference prompt (3b-#2)
    // ONLY use this if you have legacy code to reference - skip for greenfield projects
    const legacyCodeTemplatePath = '_prompt_engineering/3b-#2-functional-requirements-legacy-code-prompt_v1.md';
    const legacyCodeTemplate = normalizePath(legacyCodeTemplatePath, '');
    
    if (!legacyCodeTemplate || !fs.existsSync(legacyCodeTemplate)) {
      console.error(`Error: Legacy code template file not found: ${legacyCodeTemplatePath}`);
      process.exit(1);
    }
    
    await generatePrompt(pathsData, step, projectAbbrev, legacyCodeTemplate);
  }
}

// Update the main function with correct usage message
async function main() {
  try {
    const projectName = process.argv[2];
    const projectAbbrev = process.argv[3];
    
    if (!projectName || !projectAbbrev) {
      console.log('Usage: node 03-generate-functional-requirements.js "Project Name" project-abbrev');
      process.exit(1);
    }

    // Create output directory at startup
    const outputDir = path.resolve(__dirname, '..', '_mapping', projectAbbrev, '_run-prompts');
    ensureDirectoryExists(outputDir);
    console.log(`Prompt outputs will be saved to: ${outputDir}`);

    // Step 1: Preprocessing
    await processStep(projectName, projectAbbrev, 'preprocess');
    
    // Step 2: Enhancement
    await processStep(projectName, projectAbbrev, 'enhance');
    
    console.log('\nAll prompts generated successfully!');
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();