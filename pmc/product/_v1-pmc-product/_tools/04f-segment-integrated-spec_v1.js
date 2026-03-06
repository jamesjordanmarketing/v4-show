#!/usr/bin/env node

/**
 * Integrated Spec Section Splitter (v1)
 * 
 * Purpose: Split integrated extension specification into individual section files.
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v1.js "Product Name" product-abbrev
 * 
 * Examples:
 *   node 04f-segment-integrated-spec_v1.js "LoRA Pipeline" pipeline
 *   node 04f-segment-integrated-spec_v1.js "BMO Extension" bmo
 * 
 * Output:
 *   Creates: pmc/product/_mapping/[product-abbreviation]/full-build/
 *   Files:   04f-[product-abbreviation]-build-section-E01.md
 *            04f-[product-abbreviation]-build-section-E02.md
 *            ...
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================================
// READLINE INTERFACE
// ============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toDisplayPath(absolutePath) {
  return absolutePath.replace(/\\/g, '/');
}

function normalizePath(inputPath, defaultDir) {
  try {
    const baseDir = path.resolve(__dirname, '..');
    
    if (inputPath.startsWith('../')) {
      return path.resolve(__dirname, inputPath);
    }
    
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

function validateFilePath(filePath) {
  try {
    return filePath && fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`❌ Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// ============================================================================
// FILE INPUT WITH VALIDATION
// ============================================================================

async function getValidFilePath(description, defaultPath, productAbbrev) {
  const fullDefaultPath = normalizePath(defaultPath, '');
  const exists = validateFilePath(fullDefaultPath);
  
  console.log(`\n${description}`);
  console.log(`Default: ${toDisplayPath(fullDefaultPath)}`);
  console.log(`Exists: ${exists ? 'TRUE' : 'FALSE'}`);
  
  if (exists) {
    const useDefault = await question('Use this path? (y/n) [default: y]: ');
    if (!useDefault.trim() || useDefault.toLowerCase() === 'y' || useDefault.toLowerCase() === 'yes') {
      return fullDefaultPath;
    }
  }
  
  // File doesn't exist or user wants to provide custom path
  while (true) {
    console.log('\nPlease provide the correct path:');
    console.log('(You can paste the full path, or type "q" to quit)');
    const input = await question('> ');
    
    if (input.toLowerCase() === 'q' || input.toLowerCase() === 'quit') {
      console.log('Exiting...');
      rl.close();
      process.exit(0);
    }
    
    const customPath = normalizePath(input.trim(), '');
    const customExists = validateFilePath(customPath);
    
    console.log(`Path: ${toDisplayPath(customPath)}`);
    console.log(`Exists: ${customExists ? 'TRUE' : 'FALSE'}`);
    
    if (customExists) {
      return customPath;
    }
    
    console.log('❌ File not found. Please try again or type "q" to quit.');
  }
}

// ============================================================================
// SECTION EXTRACTION LOGIC
// ============================================================================

/**
 * Extract sections from integrated specification
 * Sections are identified by "## SECTION N:" headers
 */
function extractSections(content) {
  const sections = [];
  
  // Split content by section headers
  const sectionPattern = /^## SECTION (\d+):/gm;
  const matches = [...content.matchAll(sectionPattern)];
  
  if (matches.length === 0) {
    console.warn('⚠️  No sections found with pattern "## SECTION N:"');
    return sections;
  }
  
  // Extract each section's content
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionNumber = parseInt(match[1]);
    const startIndex = match.index;
    
    // Find where this section ends (start of next section or end of file)
    const endIndex = i < matches.length - 1 
      ? matches[i + 1].index 
      : content.length;
    
    const sectionContent = content.substring(startIndex, endIndex).trim();
    
    // Extract title from first line
    const titleMatch = sectionContent.match(/## SECTION \d+:\s*(.+?)(?:\s*-\s*INTEGRATED)?$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    
    sections.push({
      number: sectionNumber,
      title: title,
      content: sectionContent,
    });
  }
  
  return sections;
}

/**
 * Generate section file with header
 */
function generateSectionFile(section, productAbbreviation, metadata) {
  const header = `# Build Section E${String(section.number).padStart(2, '0')}

**Product**: ${productAbbreviation.toUpperCase()}  
**Section**: ${section.number} - ${section.title}  
**Generated**: ${new Date().toISOString().split('T')[0]}  
**Source**: ${metadata.sourceFile}

---

`;

  return header + section.content + '\n';
}

/**
 * Generate index file listing all sections
 */
function generateIndexFile(sections, productAbbreviation, metadata) {
  let index = `# Build Sections Index

**Product**: ${productAbbreviation.toUpperCase()}  
**Generated**: ${new Date().toISOString().split('T')[0]}  
**Total Sections**: ${sections.length}  
**Source File**: ${metadata.sourceFile}

---

## Sections

This document has been split into ${sections.length} individual section files for easier navigation and implementation.

`;

  sections.forEach(section => {
    const filename = `04f-${productAbbreviation}-build-section-E${String(section.number).padStart(2, '0')}.md`;
    index += `\n### Section ${section.number}: ${section.title}\n`;
    index += `**File**: \`${filename}\`\n`;
  });

  index += `\n---

## Usage

Each section file contains the complete specification for that section, including:
- Database schemas and migrations
- API routes and endpoints
- UI components and pages
- Integration hooks and logic

Implement sections in order (E01 → E02 → E03 → ...) as each section may depend on previous sections.

---

**Status**: Ready for implementation
`;

  return index;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('❌ Usage: node 04f-segment-integrated-spec_v1.js "Product Name" product-abbrev');
      console.error('');
      console.error('Examples:');
      console.error('  node 04f-segment-integrated-spec_v1.js "LoRA Pipeline" pipeline');
      console.error('  node 04f-segment-integrated-spec_v1.js "BMO Extension" bmo');
      process.exit(1);
    }
    
    const productName = args[0];
    const productAbbreviation = args[1];
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        Integrated Spec Section Splitter (v1)               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📦 Product: ${productName}`);
    console.log(`🔖 Abbreviation: ${productAbbreviation}\n`);
    
    // Step 1: Get input file path with validation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 1: Locate Input Specification');
    console.log('═══════════════════════════════════════════════════════════');
    
    const defaultInputPath = `_mapping/${productAbbreviation}/04e-${productAbbreviation}-integrated-extension-spec_v1.md`;
    const inputFile = await getValidFilePath(
      'Input: Integrated Extension Specification',
      defaultInputPath,
      productAbbreviation
    );
    
    console.log(`\n✓ Using input file: ${toDisplayPath(inputFile)}`);
    
    // Step 2: Determine output directory
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 2: Prepare Output Directory');
    console.log('═══════════════════════════════════════════════════════════');
    
    const outputDir = path.resolve(
      __dirname,
      '..',
      '_mapping',
      productAbbreviation,
      'full-build'
    );
    
    console.log(`\n📁 Output Directory: ${toDisplayPath(outputDir)}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ Created directory`);
    } else {
      console.log(`⚠️  Directory exists, files may be overwritten`);
    }
    
    // Step 3: Read and parse input file
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 3: Parse Specification');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n📖 Reading file...');
    const content = readFile(inputFile);
    console.log(`✓ Read ${content.length.toLocaleString()} characters`);
    
    console.log('\n🔍 Extracting sections...');
    const sections = extractSections(content);
    
    if (sections.length === 0) {
      console.error('❌ No sections found in input file!');
      console.error('   Expected sections with headers like: ## SECTION 1: Title');
      rl.close();
      process.exit(1);
    }
    
    console.log(`✓ Found ${sections.length} sections:`);
    sections.forEach(section => {
      console.log(`   - Section ${section.number}: ${section.title}`);
    });
    
    // Step 4: Write section files
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 4: Write Section Files');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const metadata = {
      sourceFile: path.basename(inputFile),
      generatedDate: new Date().toISOString().split('T')[0],
    };
    
    const generatedFiles = [];
    
    sections.forEach(section => {
      const filename = `04f-${productAbbreviation}-build-section-E${String(section.number).padStart(2, '0')}.md`;
      const filepath = path.join(outputDir, filename);
      
      const fileContent = generateSectionFile(section, productAbbreviation, metadata);
      writeFile(filepath, fileContent);
      
      generatedFiles.push({
        filename,
        filepath,
        section: section.number,
        title: section.title,
        size: fileContent.length,
      });
      
      console.log(`✓ ${filename} (${fileContent.length.toLocaleString()} chars)`);
    });
    
    // Step 5: Write index file
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 5: Write Index File');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const indexContent = generateIndexFile(sections, productAbbreviation, metadata);
    const indexPath = path.join(outputDir, 'INDEX.md');
    writeFile(indexPath, indexContent);
    console.log(`✓ INDEX.md`);
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ SPLIT COMPLETE!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Summary:');
    console.log('───────────');
    console.log(`Product:              ${productAbbreviation.toUpperCase()}`);
    console.log(`Sections Split:       ${sections.length}`);
    console.log(`Files Generated:      ${generatedFiles.length + 1} (${generatedFiles.length} sections + 1 index)`);
    console.log(`Output Directory:     ${toDisplayPath(outputDir)}`);
    console.log(`Total Output Size:    ${(generatedFiles.reduce((sum, f) => sum + f.size, 0) + indexContent.length).toLocaleString()} characters`);
    
    console.log('\n📂 Generated Files:');
    console.log('───────────────────');
    generatedFiles.forEach(file => {
      console.log(`   ${file.filename}`);
    });
    console.log(`   INDEX.md`);
    
    console.log('\n📖 Next Steps:');
    console.log('──────────────');
    console.log('1. Review the INDEX.md file in the output directory');
    console.log('2. Run 04g-generate-section-meta-prompts_v1.js to generate meta-prompts');
    console.log('3. Use meta-prompts to generate execution prompts with AI');
    console.log('4. Implement sections in order (E01 → E02 → E03 → ...)');
    console.log('');
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    rl.close();
    process.exit(1);
  }
}

// Run the script
main();

