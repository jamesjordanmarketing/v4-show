#!/usr/bin/env node

/**
 * Integrated Spec Segmentation Script
 * 
 * This script segments an integrated extension specification into
 * progressive execution prompts with proper dependencies.
 * 
 * Usage:
 *   node 04f-segment-integrated-spec_v1.js \
 *     --input "path/to/integrated-spec.md" \
 *     --output-dir "path/to/output-directory"
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
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

// Read file with error handling
function readFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    console.log(`Reading: ${absolutePath}`);
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
  
  // Match section headers: ## SECTION N: Title - INTEGRATED
  const sectionRegex = /## SECTION (\d+): (.+?) - INTEGRATED/g;
  let match;
  const sectionStarts = [];
  
  while ((match = sectionRegex.exec(content)) !== null) {
    sectionStarts.push({
      number: parseInt(match[1]),
      title: match[2].trim(),
      startIndex: match.index,
    });
  }
  
  // Extract content for each section
  for (let i = 0; i < sectionStarts.length; i++) {
    const section = sectionStarts[i];
    const nextSection = sectionStarts[i + 1];
    const endIndex = nextSection ? nextSection.startIndex : content.length;
    const sectionContent = content.substring(section.startIndex, endIndex);
    
    sections.push({
      number: section.number,
      title: section.title,
      content: sectionContent,
    });
  }
  
  return sections;
}

// Extract feature requirements from section
function extractFeatureRequirements(sectionContent) {
  const features = [];
  
  // Match feature headers: #### FR-N.M: Title
  const frRegex = /#### (FR-\d+\.\d+): (.+?)$/gm;
  let match;
  const frStarts = [];
  
  while ((match = frRegex.exec(sectionContent)) !== null) {
    frStarts.push({
      id: match[1],
      title: match[2].trim(),
      startIndex: match.index,
    });
  }
  
  // Extract content for each FR
  for (let i = 0; i < frStarts.length; i++) {
    const fr = frStarts[i];
    const nextFr = frStarts[i + 1];
    const endIndex = nextFr ? nextFr.startIndex : sectionContent.length;
    const frContent = sectionContent.substring(fr.startIndex, endIndex);
    
    // Categorize FR by type
    const hasDatabase = /```sql/i.test(frContent) || /CREATE TABLE/i.test(frContent) || /ALTER TABLE/i.test(frContent);
    const hasAPI = /```typescript[\s\S]*?\/api\//i.test(frContent) || /export async function (GET|POST|PATCH|DELETE)/i.test(frContent);
    const hasHook = /```typescript[\s\S]*?use[A-Z]/i.test(frContent) || /useQuery|useMutation/i.test(frContent);
    const hasComponent = /```typescript[\s\S]*?export (default )?function/i.test(frContent) || /'use client'/i.test(frContent);
    
    features.push({
      id: fr.id,
      title: fr.title,
      content: frContent,
      hasDatabase,
      hasAPI,
      hasHook,
      hasComponent,
    });
  }
  
  return features;
}

// Group features into logical prompts
function groupFeaturesIntoPrompts(features, sectionNumber) {
  const prompts = [];
  
  // Prompt 1: Database Setup (if any database features)
  const databaseFeatures = features.filter(f => f.hasDatabase);
  if (databaseFeatures.length > 0) {
    prompts.push({
      number: 1,
      name: 'Database Setup',
      description: 'Create database tables, indexes, and RLS policies',
      features: databaseFeatures,
      dependencies: [],
    });
  }
  
  // Prompt 2: API Routes (if any API features)
  const apiFeatures = features.filter(f => f.hasAPI && !f.hasDatabase);
  if (apiFeatures.length > 0) {
    prompts.push({
      number: prompts.length + 1,
      name: 'API Routes',
      description: 'Implement API endpoints for data operations',
      features: apiFeatures,
      dependencies: databaseFeatures.length > 0 ? ['Database Setup'] : [],
    });
  }
  
  // Prompt 3: React Hooks (if any hook features)
  const hookFeatures = features.filter(f => f.hasHook && !f.hasAPI && !f.hasDatabase);
  if (hookFeatures.length > 0) {
    prompts.push({
      number: prompts.length + 1,
      name: 'React Hooks',
      description: 'Create React Query hooks for data fetching',
      features: hookFeatures,
      dependencies: apiFeatures.length > 0 ? ['API Routes'] : [],
    });
  }
  
  // Prompt 4: UI Components (if any component features)
  const componentFeatures = features.filter(f => f.hasComponent && !f.hasHook && !f.hasAPI && !f.hasDatabase);
  if (componentFeatures.length > 0) {
    prompts.push({
      number: prompts.length + 1,
      name: 'UI Components',
      description: 'Build user interface components and pages',
      features: componentFeatures,
      dependencies: hookFeatures.length > 0 ? ['React Hooks'] : apiFeatures.length > 0 ? ['API Routes'] : [],
    });
  }
  
  // If no clear categorization, create single prompt with all features
  if (prompts.length === 0 && features.length > 0) {
    prompts.push({
      number: 1,
      name: 'Implementation',
      description: 'Implement all features for this section',
      features: features,
      dependencies: [],
    });
  }
  
  return prompts;
}

// Generate execution prompt
function generateExecutionPrompt(section, prompt, previousSections) {
  const sectionNumber = section.number.toString().padStart(2, '0');
  const promptNumber = prompt.number.toString().padStart(2, '0');
  
  let content = `# Execution Prompt: Section ${section.number} - Prompt ${prompt.number}

**Section**: ${section.title}
**Prompt**: ${prompt.name}
**Target**: ${prompt.description}
**Dependencies**: ${prompt.dependencies.length > 0 ? prompt.dependencies.join(', ') : 'None'}
**Estimated Effort**: 4-8 hours
**Risk Level**: Low

---

## Context Summary

### Existing Infrastructure (ALWAYS USE)

**Authentication**:
- \`requireAuth()\` from \`/lib/supabase-server.ts\` - Use in all API routes
- \`useAuth()\` from \`/lib/auth-context.tsx\` - Use in client components
- User ID available as \`user.id\` after authentication

**Database**:
- \`createServerSupabaseClient()\` from \`/lib/supabase-server.ts\` - Use for queries
- Supabase query builder (NOT Prisma)
- RLS policies enabled on all tables

**Storage**:
- \`createServerSupabaseAdminClient()\` from \`/lib/supabase-server.ts\` - Use for signed URLs
- Supabase Storage buckets: \`lora-datasets\`, \`lora-models\`
- Always store paths, never URLs in database

**Components**:
- 47+ shadcn/ui components available in \`/components/ui/\`
- Button, Card, Dialog, Table, Badge, Progress, Input, Label, etc.

**State Management**:
- React Query (\`@tanstack/react-query\`) - Use \`useQuery\` and \`useMutation\`
- Stale time: 60 seconds, Retry: 1

**Layout**:
- Dashboard layout: \`/app/(dashboard)/layout.tsx\` - All pages automatically wrapped
- Navigation: Add new items to sidebar if needed

---

### From Previous Prompts (AVAILABLE)

${prompt.dependencies.length > 0 
  ? prompt.dependencies.map(dep => `- ${dep}: Completed in previous prompt`).join('\n')
  : 'None - This is the first prompt in this section'}

---

### From Previous Sections (AVAILABLE)

${previousSections.length > 0
  ? previousSections.map(s => `- Section ${s.number}: ${s.title} - Complete`).join('\n')
  : 'None - This is the first section'}

---

## Features to Implement

${prompt.features.map((feature, index) => `
### Feature ${index + 1}: ${feature.id} - ${feature.title}

${feature.content}

---
`).join('\n')}

---

## Implementation Requirements

**CRITICAL - Follow These Patterns**:

1. **Authentication**: All API routes MUST use \`requireAuth()\`
   \`\`\`typescript
   const { user, response } = await requireAuth(request);
   if (response) return response;
   \`\`\`

2. **Database Queries**: Use Supabase query builder (NOT Prisma)
   \`\`\`typescript
   const supabase = await createServerSupabaseClient();
   const { data, error } = await supabase.from('table').select('*');
   \`\`\`

3. **Storage Operations**: Use admin client for signed URLs
   \`\`\`typescript
   const supabase = createServerSupabaseAdminClient();
   const { data } = await supabase.storage.from('bucket').createSignedUrl(path, 3600);
   \`\`\`

4. **API Response Format**: Use consistent format
   \`\`\`typescript
   // Success
   return NextResponse.json({ success: true, data: { ... } });
   
   // Error
   return NextResponse.json({ error: 'Message', details: '...' }, { status: 400 });
   \`\`\`

5. **React Hooks**: Use React Query patterns
   \`\`\`typescript
   export function useData() {
     return useQuery({
       queryKey: ['key'],
       queryFn: async () => { ... },
       staleTime: 60000,
       retry: 1,
     });
   }
   \`\`\`

6. **Components**: Use existing shadcn/ui components
   \`\`\`typescript
   import { Button } from '@/components/ui/button';
   import { Card } from '@/components/ui/card';
   \`\`\`

---

## Acceptance Criteria

${prompt.features.map((feature, index) => `
**Feature ${index + 1} (${feature.id})**:
- [ ] Implementation matches integrated spec exactly
- [ ] Uses existing infrastructure patterns
- [ ] No new dependencies added
- [ ] Tests pass (if applicable)
- [ ] No linter errors
`).join('\n')}

---

## Validation Steps

After implementation:

1. **Database** (if applicable):
   - Run migration: \`supabase db push\`
   - Verify tables exist
   - Test RLS policies

2. **API Routes** (if applicable):
   - Test with curl or Postman
   - Verify authentication works
   - Check response format matches spec

3. **UI Components** (if applicable):
   - Visual verification
   - Test user interactions
   - Verify data fetching works

4. **Integration**:
   - Test end-to-end flow
   - Verify no console errors
   - Check performance

---

## DO NOT

- ❌ Use Prisma (use Supabase Client instead)
- ❌ Use NextAuth (use Supabase Auth instead)
- ❌ Use S3 SDK (use Supabase Storage instead)
- ❌ Use BullMQ/Redis (use Edge Functions instead)
- ❌ Use SWR (use React Query instead)
- ❌ Store URLs in database (store paths only)
- ❌ Add new dependencies without approval
- ❌ Modify existing infrastructure files
- ❌ Skip authentication checks
- ❌ Skip RLS policies

---

## Files to Create/Modify

${prompt.features.map(feature => {
  const files = [];
  if (feature.hasDatabase) files.push('- `supabase/migrations/YYYYMMDD_*.sql`');
  if (feature.hasAPI) files.push('- `src/app/api/*/route.ts`');
  if (feature.hasHook) files.push('- `src/hooks/use-*.ts`');
  if (feature.hasComponent) files.push('- `src/app/(dashboard)/*/page.tsx` or `src/components/*/*.tsx`');
  return files.join('\n');
}).filter(Boolean).join('\n')}

---

**Prompt Status**: Ready for Implementation
**Next Prompt**: Section ${section.number} - Prompt ${prompt.number + 1} (after this is complete)
`;

  return content;
}

// Main execution
function main() {
  console.log('\n🚀 Integrated Spec Segmentation Script v1.0\n');
  console.log('=' .repeat(60));
  
  // Parse arguments
  const args = parseArgs();
  
  // Validate required arguments
  const required = ['input', 'output-dir'];
  const missing = required.filter(key => !args[key]);
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing required arguments: ${missing.join(', ')}\n`);
    console.log('Usage:');
    console.log('  node 04f-segment-integrated-spec_v1.js \\');
    console.log('    --input "path/to/integrated-spec.md" \\');
    console.log('    --output-dir "path/to/output-directory"\n');
    process.exit(1);
  }
  
  console.log('\n📂 Input File:', args.input);
  console.log('📁 Output Directory:', args['output-dir']);
  console.log('\n' + '='.repeat(60));
  
  // Read integrated spec
  console.log('\n📖 Reading integrated specification...');
  const specContent = readFile(args.input);
  console.log(`   File size: ${(specContent.length / 1024).toFixed(2)} KB`);
  
  // Parse sections
  console.log('\n🔍 Parsing sections...');
  const sections = parseIntegratedSpec(specContent);
  console.log(`   Found ${sections.length} sections`);
  
  // Process each section
  console.log('\n🔨 Generating execution prompts...\n');
  
  const outputDir = args['output-dir'];
  let totalPrompts = 0;
  const previousSections = [];
  
  for (const section of sections) {
    console.log(`\n📋 Section ${section.number}: ${section.title}`);
    
    // Extract features
    const features = extractFeatureRequirements(section.content);
    console.log(`   Features found: ${features.length}`);
    
    if (features.length === 0) {
      console.log(`   ⚠️  No features found, skipping section`);
      continue;
    }
    
    // Group into prompts
    const prompts = groupFeaturesIntoPrompts(features, section.number);
    console.log(`   Prompts to generate: ${prompts.length}`);
    
    // Generate each prompt
    for (const prompt of prompts) {
      const sectionNumber = section.number.toString().padStart(2, '0');
      const promptNumber = prompt.number.toString().padStart(2, '0');
      const filename = `04f-execution-E${sectionNumber}-P${promptNumber}.md`;
      const filepath = path.join(outputDir, filename);
      
      const promptContent = generateExecutionPrompt(section, prompt, previousSections);
      const absolutePath = writeFile(filepath, promptContent);
      
      console.log(`   ✅ Generated: ${filename} (${(promptContent.length / 1024).toFixed(2)} KB)`);
      totalPrompts++;
    }
    
    // Track completed sections
    previousSections.push({
      number: section.number,
      title: section.title,
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✨ Segmentation complete!`);
  console.log(`   Total sections processed: ${sections.length}`);
  console.log(`   Total prompts generated: ${totalPrompts}`);
  console.log(`   Output directory: ${path.resolve(outputDir)}`);
  console.log('\n📋 NEXT STEPS:\n');
  console.log('Execute prompts in order:');
  console.log('  1. E01-P01 → E01-P02 → E01-P03 → ...');
  console.log('  2. E02-P01 → E02-P02 → ...');
  console.log('  3. Continue through all sections');
  console.log('\nEach prompt is self-contained with:');
  console.log('  - Complete feature specifications');
  console.log('  - Exact code patterns to follow');
  console.log('  - Clear dependencies');
  console.log('  - Acceptance criteria');
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run main function
main();

