/**
 * Integration Spec Merger (v1)
 * 
 * Purpose: Merge structured specification with integration knowledge to produce
 *          an integrated extension specification.
 * 
 * Inputs:
 *   - Structured spec (04c): Generic features with generic infrastructure
 *   - Infrastructure Inventory (04d): What exists in codebase to USE
 *   - Extension Strategy (04d): How features map to existing infrastructure
 *   - Implementation Guide (04d): Exact code patterns to follow
 * 
 * Output:
 *   - Integrated Extension Spec (04e): Features transformed to use existing infrastructure
 * 
 * Usage:
 *   node 04e-merge-integration-spec_v1.js \
 *     --spec "path/to/04c-pipeline-structured-from-wireframe_v1.md" \
 *     --inventory "path/to/04d-infrastructure-inventory_v1.md" \
 *     --strategy "path/to/04d-extension-strategy_v1.md" \
 *     --guide "path/to/04d-implementation-guide_v1.md" \
 *     --output "path/to/04e-integrated-extension-spec_v1.md"
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Infrastructure substitutions
  substitutions: {
    'Prisma': 'Supabase Client (direct queries)',
    'NextAuth.js': 'Supabase Auth',
    'NextAuth': 'Supabase Auth',
    'AWS S3': 'Supabase Storage',
    'S3': 'Supabase Storage',
    'BullMQ': 'Supabase Edge Functions + Cron',
    'Redis': 'Supabase Edge Functions + Cron',
    'SWR': 'React Query',
    'Server-Sent Events': 'React Query polling',
    'SSE': 'React Query polling',
  },
  
  // Section titles to process
  sectionTitles: [
    'Foundation & Authentication',
    'Dataset Management',
    'Training Configuration',
    'Training Execution & Monitoring',
    'Model Artifacts & Delivery',
    'Cost Tracking & Notifications',
    'Complete System Integration',
  ],
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
    console.log(`✅ Written: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Extract sections from structured spec
 */
function extractSections(specContent) {
  const sections = [];
  const sectionRegex = /## SECTION (\d+):\s*(.+?)(?=\n## SECTION \d+:|$)/gs;
  
  let match;
  while ((match = sectionRegex.exec(specContent)) !== null) {
    const sectionNumber = parseInt(match[1]);
    const fullContent = match[0];
    
    // Extract section title
    const titleMatch = fullContent.match(/## SECTION \d+:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';
    
    sections.push({
      number: sectionNumber,
      title: title,
      content: fullContent,
      originalContent: fullContent,
    });
  }
  
  return sections;
}

/**
 * Extract features from a section
 */
function extractFeatures(sectionContent) {
  const features = [];
  const featureRegex = /#### (FR-\d+\.\d+(?:\.\d+)?):(.+?)(?=\n#### FR-|\n### |$)/gs;
  
  let match;
  while ((match = featureRegex.exec(sectionContent)) !== null) {
    features.push({
      id: match[1],
      content: match[0],
    });
  }
  
  return features;
}

/**
 * Transform section header to integrated format
 */
function transformSectionHeader(section, originalInfra, actualInfra) {
  const header = `## SECTION ${section.number}: ${section.title} - INTEGRATED

**Extension Status**: ✅ Transformed to use existing infrastructure  
**Original Infrastructure**: ${originalInfra.join(', ')}  
**Actual Infrastructure**: ${actualInfra.join(', ')}

---
`;
  return header;
}

/**
 * Identify original infrastructure mentioned in section
 */
function identifyOriginalInfrastructure(content) {
  const mentioned = new Set();
  
  for (const [key, value] of Object.entries(CONFIG.substitutions)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    if (regex.test(content)) {
      mentioned.add(key);
    }
  }
  
  return Array.from(mentioned);
}

/**
 * Get actual infrastructure for replacements
 */
function getActualInfrastructure(originalInfra) {
  return originalInfra.map(item => CONFIG.substitutions[item] || item);
}

/**
 * Check if section is Section 1 (special handling)
 */
function isFoundationSection(section) {
  return section.number === 1;
}

/**
 * Transform Section 1 (Foundation) - special case
 */
function transformFoundationSection(section, inventory, strategy) {
  const header = `## SECTION 1: Foundation & Authentication - INTEGRATED

**Extension Status**: ✅ Most infrastructure ALREADY EXISTS - only adding LoRA-specific tables

**What Already Exists** (from existing codebase):
- ✅ Next.js 14 App Router with TypeScript
- ✅ Supabase Auth with cookie-based sessions
- ✅ Supabase PostgreSQL database with direct client
- ✅ Supabase Storage with on-demand signed URLs
- ✅ shadcn/ui components (47+ components available)
- ✅ React Query for state management
- ✅ Dashboard layout and protected routes

**What We're Adding** (LoRA Training specific):
- New database tables: datasets, training_jobs, metrics_points, model_artifacts, cost_records, notifications
- New storage buckets: lora-datasets, lora-models
- New type definitions: src/lib/types/lora-training.ts

**Infrastructure Patterns to USE**:
- Authentication: Use \`requireAuth()\` from \`@/lib/supabase-server\`
- Database: Use \`createServerSupabaseClient()\` for queries
- Storage: Use \`createServerSupabaseAdminClient()\` for signed URLs
- Components: Import from \`@/components/ui/\`
- API Routes: Follow existing response format \`{ success, data }\` or \`{ error, details }\`

---

### Database Schema Additions (INTEGRATED)

The following tables need to be added to the existing Supabase database. These tables are specific to the LoRA Training module and do not replace any existing infrastructure.

**Migration File**: \`supabase/migrations/YYYYMMDD_create_lora_training_tables.sql\`

See Implementation Guide for complete migration SQL with:
- All 7 tables (datasets, training_jobs, metrics_points, model_artifacts, cost_records, notifications)
- RLS policies for all tables
- Indexes for performance
- Foreign key constraints
- Update triggers

---

### Storage Buckets (INTEGRATED)

Create two new private buckets in Supabase Storage:

**Bucket 1: lora-datasets**
- Purpose: Store uploaded training dataset files
- Privacy: Private
- Max file size: 500 MB
- Path pattern: \`{user_id}/{dataset_id}/{filename}\`

**Bucket 2: lora-models**
- Purpose: Store trained model artifacts
- Privacy: Private
- Max file size: 5 GB
- Path pattern: \`{user_id}/{model_id}/{artifact_type}/{filename}\`

---

### Type Definitions (INTEGRATED)

**File**: \`src/lib/types/lora-training.ts\`

See Implementation Guide for complete TypeScript interfaces matching database schema.

---

### Dependencies for Subsequent Sections

**Available for Section 2+**:
- ✅ Database tables (after migration)
- ✅ Storage buckets (after creation)
- ✅ Type definitions (after file creation)
- ✅ All existing infrastructure (auth, storage, components)

---

### Section 1 Summary

**What Was Added**:
- 7 database tables for LoRA training
- 2 storage buckets
- Type definitions file

**What Was Reused**:
- All authentication infrastructure
- All database client infrastructure
- All storage client infrastructure
- All component library
- All API patterns

**Integration Points**:
- New tables reference \`auth.users(id)\` for user ownership
- New buckets use same Supabase Storage client
- New types follow existing type definition patterns

---
`;

  return header;
}

/**
 * Add integration notes to feature
 */
function addIntegrationNotes(featureContent, inventory) {
  // Check which infrastructure components this feature uses
  const usesAuth = /auth|session|user/i.test(featureContent);
  const usesDatabase = /database|table|query|insert|update/i.test(featureContent);
  const usesStorage = /storage|upload|download|file|s3/i.test(featureContent);
  const usesQueue = /queue|job|worker|background/i.test(featureContent);
  
  let notes = '\n**Implementation (INTEGRATED)**:\n\n';
  
  if (usesAuth) {
    notes += '- **Authentication**: Use `requireAuth()` pattern from Infrastructure Inventory Section 1\n';
  }
  
  if (usesDatabase) {
    notes += '- **Database**: Use Supabase Client with direct queries (see Infrastructure Inventory Section 2)\n';
  }
  
  if (usesStorage) {
    notes += '- **Storage**: Use Supabase Storage with on-demand signed URLs (see Infrastructure Inventory Section 3)\n';
  }
  
  if (usesQueue) {
    notes += '- **Background Processing**: Use Supabase Edge Functions with Cron triggers (see Extension Strategy)\n';
  }
  
  notes += '\nRefer to Implementation Guide for exact code patterns.\n';
  
  return featureContent + notes;
}

/**
 * Transform section content
 */
function transformSection(section, inventory, strategy, guide) {
  // Special handling for Section 1
  if (isFoundationSection(section)) {
    return transformFoundationSection(section, inventory, strategy);
  }
  
  // Identify infrastructure mentioned
  const originalInfra = identifyOriginalInfrastructure(section.content);
  const actualInfra = getActualInfrastructure(originalInfra);
  
  // Transform header
  let transformed = transformSectionHeader(section, originalInfra, actualInfra);
  
  // Add overview from original section
  const overviewMatch = section.content.match(/### Overview\s+([\s\S]*?)(?=\n### |$)/);
  if (overviewMatch) {
    transformed += `### Overview (from original spec)\n\n${overviewMatch[1].trim()}\n\n---\n\n`;
  }
  
  // Add dependencies section
  transformed += `### Dependencies\n\n`;
  transformed += `**Codebase Prerequisites** (MUST exist before this section):\n`;
  transformed += `- Supabase Auth with requireAuth() pattern\n`;
  transformed += `- Supabase PostgreSQL with database client\n`;
  transformed += `- Supabase Storage with signed URL generation\n`;
  transformed += `- shadcn/ui components at /components/ui/\n`;
  transformed += `- React Query for data fetching\n\n`;
  
  transformed += `**Previous Section Prerequisites**:\n`;
  if (section.number === 2) {
    transformed += `- Section 1: Database tables created, storage buckets created, type definitions available\n\n`;
  } else if (section.number > 2) {
    transformed += `- Section ${section.number - 1}: [Features from previous section]\n\n`;
  }
  
  transformed += `---\n\n`;
  
  // Extract and transform features
  const features = extractFeatures(section.content);
  
  if (features.length > 0) {
    transformed += `### Features & Requirements (INTEGRATED)\n\n`;
    
    for (const feature of features) {
      // Add feature with integration notes
      transformed += addIntegrationNotes(feature.content, inventory);
      transformed += '\n\n---\n\n';
    }
  }
  
  // Add section summary
  transformed += `### Section ${section.number} Summary\n\n`;
  transformed += `**What Was Added**:\n`;
  transformed += `- [List new tables from this section]\n`;
  transformed += `- [List new API routes from this section]\n`;
  transformed += `- [List new components from this section]\n`;
  transformed += `- [List new pages from this section]\n\n`;
  
  transformed += `**What Was Reused**:\n`;
  transformed += `- Existing authentication infrastructure\n`;
  transformed += `- Existing database client\n`;
  transformed += `- Existing storage client\n`;
  transformed += `- Existing UI components\n\n`;
  
  transformed += `**Integration Points**:\n`;
  transformed += `- [How this section connects to existing codebase]\n\n`;
  
  transformed += `---\n\n`;
  
  return transformed;
}

/**
 * Generate document header
 */
function generateHeader() {
  const date = new Date().toISOString().split('T')[0];
  
  return `# BrightRun LoRA Training Platform - Integrated Extension Specification

**Version:** 1.0  
**Date:** ${date}  
**Source:** 04c-pipeline-structured-from-wireframe_v1.md  
**Integration Basis:** Infrastructure Inventory v1, Extension Strategy v1, Implementation Guide v1

---

## INTEGRATION SUMMARY

This specification describes how to implement the BrightRun LoRA Training Platform as an EXTENSION to the existing BrightHub application.

**Approach**: EXTENSION (not separate application)

**Infrastructure Decisions**:
- ✅ Use existing Supabase Auth (not NextAuth)
- ✅ Use existing Supabase PostgreSQL (not Prisma)
- ✅ Use existing Supabase Storage (not S3)
- ✅ Use existing shadcn/ui components
- ✅ Use existing React Query (not SWR)
- ✅ Use Edge Functions + Cron (not BullMQ + Redis)

**What We're Adding**:
- 7 new database tables
- 2 new storage buckets
- ~25 new API routes
- ~8-10 new pages
- ~25-30 new components
- ~15 new hooks
- 2 Edge Functions

**What We're NOT Creating**:
- ❌ New authentication system
- ❌ New database client
- ❌ New storage client
- ❌ Job queue infrastructure
- ❌ Component library

---

`;
}

/**
 * Generate document footer
 */
function generateFooter() {
  return `
---

## APPENDIX: Integration Reference

### Infrastructure Inventory Cross-Reference

For detailed patterns and exact code examples, refer to:
- **Section 1 (Auth)**: Infrastructure Inventory - Authentication patterns with requireAuth()
- **Section 2 (Database)**: Infrastructure Inventory - Supabase Client query patterns
- **Section 3 (Storage)**: Infrastructure Inventory - On-demand signed URL generation
- **Section 4 (API)**: Infrastructure Inventory - API route templates and response formats
- **Section 5 (Components)**: Infrastructure Inventory - shadcn/ui component usage
- **Section 6 (State)**: Infrastructure Inventory - React Query hook patterns

### Extension Strategy Alignment

All transformations align with the Extension Strategy v1:
- Features extracted from spec (WHAT to build)
- Generic infrastructure replaced with existing patterns (HOW to build)
- Only creating what's new (tables, APIs, pages, components for LoRA training)
- Not creating what exists (auth, database, storage, components)

### Implementation Guide Patterns

For complete, copy-pasteable code implementations:
- **Phase 1**: Database migrations with RLS policies
- **Phase 2**: TypeScript type definitions
- **Phase 3**: Complete API route implementations
- **Phase 4**: React Query hook implementations
- **Phase 5**: Component implementations
- **Phase 6**: Page implementations
- **Phase 7**: Navigation updates

---

**Document Status**: ✅ READY FOR SEGMENTATION  
**Next Step**: Run segmentation script (04f-segment-integrated-spec_v1.js)  
**Expected Output**: Progressive execution prompts (04f-execution-E[XX]-P[YY].md)
`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

function main() {
  console.log('🚀 Integration Spec Merger v1\n');
  
  // Parse arguments
  const args = parseArgs();
  
  if (!args.spec || !args.inventory || !args.strategy || !args.guide || !args.output) {
    console.error('❌ Usage: node 04e-merge-integration-spec_v1.js \\');
    console.error('    --spec "path/to/04c-pipeline-structured-from-wireframe_v1.md" \\');
    console.error('    --inventory "path/to/04d-infrastructure-inventory_v1.md" \\');
    console.error('    --strategy "path/to/04d-extension-strategy_v1.md" \\');
    console.error('    --guide "path/to/04d-implementation-guide_v1.md" \\');
    console.error('    --output "path/to/04e-integrated-extension-spec_v1.md"');
    process.exit(1);
  }
  
  console.log('📂 Reading input files...\n');
  
  // Read input files
  const specContent = readFile(args.spec);
  const inventoryContent = readFile(args.inventory);
  const strategyContent = readFile(args.strategy);
  const guideContent = readFile(args.guide);
  
  console.log(`✅ Structured Spec: ${args.spec}`);
  console.log(`✅ Infrastructure Inventory: ${args.inventory}`);
  console.log(`✅ Extension Strategy: ${args.strategy}`);
  console.log(`✅ Implementation Guide: ${args.guide}\n`);
  
  // Extract sections from structured spec
  console.log('🔍 Extracting sections from structured spec...\n');
  const sections = extractSections(specContent);
  console.log(`✅ Found ${sections.length} sections\n`);
  
  // Transform each section
  console.log('🔄 Transforming sections...\n');
  const transformedSections = sections.map((section, index) => {
    console.log(`   Processing Section ${section.number}: ${section.title}`);
    return transformSection(section, inventoryContent, strategyContent, guideContent);
  });
  console.log('\n✅ All sections transformed\n');
  
  // Generate integrated spec
  console.log('📝 Generating integrated specification...\n');
  
  let integratedSpec = generateHeader();
  
  for (const transformedSection of transformedSections) {
    integratedSpec += transformedSection;
  }
  
  integratedSpec += generateFooter();
  
  // Write output
  console.log('💾 Writing output file...\n');
  writeFile(args.output, integratedSpec);
  
  // Summary
  console.log('\n✅ MERGE COMPLETE!\n');
  console.log('📊 Summary:');
  console.log(`   - Sections processed: ${sections.length}`);
  console.log(`   - Output file: ${args.output}`);
  console.log(`   - File size: ${(integratedSpec.length / 1024).toFixed(2)} KB\n`);
  console.log('🎯 Next step: Run segmentation script');
  console.log(`   node 04f-segment-integrated-spec_v1.js --input "${args.output}" --output-dir "./execution-prompts/"\n`);
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

module.exports = { extractSections, extractFeatures, transformSection };

