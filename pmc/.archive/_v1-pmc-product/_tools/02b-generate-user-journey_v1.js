#!/usr/bin/env node

/*
 * 02b-generate-user-journey_v1.js
 *
 * Purpose:
 *  - Interactive script to generate user journey prompts
 *  - Loads template from 02b-user-journey-prompt_v8.md
 *  - Replaces placeholders with project-specific paths
 *  - Outputs customized prompt to _run-prompts/
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 02b-generate-user-journey_v1.js "Project Name" project-abbrev
 *  
 * Examples:
 *     node 02b-generate-user-journey_v1.js "LoRA Pipeline" pipeline
 *     node 02b-generate-user-journey_v1.js "Bright Module Orchestrator" bmo
 *
 * Notes:
 *  - File paths are cached per project for reuse
 *  - Use 'quit' at any prompt to exit safely
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration for user journey prompt generation
const USER_JOURNEY_CONFIG = {
  type: "user-journey",
  prompt_template_path: "_prompt_engineering/02b-user-journey-prompt_v8.md",
  required_placeholders: {
    "PROJECT_NAME": "{project_name}",
    "PROJECT_ABBREVIATION": "{{project_abbreviation}}",
    "SEED_STORY_PATH": "pmc/product/_mapping/{{project_abbreviation}}/00-{{project_abbreviation}}-seed-story.md",
    "OVERVIEW_PATH": "pmc/product/_mapping/{{project_abbreviation}}/01-{{project_abbreviation}}-overview.md",
    "USER_STORIES_PATH": "pmc/product/_mapping/{{project_abbreviation}}/02-{{project_abbreviation}}-user-stories.md",
    "TEMPLATE_PATH": "pmc/product/_templates/03-functional-requirements-template.md",
    "EXAMPLE_PATH": "pmc/product/_examples/03-bmo-functional-requirements.md",
    "OUTPUT_PATH": "pmc/product/_mapping/{{project_abbreviation}}/02b-{{project_abbreviation}}-user-journey.md"
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

// Get cache filename based on project abbreviation
function getCacheFilename(projectAbbrev) {
  return path.join(__dirname, 'cache', `02b-${projectAbbrev}-paths-cache.json`);
}

// Normalize path to handle Windows paths and simple filenames
function normalizePath(inputPath, defaultDir) {
  try {
    // If it's just a filename, prepend the default directory
    if (!inputPath.includes('/') && !inputPath.includes('\\')) {
      return path.resolve(__dirname, '..', defaultDir, inputPath);
    }
    
    // Convert Windows backslashes to forward slashes
    let normalizedPath = inputPath.replace(/\\/g, '/');
    
    // If it's a full project path, extract the relevant part
    const projectRoot = 'pmc/product/';
    if (normalizedPath.includes(projectRoot)) {
      normalizedPath = normalizedPath.substring(normalizedPath.indexOf(projectRoot) + projectRoot.length);
      return path.resolve(__dirname, '..', normalizedPath);
    }
    
    // Otherwise treat as relative path
    return path.resolve(__dirname, normalizedPath);
  } catch (error) {
    console.error('Path normalization error:', error);
    return null;
  }
}

// Convert path to LLM-friendly format
function toLLMPath(absolutePath) {
  try {
    if (!absolutePath) return '';
    
    const normalized = absolutePath.replace(/\\/g, '/');
    const projectRoot = 'pmc/';
    
    if (normalized.includes(projectRoot)) {
      return normalized.substring(normalized.indexOf(projectRoot));
    }
    
    // If path doesn't contain project root, it's likely relative to _tools
    const toolsDir = '/product/_tools/';
    if (normalized.includes(toolsDir)) {
      return 'pmc/product/' + normalized.split(toolsDir)[1];
    }
    
    // For paths that start with ../
    if (normalized.startsWith('../')) {
      return 'pmc/product/' + normalized.replace('../', '');
    }
    
    // For relative paths that don't start with ../, add the full prefix
    if (!normalized.startsWith('/') && !normalized.includes(':')) {
      return 'pmc/product/' + normalized;
    }
    
    return normalized;
  } catch (error) {
    console.error('Path conversion error:', error);
    return absolutePath;
  }
}

// Load cached paths with error handling
function loadPathCache(projectAbbrev) {
  try {
    const cachePath = getCacheFilename(projectAbbrev);
    ensureDirectoryExists(path.dirname(cachePath));
    
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
  } catch (error) {
    console.warn('Could not load path cache:', error.message);
  }
  return null;
}

// Save paths to cache with error handling
function savePathCache(projectAbbrev, paths) {
  try {
    const cachePath = getCacheFilename(projectAbbrev);
    ensureDirectoryExists(path.dirname(cachePath));
    fs.writeFileSync(cachePath, JSON.stringify(paths, null, 2));
  } catch (error) {
    console.error('Error saving path cache:', error);
  }
}

// Input handling functions
function isQuit(input) {
  return /^(q|quit)$/i.test(input);
}

// Get valid file path with user interaction
async function getValidFilePath(description, defaultPath, projectAbbrev) {
  try {
    // Process the default path
    const processedDefaultPath = defaultPath.replace(/\{\{project_abbreviation\}\}/g, projectAbbrev);
    
    // For paths that look like pmc/product/..., resolve from parent of _tools
    let fullDefaultPath;
    if (processedDefaultPath.startsWith('pmc/product/')) {
      const relativePath = processedDefaultPath.replace('pmc/product/', '');
      fullDefaultPath = path.resolve(__dirname, '..', relativePath);
    } else {
      fullDefaultPath = path.resolve(__dirname, '..', processedDefaultPath);
    }
    
    // Keep trying until we get a valid path or user quits
    while (true) {
      console.log(`\nEnter path for ${description}`);
      console.log(`Default: ${fullDefaultPath}`);
      console.log(`Exists: ${fs.existsSync(fullDefaultPath) ? 'TRUE' : 'FALSE'}`);
      
      const input = await question('> ');
      if (isQuit(input)) {
        console.log('Exiting...');
        process.exit(0);
      }
      
      const finalPath = input.trim() || processedDefaultPath;
      let fullFinalPath;
      if (finalPath.startsWith('pmc/product/')) {
        const relativePath = finalPath.replace('pmc/product/', '');
        fullFinalPath = path.resolve(__dirname, '..', relativePath);
      } else {
        fullFinalPath = path.resolve(__dirname, '..', finalPath);
      }
      
      if (fs.existsSync(fullFinalPath)) {
        return finalPath;
      }
      
      console.log(`Path not found: ${fullFinalPath}`);
      console.log('Please verify the file exists and try again.');
    }
  } catch (error) {
    console.error('Error getting valid file path:', error);
    return null;
  }
}

// Ensure output directory exists and save prompt to file
function savePromptToFile(prompt, filename, projectAbbrev) {
  const outputDir = path.resolve(__dirname, `../_mapping/${projectAbbrev}/_run-prompts`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, prompt, 'utf-8');
  
  console.log(`✅ Prompt saved to: ${toLLMPath(filePath)}`);
  return filePath;
}

// Function to display header
function displayHeader(productName, productAbbrev) {
  const header = '='.repeat(50);
  console.log(header);
  console.log(`User Journey Prompt Generator`);
  console.log(`Product: ${productName}`);
  console.log(`Abbreviation: ${productAbbrev}`);
  console.log(header);
}

// Get all required file paths
async function getReferencePaths(projectAbbrev, projectName) {
  console.log('\nValidating reference documents...');
  
  const paths = {};
  const config = USER_JOURNEY_CONFIG;
  
  try {
    // Handle each placeholder
    for (const [key, defaultPath] of Object.entries(config.required_placeholders)) {
      // Process template variables
      let processedValue = defaultPath
        .replace(/\{\{project_abbreviation\}\}/g, projectAbbrev)
        .replace(/\{project_name\}/g, projectName);
      
      // For non-path placeholders, just store the value
      if (!key.endsWith('_PATH')) {
        paths[key] = processedValue;
        continue;
      }
      
      // For OUTPUT_PATH, don't validate - it's the destination
      if (key === 'OUTPUT_PATH') {
        paths[key] = processedValue;
        continue;
      }
      
      // For paths, validate and potentially update
      const validatedPath = await getValidFilePath(key, processedValue, projectAbbrev);
      paths[key] = validatedPath || processedValue;
    }
    
    return paths;
  } catch (error) {
    console.error('Error getting reference paths:', error);
    return {};
  }
}

// Load and process prompt template
async function generatePrompt(paths, projectName, projectAbbrev) {
  try {
    // Load the prompt template
    const templatePath = path.resolve(__dirname, '..', USER_JOURNEY_CONFIG.prompt_template_path);
    console.log('\nLoading prompt template from:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    let prompt = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(paths)) {
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      prompt = prompt.replace(pattern, value);
    }
    
    // Also replace project name and abbreviation directly
    prompt = prompt.replace(/\{PROJECT_NAME\}/g, projectName);
    prompt = prompt.replace(/\{PROJECT_ABBREVIATION\}/g, projectAbbrev);
    
    return prompt;
  } catch (error) {
    console.error('Error generating prompt:', error);
    return null;
  }
}

// Main execution function
async function main() {
  try {
    const projectName = process.argv[2];
    const projectAbbrev = process.argv[3];
    
    if (!projectName || !projectAbbrev) {
      console.log('Usage: node 02b-generate-user-journey_v1.js "Project Name" project-abbrev');
      console.log('');
      console.log('Examples:');
      console.log('  node 02b-generate-user-journey_v1.js "LoRA Pipeline" pipeline');
      console.log('  node 02b-generate-user-journey_v1.js "Bright Module Orchestrator" bmo');
      process.exit(1);
    }
    
    displayHeader(projectName, projectAbbrev);
    
    // Get all required paths
    const paths = await getReferencePaths(projectAbbrev, projectName);
    
    // Generate the customized prompt
    const prompt = await generatePrompt(paths, projectName, projectAbbrev);
    
    if (prompt) {
      // Generate filename for the prompt
      const filename = `02b-product-${projectAbbrev}-user-journey-prompt-v1.md`;
      
      console.log('\n============================');
      console.log('Generated User Journey Prompt');
      console.log('============================');
      savePromptToFile(prompt, filename, projectAbbrev);
      console.log('============================\n');
      
      console.log('Next steps:');
      console.log(`1. Open the generated prompt: pmc/product/_mapping/${projectAbbrev}/_run-prompts/${filename}`);
      console.log('2. Copy the prompt content');
      console.log('3. Paste into your AI assistant to generate the user journey document');
      console.log(`4. Save the AI output as: pmc/product/_mapping/${projectAbbrev}/02b-${projectAbbrev}-user-journey.md`);
    } else {
      console.error('Failed to generate prompt');
      process.exit(1);
    }
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
