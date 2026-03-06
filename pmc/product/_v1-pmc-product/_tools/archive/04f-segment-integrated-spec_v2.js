#!/usr/bin/env node

/**
 * Integrated Spec Segmenter (v2)
 * 
 * Purpose: Segment integrated extension specification into progressive execution prompts.
 * 
 * Interactive script with default paths based on product abbreviation.
 * 
 * Usage:
 *   From pmc/product/_tools/, run:
 *     node 04f-segment-integrated-spec_v2.js "Project Name" product-abbreviation
 * 
 * Examples:
 *     node 04f-segment-integrated-spec_v2.js "LoRA Pipeline" pipeline
 *     node 04f-segment-integrated-spec_v2.js "Bright Module Orchestrator" bmo
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Convert path to display format (full absolute path)
function toDisplayPath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  return normalized;
}

// Validate that a file exists
function validatePath(filePath, shouldExist = true) {
  const exists = fs.existsSync(filePath);
  
  if (shouldExist && !exists) {
    return { valid: false, message: `File does not exist: ${toDisplayPath(filePath)}` };
  }
  
  if (!shouldExist && exists) {
    return { 
      valid: true, 
      warning: `Warning: Directory already exists, files may be overwritten: ${toDisplayPath(filePath)}` 
    };
  }
  
  return { valid: true };
}

// Resolve various path formats to absolute paths
function resolvePath(inputPath) {
  // Handle absolute Windows paths
  if (inputPath.match(/^[A-Za-z]:\\/)) {
    return path.normalize(inputPath);
  }
  
  // Handle relative paths
  if (inputPath.startsWith('../') || inputPath.startsWith('./')) {
    return path.resolve(__dirname, inputPath);
  }
  
  // Handle paths relative to project root
  if (inputPath.startsWith('pmc/')) {
    return path.resolve(__dirname, '../..', inputPath);
  }
  
  // Default: treat as relative to current directory
  return path.resolve(process.cwd(), inputPath);
}

// Get a valid directory path from user
async function getValidPath(promptText, defaultPath, shouldExist = false) {
  while (true) {
    const resolvedDefault = resolvePath(defaultPath);
    const validation = validatePath(resolvedDefault, shouldExist);
    
    console.log(`\n${promptText}`);
    console.log(`Default: ${toDisplayPath(resolvedDefault)}`);
    
    if (validation.warning) {
      console.log(`⚠️  ${validation.warning}`);
    }
    
    const input = await question('> ');
    
    // Use default if empty input
    if (!input.trim()) {
      if (validation.valid) {
        return resolvedDefault;
      } else {
        console.log(`❌ ${validation.message}`);
        continue;
      }
    }
    
    // Validate user input
    const resolvedInput = resolvePath(input.trim());
    const inputValidation = validatePath(resolvedInput, shouldExist);
    
    if (inputValidation.valid) {
      if (inputValidation.warning) {
        console.log(`⚠️  ${inputValidation.warning}`);
        const confirm = await question('Continue? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
          continue;
        }
      }
      return resolvedInput;
    } else {
      console.log(`❌ ${inputValidation.message}`);
    }
  }
}

// Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Write file content
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

// ============================================================================
// SEGMENTATION LOGIC (from v1)
// ============================================================================

const CONFIG = {
  layers: ['database', 'api', 'ui', 'integration'],
  
  layerDescriptions: {
    database: 'Database Setup - Tables, Migrations, RLS Policies',
    api: 'API Routes - Backend Logic and Data Access',
    ui: 'UI Components - User Interface Building Blocks',
    integration: 'Integration - Hooks, State Management, Page Assembly',
  },
  
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

function extractSections(content) {
  const sections = [];
  const sectionRegex = /## SECTION (\d+):\s*(.+?)(?=\n## SECTION \d+:|$)/gs;
  
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionNumber = parseInt(match[1]);
    const fullContent = match[0];
    const titleMatch = fullContent.match(/## SECTION \d+:\s*(.+?)(?:\s*-\s*INTEGRATED)?$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    
    sections.push({
      number: sectionNumber,
      title: title,
      content: fullContent,
    });
  }
  
  return sections;
}

function extractFeatures(sectionContent) {
  const features = [];
  const featureRegex = /#### (FR-\d+\.\d+(?:\.\d+)?):(.+?)(?=\n#### FR-|\n### |$)/gs;
  
  let match;
  while ((match = featureRegex.exec(sectionContent)) !== null) {
    const featureId = match[1];
    const featureName = match[2].trim();
    const featureContent = match[0];
    
    features.push({
      id: featureId,
      name: featureName,
      content: featureContent,
    });
  }
  
  return features;
}

function categorizeFeature(feature) {
  const content = feature.content.toLowerCase();
  const layers = [];
  
  if (/table|migration|rls|policy|database|schema|column/i.test(content)) {
    layers.push('database');
  }
  
  if (/api|route|endpoint|handler|request|response/i.test(content)) {
    layers.push('api');
  }
  
  if (/component|page|ui|interface|form|button|card|dialog/i.test(content)) {
    layers.push('ui');
  }
  
  if (/hook|query|mutation|state|integration|navigation/i.test(content)) {
    layers.push('integration');
  }
  
  // Default to all layers if nothing detected
  if (layers.length === 0) {
    layers.push('database', 'api', 'ui', 'integration');
  }
  
  return layers;
}

function groupFeaturesByLayer(features) {
  const groups = {
    database: [],
    api: [],
    ui: [],
    integration: [],
  };
  
  for (const feature of features) {
    const layers = categorizeFeature(feature);
    
    for (const layer of layers) {
      if (groups[layer]) {
        groups[layer].push(feature);
      }
    }
  }
  
  return groups;
}

function formatFeature(feature) {
  return `### ${feature.id}: ${feature.name}

${feature.content}

---
`;
}

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

**Prompt Status**: Ready for execution  
**Estimated Time**: ${estimateTime(features.length, layer)}  
**Next Prompt**: E${sectionNum}-P${String(promptNum + 1).padStart(2, '0')} (${CONFIG.layers[promptNum] || 'Next section'})
`;

  return prompt;
}

function buildDependencies(sectionIndex, promptIndex, allSections) {
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

function generateSectionPrompts(section, sectionIndex, allSections, outputDir) {
  const prompts = [];
  
  if (section.number === 1) {
    console.log(`   ⚠️  Section 1 (Foundation): Most infrastructure exists, creating minimal prompts for new tables only`);
  }
  
  const features = extractFeatures(section.content);
  
  if (features.length === 0) {
    console.log(`   ⚠️  No features found in section ${section.number}`);
    return prompts;
  }
  
  console.log(`   📋 Found ${features.length} features`);
  
  const groups = groupFeaturesByLayer(features);
  
  CONFIG.layers.forEach((layer, layerIndex) => {
    const layerFeatures = groups[layer];
    
    if (layerFeatures.length === 0) {
      return;
    }
    
    console.log(`      - ${layer}: ${layerFeatures.length} features`);
    
    const dependencies = buildDependencies(sectionIndex, layerIndex, allSections);
    const prompt = generateExecutionPrompt(section, layer, layerFeatures, dependencies);
    
    const sectionNum = String(section.number).padStart(2, '0');
    const promptNum = String(layerIndex + 1).padStart(2, '0');
    const filename = `04f-execution-E${sectionNum}-P${promptNum}.md`;
    const filepath = path.join(outputDir, filename);
    
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
  console.log(`✓ Created execution index: ${indexPath}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Check for required command-line arguments
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      console.error('Usage: node 04f-segment-integrated-spec_v2.js "Project Name" product-abbreviation');
      console.error('Example:');
      console.error('  node 04f-segment-integrated-spec_v2.js "LoRA Pipeline" pipeline');
      process.exit(1);
    }
    
    const [projectName, productAbbreviation] = args;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║      Integrated Spec Segmenter (Interactive v2)            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`Project: ${projectName} (${productAbbreviation})\n`);
    
    // Step 1: Get integrated spec path
    console.log('Step 1: Locate Integrated Extension Specification');
    console.log('──────────────────────────────────────────────────');
    
    const defaultInputPath = path.resolve(
      __dirname,
      '..',
      '_mapping',
      productAbbreviation,
      `04e-${productAbbreviation}-integrated-extension-spec_v1.md`
    );
    
    const inputPath = await getValidPath(
      'Enter path to integrated extension specification:',
      defaultInputPath,
      true
    );
    
    console.log(`✓ Using integrated spec: ${toDisplayPath(inputPath)}`);
    
    // Step 2: Get output directory path
    console.log('\n\nStep 2: Choose Output Directory for Execution Prompts');
    console.log('──────────────────────────────────────────────────────');
    
    const defaultOutputDir = path.resolve(
      __dirname,
      '..',
      '_mapping',
      productAbbreviation,
      '_execution-prompts'
    );
    
    const outputDir = await getValidPath(
      'Enter path for execution prompts directory:',
      defaultOutputDir,
      false
    );
    
    console.log(`✓ Prompts will be saved to: ${toDisplayPath(outputDir)}`);
    
    // Step 3: Process file
    console.log('\n\nStep 3: Segment and Generate Prompts');
    console.log('─────────────────────────────────────');
    
    console.log('📂 Reading integrated specification...');
    const content = readFile(inputPath);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${toDisplayPath(outputDir)}`);
    }
    
    console.log('🔍 Extracting sections...');
    const sections = extractSections(content);
    console.log(`✓ Found ${sections.length} sections`);
    
    console.log('📝 Generating execution prompts...\n');
    
    const allPrompts = [];
    
    sections.forEach((section, index) => {
      console.log(`\n📦 Section ${section.number}: ${section.title}`);
      const sectionPrompts = generateSectionPrompts(section, index, sections, outputDir);
      allPrompts.push(...sectionPrompts);
      console.log(`   ✅ Generated ${sectionPrompts.length} prompts`);
    });
    
    console.log('\n📋 Generating execution index...');
    generateExecutionIndex(allPrompts, sections, outputDir);
    
    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                ✅ SEGMENTATION COMPLETE!                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Summary:');
    console.log('─────────');
    console.log(`Project:                ${projectName} (${productAbbreviation})`);
    console.log(`Sections Processed:     ${sections.length}`);
    console.log(`Prompts Generated:      ${allPrompts.length}`);
    console.log(`Output Directory:       ${toDisplayPath(outputDir)}`);
    console.log(`Total Features:         ${allPrompts.reduce((sum, p) => sum + p.featureCount, 0)}`);
    
    console.log('\n\n📖 Next Steps:');
    console.log('─────────────');
    console.log('1. Review the EXECUTION-INDEX.md file in the output directory');
    console.log('');
    console.log('2. Execute prompts in order:');
    if (allPrompts.length > 0) {
      console.log(`   Start with: ${allPrompts[0].filename}`);
    }
    console.log('');
    console.log('3. Complete all acceptance criteria before moving to next prompt');
    console.log('');
    console.log('4. Run validation steps after each prompt');
    console.log('');
    console.log('5. Progressive execution ensures dependencies are satisfied');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();
