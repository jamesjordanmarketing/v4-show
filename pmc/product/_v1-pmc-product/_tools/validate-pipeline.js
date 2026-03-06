/**
 * Pipeline Validation Script
 * 
 * Purpose: Validate that all required files exist and are properly structured
 *          before running the two-stage pipeline.
 * 
 * Usage:
 *   node validate-pipeline.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_DIR = path.join(__dirname, '..');

const REQUIRED_FILES = {
  'Input Files': [
    '_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md',
    '_mapping/pipeline/_run-prompts/04d-infrastructure-inventory_v1.md',
    '_mapping/pipeline/_run-prompts/04d-extension-strategy_v1.md',
    '_mapping/pipeline/_run-prompts/04d-implementation-guide_v1.md',
  ],
  'Tool Files': [
    '_prompt_engineering/04e-merge-integration-spec-meta-prompt_v1.md',
    '_tools/04e-merge-integration-spec_v1.js',
    '_tools/04f-segment-integrated-spec_v1.js',
  ],
};

const MIN_FILE_SIZES = {
  '04c-pipeline-structured-from-wireframe_v1.md': 100 * 1024, // 100 KB
  '04d-infrastructure-inventory_v1.md': 40 * 1024, // 40 KB
  '04d-extension-strategy_v1.md': 20 * 1024, // 20 KB
  '04d-implementation-guide_v1.md': 50 * 1024, // 50 KB
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Get file size in KB
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2);
  } catch (error) {
    return 0;
  }
}

/**
 * Check file size meets minimum
 */
function checkFileSize(filePath, minSize) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size >= minSize;
  } catch (error) {
    return false;
  }
}

/**
 * Count sections in structured spec
 */
function countSections(content) {
  const matches = content.match(/## SECTION \d+:/g);
  return matches ? matches.length : 0;
}

/**
 * Validate structured spec format
 */
function validateStructuredSpec(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sectionCount = countSections(content);
    
    return {
      valid: sectionCount === 7,
      sectionCount: sectionCount,
      message: sectionCount === 7 ? 'OK' : `Expected 7 sections, found ${sectionCount}`,
    };
  } catch (error) {
    return {
      valid: false,
      message: `Error reading file: ${error.message}`,
    };
  }
}

/**
 * Validate JavaScript syntax
 */
function validateJavaScriptSyntax(filePath) {
  try {
    require(filePath);
    return { valid: true, message: 'OK' };
  } catch (error) {
    return {
      valid: false,
      message: `Syntax error: ${error.message}`,
    };
  }
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

function main() {
  console.log('🔍 Pipeline Validation\n');
  console.log('=' .repeat(70));
  console.log('\n');
  
  let allValid = true;
  const results = {
    files: { passed: 0, failed: 0 },
    sizes: { passed: 0, failed: 0 },
    formats: { passed: 0, failed: 0 },
    syntax: { passed: 0, failed: 0 },
  };
  
  // Check required files
  console.log('📂 Checking Required Files...\n');
  
  for (const [category, files] of Object.entries(REQUIRED_FILES)) {
    console.log(`  ${category}:`);
    
    for (const file of files) {
      const fullPath = path.join(BASE_DIR, file);
      const fileName = path.basename(file);
      const exists = fileExists(fullPath);
      const size = getFileSize(fullPath);
      
      if (exists) {
        console.log(`    ✅ ${fileName} (${size} KB)`);
        results.files.passed++;
      } else {
        console.log(`    ❌ ${fileName} - NOT FOUND`);
        results.files.failed++;
        allValid = false;
      }
    }
    console.log('');
  }
  
  // Check file sizes
  console.log('📏 Checking File Sizes...\n');
  
  for (const [fileName, minSize] of Object.entries(MIN_FILE_SIZES)) {
    const filePath = path.join(BASE_DIR, '_mapping/pipeline', fileName);
    
    if (!fileExists(filePath)) {
      continue; // Already reported as missing
    }
    
    const sizeOk = checkFileSize(filePath, minSize);
    const actualSize = getFileSize(filePath);
    const minSizeKB = (minSize / 1024).toFixed(0);
    
    if (sizeOk) {
      console.log(`  ✅ ${fileName}: ${actualSize} KB (min: ${minSizeKB} KB)`);
      results.sizes.passed++;
    } else {
      console.log(`  ⚠️  ${fileName}: ${actualSize} KB (min: ${minSizeKB} KB) - MAY BE INCOMPLETE`);
      results.sizes.failed++;
    }
  }
  console.log('');
  
  // Validate structured spec format
  console.log('📋 Validating Structured Spec Format...\n');
  
  const specPath = path.join(BASE_DIR, '_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md');
  if (fileExists(specPath)) {
    const validation = validateStructuredSpec(specPath);
    
    if (validation.valid) {
      console.log(`  ✅ Structured spec has ${validation.sectionCount} sections - ${validation.message}`);
      results.formats.passed++;
    } else {
      console.log(`  ❌ Structured spec validation failed - ${validation.message}`);
      results.formats.failed++;
      allValid = false;
    }
  } else {
    console.log(`  ⏭️  Structured spec not found - already reported`);
  }
  console.log('');
  
  // Validate JavaScript syntax
  console.log('🔧 Validating JavaScript Syntax...\n');
  
  const jsFiles = [
    '_tools/04e-merge-integration-spec_v1.js',
    '_tools/04f-segment-integrated-spec_v1.js',
  ];
  
  for (const file of jsFiles) {
    const fullPath = path.join(BASE_DIR, file);
    const fileName = path.basename(file);
    
    if (!fileExists(fullPath)) {
      continue; // Already reported as missing
    }
    
    const validation = validateJavaScriptSyntax(fullPath);
    
    if (validation.valid) {
      console.log(`  ✅ ${fileName} - ${validation.message}`);
      results.syntax.passed++;
    } else {
      console.log(`  ❌ ${fileName} - ${validation.message}`);
      results.syntax.failed++;
      allValid = false;
    }
  }
  console.log('');
  
  // Summary
  console.log('=' .repeat(70));
  console.log('\n📊 Validation Summary\n');
  console.log(`  Files:   ${results.files.passed} passed, ${results.files.failed} failed`);
  console.log(`  Sizes:   ${results.sizes.passed} passed, ${results.sizes.failed} warnings`);
  console.log(`  Formats: ${results.formats.passed} passed, ${results.formats.failed} failed`);
  console.log(`  Syntax:  ${results.syntax.passed} passed, ${results.syntax.failed} failed`);
  console.log('');
  
  if (allValid) {
    console.log('✅ VALIDATION PASSED - Ready to run pipeline!\n');
    console.log('Next steps:');
    console.log('  1. Run Stage 1 (Merge): node 04e-merge-integration-spec_v1.js ...');
    console.log('  2. Run Stage 2 (Segment): node 04f-segment-integrated-spec_v1.js ...');
    console.log('  3. See PIPELINE-USAGE-GUIDE.md for complete commands\n');
    process.exit(0);
  } else {
    console.log('❌ VALIDATION FAILED - Fix errors before running pipeline\n');
    console.log('Review errors above and ensure all required files exist and are valid.\n');
    process.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ VALIDATION ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { fileExists, getFileSize, validateStructuredSpec };

