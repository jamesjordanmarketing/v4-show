#!/usr/bin/env node

/**
 * Meta-Prompt Generator for Integrated Spec Sections (v4)
 * 
 * Purpose: Generate customized meta-prompts for each section file that can be used
 *          to create progressive execution prompts.
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v4.js <product-abbreviation>
 * 
 * Examples:
 *   node 04f-segment-integrated-spec_v4.js pipeline
 *   node 04f-segment-integrated-spec_v4.js bmo
 * 
 * Input:
 *   - Section files: pmc/product/_mapping/[product]/full-build/04f-[product]-build-section-E*.md
 *   - Meta-prompt template: pmc/product/_prompt_engineering/04f-integrated-spec-to-progressive-prompts_v2.md
 * 
 * Output:
 *   - Meta-prompts: pmc/product/_mapping/[product]/full-build/04f-[product]-build-section-E[NN]-meta-prompts.md
 * 
 * What it does:
 *   1. Reads the base meta-prompt template
 *   2. For each section file, creates a customized meta-prompt
 *   3. Embeds section-specific information
 *   4. Provides instructions for generating execution prompts
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toDisplayPath(absolutePath) {
  return absolutePath.replace(/\\/g, '/');
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
// SECTION PARSING
// ============================================================================

/**
 * Extract metadata from section file header
 */
function extractSectionMetadata(content) {
  const metadata = {
    sectionNumber: null,
    sectionTitle: '',
    product: '',
    generated: '',
    source: '',
  };

  // Extract section number and title from header
  const headerMatch = content.match(/\*\*Section\*\*:\s*(\d+)\s*-\s*(.+?)$/m);
  if (headerMatch) {
    metadata.sectionNumber = parseInt(headerMatch[1]);
    metadata.sectionTitle = headerMatch[2].trim();
  }

  // Extract product
  const productMatch = content.match(/\*\*Product\*\*:\s*(\w+)/);
  if (productMatch) {
    metadata.product = productMatch[1];
  }

  // Extract generated date
  const generatedMatch = content.match(/\*\*Generated\*\*:\s*(.+?)$/m);
  if (generatedMatch) {
    metadata.generated = generatedMatch[1].trim();
  }

  // Extract source
  const sourceMatch = content.match(/\*\*Source\*\*:\s*(.+?)$/m);
  if (sourceMatch) {
    metadata.source = sourceMatch[1].trim();
  }

  return metadata;
}

/**
 * Extract overview section
 */
function extractOverview(content) {
  const overviewMatch = content.match(/### Overview \(from original spec\)([\s\S]*?)(?=\n###|$)/);
  if (overviewMatch) {
    return overviewMatch[1].trim();
  }
  return 'No overview found in section file.';
}

/**
 * Count features in section
 */
function countFeatures(content) {
  const featureMatches = content.match(/#### FR-\d+\.\d+:/g);
  return featureMatches ? featureMatches.length : 0;
}

/**
 * Estimate complexity (rough estimate based on content size)
 */
function estimateComplexity(content) {
  const lines = content.split('\n').length;
  const features = countFeatures(content);
  
  if (lines < 200 || features <= 2) {
    return { level: 'LOW', hours: '3-5', prompts: 1 };
  } else if (lines < 500 || features <= 4) {
    return { level: 'MEDIUM', hours: '8-16', prompts: 2-3 };
  } else if (lines < 1000 || features <= 6) {
    return { level: 'HIGH', hours: '16-32', prompts: 3-5 };
  } else {
    return { level: 'CRITICAL', hours: '32+', prompts: 5-8 };
  }
}

// ============================================================================
// META-PROMPT GENERATION
// ============================================================================

/**
 * Generate customized meta-prompt for a section
 */
function generateCustomizedMetaPrompt(sectionFile, sectionPath, metaPromptTemplate, previousSections) {
  const metadata = extractSectionMetadata(sectionFile);
  const overview = extractOverview(sectionFile);
  const featureCount = countFeatures(sectionFile);
  const complexity = estimateComplexity(sectionFile);

  const sectionNumPadded = String(metadata.sectionNumber).padStart(2, '0');
  const sectionFileName = path.basename(sectionPath);

  // Build previous sections context
  let previousSectionsContext = '';
  if (previousSections.length > 0) {
    previousSectionsContext = '### Available from Previous Sections\n\n';
    previousSections.forEach(prev => {
      previousSectionsContext += `#### Section E${String(prev.number).padStart(2, '0')}: ${prev.title}\n`;
      previousSectionsContext += `- Source: \`${prev.fileName}\`\n`;
      previousSectionsContext += `- Features implemented: ${prev.featureCount}\n`;
      previousSectionsContext += `- Key deliverables: [Will be detailed in execution prompts]\n\n`;
    });
  } else {
    previousSectionsContext = '### No Previous Sections\n\nThis is the first section (E01 - Foundation). No previous sections exist.\n';
  }

  const customizedPrompt = `# Customized Meta-Prompt: Section E${sectionNumPadded}

**Product:** ${metadata.product.toUpperCase()}  
**Section:** ${metadata.sectionNumber} - ${metadata.sectionTitle}  
**Generated:** ${new Date().toISOString().split('T')[0]}  
**Source Section File:** \`${sectionFileName}\`

---

## 🎯 Purpose

This is a **customized meta-prompt** for generating progressive execution prompts for Section E${sectionNumPadded}.

**What This Document Does:**
- Provides section-specific context and requirements
- Guides you through analyzing this specific section
- Helps you generate progressive execution prompts
- Outputs a single file with all prompts for this section

**What You'll Generate:**
- **Output File:** \`04f-${metadata.product.toLowerCase()}-build-section-E${sectionNumPadded}-execution-prompts.md\`
- **Location:** Same directory as this file
- **Contents:** Progressive execution prompts (P01, P02, P03, etc.)

---

## 📊 Section Statistics

- **Section Number:** E${sectionNumPadded}
- **Title:** ${metadata.sectionTitle}
- **Features:** ${featureCount} identified
- **Complexity:** ${complexity.level}
- **Estimated Hours:** ${complexity.hours}
- **Expected Prompts:** ${complexity.prompts}
- **Source File:** \`${sectionFileName}\`

---

## 📋 Section Overview

${overview}

---

## 🔗 Integration Context

${previousSectionsContext}

---

## 📖 Instructions

### Step 1: Read the Base Meta-Prompt Template

The complete meta-prompt methodology is defined in:
\`pmc/product/_prompt_engineering/04f-integrated-spec-to-progressive-prompts_v2.md\`

**Key sections to reference:**
- Phase 1: Section Analysis (how to parse features)
- Phase 2: Prompt Planning (how to group features)
- Phase 3: Prompt Generation (the prompt template)
- Phase 4: Cross-Prompt Validation (quality checks)

### Step 2: Read the Section File

Load and analyze the complete section specification:
\`${sectionPath}\`

**What to extract:**
- All features (FR-${metadata.sectionNumber}.X format)
- Code blocks (SQL, TypeScript, TSX, etc.)
- File specifications (paths, new vs modify)
- Dependencies (on previous sections and within section)
- Acceptance criteria

### Step 3: Apply the Meta-Prompt Phases

Follow the methodology from the base meta-prompt:

#### Phase 1: Section Analysis
- Parse section metadata (already done above)
- Extract all ${featureCount} features
- Assess complexity for each feature
- Build dependency graph

#### Phase 2: Prompt Planning
- Determine grouping strategy (Layer-Based, Feature-Based, or Single Prompt)
- Group features into logical prompts (target 6-8 hours each)
- Define integration points between prompts
- Ensure correct dependency order

#### Phase 3: Prompt Generation
- Use the prompt template from base meta-prompt
- Generate one prompt for each group
- Include all code blocks from section file
- Specify integration points with previous sections: ${previousSections.map(p => `E${String(p.number).padStart(2, '0')}`).join(', ')}
- Add acceptance criteria and testing steps

#### Phase 4: Cross-Prompt Validation
- Verify all features covered
- Check dependencies are correct
- Ensure no redundancy
- Validate integration points

### Step 4: Generate Output File

Create a single markdown file with this structure:

\`\`\`markdown
# ${metadata.product.toUpperCase()} - Section E${sectionNumPadded}: ${metadata.sectionTitle} - Execution Prompts

**Product:** ${metadata.product.toUpperCase()}  
**Section:** ${metadata.sectionNumber} - ${metadata.sectionTitle}  
**Generated:** [Today's date]  
**Total Prompts:** [Number you determined]  
**Estimated Total Time:** [Total hours] hours  
**Source Section File:** ${sectionFileName}

---

## Section Overview

[Copy from section file]

---

## Prompt Sequence for This Section

[List all prompts you're generating]

---

## Integration Context

### Dependencies from Previous Sections
[List what this section needs from sections: ${previousSections.map(p => `E${String(p.number).padStart(2, '0')}`).join(', ')}]

### Provides for Next Sections
[List what future sections will use]

---

## Dependency Flow (This Section)

[Show the flow between prompts in this section]

---

# PROMPT 1: [Title]

[Full prompt using template from base meta-prompt]

---

# PROMPT 2: [Title]

[Full prompt using template from base meta-prompt]

---

[Continue for all prompts...]

---

## Section Completion Checklist

[Comprehensive checklist for this section]

---

**End of Section E${sectionNumPadded} Execution Prompts**
\`\`\`

### Step 5: Save Output

**File Path:**
\`${path.dirname(sectionPath)}/04f-${metadata.product.toLowerCase()}-build-section-E${sectionNumPadded}-execution-prompts.md\`

---

## ✅ Success Criteria

Your generated execution prompts file is complete when:

1. ✅ All ${featureCount} features from section file are covered
2. ✅ Each prompt is 6-8 hours of work (not too large/small)
3. ✅ Prompts are in correct dependency order
4. ✅ Integration points with previous sections are explicit
5. ✅ All code blocks from section file are included in appropriate prompts
6. ✅ Acceptance criteria and testing steps are specific
7. ✅ File follows the template structure exactly
8. ✅ Output file name matches: \`04f-${metadata.product.toLowerCase()}-build-section-E${sectionNumPadded}-execution-prompts.md\`

---

## 📚 Reference Materials

### Section File Location
\`${sectionPath}\`

### Base Meta-Prompt Template
\`pmc/product/_prompt_engineering/04f-integrated-spec-to-progressive-prompts_v2.md\`

### Previous Section Files
${previousSections.length > 0 ? previousSections.map(p => `- \`${p.filePath}\``).join('\n') : '(None - this is the first section)'}

---

## 🚀 Ready to Generate

You now have all the information needed to generate execution prompts for Section E${sectionNumPadded}.

**Next Steps:**
1. Open the section file: \`${sectionFileName}\`
2. Reference the base meta-prompt for methodology
3. Apply the 4 phases (Analysis → Planning → Generation → Validation)
4. Generate the output file with all prompts

**Expected Output:**
- File: \`04f-${metadata.product.toLowerCase()}-build-section-E${sectionNumPadded}-execution-prompts.md\`
- Prompts: ${complexity.prompts} progressive build prompts
- Total Time: ${complexity.hours} hours of implementation work

---

**Let's generate execution prompts for ${metadata.sectionTitle}!** 🎯
`;

  return customizedPrompt;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('❌ Usage: node 04f-segment-integrated-spec_v4.js <product-abbreviation>');
      console.error('');
      console.error('Examples:');
      console.error('  node 04f-segment-integrated-spec_v4.js pipeline');
      console.error('  node 04f-segment-integrated-spec_v4.js bmo');
      process.exit(1);
    }
    
    const productAbbreviation = args[0];
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Meta-Prompt Generator for Integrated Specs (v4)        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📦 Product: ${productAbbreviation.toUpperCase()}\n`);
    
    // Step 1: Locate section files directory
    console.log('Step 1: Locate Section Files');
    console.log('────────────────────────────');
    
    const sectionsDir = path.resolve(
      __dirname,
      '..',
      '_mapping',
      productAbbreviation,
      'full-build'
    );
    
    if (!fs.existsSync(sectionsDir)) {
      console.error(`❌ Section files directory not found: ${toDisplayPath(sectionsDir)}`);
      console.error('   Run 04f-segment-integrated-spec_v3.js first to create section files.');
      process.exit(1);
    }
    
    console.log(`✓ Found directory: ${toDisplayPath(sectionsDir)}`);
    
    // Step 2: Find all section files
    console.log('\nStep 2: Find Section Files');
    console.log('──────────────────────────');
    
    const files = fs.readdirSync(sectionsDir);
    const sectionFiles = files
      .filter(f => f.match(/^04f-.+-build-section-E\d+\.md$/))
      .sort();
    
    if (sectionFiles.length === 0) {
      console.error('❌ No section files found in directory');
      console.error(`   Expected files like: 04f-${productAbbreviation}-build-section-E01.md`);
      process.exit(1);
    }
    
    console.log(`✓ Found ${sectionFiles.length} section files:`);
    sectionFiles.forEach(f => console.log(`   - ${f}`));
    
    // Step 3: Load meta-prompt template
    console.log('\nStep 3: Load Meta-Prompt Template');
    console.log('──────────────────────────────────');
    
    const metaPromptPath = path.resolve(
      __dirname,
      '..',
      '_prompt_engineering',
      '04f-integrated-spec-to-progressive-prompts_v2.md'
    );
    
    if (!fs.existsSync(metaPromptPath)) {
      console.error(`❌ Meta-prompt template not found: ${toDisplayPath(metaPromptPath)}`);
      process.exit(1);
    }
    
    const metaPromptTemplate = readFile(metaPromptPath);
    console.log(`✓ Loaded template: ${toDisplayPath(metaPromptPath)}`);
    console.log(`  Template size: ${metaPromptTemplate.length.toLocaleString()} characters`);
    
    // Step 4: Generate customized meta-prompts
    console.log('\nStep 4: Generate Customized Meta-Prompts');
    console.log('─────────────────────────────────────────');
    
    const previousSections = [];
    const generatedFiles = [];
    
    for (const sectionFileName of sectionFiles) {
      const sectionPath = path.join(sectionsDir, sectionFileName);
      const sectionContent = readFile(sectionPath);
      const metadata = extractSectionMetadata(sectionContent);
      
      console.log(`\n📄 Processing: ${sectionFileName}`);
      console.log(`   Section: E${String(metadata.sectionNumber).padStart(2, '0')} - ${metadata.sectionTitle}`);
      console.log(`   Features: ${countFeatures(sectionContent)}`);
      
      // Generate customized meta-prompt
      const customizedPrompt = generateCustomizedMetaPrompt(
        sectionContent,
        sectionPath,
        metaPromptTemplate,
        previousSections
      );
      
      // Output filename
      const outputFileName = `04f-${productAbbreviation}-build-section-E${String(metadata.sectionNumber).padStart(2, '0')}-meta-prompts.md`;
      const outputPath = path.join(sectionsDir, outputFileName);
      
      // Write file
      writeFile(outputPath, customizedPrompt);
      
      console.log(`   ✓ Generated: ${outputFileName}`);
      console.log(`   Size: ${customizedPrompt.length.toLocaleString()} characters`);
      
      generatedFiles.push({
        fileName: outputFileName,
        filePath: outputPath,
        section: metadata.sectionNumber,
        title: metadata.sectionTitle,
        size: customizedPrompt.length,
      });
      
      // Track for next section's context
      previousSections.push({
        number: metadata.sectionNumber,
        title: metadata.sectionTitle,
        fileName: sectionFileName,
        filePath: sectionPath,
        featureCount: countFeatures(sectionContent),
      });
    }
    
    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ GENERATION COMPLETE!                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Summary:');
    console.log('───────────');
    console.log(`Product:                ${productAbbreviation.toUpperCase()}`);
    console.log(`Sections Processed:     ${sectionFiles.length}`);
    console.log(`Meta-Prompts Generated: ${generatedFiles.length}`);
    console.log(`Output Directory:       ${toDisplayPath(sectionsDir)}`);
    console.log(`Total Output Size:      ${generatedFiles.reduce((sum, f) => sum + f.size, 0).toLocaleString()} characters`);
    
    console.log('\n📂 Generated Meta-Prompt Files:');
    console.log('───────────────────────────────');
    generatedFiles.forEach(file => {
      console.log(`   ${file.fileName}`);
    });
    
    console.log('\n📖 Next Steps:');
    console.log('──────────────');
    console.log('1. Open each meta-prompt file (E01, E02, E03, etc.)');
    console.log('2. Follow the instructions in each meta-prompt');
    console.log('3. Generate execution prompts for each section');
    console.log('4. Output files will be: 04f-[product]-build-section-E[NN]-execution-prompts.md');
    console.log('5. Execute the execution prompts to build the application');
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

