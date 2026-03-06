# Solution: Raw Spec and Integration Specs Segmentation

**Date**: December 23, 2025
**Context**: Resolving the relationship between integration documents and structured specification for progressive prompt generation

---

## Executive Summary

The three integration documents (Infrastructure Inventory, Extension Strategy, Implementation Guide) are **contextual supplements** that inform HOW to implement the structured specification using the existing codebase's infrastructure. They do NOT replace the structured spec—they transform it from a generic spec into an extension-aware implementation plan.

**The solution**: Create a two-stage pipeline:
1. **Stage 1 (Merge)**: Combine the structured spec with integration knowledge to produce an "Integrated Extension Spec"
2. **Stage 2 (Segment)**: Segment the integrated spec into progressive execution prompts

---

## Problem Analysis

### What We Have

| Document | Purpose | Contains |
|----------|---------|----------|
| **04c-pipeline-structured-from-wireframe_v1.md** | Feature requirements | 7 sections of features, database schemas, API specs, UI pages using generic infrastructure (Prisma, NextAuth, S3, BullMQ) |
| **04d-infrastructure-inventory_v1.md** | Infrastructure patterns | What EXISTS in the codebase to USE (Supabase Auth, Supabase Client, existing components, existing patterns) |
| **04d-extension-strategy_v1.md** | Extension mapping | How each spec feature USES existing infrastructure |
| **04d-implementation-guide_v1.md** | Execution instructions | Exact code to ADD (new tables, APIs, pages, components) |

### The Gap

The structured spec describes features using **generic infrastructure**:
- Prisma ORM → But codebase uses Supabase Client
- NextAuth.js → But codebase uses Supabase Auth
- S3 direct → But codebase uses Supabase Storage
- BullMQ/Redis → May need adaptation or alternative

The integration documents tell us WHAT to use instead, but don't provide:
1. Section-by-section breakdown aligned with structured spec
2. Progressive dependency mapping
3. Individual prompt boundaries for execution

### The Question

> "How do I produce prompts that build progressively within and between sections, using the integration knowledge to transform the generic spec into extension-aware implementation prompts?"

---

## Solution Architecture

### Two-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STAGE 1: MERGE                               │
│                                                                       │
│  ┌───────────────────┐     ┌────────────────────────────────────┐   │
│  │ Structured Spec   │     │ Integration Documents              │   │
│  │ (04c-pipeline...) │     │ ┌────────────────────────────────┐ │   │
│  │                   │     │ │ Infrastructure Inventory      │ │   │
│  │ Section 1         │     │ │ (Supabase patterns)           │ │   │
│  │ Section 2         │ ──▶ │ ├────────────────────────────────┤ │   │
│  │ Section 3         │     │ │ Extension Strategy            │ │   │
│  │ ...               │     │ │ (Feature → Infrastructure)    │ │   │
│  │ Section 7         │     │ ├────────────────────────────────┤ │   │
│  └───────────────────┘     │ │ Implementation Guide          │ │   │
│                            │ │ (Exact code patterns)         │ │   │
│                            │ └────────────────────────────────┘ │   │
│                            └────────────────────────────────────┘   │
│                                         │                           │
│                                         ▼                           │
│                            ┌────────────────────────────────────┐   │
│                            │ MERGE META-PROMPT                 │   │
│                            │                                    │   │
│                            │ For each section in structured spec: │
│                            │ 1. Extract feature requirements    │   │
│                            │ 2. Replace generic infrastructure  │   │
│                            │ 3. Apply extension patterns        │   │
│                            │ 4. Output integrated section       │   │
│                            └────────────────────────────────────┘   │
│                                         │                           │
│                                         ▼                           │
│                            ┌────────────────────────────────────┐   │
│                            │ INTEGRATED EXTENSION SPEC         │   │
│                            │ (04e-integrated-extension-spec)    │   │
│                            │                                    │   │
│                            │ Section 1 (with Supabase patterns) │   │
│                            │ Section 2 (with Supabase patterns) │   │
│                            │ ...                                │   │
│                            └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         STAGE 2: SEGMENT                             │
│                                                                       │
│  ┌───────────────────────────────────────┐                          │
│  │ Integrated Extension Spec             │                          │
│  │ (04e-integrated-extension-spec)       │                          │
│  └───────────────────────────────────────┘                          │
│                     │                                                │
│                     ▼                                                │
│  ┌───────────────────────────────────────┐                          │
│  │ SEGMENTATION SCRIPT                   │                          │
│  │                                        │                          │
│  │ For each section:                      │                          │
│  │ 1. Parse FRs (FR-1.1, FR-1.2, etc.)   │                          │
│  │ 2. Group into logical prompts          │                          │
│  │ 3. Add dependencies from prev sections │                          │
│  │ 4. Generate execution prompt           │                          │
│  └───────────────────────────────────────┘                          │
│                     │                                                │
│                     ▼                                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ EXECUTION PROMPTS                                              │  │
│  │                                                                 │  │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │  │
│  │ │ E01-Prompt-1   │ │ E01-Prompt-2   │ │ E01-Prompt-3   │       │  │
│  │ │ Database Setup │ │ API Services   │ │ UI Components  │       │  │
│  │ └────────────────┘ └────────────────┘ └────────────────┘       │  │
│  │                                                                 │  │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │  │
│  │ │ E02-Prompt-1   │ │ E02-Prompt-2   │ │ ...            │       │  │
│  │ │ Dataset Upload │ │ Validation     │ │                │       │  │
│  │ └────────────────┘ └────────────────┘ └────────────────┘       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Merge Meta-Prompt

### Purpose
Transform the structured spec from generic infrastructure to extension-aware implementation by applying the integration knowledge to each section.

### Input Files
1. `04c-pipeline-structured-from-wireframe_v1.md` - The structured spec
2. `04d-infrastructure-inventory_v1.md` - What exists in codebase
3. `04d-extension-strategy_v1.md` - How features use infrastructure
4. `04d-implementation-guide_v1.md` - Code patterns to follow

### Output File
`04e-integrated-extension-spec_v1.md` - Structured spec with all infrastructure choices replaced

### Merge Meta-Prompt Template

```markdown
# Integration Merge Meta-Prompt

## Purpose
Transform the structured specification into an integrated extension specification by replacing generic infrastructure references with existing codebase patterns.

## Inputs

### Input 1: Structured Specification
**File**: {{STRUCTURED_SPEC_PATH}}

This file contains feature requirements organized into sections. Extract the FEATURES from each section, ignoring the generic infrastructure choices (Prisma, NextAuth, S3, BullMQ).

### Input 2: Infrastructure Inventory
**File**: {{INFRASTRUCTURE_INVENTORY_PATH}}

This file documents what EXISTS in the codebase. For every infrastructure need in the structured spec, use the pattern from this inventory.

### Input 3: Extension Strategy
**File**: {{EXTENSION_STRATEGY_PATH}}

This file maps each feature area to existing infrastructure. Use this to determine HOW each feature uses the existing codebase.

### Input 4: Implementation Guide
**File**: {{IMPLEMENTATION_GUIDE_PATH}}

This file provides exact code patterns. When transforming the spec, reference these patterns for consistency.

## Transformation Rules

### Rule 1: Database Schema Transformation
**Original**: Prisma schema with `model User { ... }`
**Transformed**: SQL migration for Supabase with RLS policies

```
BEFORE (from structured spec):
model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(...)
  ...
}

AFTER (in integrated spec):
-- Supabase migration
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ...
);

-- RLS Policy
CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT USING (auth.uid() = user_id);
```

### Rule 2: Authentication Transformation
**Original**: NextAuth.js patterns
**Transformed**: Supabase Auth patterns

```
BEFORE (from structured spec):
import { getServerSession } from "next-auth";
const session = await getServerSession(authOptions);
if (!session) return unauthorized();

AFTER (in integrated spec):
import { createServerSupabaseClient } from '@/lib/supabase-server';
const supabase = createServerSupabaseClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) return unauthorized();
```

### Rule 3: Storage Transformation
**Original**: S3 direct SDK usage
**Transformed**: Supabase Storage patterns

```
BEFORE (from structured spec):
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ ... });
await s3.send(new PutObjectCommand({ Bucket, Key, Body }));

AFTER (in integrated spec):
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(path, file, options);
```

### Rule 4: API Route Transformation
**Original**: Generic patterns
**Transformed**: Existing codebase patterns from Infrastructure Inventory

Apply the exact API route template from the Infrastructure Inventory's "API Route Template (USE THIS)" section.

### Rule 5: Component Transformation
**Original**: Generic shadcn/ui usage
**Transformed**: Specific imports from existing codebase

Reference the exact component paths and patterns from the Infrastructure Inventory's "Components Available" section.

## Output Structure

For each section in the structured spec, produce an integrated section with:

```markdown
## SECTION [N]: [Section Name] - INTEGRATED

### Overview (from original spec)
[Copy the section purpose and user value unchanged]

### Dependencies (transformed)
**Codebase Prerequisites**:
- [List existing infrastructure this section USES]

**Previous Section Prerequisites**:
- [List what from previous sections this section needs]

### Features & Requirements (transformed)

#### FR-[N].1: [Feature Name]

**Type**: [Original type]

**Description**: [Original description]

**Implementation (INTEGRATED)**:

Instead of [original infrastructure], use:
- [Specific pattern from codebase]
- [Reference to specific file/function]

**Database Changes**:
```sql
-- Supabase migration (not Prisma)
[Transformed SQL]
```

**API Route**:
```typescript
// Using existing patterns from codebase
[Transformed TypeScript following Infrastructure Inventory patterns]
```

**Components**:
```typescript
// Using existing components from codebase
import { Button, Card } from '@/components/ui/[exact-paths]';
[Transformed component code]
```
```

## Validation

After transformation, verify:
1. ✅ No Prisma references remain
2. ✅ No NextAuth references remain
3. ✅ No direct S3 SDK references remain
4. ✅ All database operations use Supabase Client
5. ✅ All auth uses Supabase Auth patterns
6. ✅ All storage uses Supabase Storage
7. ✅ All components reference existing paths
8. ✅ All API routes follow existing patterns

## Begin Transformation

Process each section sequentially:
1. Section 1: Foundation & Authentication → INTEGRATED
2. Section 2: Dataset Management → INTEGRATED
3. Section 3: Training Configuration → INTEGRATED
4. Section 4: Training Execution & Monitoring → INTEGRATED
5. Section 5: Model Artifacts & Delivery → INTEGRATED
6. Section 6: Cost Tracking & Notifications → INTEGRATED
7. Section 7: Complete System Integration → INTEGRATED
```

---

## Stage 2: Segmentation Script

### Purpose
Take the integrated extension spec and produce individual execution prompts for each section, with proper dependencies and progressive structure.

### Key Differences from Deprecated Script

| Aspect | Deprecated Script | New Script |
|--------|------------------|------------|
| **Input** | Raw structured spec | Integrated extension spec |
| **Infrastructure** | Generic (Prisma, etc.) | Already transformed to Supabase |
| **Dependencies** | Section-level only | Prompt-level granular |
| **Context Injection** | None | Includes infrastructure patterns |
| **Output Quality** | Prompts need manual adaptation | Prompts are execution-ready |

### New Script Template

```javascript
/**
 * Integrated Extension Spec Segmenter (v1)
 *
 * Input: 04e-integrated-extension-spec_v1.md
 * Output: Execution prompts per section with progressive dependencies
 */

const fs = require('fs');
const path = require('path');

function parseIntegratedSpec(content) {
  // Parse sections from integrated spec
  // Each section is already transformed with Supabase patterns
  const sections = {};
  const sectionRegex = /## SECTION (\d+):.+- INTEGRATED/g;
  // ... parsing logic
  return sections;
}

function extractFeatureRequirements(sectionContent) {
  // Extract FR-X.Y blocks
  const frs = [];
  const frRegex = /#### FR-(\d+)\.(\d+):.+/g;
  // ... extraction logic
  return frs;
}

function groupIntoPrompts(frs, sectionNumber) {
  // Group FRs into logical prompts based on:
  // 1. Database operations → Prompt 1
  // 2. API routes → Prompt 2
  // 3. UI components → Prompt 3
  // 4. Integration → Prompt 4

  const groups = {
    database: [],
    api: [],
    ui: [],
    integration: []
  };

  for (const fr of frs) {
    if (fr.hasDatabase) groups.database.push(fr);
    if (fr.hasAPI) groups.api.push(fr);
    if (fr.hasUI) groups.ui.push(fr);
    // Integration FRs go to all groups
  }

  return groups;
}

function generateExecutionPrompt(group, sectionNumber, promptNumber, dependencies) {
  const template = `
# Section ${sectionNumber} - Prompt ${promptNumber}: ${group.name}

## Context

**What Exists (from Infrastructure Inventory)**:
${dependencies.infrastructure}

**What Was Built in Previous Prompts**:
${dependencies.previousPrompts}

**What Was Built in Previous Sections**:
${dependencies.previousSections}

## Features to Implement

${group.frs.map(fr => formatFR(fr)).join('\n\n')}

## Implementation Requirements

All code must:
1. Use existing Supabase Client patterns (see Infrastructure Inventory)
2. Use existing Auth patterns (see Infrastructure Inventory)
3. Use existing Component patterns (see Infrastructure Inventory)
4. Follow RLS patterns for all new tables
5. Match existing API response formats

## Acceptance Criteria

${group.frs.map(fr => formatAcceptanceCriteria(fr)).join('\n')}

## Validation

After implementation:
${group.validationSteps.join('\n')}
`;

  return template;
}

function generateAllPrompts(integratedSpecPath, outputDir) {
  const content = fs.readFileSync(integratedSpecPath, 'utf-8');
  const sections = parseIntegratedSpec(content);

  const allDependencies = {
    previousSections: {},
    previousPrompts: {}
  };

  for (const [sectionId, sectionContent] of Object.entries(sections)) {
    const frs = extractFeatureRequirements(sectionContent);
    const groups = groupIntoPrompts(frs, sectionId);

    let promptNumber = 1;
    for (const [groupName, groupFRs] of Object.entries(groups)) {
      if (groupFRs.length === 0) continue;

      const prompt = generateExecutionPrompt(
        { name: groupName, frs: groupFRs },
        sectionId,
        promptNumber,
        {
          infrastructure: getInfrastructureContext(),
          previousPrompts: allDependencies.previousPrompts[sectionId] || 'None',
          previousSections: Object.entries(allDependencies.previousSections)
            .map(([s, d]) => `Section ${s}: ${d}`)
            .join('\n') || 'None'
        }
      );

      const filename = `04f-execution-E${sectionId.padStart(2, '0')}-P${promptNumber.toString().padStart(2, '0')}.md`;
      fs.writeFileSync(path.join(outputDir, filename), prompt);

      // Track what this prompt creates
      allDependencies.previousPrompts[sectionId] =
        (allDependencies.previousPrompts[sectionId] || '') +
        `\nPrompt ${promptNumber}: ${groupName} - ${groupFRs.map(fr => fr.id).join(', ')}`;

      promptNumber++;
    }

    // Track what this section creates
    allDependencies.previousSections[sectionId] =
      Object.entries(groups)
        .filter(([_, frs]) => frs.length > 0)
        .map(([name, frs]) => `${name}: ${frs.length} features`)
        .join(', ');
  }
}

// Entry point
if (require.main === module) {
  const integratedSpecPath = process.argv[2];
  const outputDir = process.argv[3];
  generateAllPrompts(integratedSpecPath, outputDir);
}
```

---

## Progressive Dependency Model

### Within Section (Intra-Section)

```
Section E01: Foundation
├── Prompt 1: Database Setup
│   └── Creates: New tables, RLS policies
├── Prompt 2: API Services (depends on Prompt 1)
│   └── Uses: Tables from Prompt 1
│   └── Creates: Service classes, API routes
├── Prompt 3: UI Components (depends on Prompt 2)
│   └── Uses: API routes from Prompt 2
│   └── Creates: React components, pages
└── Prompt 4: Integration (depends on Prompts 1-3)
    └── Uses: All from Prompts 1-3
    └── Creates: Hooks, state management
```

### Between Sections (Inter-Section)

```
Section E01: Foundation
└── Provides: Base tables, auth patterns, core services

Section E02: Dataset Management (depends on E01)
├── Uses from E01: User model, auth middleware
└── Provides: Dataset table, upload APIs, validation

Section E03: Training Configuration (depends on E01, E02)
├── Uses from E01: Base infrastructure
├── Uses from E02: Dataset selection, validation status
└── Provides: Training job config, cost estimation

Section E04: Training Execution (depends on E01, E02, E03)
├── Uses from E01: Job queue patterns
├── Uses from E02: Dataset S3 keys
├── Uses from E03: Training configuration
└── Provides: Job execution, real-time monitoring

[... and so on]
```

---

## Execution Prompt Template

Each generated execution prompt should follow this structure:

```markdown
# Execution Prompt: Section [N] - Prompt [M]

**Target**: [Specific deliverable]
**Dependencies**: [What must exist first]
**Estimated Effort**: [Hours]
**Risk Level**: [Low/Medium/High]

---

## Context Summary

### Existing Infrastructure (ALWAYS USE)
- **Authentication**: Supabase Auth via `createServerSupabaseClient()`
- **Database**: Supabase Client via `supabase.from('table')`
- **Storage**: Supabase Storage via `supabase.storage.from('bucket')`
- **Components**: shadcn/ui at `@/components/ui/*`

### From Previous Prompts (AVAILABLE)
[What was created in earlier prompts of this section]

### From Previous Sections (AVAILABLE)
[What was created in earlier sections]

---

## Features to Implement

### FR-[N].[M].1: [Feature Name]

**Description**: [What this feature does]

**Database Changes**:
```sql
-- Migration file: supabase/migrations/YYYYMMDD_[name].sql
CREATE TABLE [table_name] (
  -- Schema following RLS patterns
);

-- RLS policies
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON [table_name] ...;
```

**API Implementation**:
```typescript
// File: app/api/[route]/route.ts
// Follow exact pattern from Infrastructure Inventory

export async function GET(request: NextRequest) {
  // Auth check pattern
  // Database query pattern
  // Response format pattern
}
```

**UI Implementation**:
```typescript
// File: app/(dashboard)/[page]/page.tsx
// Follow exact pattern from Infrastructure Inventory

export default function PageName() {
  // Use existing components
  // Use existing hooks
  // Follow existing styling
}
```

---

## Acceptance Criteria

- [ ] [Specific testable criterion 1]
- [ ] [Specific testable criterion 2]
- [ ] [Specific testable criterion 3]

---

## Validation Steps

1. **Database**: Run migration, verify tables exist, test RLS
2. **API**: Test endpoints with curl commands provided
3. **UI**: Visual verification against wireframes
4. **Integration**: End-to-end flow test

---

## Do NOT

- ❌ Create new authentication system
- ❌ Use Prisma or any ORM other than Supabase Client
- ❌ Modify existing infrastructure files
- ❌ Add new dependencies not in package.json
```

---

## Recommended Workflow

### Step 1: Run Merge (One-Time)

```bash
# Create the integrated extension spec
node pmc/product/_tools/04e-merge-integration-spec_v1.js \
  --spec "pmc/product/_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md" \
  --inventory "pmc/product/_mapping/pipeline/_run-prompts/04d-infrastructure-inventory_v1.md" \
  --strategy "pmc/product/_mapping/pipeline/_run-prompts/04d-extension-strategy_v1.md" \
  --guide "pmc/product/_mapping/pipeline/_run-prompts/04d-implementation-guide_v1.md" \
  --output "pmc/product/_mapping/pipeline/04e-integrated-extension-spec_v1.md"
```

### Step 2: Run Segmentation (One-Time)

```bash
# Generate execution prompts
node pmc/product/_tools/04f-segment-integrated-spec_v1.js \
  --input "pmc/product/_mapping/pipeline/04e-integrated-extension-spec_v1.md" \
  --output-dir "pmc/product/_mapping/pipeline/_execution-prompts/"
```

### Step 3: Execute Prompts (Progressive)

```bash
# Execute each prompt in order
# E01-P01 → E01-P02 → E01-P03 → E02-P01 → ...

# Each prompt is self-contained with all context needed
# Agent receives:
# - What infrastructure to USE
# - What was created in previous prompts
# - What features to implement
# - Exact patterns to follow
```

---

## Files to Create

1. **04e-merge-integration-spec-meta-prompt_v1.md**
   - Meta-prompt for merge operation
   - Input: structured spec + 3 integration docs
   - Output: integrated extension spec

2. **04e-merge-integration-spec_v1.js**
   - Script to run the merge meta-prompt
   - Handles file I/O and template filling

3. **04f-segment-integrated-spec_v1.js**
   - Script to segment integrated spec into prompts
   - Generates execution prompts with dependencies

4. **04e-integrated-extension-spec_v1.md** (generated)
   - The merged specification
   - All infrastructure replaced with codebase patterns

5. **04f-execution-E[XX]-P[YY].md** (generated, multiple)
   - Individual execution prompts
   - Progressive within and between sections

---

## Answer to Original Questions

### Q1: Do the three integration docs REPLACE the structured spec?

**No.** They SUPPLEMENT it. The structured spec defines WHAT to build (features). The integration docs define HOW to build (using existing infrastructure). You need both, merged together.

### Q2: How to produce prompts that build progressively?

**Two-stage approach:**
1. First, merge the structured spec with integration knowledge to create an integrated extension spec
2. Then, segment that integrated spec into prompts with proper dependencies

### Q3: Relationship between integration knowledge and structured spec when segmenting?

The integration knowledge must be BAKED INTO the structured spec before segmentation. The segmentation script should operate on an already-integrated spec, not try to do both simultaneously.

---

## Next Steps

1. Create `04e-merge-integration-spec-meta-prompt_v1.md`
2. Create `04e-merge-integration-spec_v1.js` script
3. Run merge to produce `04e-integrated-extension-spec_v1.md`
4. Create `04f-segment-integrated-spec_v1.js` script
5. Run segmentation to produce execution prompts
6. Begin progressive execution

---

**Document Status**: SOLUTION DEFINED
**Ready For**: Implementation of merge meta-prompt and segmentation script
