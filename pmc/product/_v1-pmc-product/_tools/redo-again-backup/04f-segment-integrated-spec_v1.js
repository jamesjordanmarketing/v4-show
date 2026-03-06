/**
 * Integrated Extension Spec Segmentation Script
 * 
 * Purpose: Segment an integrated extension specification into progressive execution prompts
 *          for systematic implementation.
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v1.js \
 *     --input <path-to-integrated-spec> \
 *     --output-dir <path-to-output-directory>
 * 
 * Example:
 *   node pmc/product/_tools/04f-segment-integrated-spec_v1.js \
 *     --input "pmc/product/_mapping/pipeline/04e-integrated-extension-spec_v1.md" \
 *     --output-dir "pmc/product/_mapping/pipeline/_execution-prompts/"
 * 
 * Output: Creates multiple execution prompt files (04f-execution-E[XX]-P[YY].md)
 *         with progressive dependencies and implementation instructions.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  
  return parsed;
}

// Validate required arguments
function validateArgs(args) {
  const required = ['input', 'output-dir'];
  const missing = required.filter(arg => !args[arg]);
  
  if (missing.length > 0) {
    console.error('Error: Missing required arguments:', missing.join(', '));
    console.error('\nUsage:');
    console.error('  node 04f-segment-integrated-spec_v1.js \\');
    console.error('    --input <path> \\');
    console.error('    --output-dir <path>');
    process.exit(1);
  }
  
  // Normalize output-dir key
  if (args['output-dir']) {
    args.outputDir = args['output-dir'];
    delete args['output-dir'];
  }
}

// Read file with error handling
function readFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Write file with error handling
function writeFile(filePath, content) {
  try {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(absolutePath, content, 'utf-8');
    return absolutePath;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Parse integrated spec into sections
function parseIntegratedSpec(content) {
  const sections = [];
  
  // Match section headers: ## SECTION [N]: [Name] - INTEGRATED
  const sectionRegex = /^## SECTION (\d+):\s*(.+?)\s*-\s*INTEGRATED\s*$/gm;
  let match;
  
  const sectionPositions = [];
  while ((match = sectionRegex.exec(content)) !== null) {
    sectionPositions.push({
      number: parseInt(match[1], 10),
      name: match[2].trim(),
      startIndex: match.index,
      headerText: match[0]
    });
  }
  
  // Extract content for each section
  for (let i = 0; i < sectionPositions.length; i++) {
    const section = sectionPositions[i];
    const nextSection = sectionPositions[i + 1];
    
    const startIndex = section.startIndex;
    const endIndex = nextSection ? nextSection.startIndex : content.length;
    const sectionContent = content.substring(startIndex, endIndex);
    
    sections.push({
      number: section.number,
      name: section.name,
      content: sectionContent,
      frs: extractFeatureRequirements(sectionContent, section.number)
    });
  }
  
  return sections;
}

// Extract feature requirements from section content
function extractFeatureRequirements(sectionContent, sectionNumber) {
  const frs = [];
  
  // Match FR headers: #### FR-[N].[M]: [Name]
  const frRegex = /^#### FR-(\d+)\.(\d+):\s*(.+?)$/gm;
  let match;
  
  const frPositions = [];
  while ((match = frRegex.exec(sectionContent)) !== null) {
    frPositions.push({
      sectionNum: parseInt(match[1], 10),
      frNum: parseInt(match[2], 10),
      name: match[3].trim(),
      startIndex: match.index,
      headerText: match[0]
    });
  }
  
  // Extract content for each FR
  for (let i = 0; i < frPositions.length; i++) {
    const fr = frPositions[i];
    const nextFr = frPositions[i + 1];
    
    const startIndex = fr.startIndex;
    const endIndex = nextFr ? nextFr.startIndex : sectionContent.length;
    const frContent = sectionContent.substring(startIndex, endIndex);
    
    // Detect what types of work this FR contains
    const types = detectFRTypes(frContent);
    
    frs.push({
      id: `FR-${fr.sectionNum}.${fr.frNum}`,
      name: fr.name,
      content: frContent,
      types: types,
      sectionNumber: fr.sectionNum,
      frNumber: fr.frNum
    });
  }
  
  return frs;
}

// Detect what types of work a FR contains
function detectFRTypes(frContent) {
  const types = {
    database: false,
    api: false,
    ui: false,
    integration: false
  };
  
  const contentLower = frContent.toLowerCase();
  
  // Database indicators
  if (
    contentLower.includes('create table') ||
    contentLower.includes('database') ||
    contentLower.includes('migration') ||
    contentLower.includes('schema') ||
    contentLower.includes('sql') ||
    contentLower.includes('alter table')
  ) {
    types.database = true;
  }
  
  // API indicators
  if (
    contentLower.includes('api route') ||
    contentLower.includes('/api/') ||
    contentLower.includes('export async function get') ||
    contentLower.includes('export async function post') ||
    contentLower.includes('export async function patch') ||
    contentLower.includes('export async function delete') ||
    contentLower.includes('route.ts')
  ) {
    types.api = true;
  }
  
  // UI indicators
  if (
    contentLower.includes('component') ||
    contentLower.includes('page.tsx') ||
    contentLower.includes('return (') ||
    contentLower.includes('<div') ||
    contentLower.includes('export default function') ||
    contentLower.includes('export function')
  ) {
    types.ui = true;
  }
  
  // Integration indicators (tests, hooks, utilities)
  if (
    contentLower.includes('hook') ||
    contentLower.includes('usequery') ||
    contentLower.includes('usemutation') ||
    contentLower.includes('integration') ||
    contentLower.includes('end-to-end') ||
    contentLower.includes('state management')
  ) {
    types.integration = true;
  }
  
  return types;
}

// Group FRs into prompts based on types
function groupIntoPrompts(section) {
  const groups = {
    database: [],
    api: [],
    ui: [],
    integration: []
  };
  
  for (const fr of section.frs) {
    if (fr.types.database) groups.database.push(fr);
    if (fr.types.api) groups.api.push(fr);
    if (fr.types.ui) groups.ui.push(fr);
    if (fr.types.integration) groups.integration.push(fr);
  }
  
  // Create prompt groups in order
  const prompts = [];
  
  if (groups.database.length > 0) {
    prompts.push({
      type: 'database',
      name: 'Database Setup',
      frs: groups.database,
      description: 'Create database tables, migrations, and RLS policies'
    });
  }
  
  if (groups.api.length > 0) {
    prompts.push({
      type: 'api',
      name: 'API Implementation',
      frs: groups.api,
      description: 'Implement API routes and service layer'
    });
  }
  
  if (groups.ui.length > 0) {
    prompts.push({
      type: 'ui',
      name: 'UI Components & Pages',
      frs: groups.ui,
      description: 'Build user interface components and pages'
    });
  }
  
  if (groups.integration.length > 0) {
    prompts.push({
      type: 'integration',
      name: 'Integration & Testing',
      frs: groups.integration,
      description: 'Add hooks, state management, and integration tests'
    });
  }
  
  return prompts;
}

// Extract infrastructure inventory summary from spec
function extractInfrastructureSummary(content) {
  // Look for "INTEGRATION SUMMARY" or "Existing Infrastructure" section
  const summaryMatch = content.match(/## INTEGRATION SUMMARY[\s\S]+?(?=##|$)/);
  
  if (summaryMatch) {
    return summaryMatch[0];
  }
  
  // Fallback: create basic summary
  return `## Existing Infrastructure

Refer to the Infrastructure Inventory document for complete details on:
- Authentication system and patterns
- Database client and query patterns
- Storage client and upload patterns
- Component library and UI patterns
- State management and API patterns
`;
}

// Generate execution prompt
function generateExecutionPrompt(section, prompt, promptNumber, dependencies, infrastructureSummary) {
  const sectionId = section.number.toString().padStart(2, '0');
  const promptId = promptNumber.toString().padStart(2, '0');
  
  const frList = prompt.frs.map(fr => fr.id).join(', ');
  const frCount = prompt.frs.length;
  
  return `# Execution Prompt: Section ${sectionId} - Prompt ${promptId}

**Section**: ${section.name}  
**Prompt Type**: ${prompt.name}  
**Target**: ${prompt.description}  
**Feature Requirements**: ${frList} (${frCount} FR${frCount > 1 ? 's' : ''})

---

## CONTEXT SUMMARY

### Existing Infrastructure (ALWAYS USE)

${infrastructureSummary}

### Dependencies

**From Previous Sections** (AVAILABLE):
${dependencies.previousSections || 'None (this is the first section)'}

**From Previous Prompts in This Section** (AVAILABLE):
${dependencies.previousPrompts || 'None (this is the first prompt in this section)'}

**What This Prompt Creates** (NEW):
${prompt.frs.map(fr => `- ${fr.id}: ${fr.name}`).join('\n')}

---

## FEATURES TO IMPLEMENT

${prompt.frs.map(fr => fr.content).join('\n\n---\n\n')}

---

## IMPLEMENTATION REQUIREMENTS

All code must:
1. ✅ Use existing infrastructure patterns (see Infrastructure Inventory above)
2. ✅ Follow existing authentication patterns for all API routes
3. ✅ Follow existing database query patterns for all data access
4. ✅ Follow existing component patterns for all UI
5. ✅ Follow existing error handling patterns
6. ✅ Match existing code style and conventions
7. ✅ Include proper TypeScript types
8. ✅ Add appropriate comments for complex logic

---

## ACCEPTANCE CRITERIA

For each feature requirement above:
- ✅ All specified functionality implemented
- ✅ Code follows existing patterns exactly
- ✅ No breaking changes to existing features
- ✅ Proper error handling in place
- ✅ TypeScript compiles without errors
- ✅ Tests pass (if applicable)

---

## VALIDATION STEPS

After implementation:

### For Database Changes (if applicable)
1. Run migration: \`npx supabase migration up\` (or equivalent)
2. Verify tables exist in database
3. Test RLS policies with different user contexts
4. Verify indexes are created

### For API Routes (if applicable)
1. Test each endpoint with curl or Postman
2. Verify authentication works correctly
3. Verify error responses are correct
4. Check response format matches existing patterns

### For UI Components (if applicable)
1. Visual verification against requirements
2. Test user interactions (clicks, inputs, etc.)
3. Verify loading states work
4. Verify error states work
5. Check responsive design

### For Integration (if applicable)
1. Test end-to-end user flows
2. Verify state management works correctly
3. Test data refetching/invalidation
4. Run integration tests

---

## DO NOT

- ❌ Create new authentication system
- ❌ Use different database client than existing
- ❌ Modify existing infrastructure files
- ❌ Add new dependencies without approval
- ❌ Change existing API response formats
- ❌ Modify existing component interfaces
- ❌ Skip error handling
- ❌ Ignore TypeScript errors

---

## FILES TO CREATE/MODIFY

Based on the feature requirements above, you will likely need to:

${generateFileList(prompt)}

Refer to the Infrastructure Inventory for exact patterns to follow for each file type.

---

**End of Execution Prompt E${sectionId}-P${promptId}**
`;
}

// Generate list of files that will be created
function generateFileList(prompt) {
  const files = [];
  
  if (prompt.type === 'database') {
    files.push('### Database Files');
    files.push('- `supabase/migrations/YYYYMMDD_*.sql` - Migration files');
    files.push('- `src/types/*.ts` - TypeScript interfaces (if needed)');
  }
  
  if (prompt.type === 'api') {
    files.push('### API Files');
    files.push('- `src/app/api/*/route.ts` - API route handlers');
    files.push('- `src/services/*.ts` - Service layer (if needed)');
    files.push('- `src/types/*.ts` - Request/response types');
  }
  
  if (prompt.type === 'ui') {
    files.push('### UI Files');
    files.push('- `src/components/**/*.tsx` - React components');
    files.push('- `src/app/(dashboard)/*/page.tsx` - Page components');
    files.push('- `src/types/*.ts` - Component prop types');
  }
  
  if (prompt.type === 'integration') {
    files.push('### Integration Files');
    files.push('- `src/hooks/*.ts` - React Query hooks');
    files.push('- `src/lib/*.ts` - Utility functions');
    files.push('- `src/__tests__/**/*.test.ts` - Integration tests (if needed)');
  }
  
  return files.join('\n');
}

// Generate dependency summary for previous sections
function generatePreviousSectionsSummary(currentSection, allSections) {
  if (currentSection === 1) {
    return 'None (this is the first section)';
  }
  
  const previousSections = allSections.filter(s => s.number < currentSection);
  
  return previousSections.map(s => {
    const frCount = s.frs.length;
    return `- Section ${s.number}: ${s.name} (${frCount} features implemented)`;
  }).join('\n');
}

// Generate dependency summary for previous prompts in section
function generatePreviousPromptsSummary(currentPromptNumber, prompts) {
  if (currentPromptNumber === 1) {
    return 'None (this is the first prompt in this section)';
  }
  
  const previousPrompts = prompts.slice(0, currentPromptNumber - 1);
  
  return previousPrompts.map((p, index) => {
    const frList = p.frs.map(fr => fr.id).join(', ');
    return `- Prompt ${index + 1}: ${p.name} (${frList})`;
  }).join('\n');
}

// Main execution
function main() {
  console.log('🔄 Segmentation Script v1.0');
  console.log('============================\n');
  
  // Parse and validate arguments
  const args = parseArgs();
  validateArgs(args);
  
  console.log('📂 Reading input file...');
  const specContent = readFile(args.input);
  console.log(`  - Input size: ${(specContent.length / 1024).toFixed(1)} KB\n`);
  
  // Parse the integrated spec
  console.log('🔍 Parsing integrated specification...');
  const sections = parseIntegratedSpec(specContent);
  console.log(`  - Found ${sections.length} sections\n`);
  
  // Extract infrastructure summary
  const infrastructureSummary = extractInfrastructureSummary(specContent);
  
  // Generate execution prompts
  console.log('🔨 Generating execution prompts...\n');
  
  let totalPrompts = 0;
  const generatedFiles = [];
  
  for (const section of sections) {
    console.log(`📋 Section ${section.number}: ${section.name}`);
    console.log(`   Features: ${section.frs.length} FRs`);
    
    // Group FRs into prompts
    const prompts = groupIntoPrompts(section);
    console.log(`   Prompts: ${prompts.length}\n`);
    
    // Generate each prompt
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const promptNumber = i + 1;
      
      const dependencies = {
        previousSections: generatePreviousSectionsSummary(section.number, sections),
        previousPrompts: generatePreviousPromptsSummary(promptNumber, prompts)
      };
      
      const executionPrompt = generateExecutionPrompt(
        section,
        prompt,
        promptNumber,
        dependencies,
        infrastructureSummary
      );
      
      const sectionId = section.number.toString().padStart(2, '0');
      const promptId = promptNumber.toString().padStart(2, '0');
      const filename = `04f-execution-E${sectionId}-P${promptId}.md`;
      const filepath = path.join(args.outputDir, filename);
      
      writeFile(filepath, executionPrompt);
      generatedFiles.push({ section: section.number, prompt: promptNumber, filename });
      totalPrompts++;
      
      console.log(`   ✅ ${filename} - ${prompt.name} (${prompt.frs.length} FRs)`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log('✅ Segmentation complete!\n');
  console.log('📊 Summary:');
  console.log(`  - Sections processed: ${sections.length}`);
  console.log(`  - Total FRs: ${sections.reduce((sum, s) => sum + s.frs.length, 0)}`);
  console.log(`  - Execution prompts generated: ${totalPrompts}\n`);
  
  console.log('📋 Generated Files:');
  for (const file of generatedFiles) {
    console.log(`  - E${file.section.toString().padStart(2, '0')}-P${file.prompt.toString().padStart(2, '0')}: ${file.filename}`);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('  1. Review the generated execution prompts');
  console.log('  2. Execute them in order (E01-P01, E01-P02, ..., E02-P01, ...)');
  console.log('  3. Each prompt is self-contained with all context needed');
  console.log('  4. Validate implementation after each prompt\n');
  
  console.log('✨ Done!\n');
}

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  validateArgs,
  parseIntegratedSpec,
  extractFeatureRequirements,
  detectFRTypes,
  groupIntoPrompts,
  generateExecutionPrompt
};

