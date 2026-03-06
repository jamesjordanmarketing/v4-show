/**
 * Integrated Spec Segmenter (v1)
 * 
 * Purpose: Segment integrated extension specification into progressive execution prompts.
 * 
 * Input:
 *   - Integrated Extension Spec (04e): Features with existing infrastructure patterns
 * 
 * Output:
 *   - Execution Prompts (04f-E[XX]-P[YY].md): Progressive prompts for implementation
 * 
 * Progressive Dependency Model:
 *   - Intra-section: Database → API → UI → Integration
 *   - Inter-section: E01 → E02 → E03 with dependency chains
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v1.js \
 *     --input "path/to/04e-integrated-extension-spec_v1.md" \
 *     --output-dir "path/to/execution-prompts/"
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Prompt grouping by layer
  layers: ['database', 'api', 'ui', 'integration'],
  
  // Layer descriptions
  layerDescriptions: {
    database: 'Database Setup - Tables, Migrations, RLS Policies',
    api: 'API Routes - Backend Logic and Data Access',
    ui: 'UI Components - User Interface Building Blocks',
    integration: 'Integration - Hooks, State Management, Page Assembly',
  },
  
  // Infrastructure context template
  infrastructureContext: `
**What Exists in Codebase (ALWAYS USE)**:
- **Authentication**: Supabase Auth via \`requireAuth()\` from \`@/lib/supabase-server\`
- **Database**: Supabase Client via \`createServerSupabaseClient()\` from \`@/lib/supabase-server\`
- **Storage**: Supabase Storage via \`createServerSupabaseAdminClient()\` for signed URLs
- **Components**: 47+ shadcn/ui components at \`@/components/ui/*\`
- **State Management**: React Query v5 with custom hooks pattern
- **API Format**: \`{ success: true, data }\` for success, \`{ error, details }\` for errors
`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    parsed[key] = value;
  }
  
  return parsed;
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Write file content
 */
function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Extract sections from integrated spec
 */
function extractSections(content) {
  const sections = [];
  const sectionRegex = /## SECTION (\d+):\s*(.+?)\s*-\s*INTEGRATED([\s\S]*?)(?=\n## SECTION \d+:|## APPENDIX:|$)/g;
  
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionNumber = parseInt(match[1]);
    const title = match[2].trim();
    const content = match[3];
    
    sections.push({
      number: sectionNumber,
      title: title,
      content: content,
      fullMatch: match[0],
    });
  }
  
  return sections;
}

/**
 * Extract features from a section
 */
function extractFeatures(sectionContent) {
  const features = [];
  const featureRegex = /#### (FR-\d+\.\d+(?:\.\d+)?):(.+?)\n([\s\S]*?)(?=\n#### FR-|\n### [\w\s]+ Summary|$)/g;
  
  let match;
  while ((match = featureRegex.exec(sectionContent)) !== null) {
    const featureId = match[1];
    const featureName = match[2].trim();
    const featureContent = match[3];
    
    features.push({
      id: featureId,
      name: featureName,
      content: featureContent,
      fullContent: match[0],
    });
  }
  
  return features;
}

/**
 * Categorize feature by layer
 */
function categorizeFeature(feature) {
  const content = feature.content.toLowerCase();
  const layers = [];
  
  // Check for database layer
  if (content.includes('database') || 
      content.includes('table') || 
      content.includes('migration') ||
      content.includes('schema') ||
      content.includes('rls')) {
    layers.push('database');
  }
  
  // Check for API layer
  if (content.includes('api') || 
      content.includes('route') || 
      content.includes('endpoint') ||
      content.includes('post /') ||
      content.includes('get /') ||
      content.includes('patch /') ||
      content.includes('delete /')) {
    layers.push('api');
  }
  
  // Check for UI layer
  if (content.includes('component') || 
      content.includes('ui') || 
      content.includes('page') ||
      content.includes('button') ||
      content.includes('form') ||
      content.includes('card') ||
      content.includes('dialog')) {
    layers.push('ui');
  }
  
  // Check for integration layer
  if (content.includes('hook') || 
      content.includes('usequery') || 
      content.includes('usemutation') ||
      content.includes('state') ||
      content.includes('navigation')) {
    layers.push('integration');
  }
  
  // If no specific layer identified, default to integration
  if (layers.length === 0) {
    layers.push('integration');
  }
  
  return layers;
}

/**
 * Group features by layer
 */
function groupFeaturesByLayer(features) {
  const groups = {
    database: [],
    api: [],
    ui: [],
    integration: [],
  };
  
  for (const feature of features) {
    const layers = categorizeFeature(feature);
    
    // Add feature to all applicable layers
    for (const layer of layers) {
      if (groups[layer]) {
        groups[layer].push(feature);
      }
    }
  }
  
  return groups;
}

/**
 * Format feature for prompt
 */
function formatFeature(feature) {
  return `### ${feature.id}: ${feature.name}

${feature.content}

---
`;
}

/**
 * Generate execution prompt
 */
function generateExecutionPrompt(section, layer, features, dependencies) {
  const sectionNum = String(section.number).padStart(2, '0');
  const promptNum = CONFIG.layers.indexOf(layer) + 1;
  const promptNumPadded = String(promptNum).padStart(2, '0');
  
  const title = `Section ${section.number} - ${layer.charAt(0).toUpperCase() + layer.slice(1)} Layer`;
  const description = CONFIG.layerDescriptions[layer];
  
  let prompt = `# Execution Prompt: E${sectionNum}-P${promptNumPadded}

**Section**: ${section.number} - ${section.title}  
**Layer**: ${description}  
**Dependencies**: ${dependencies.previous.length > 0 ? dependencies.previous.join(', ') : 'None'}

---

## CONTEXT SUMMARY

${CONFIG.infrastructureContext}

### From Previous Prompts (AVAILABLE)

${dependencies.previousPrompts.length > 0 ? dependencies.previousPrompts.join('\n') : 'None - this is the first prompt in this section'}

### From Previous Sections (AVAILABLE)

${dependencies.previousSections.length > 0 ? dependencies.previousSections.join('\n') : 'None - this is the first section'}

---

## FEATURES TO IMPLEMENT

This prompt implements **${features.length} feature(s)** at the ${layer} layer:

${features.map(f => `- ${f.id}: ${f.name}`).join('\n')}

---

${features.map(f => formatFeature(f)).join('\n')}

---

## IMPLEMENTATION REQUIREMENTS

All code must follow existing patterns from the codebase:

### Database Layer Requirements
- ✅ Use Supabase migrations (SQL files in \`supabase/migrations/\`)
- ✅ Enable RLS on all tables
- ✅ Create policies for SELECT, INSERT, UPDATE, DELETE
- ✅ Add indexes for foreign keys and frequently queried columns
- ✅ Use \`auth.uid()\` for user ownership checks

### API Layer Requirements
- ✅ Use \`requireAuth()\` for authentication in all routes
- ✅ Use \`createServerSupabaseClient()\` for database queries
- ✅ Follow response format: \`{ success: true, data }\` or \`{ error, details }\`
- ✅ Add try-catch for error handling
- ✅ Log errors with \`console.error()\`
- ✅ Use Zod for request validation

### UI Layer Requirements
- ✅ Import all components from \`@/components/ui/\`
- ✅ Use \`'use client'\` directive for client components
- ✅ Use TypeScript with proper interfaces
- ✅ Use Tailwind CSS for styling
- ✅ Use \`cn()\` utility for class merging
- ✅ Follow existing component patterns

### Integration Layer Requirements
- ✅ Use React Query for all data fetching
- ✅ Create custom hooks following \`use[Resource]\` naming
- ✅ Use \`useQuery\` for fetching, \`useMutation\` for modifications
- ✅ Invalidate queries on success in mutations
- ✅ Show toast notifications on success/error (use Sonner)

---

## ACCEPTANCE CRITERIA

`;

  // Add acceptance criteria based on layer
  if (layer === 'database') {
    prompt += `
- [ ] Migration file created in \`supabase/migrations/\`
- [ ] All tables created successfully
- [ ] RLS policies enabled and working
- [ ] Indexes created for performance
- [ ] Foreign key constraints working
- [ ] Can insert/query/update/delete data
- [ ] User isolation working (users can only see own data)
`;
  } else if (layer === 'api') {
    prompt += `
- [ ] All API routes created in \`src/app/api/\`
- [ ] Authentication working (requireAuth)
- [ ] Database queries working
- [ ] Response format consistent
- [ ] Error handling working
- [ ] Validation working (Zod schemas)
- [ ] Can test with curl/Postman
`;
  } else if (layer === 'ui') {
    prompt += `
- [ ] All components created
- [ ] Components render without errors
- [ ] TypeScript types correct
- [ ] Styling matches design
- [ ] shadcn/ui components used correctly
- [ ] Responsive on mobile/desktop
- [ ] Accessibility considerations
`;
  } else if (layer === 'integration') {
    prompt += `
- [ ] Hooks created and working
- [ ] React Query setup correct
- [ ] Data fetching working
- [ ] Mutations working
- [ ] Query invalidation working
- [ ] Toast notifications working
- [ ] Pages render with data
- [ ] Navigation working
`;
  }

  prompt += `
---

## VALIDATION STEPS

1. **Code Review**:
   - Check all patterns match Infrastructure Inventory
   - Verify imports are correct
   - Ensure TypeScript types are defined

2. **Testing**:
   - Test all functionality manually
   - Check error cases
   - Verify authentication works
   - Test with different user accounts

3. **Integration Check**:
   - Verify works with existing infrastructure
   - Check no breaking changes to existing features
   - Confirm data appears correctly

---

## DO NOT

- ❌ Create new authentication system
- ❌ Use Prisma or any ORM (use Supabase Client)
- ❌ Use NextAuth (use Supabase Auth)
- ❌ Use AWS S3 SDK (use Supabase Storage)
- ❌ Create BullMQ/Redis infrastructure (use Edge Functions if needed)
- ❌ Use SWR (use React Query)
- ❌ Store URLs in database (store paths only, generate URLs on-demand)
- ❌ Modify existing infrastructure files
- ❌ Add dependencies not already in package.json

---

## REFERENCE DOCUMENTS

For detailed patterns and examples, refer to:

- **Infrastructure Inventory**: Existing patterns to use
- **Extension Strategy**: Feature mapping to infrastructure
- **Implementation Guide**: Complete code examples

---

**Prompt Status**: Ready for execution  
**Estimated Time**: ${estimateTime(features.length, layer)}  
**Next Prompt**: E${sectionNum}-P${String(promptNum + 1).padStart(2, '0')} (${CONFIG.layers[promptNum] || 'Next section'})
`;

  return prompt;
}

/**
 * Estimate implementation time
 */
function estimateTime(featureCount, layer) {
  const baseTime = {
    database: 1,
    api: 2,
    ui: 3,
    integration: 2,
  };
  
  const hours = baseTime[layer] * featureCount;
  return `${hours}-${hours + 2} hours`;
}

/**
 * Build dependencies object
 */
function buildDependencies(sectionIndex, promptIndex, allSections, currentPrompts) {
  const dependencies = {
    previous: [],
    previousPrompts: [],
    previousSections: [],
  };
  
  // Add dependency on previous prompts in same section
  for (let i = 0; i < promptIndex; i++) {
    const prevLayer = CONFIG.layers[i];
    dependencies.previous.push(`E${String(sectionIndex + 1).padStart(2, '0')}-P${String(i + 1).padStart(2, '0')}`);
    dependencies.previousPrompts.push(`- **${prevLayer}**: ${CONFIG.layerDescriptions[prevLayer]}`);
  }
  
  // Add dependency on previous sections
  for (let i = 0; i < sectionIndex; i++) {
    const prevSection = allSections[i];
    dependencies.previousSections.push(`- **Section ${prevSection.number}**: ${prevSection.title}`);
  }
  
  return dependencies;
}

/**
 * Generate all prompts for a section
 */
function generateSectionPrompts(section, sectionIndex, allSections, outputDir) {
  const prompts = [];
  
  // Skip Section 1 if it's foundation (already exists in codebase)
  if (section.number === 1) {
    console.log(`   ⚠️  Section 1 (Foundation): Most infrastructure exists, creating minimal prompts for new tables only`);
  }
  
  // Extract features from section
  const features = extractFeatures(section.content);
  
  if (features.length === 0) {
    console.log(`   ⚠️  No features found in section ${section.number}`);
    return prompts;
  }
  
  console.log(`   📋 Found ${features.length} features`);
  
  // Group features by layer
  const groups = groupFeaturesByLayer(features);
  
  // Generate prompt for each layer that has features
  CONFIG.layers.forEach((layer, layerIndex) => {
    const layerFeatures = groups[layer];
    
    if (layerFeatures.length === 0) {
      return; // Skip empty layers
    }
    
    console.log(`      - ${layer}: ${layerFeatures.length} features`);
    
    // Build dependencies
    const dependencies = buildDependencies(sectionIndex, layerIndex, allSections, prompts);
    
    // Generate prompt
    const prompt = generateExecutionPrompt(section, layer, layerFeatures, dependencies);
    
    // Create filename
    const sectionNum = String(section.number).padStart(2, '0');
    const promptNum = String(layerIndex + 1).padStart(2, '0');
    const filename = `04f-execution-E${sectionNum}-P${promptNum}.md`;
    const filepath = path.join(outputDir, filename);
    
    // Write prompt
    writeFile(filepath, prompt);
    
    prompts.push({
      filename,
      filepath,
      layer,
      featureCount: layerFeatures.length,
    });
  });
  
  return prompts;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function main() {
  console.log('🚀 Integrated Spec Segmenter v1\n');
  
  // Parse arguments
  const args = parseArgs();
  
  if (!args.input || !args['output-dir']) {
    console.error('❌ Usage: node 04f-segment-integrated-spec_v1.js \\');
    console.error('    --input "path/to/04e-integrated-extension-spec_v1.md" \\');
    console.error('    --output-dir "path/to/execution-prompts/"');
    process.exit(1);
  }
  
  const inputPath = args.input;
  const outputDir = args['output-dir'];
  
  console.log('📂 Reading integrated specification...\n');
  const content = readFile(inputPath);
  console.log(`✅ Input: ${inputPath}\n`);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}\n`);
  }
  
  // Extract sections
  console.log('🔍 Extracting sections...\n');
  const sections = extractSections(content);
  console.log(`✅ Found ${sections.length} sections\n`);
  
  // Generate prompts for each section
  console.log('📝 Generating execution prompts...\n');
  
  const allPrompts = [];
  
  sections.forEach((section, index) => {
    console.log(`\n📦 Section ${section.number}: ${section.title}`);
    const sectionPrompts = generateSectionPrompts(section, index, sections, outputDir);
    allPrompts.push(...sectionPrompts);
    console.log(`   ✅ Generated ${sectionPrompts.length} prompts`);
  });
  
  // Generate index file
  console.log('\n📋 Generating execution index...\n');
  generateExecutionIndex(allPrompts, sections, outputDir);
  
  // Summary
  console.log('\n✅ SEGMENTATION COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   - Sections processed: ${sections.length}`);
  console.log(`   - Prompts generated: ${allPrompts.length}`);
  console.log(`   - Output directory: ${outputDir}`);
  console.log(`   - Total features: ${allPrompts.reduce((sum, p) => sum + p.featureCount, 0)}\n`);
  console.log('🎯 Next step: Execute prompts in order');
  console.log(`   Start with: ${allPrompts[0]?.filename || 'N/A'}\n`);
}

/**
 * Generate execution index
 */
function generateExecutionIndex(prompts, sections, outputDir) {
  let index = `# Execution Prompts Index

**Generated**: ${new Date().toISOString().split('T')[0]}  
**Total Prompts**: ${prompts.length}  
**Total Sections**: ${sections.length}

---

## Execution Order

Execute prompts in the order listed below. Each prompt builds upon the previous ones.

### Progressive Dependency Model

**Within Section** (Intra-section):
\`\`\`
Database → API → UI → Integration
\`\`\`

**Between Sections** (Inter-section):
\`\`\`
E01 → E02 → E03 → E04 → E05 → E06 → E07
\`\`\`

---

## Prompt List

`;

  // Group prompts by section
  const promptsBySection = {};
  
  prompts.forEach(prompt => {
    const sectionMatch = prompt.filename.match(/E(\d+)-P/);
    if (sectionMatch) {
      const sectionNum = parseInt(sectionMatch[1]);
      if (!promptsBySection[sectionNum]) {
        promptsBySection[sectionNum] = [];
      }
      promptsBySection[sectionNum].push(prompt);
    }
  });
  
  // Generate list
  sections.forEach(section => {
    const sectionPrompts = promptsBySection[section.number] || [];
    
    index += `\n### Section ${section.number}: ${section.title}\n\n`;
    
    if (sectionPrompts.length === 0) {
      index += `*No prompts generated for this section*\n`;
    } else {
      sectionPrompts.forEach((prompt, idx) => {
        index += `${idx + 1}. **${prompt.filename}** - ${prompt.layer} layer (${prompt.featureCount} features)\n`;
      });
    }
  });
  
  index += `\n---

## Usage

1. Execute each prompt in order
2. Complete all acceptance criteria before moving to next prompt
3. Run validation steps after each prompt
4. Do not skip prompts (dependencies matter)

---

**Status**: Ready for progressive execution
`;

  const indexPath = path.join(outputDir, 'EXECUTION-INDEX.md');
  writeFile(indexPath, index);
  console.log(`✅ Created execution index: ${indexPath}`);
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { 
  extractSections, 
  extractFeatures, 
  groupFeaturesByLayer, 
  generateExecutionPrompt 
};

