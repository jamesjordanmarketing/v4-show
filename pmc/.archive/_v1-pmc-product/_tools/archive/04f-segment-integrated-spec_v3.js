#!/usr/bin/env node

/**
 * Integrated Spec Section Splitter (v3)
 * 
 * Purpose: Split integrated extension specification into individual section files.
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v3.js <product-abbreviation> [input-file]
 * 
 * Examples:
 *   node 04f-segment-integrated-spec_v3.js pipeline
 *   node 04f-segment-integrated-spec_v3.js pipeline path/to/custom-spec.md
 *   node 04f-segment-integrated-spec_v3.js bmo
 * 
 * Output:
 *   Creates: pmc/product/_mapping/[product-abbreviation]/full-build/
 *   Files:   04f-[product-abbreviation]-build-section-E01.md
 *            04f-[product-abbreviation]-build-section-E02.md
 *            ...
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toDisplayPath(absolutePath) {
  return absolutePath.replace(/\\/g, '/');
}

function resolvePath(inputPath, basePath = __dirname) {
  // Handle absolute Windows paths
  if (inputPath.match(/^[A-Za-z]:\\/)) {
    return path.normalize(inputPath);
  }
  
  // Handle relative paths
  if (inputPath.startsWith('../') || inputPath.startsWith('./')) {
    return path.resolve(basePath, inputPath);
  }
  
  // Handle paths relative to project root
  if (inputPath.startsWith('pmc/')) {
    return path.resolve(__dirname, '../..', inputPath);
  }
  
  // Default: treat as relative to current directory
  return path.resolve(process.cwd(), inputPath);
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
    
    if (args.length < 1) {
      console.error('❌ Usage: node 04f-segment-integrated-spec_v3.js <product-abbreviation> [input-file]');
      console.error('');
      console.error('Examples:');
      console.error('  node 04f-segment-integrated-spec_v3.js pipeline');
      console.error('  node 04f-segment-integrated-spec_v3.js pipeline custom-spec.md');
      console.error('  node 04f-segment-integrated-spec_v3.js bmo');
      process.exit(1);
    }
    
    const productAbbreviation = args[0];
    let inputFile = args[1];
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        Integrated Spec Section Splitter (v3)               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📦 Product: ${productAbbreviation.toUpperCase()}\n`);
    
    // Step 1: Determine input file
    console.log('Step 1: Locate Input Specification');
    console.log('───────────────────────────────────');
    
    if (!inputFile) {
      // Try default patterns
      const defaultPatterns = [
        path.resolve(__dirname, '..', '_mapping', productAbbreviation, `04e-${productAbbreviation}-integrated-extension-spec_v1.md`),
        path.resolve(__dirname, '..', '_mapping', productAbbreviation, `04e-${productAbbreviation}-integrated-extension-spec_v1a.md`),
        path.resolve(__dirname, '..', '_mapping', productAbbreviation, `04e-${productAbbreviation}-integrated-extension-spec_v1b.md`),
      ];
      
      for (const pattern of defaultPatterns) {
        if (fs.existsSync(pattern)) {
          inputFile = pattern;
          console.log(`✓ Found: ${toDisplayPath(pattern)}`);
          break;
        }
      }
      
      if (!inputFile) {
        console.error(`❌ No default spec file found. Tried:`);
        defaultPatterns.forEach(p => console.error(`   - ${toDisplayPath(p)}`));
        console.error('');
        console.error('Please specify input file as second argument.');
        process.exit(1);
      }
    } else {
      inputFile = resolvePath(inputFile);
      if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${toDisplayPath(inputFile)}`);
        process.exit(1);
      }
      console.log(`✓ Using: ${toDisplayPath(inputFile)}`);
    }
    
    // Step 2: Determine output directory
    console.log('\nStep 2: Create Output Directory');
    console.log('────────────────────────────────');
    
    const outputDir = path.resolve(
      __dirname,
      '..',
      '_mapping',
      productAbbreviation,
      'full-build'
    );
    
    console.log(`📁 Output: ${toDisplayPath(outputDir)}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✓ Created directory`);
    } else {
      console.log(`⚠️  Directory exists, files may be overwritten`);
    }
    
    // Step 3: Read and parse input file
    console.log('\nStep 3: Parse Specification');
    console.log('───────────────────────────');
    
    console.log('📖 Reading file...');
    const content = readFile(inputFile);
    console.log(`✓ Read ${content.length.toLocaleString()} characters`);
    
    console.log('🔍 Extracting sections...');
    const sections = extractSections(content);
    
    if (sections.length === 0) {
      console.error('❌ No sections found in input file!');
      console.error('   Expected sections with headers like: ## SECTION 1: Title');
      process.exit(1);
    }
    
    console.log(`✓ Found ${sections.length} sections:`);
    sections.forEach(section => {
      console.log(`   - Section ${section.number}: ${section.title}`);
    });
    
    // Step 4: Write section files
    console.log('\nStep 4: Write Section Files');
    console.log('───────────────────────────');
    
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
    console.log('\nStep 5: Write Index File');
    console.log('────────────────────────');
    
    const indexContent = generateIndexFile(sections, productAbbreviation, metadata);
    const indexPath = path.join(outputDir, 'INDEX.md');
    writeFile(indexPath, indexContent);
    console.log(`✓ INDEX.md`);
    
    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
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
    console.log('2. Implement sections in order (E01 → E02 → E03 → ...)');
    console.log('3. Each section file contains complete specifications');
    console.log('4. Reference previous sections as dependencies are mentioned');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();

