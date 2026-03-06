#!/usr/bin/env node

/*
 * 02a-generate-user-story-spec.js
 *
 * Purpose:
 *  - Generates user stories prompt for product specifications
 *  - Works with Cursor's AI interface for interactive generation
 *  - Requires 01-{abbrev}-overview.md to exist before running
 *  - Uses configuration from ./config/prompts-config.json
 *
 * Usage:
 *  From pmc/product/_tools/, run:
 *     node 02a-generate-user-story-spec.js "Project Name" project-abbrev
 *  
 * Examples:
 *     node 02a-generate-user-story-spec.js "Next.js 14 Modernization" ts-14
 *     node 02a-generate-user-story-spec.js "Project Memory Core Tracking" pmct
 *
 * Notes:
 *  - This script ONLY generates user stories prompt (step 02)
 *  - Run 01-generate-overview.js first to create the overview document
 *  - Progress is saved automatically and can be resumed
 *  - Use 'quit' at any prompt to exit safely
 *  - File paths are cached per project for reuse
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Get progress filename based on project
function getProgressFilename(projectName, projectAbbrev) {
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return path.join('progress', `${sanitizedName}-${projectAbbrev}-progress.json`);
}

// Get cache filename based on project abbreviation and document type
function getCacheFilename(projectAbbrev, docType = '') {
  const docSuffix = docType ? `-${docType}` : '';
  return path.join('cache', `02a-${projectAbbrev}${docSuffix}-paths-cache.json`);
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

// Resolve a path relative to the script's directory
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

// Load progress from file
function loadProgress(projectName, projectAbbrev) {
  try {
    ensureDirectoryExists(path.join(__dirname, 'progress'));
    const progressFile = getProgressFilename(projectName, projectAbbrev);
    const fullProgressPath = path.resolve(__dirname, progressFile);
    
    if (fs.existsSync(fullProgressPath)) {
      const progressData = fs.readFileSync(fullProgressPath, 'utf-8');
      return JSON.parse(progressData);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
  
  return {
    documents: {}
  };
}

// Save progress to file
function saveProgress(projectName, projectAbbrev, progress) {
  try {
    ensureDirectoryExists(path.join(__dirname, 'progress'));
    const progressFile = getProgressFilename(projectName, projectAbbrev);
    const fullProgressPath = path.resolve(__dirname, progressFile);
    fs.writeFileSync(fullProgressPath, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

// Load path cache
function loadPathCache(projectAbbrev, docType) {
  try {
    ensureDirectoryExists(path.join(__dirname, 'cache'));
    const cacheFile = getCacheFilename(projectAbbrev, docType);
    const fullCachePath = path.resolve(__dirname, cacheFile);
    
    if (fs.existsSync(fullCachePath)) {
      const cacheData = fs.readFileSync(fullCachePath, 'utf-8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
  
  return null;
}

// Save path cache
function savePathCache(projectAbbrev, cache, docType) {
  try {
    ensureDirectoryExists(path.join(__dirname, 'cache'));
    const cacheFile = getCacheFilename(projectAbbrev, docType);
    const fullCachePath = path.resolve(__dirname, cacheFile);
    fs.writeFileSync(fullCachePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Load prompts configuration
function loadPromptsConfig(projectAbbrev) {
  try {
    const configPath = path.resolve(__dirname, 'config', 'prompts-config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading prompts config:', error);
    console.log(`Expected config file at: ${path.resolve(__dirname, 'config', 'prompts-config.json')}`);
    process.exit(1);
  }
}

// Convert path to LLM-friendly format with error handling
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

// Ensure output directory exists and save prompt to file
function savePromptToFile(prompt, filename, projectAbbrev) {
  const outputDir = path.resolve(__dirname, `../_mapping/${projectAbbrev}/_run-prompts`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, prompt, 'utf-8');
  
  console.log(`✅ Prompt saved to: ${toProjectPath(filePath)}`);
  return filePath;
}

// Update toProjectPath to use toLLMPath for display
function toProjectPath(absolutePath) {
  return toLLMPath(absolutePath);
}

// Document type definitions with descriptions
const docTypes = [
  'overview',
  'user-stories',
  'functional-requirements',
  'architecture',
  'logging-and-reporting',
  'deployment-and-setup',
  'roadmap',
  'structure'
];

// Document name mapping with descriptions
const documentNames = {
  'overview': 'Product Overview',
  'user-stories': 'User Stories',
  'functional-requirements': 'Functional Requirements',
  'architecture': 'Architecture',
  'logging-and-reporting': 'Logging and Reporting',
  'deployment-and-setup': 'Deployment and Setup',
  'roadmap': 'Project Roadmap',
  'structure': 'Project Structure'
};

// Function to display header
function displayHeader(productName, productAbbrev, currentDoc) {
  const header = '='.repeat(45);
  console.log(header);
  console.log(`Product: ${productName}`);
  console.log(`Abbreviation: ${productAbbrev}`);
  console.log(`Current Document: ${currentDoc}`);
  console.log(header);
}

// Input handling functions
function isYes(input) {
  return input.trim() === '' || /^(y|yes)$/i.test(input);
}

function isNo(input) {
  return /^(n|no)$/i.test(input);
}

function isQuit(input) {
  return /^(q|quit)$/i.test(input);
}

// Get valid file path with improved error handling
async function getValidFilePath(description, defaultPath, projectAbbrev, docType = '') {
  try {
    // Process the default path
    const processedDefaultPath = defaultPath.replace(/\{\{project_abbreviation\}\}/g, projectAbbrev);
    const fullDefaultPath = path.resolve(__dirname, '..', processedDefaultPath).replace(/\\pmc\\(?!product)/, '\\pmc\\product\\');
    
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
      const fullFinalPath = path.resolve(__dirname, '..', finalPath).replace(/\\pmc\\(?!product)/, '\\pmc\\product\\');
      
      if (fs.existsSync(fullFinalPath)) {
        return finalPath;
      }
      
      console.log(`Path not found: ${fullFinalPath}`);
      console.log('Please verify the file exists and try again.');
      
      // Show available files in the directory to help user
      try {
        const dir = path.resolve(__dirname, '..', defaultDir).replace(/\\pmc\\(?!product)/, '\\pmc\\product\\');
        if (fs.existsSync(dir)) {
          console.log('\nAvailable files in directory:');
          const files = fs.readdirSync(dir);
          files.forEach(file => console.log(`- ${file}`));
        }
      } catch (err) {
        console.error('Error listing directory:', err);
      }
    }
  } catch (error) {
    console.error('Error getting valid file path:', error);
    return null;
  }
}

// Get all required file paths for a document type
async function getReferencePaths(docConfig, projectAbbrev, projectName) {
  console.log('Validating reference documents...');
  
  const paths = {};
  const newPaths = {};
  
  try {
    // Handle regular placeholders
    for (const [key, defaultPath] of Object.entries(docConfig.template_config.required_placeholders)) {
      if (key === 'OUTPUT_PATH' || key === 'OVERVIEW_PATH' || key === 'SEED_STORY_PATH' || !key.endsWith('_PATH')) {
        let processedValue = defaultPath.replace(/\{\{project_abbreviation\}\}/g, projectAbbrev);
        processedValue = processedValue.replace(/\{project_name\}/g, projectName);
        
        // For OUTPUT_PATH, OVERVIEW_PATH, and SEED_STORY_PATH, add the full project prefix
        if (key === 'OUTPUT_PATH' || key === 'OVERVIEW_PATH' || key === 'SEED_STORY_PATH') {
          processedValue = `pmc/product/${processedValue}`;
        }
        
        paths[key] = processedValue;
        continue;
      }
      
      // Replace any template variables in the default path
      const processedPath = defaultPath.replace(/\{\{project_abbreviation\}\}/g, projectAbbrev);
      const path = await getValidFilePath(key, processedPath, projectAbbrev, docConfig.type);
      const llmPath = toLLMPath(path || processedPath);
      paths[key] = llmPath;
    }

    // Display all collected paths for confirmation
    console.log('\n=== Input Specification Files ===');
    for (const [key, value] of Object.entries(paths)) {
      if (key.endsWith('_PATH')) {
        const fullPath = path.resolve(__dirname, '..', value.replace('pmc/product/', ''));
        const exists = fs.existsSync(fullPath);
        console.log(`${key}:`);
        console.log(`  Path: ${value}`);
        console.log(`  Exists: ${exists ? 'TRUE' : 'FALSE'}`);
      }
    }
    console.log('=================================\n');

    // Ask user if they want to review the codebase
    const enable = await question('\nInclude codebase review in prompt? (y/n) [default: n] > ');
    if (isQuit(enable)) {
      console.log('Exiting...');
      process.exit(0);
    }
    
    const includeCodebase = enable.toLowerCase() === 'y';
    
    const conditionals = {
      current_status: {
        enabled: includeCodebase
      }
    };
    
    if (includeCodebase) {
      // If codebase review is enabled, get the codebase path
      if (docConfig.template_config.conditional_sections?.current_status?.placeholders?.CODEBASE_REVIEW_PATH !== undefined) {
        console.log('\nProcessing codebase path:');
        const defaultDir = '../../'; // Go up to workspace root
        const defaultPath = path.resolve(__dirname, defaultDir);
        const codebasePath = await getValidFilePath('CODEBASE_REVIEW_PATH', defaultPath, projectAbbrev);
        
        if (codebasePath) {
          paths['CODEBASE_REVIEW_PATH'] = toLLMPath(codebasePath);
          conditionals.current_status.placeholders = {
            CODEBASE_REVIEW_PATH: toLLMPath(codebasePath)
          };
        }
      }
    }

    return {
      placeholders: paths,
      conditionals: conditionals
    };
  } catch (error) {
    console.error('Error getting reference paths:', error);
    return {
      placeholders: {},
      conditionals: { current_status: { enabled: false } }
    };
  }
}

// Load and process prompt template
async function generatePrompt(docConfig, paths) {
  try {
    let promptTemplate;
    if (docConfig.prompt_template_path) {
      let templatePath;
      
      if (docConfig.prompt_template_path.includes('pmc/product/')) {
        // Handle absolute path from project root
        const relativePath = docConfig.prompt_template_path.split('pmc/product/')[1];
        templatePath = path.resolve(__dirname, '..', relativePath);
      } else if (docConfig.prompt_template_path.startsWith('pmc/')) {
        // Handle full project path - resolve from project root
        const projectParts = docConfig.prompt_template_path.split('/').slice(1); // Remove 'pmc'
        templatePath = path.resolve(__dirname, '..', '..', ...projectParts);
      } else {
        // Handle relative path from tools directory
        templatePath = path.resolve(__dirname, '..', docConfig.prompt_template_path);
      }
      
      console.log('Loading prompt template from:', templatePath);
      promptTemplate = fs.readFileSync(templatePath, 'utf-8');
    } else if (docConfig.prompt_template) {
      promptTemplate = docConfig.prompt_template;
    } else {
      throw new Error('No prompt template found in configuration');
    }

    // Replace placeholders in template
    let prompt = promptTemplate;
    for (const [key, value] of Object.entries(paths.placeholders)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // Handle conditional sections
    if (paths.conditionals) {
      for (const [section, config] of Object.entries(paths.conditionals)) {
        const pattern = new RegExp(`\\[\\[ if ${section}\\.enabled \\]\\]([\\s\\S]*?)\\[\\[ endif \\]\\]`, 'g');
        prompt = prompt.replace(pattern, (match, content) => {
          return config.enabled ? content : '';
        });
      }
    }

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
      console.log('Usage: node 02a-generate-user-story-spec.js "Project Name" project-abbrev');
      process.exit(1);
    }
    
    const config = loadPromptsConfig(projectAbbrev);
    
    // Generate User Stories Prompt (Step 02)
    console.log('\nGenerating User Stories Prompt (Step 02):');
    console.log('==========================================');
    
    const userStoriesDoc = config.documents[1];
    displayHeader(projectName, projectAbbrev, userStoriesDoc);
    
    const userStoriesPaths = await getReferencePaths(userStoriesDoc, projectAbbrev, projectName);
    const userStoriesPrompt = await generatePrompt(userStoriesDoc, userStoriesPaths);
    
    if (userStoriesPrompt) {
      // Generate filename for the user stories prompt
      const userStoriesFilename = `02-product-${projectAbbrev}-${userStoriesDoc.type}-prompt-v1.md`;
      
      console.log(`\nGenerated ${documentNames[userStoriesDoc.type]} Prompt:`);
      console.log('============================');
      savePromptToFile(userStoriesPrompt, userStoriesFilename, projectAbbrev);
      console.log('============================\n');
      
      console.log('✅ User stories prompt generation complete!');
      console.log('\nNext steps:');
      console.log('1. Copy the prompt from the file shown above');
      console.log('2. Paste into your AI assistant (Claude/ChatGPT)');
      console.log('3. Review and refine the generated user stories');
      console.log(`4. Save output to: pmc/product/02-${projectAbbrev}-user-stories.md`);
    } else {
      console.error('Failed to generate user stories prompt');
      rl.close();
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
