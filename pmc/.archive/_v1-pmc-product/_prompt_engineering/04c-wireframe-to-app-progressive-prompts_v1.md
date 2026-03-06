# Meta-Prompt Template: Unstructured Specification to Progressive Build Prompts

**Version:** 0.1  
**Date:** December 21, 2025  
**Purpose:** Transform any unstructured specification into a series of progressive, integrative build prompts  
**Target Agent:** Claude Sonnet 4.5 (200k context window)  
**Output Format:** Standalone, executable prompts that build incrementally without redundancy

---

## Overview

This meta-prompt template analyzes unstructured technical specifications and generates a series of progressive build prompts. Each prompt is designed to be executed in a fresh Claude Sonnet 4.5 window with 200k token context, building upon previous work in an explicit, integrative manner.

**Key Principles:**
1. **Progressive Build**: Each prompt builds on previous implementations explicitly
2. **No Redundancy**: Features are implemented once and referenced thereafter
3. **Standalone Execution**: Each prompt is self-contained with all necessary context
4. **Explicit Integration**: Clear references to previous prompts and their deliverables
5. **Adaptive Complexity**: Number of prompts determined by specification complexity

---

## Input Requirements

When using this template, you will receive:

### Required Input
- **SPECIFICATION_DOCUMENT**: The unstructured specification to be implemented
  - Path: `{SPECIFICATION_DOCUMENT_PATH}`
  - Format: Any (markdown, text, HTML, etc.)
  - Content: Technical requirements, architecture, features, etc.

### Optional Context (if available)
- **ORIGINAL_WIREFRAME**: Existing wireframe or prototype (if converting/migrating)
  - Path: `{WIREFRAME_PATH}` (if applicable)
- **EXISTING_CODEBASE**: Current implementation (if extending/refactoring)
  - Path: `{CODEBASE_PATH}` (if applicable)
- **RELATED_DOCS**: Supporting documentation (architecture, APIs, etc.)
  - Paths: `{RELATED_DOCS_PATHS}` (if applicable)

---

## Phase 1: Specification Analysis

Before generating any prompts, you must analyze the specification document thoroughly.

### Step 1.1: Document Structure Analysis

Read the entire specification and identify:

1. **Document Organization**
   - Table of contents structure
   - Major sections and subsections
   - Hierarchical relationships
   - Cross-references and dependencies

2. **Content Classification**
   - Executive summaries and overviews
   - Technical requirements
   - Implementation details
   - Database schemas
   - API specifications
   - UI/UX requirements
   - Testing requirements
   - Deployment requirements

3. **Complexity Assessment**
   ```
   For each major section, rate complexity:
   - LOW: Simple, straightforward implementation (1-2 hours)
   - MEDIUM: Moderate complexity, some integration (3-6 hours)
   - HIGH: Complex, multiple dependencies (7-12 hours)
   - CRITICAL: Core architecture, high risk (12+ hours)
   ```

### Step 1.2: Dependency Mapping

Create a dependency graph:

1. **Component Dependencies**
   - What depends on what?
   - What must be built first?
   - What can be built in parallel?
   - What requires previous work to be completed?

2. **Data Flow Dependencies**
   - Database schema requirements
   - API endpoint dependencies
   - Authentication requirements
   - State management needs

3. **Integration Points**
   - Frontend ↔ Backend connections
   - External service integrations
   - Third-party library dependencies
   - Infrastructure requirements

### Step 1.3: Feature Inventory

Enumerate all features and components:

1. **Core Features** (must-have for MVP)
2. **Secondary Features** (important but not blocking)
3. **Enhancement Features** (nice-to-have improvements)
4. **Infrastructure** (database, auth, deployment)

For each feature, identify:
- Dependencies (what must exist first)
- Deliverables (what files/components will be created)
- Acceptance criteria (how to verify completion)
- Integration requirements (what it connects to)

### Step 1.4: Risk Assessment

Identify high-risk areas:

1. **Technical Risk**
   - Complex algorithms
   - Performance-critical sections
   - Security-sensitive areas
   - External integrations

2. **Integration Risk**
   - Multiple systems interacting
   - Real-time data synchronization
   - State management complexity
   - Cross-cutting concerns

3. **Scope Risk**
   - Ambiguous requirements
   - Incomplete specifications
   - Multiple valid approaches
   - Potential scope creep

---

## Phase 2: Prompt Sequence Planning

Based on your analysis, determine the optimal sequence of prompts.

### Step 2.1: Determine Prompt Count

**Formula for Initial Estimate:**
```
Base Prompts = CEIL(Total Complexity Hours / 8)
Adjustment Factors:
  + 1 if extensive database schema required
  + 1 if complex authentication system
  + 1 if real-time features required
  + 1 if multiple external integrations
  + 1 if migration from existing system
  
Total Prompts = Base Prompts + Adjustment Factors
Typical Range: 3-12 prompts for most projects
```

### Step 2.2: Logical Grouping Strategy

Group implementation tasks using these patterns:

**Pattern A: Layer-Based (Traditional Full-Stack)**
1. Foundation & Infrastructure (DB, Auth, Config)
2. Backend Core (API Routes, Business Logic)
3. Frontend Foundation (Layout, Navigation, State)
4. Feature Set 1 (Related features grouped)
5. Feature Set 2 (Related features grouped)
6. Integration & Polish (Real-time, Testing, Optimization)

**Pattern B: Vertical Slice (Feature-Driven)**
1. Foundation & Infrastructure
2. Feature 1 (Full Stack - DB to UI)
3. Feature 2 (Full Stack - DB to UI)
4. Feature 3 (Full Stack - DB to UI)
5. Integration & Polish

**Pattern C: Migration-Based (Legacy → New)**
1. New Architecture Setup
2. Core Infrastructure Migration
3. Data Model Migration
4. Feature Migration (Batch 1)
5. Feature Migration (Batch 2)
6. Cutover & Cleanup

Choose the pattern that best fits the specification and document your reasoning.

### Step 2.3: Define Prompt Boundaries

For each prompt, explicitly define:

```markdown
### Prompt N: [Descriptive Name]

**Purpose:** [One sentence describing what this prompt accomplishes]

**Prerequisites:**
- Prompt 1 deliverables: [List specific files/features from Prompt 1]
- Prompt 2 deliverables: [List specific files/features from Prompt 2]
- ... (continue for all previous prompts)

**Scope:**
- IN SCOPE: [Specific features, files, components to implement]
- OUT OF SCOPE: [What this prompt does NOT do]
- INTEGRATES WITH: [What from previous prompts this builds upon]

**Deliverables:**
- [Specific file paths and components]
- [Database changes, if any]
- [API endpoints, if any]
- [UI components, if any]

**Validation:**
- [How to verify this prompt's work is complete]
- [Integration tests to run]
- [Acceptance criteria to check]
```

### Step 2.4: Integration Strategy

For each prompt after Prompt 1, specify:

1. **What to Reuse** (from previous prompts)
   - Existing components to import
   - Existing APIs to call
   - Existing utilities to leverage
   - Existing patterns to follow

2. **What to Extend** (building upon previous work)
   - Components to enhance
   - APIs to expand
   - Features to complete
   - Patterns to apply

3. **What to Integrate** (connecting new to old)
   - How new features connect to existing ones
   - Data flow between old and new components
   - Shared state management
   - Navigation updates

---

## Phase 3: Prompt Generation

Now generate each prompt using this exact structure.

### Prompt Template Structure

```markdown
# [Project Name] - Build Prompt [N]: [Descriptive Title]

**Generated:** [ISO Date]
**Prompt Number:** [N] of [Total]
**Estimated Time:** [Hours] hours
**Prerequisites:** [Prompts that must be completed first]

---

## 🎯 Mission Statement

[2-3 sentences describing exactly what this prompt accomplishes and why it's important in the overall build sequence]

---

## 📋 Context & Background

### Project Overview
[Brief description of the overall project - 1 paragraph]

### What Has Been Built (Previous Prompts)

[If this is Prompt 1, state "This is the foundation prompt. No previous work exists."]

[If this is Prompt 2+, explicitly list:]

#### From Prompt 1: [Title]
**Deliverables Used in This Prompt:**
- `path/to/file1.ts` - [Purpose and how we'll use it]
- `path/to/file2.tsx` - [Purpose and how we'll use it]
- [Database table: table_name] - [Schema and how we'll query it]
- [API endpoint: /api/route] - [What it does and how we'll call it]

#### From Prompt 2: [Title]
**Deliverables Used in This Prompt:**
- [Continue same pattern for all previous prompts]

**Integration Points:**
- [Specific ways this prompt connects to previous work]
- [Shared state or data flows]
- [Common utilities or patterns to follow]

---

## 🎯 This Prompt's Objectives

### Primary Goals
1. [Specific, measurable goal]
2. [Specific, measurable goal]
3. [Specific, measurable goal]

### Scope Definition

**✅ IN SCOPE (What We're Building)**
- [Specific feature/component 1]
- [Specific feature/component 2]
- [Specific feature/component 3]

**❌ OUT OF SCOPE (What We're NOT Building)**
- [Feature handled by Prompt X]
- [Feature planned for Prompt Y]
- [Feature not in specification]

**🔗 INTEGRATES WITH (What We're Enhancing)**
- [Previous feature from Prompt X that we extend]
- [Previous API from Prompt Y that we call]
- [Previous component from Prompt Z that we import]

---

## 📐 Technical Architecture

### Technology Stack
[List relevant technologies for this specific prompt]
- Framework: [e.g., Next.js 14, React 18]
- Backend: [e.g., API Routes, Prisma, PostgreSQL]
- UI Library: [e.g., Tailwind CSS, shadcn/ui]
- State Management: [e.g., React hooks, SWR]
- Other: [Any specific libraries or tools]

### File Structure
```
[Show the directory structure for files this prompt will create/modify]

app/
  └── [new-feature]/
      ├── page.tsx          [NEW - Main page component]
      ├── layout.tsx        [MODIFY - Add to existing layout]
      └── components/
          ├── Component1.tsx [NEW]
          └── Component2.tsx [NEW]

api/
  └── [new-endpoint]/
      └── route.ts          [NEW - API endpoint]

lib/
  └── utils.ts              [MODIFY - Add utility functions]
```

### Integration Architecture
[If Prompt 2+, show how this integrates with previous work]

```
[Diagram or description of data flow, component hierarchy, API calls]

Previous Work (Prompt X):     This Prompt:              Future Work (Prompt Y):
┌─────────────────┐          ┌──────────────────┐      ┌─────────────────┐
│ Component A     │────────> │ New Component B  │────> │ Future Feature  │
│ (already exists)│  calls   │ (we build this)  │      │ (not yet built) │
└─────────────────┘          └──────────────────┘      └─────────────────┘
```

---

## 🗄️ Database Requirements

[If this prompt requires database changes]

### Schema Changes

```sql
-- Tables to create or modify
-- Mark each statement as [NEW] or [MODIFY]

[NEW] CREATE TABLE table_name (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  field_name type CONSTRAINTS,
  created_at timestamptz DEFAULT now()
);

[MODIFY] ALTER TABLE existing_table
  ADD COLUMN new_field type;

-- Indexes for performance
CREATE INDEX idx_table_field ON table_name(field_name);
```

### Data Access Patterns

```typescript
// Example queries this prompt will use

// From Previous Prompt X (reusing existing pattern):
const existingData = await prisma.existingTable.findMany({
  where: { userId: user.id }
});

// New queries for this prompt:
const newData = await prisma.newTable.create({
  data: {
    userId: user.id,
    fieldName: value
  }
});
```

---

## 🌐 API Specifications

[If this prompt creates or modifies API endpoints]

### New Endpoints

#### POST `/api/[new-endpoint]`

**Purpose:** [What this endpoint does]

**Request:**
```typescript
{
  field1: string;
  field2: number;
  field3?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    field1: string;
    createdAt: string;
  }
}
```

**Implementation Notes:**
- Uses database table: [table_name]
- Calls existing API: [/api/existing-endpoint] (from Prompt X)
- Validates using: [validation approach]
- Error handling: [approach]

### Modified Endpoints

[If modifying existing endpoints from previous prompts]

#### PATCH `/api/[existing-endpoint]` (Modified)

**Added in This Prompt:**
- New field in request: `newField`
- Enhanced response: `additionalData`
- Integration with: [new feature from this prompt]

**Original Implementation:** Prompt X  
**Enhancement Reason:** [Why we're modifying it]

---

## 🎨 Frontend Implementation

### Components to Build

#### Component 1: [ComponentName]

**Location:** `app/[feature]/components/ComponentName.tsx`

**Purpose:** [What this component does]

**Props Interface:**
```typescript
interface ComponentNameProps {
  prop1: Type1;
  prop2: Type2;
  onAction?: (data: DataType) => void;
}
```

**Key Features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]

**Integrations:**
- Imports: [ExistingComponent from Prompt X]
- Calls API: [/api/endpoint from Prompt Y]
- Uses Hook: [useCustomHook from Prompt Z]

**Implementation Pattern:**
```typescript
'use client';

import { ExistingComponent } from '@/components/existing'; // From Prompt X
import { useCustomHook } from '@/hooks/useCustomHook'; // From Prompt Y

export function ComponentName({ prop1, prop2, onAction }: ComponentNameProps) {
  // State management
  const { data, isLoading } = useCustomHook();
  
  // Integration with existing components
  // Implementation logic
  
  return (
    <div>
      <ExistingComponent /> {/* Reusing from previous prompt */}
      {/* New functionality */}
    </div>
  );
}
```

### Pages to Build/Modify

#### Page: `/[feature]`

**Location:** `app/[feature]/page.tsx`

**Status:** [NEW] or [MODIFY]

**Purpose:** [What this page does]

**Route:** `/[feature]` (accessible via navigation from [previous page])

**Layout:** Uses `DashboardLayout` from Prompt X

**Components:**
- [ComponentName] (built in this prompt)
- [ExistingComponent] (from Prompt Y)
- [SharedUtilityComponent] (from Prompt Z)

### Navigation Updates

[If this prompt adds new routes]

**Modify:** `components/layout/AppSidebar.tsx` (from Prompt X)

```typescript
// Add new navigation item:
{
  title: '[Feature Name]',
  href: '/[feature]',
  icon: IconName,
  badge: data?.count // If applicable
}
```

---

## 🔄 State Management

### Client State

[If this prompt manages client-side state]

**Approach:** [e.g., React hooks, Context API, Zustand]

**Shared State:**
- [State from Prompt X that we read]
- [State we create and other prompts will use]

### Server State (Data Fetching)

**Approach:** [e.g., SWR, TanStack Query, Server Components]

**Hooks to Create:**

```typescript
// hooks/useFeatureData.ts
export function useFeatureData() {
  return useSWR('/api/feature-endpoint', fetcher);
}
```

**Hooks to Reuse:**
- `useExistingHook` from Prompt X
- `useOtherHook` from Prompt Y

---

## ✅ Acceptance Criteria

### Functional Requirements

- [ ] [Specific feature works as described]
- [ ] [Integration with Prompt X feature verified]
- [ ] [API endpoint returns expected data]
- [ ] [UI component renders correctly]
- [ ] [Navigation flows work properly]

### Technical Requirements

- [ ] [No TypeScript errors]
- [ ] [No linter warnings]
- [ ] [Follows existing code patterns from previous prompts]
- [ ] [Database queries optimized]
- [ ] [Error handling implemented]
- [ ] [Loading states implemented]

### Integration Requirements

- [ ] [Works with component from Prompt X]
- [ ] [Calls API from Prompt Y correctly]
- [ ] [Shares data with feature from Prompt Z]
- [ ] [Navigation from previous pages works]

---

## 🧪 Testing & Validation

### Manual Testing Steps

1. **Setup:**
   - Ensure database is running
   - Ensure previous prompts' work is in place
   - Navigate to [starting point]

2. **Test Flow:**
   - Step 1: [Action to take]
   - Expected: [What should happen]
   - Verify: [How to confirm it worked]
   
   - Step 2: [Next action]
   - Expected: [What should happen]
   - Verify: [How to confirm it worked]

3. **Integration Testing:**
   - Test with feature from Prompt X
   - Test with data from Prompt Y
   - Verify end-to-end flow

### Error Cases to Test

- [ ] [Error scenario 1]
- [ ] [Error scenario 2]
- [ ] [Edge case 1]
- [ ] [Edge case 2]

### Validation Queries

[If database changes were made]

```sql
-- Verify tables exist
SELECT * FROM information_schema.tables 
WHERE table_name = 'new_table';

-- Verify data structure
SELECT * FROM new_table LIMIT 5;

-- Verify relationships
SELECT * FROM new_table nt
JOIN existing_table et ON nt.user_id = et.id;
```

---

## 📦 Deliverables Checklist

### New Files Created

- [ ] `path/to/file1.tsx` - [Description]
- [ ] `path/to/file2.ts` - [Description]
- [ ] `path/to/file3.tsx` - [Description]

### Existing Files Modified

- [ ] `existing/file1.tsx` - [What was added/changed]
- [ ] `existing/file2.ts` - [What was added/changed]

### Database Changes

- [ ] Table `table_name` created
- [ ] Column `column_name` added to `existing_table`
- [ ] Index `idx_name` created

### API Endpoints

- [ ] `POST /api/new-endpoint` - [Purpose]
- [ ] `GET /api/new-endpoint` - [Purpose]
- [ ] `PATCH /api/existing-endpoint` - [Enhancement]

---

## 🔜 Next Steps (For Next Prompt)

This prompt's deliverables will be used by **Prompt [N+1]** for:

- [Specific file or component that next prompt will use]
- [API endpoint that next prompt will call]
- [Database table that next prompt will query]
- [Pattern or utility that next prompt will follow]

**What's Coming Next:**
[Brief preview of what Prompt N+1 will build and how it builds upon this prompt]

---

## 📝 Implementation Notes

### Code Style & Patterns

Follow these patterns established in previous prompts:

1. **File Organization:** [Pattern from Prompt X]
2. **Component Structure:** [Pattern from Prompt Y]
3. **Error Handling:** [Pattern from Prompt Z]
4. **API Response Format:** [Pattern from Prompt X]

### Dependencies

**Required Packages:** (should already be installed from previous prompts)
- [package-name@version]
- [package-name@version]

**New Packages:** (if any new dependencies needed)
```bash
npm install [new-package]
```

### Environment Variables

[If new environment variables needed]

```env
# Add to .env.local
NEW_API_KEY=your-key-here
NEW_SERVICE_URL=https://service.com
```

---

## ⚠️ Important Reminders

1. **Reuse Before Creating:** Always check if a component or utility from a previous prompt can be reused
2. **Follow Established Patterns:** Maintain consistency with code patterns from earlier prompts
3. **Explicit Integration:** When using previous work, add comments like `// From Prompt X`
4. **Test Integration:** Don't just test new code, test how it integrates with existing features
5. **Update Navigation:** If adding new pages, update the sidebar/navigation components
6. **Document Changes:** Add comments explaining how new code connects to previous work

---

## 🎓 Success Indicators

You'll know this prompt is complete when:

1. ✅ All deliverables listed above are created/modified
2. ✅ All acceptance criteria are met
3. ✅ Integration with previous prompts works seamlessly
4. ✅ Manual testing steps pass without errors
5. ✅ Code follows established patterns from earlier prompts
6. ✅ No TypeScript or linter errors
7. ✅ Application builds and runs successfully

---

**End of Prompt [N]**

---

## 📚 Reference: Files from Previous Prompts

[Comprehensive list of all files and features from earlier prompts that might be relevant]

### From Prompt 1: [Title]
- File: `path/to/file.ts` - [Purpose]
- API: `/api/endpoint` - [Purpose]
- Component: `ComponentName` - [Purpose]

### From Prompt 2: [Title]
- [Continue pattern...]

---

**Ready to implement? Let's build [Feature Name]!**
```

---

## Phase 4: Quality Assurance

After generating all prompts, perform these checks:

### Cross-Prompt Validation

1. **Completeness Check**
   - Does the full sequence cover all features in the spec?
   - Are there any gaps or missing implementations?
   - Are all acceptance criteria from the spec covered?

2. **Redundancy Check**
   - Is any feature implemented in multiple prompts?
   - Are there duplicate API endpoints or components?
   - Can any prompts be consolidated?

3. **Integration Check**
   - Does each prompt properly reference previous work?
   - Are integration points clearly defined?
   - Is the data flow between prompts clear?

4. **Dependency Check**
   - Are prompts in the correct order?
   - Does any prompt require something not yet built?
   - Are circular dependencies avoided?

### Individual Prompt Validation

For each prompt, verify:

- [ ] Clear mission statement
- [ ] Explicit list of previous prompts' deliverables being used
- [ ] Well-defined scope (in/out of scope)
- [ ] Specific, actionable implementation tasks
- [ ] Complete technical specifications
- [ ] Acceptance criteria that can be objectively verified
- [ ] Testing and validation steps
- [ ] Deliverables checklist

---

## Output Format

Generate a single document with the following structure:

```markdown
# [Project Name] - Progressive Build Specification

**Generated:** [Date]
**Source Specification:** [Path to input spec]
**Total Prompts:** [N]
**Estimated Total Time:** [Hours]

---

## Build Overview

### Specification Summary
[2-3 paragraphs summarizing the input specification]

### Build Strategy
[Explain the chosen approach: Layer-Based, Vertical Slice, or Migration-Based]
[Justify why this strategy was chosen]

### Prompt Sequence Logic
[Explain the reasoning behind the prompt ordering]
[Highlight key integration points between prompts]

### Risk Mitigation
[Identify high-risk areas and how they're addressed in the sequence]

---

## Dependency Graph

```
Prompt 1 (Foundation)
    ↓
Prompt 2 (Core Features) ←─────┐
    ↓                           │
Prompt 3 (Extended Features) ←─┤
    ↓                           │
Prompt 4 (Integration) ←────────┘
    ↓
Prompt 5 (Polish)
```

---

## Prompt 1: [Title]
[Full prompt using template from Phase 3]

---

## Prompt 2: [Title]
[Full prompt using template from Phase 3]

---

[Continue for all prompts...]

---

## Build Completion Checklist

### Overall Success Criteria
- [ ] All features from specification implemented
- [ ] All prompts executed successfully
- [ ] Integration testing passed
- [ ] Performance requirements met
- [ ] Security requirements met
- [ ] Documentation complete

### Post-Build Verification

**Functional Testing:**
1. [End-to-end user flow 1]
2. [End-to-end user flow 2]
3. [Integration scenario 1]
4. [Integration scenario 2]

**Technical Validation:**
- [ ] No build errors
- [ ] No runtime errors
- [ ] All tests passing
- [ ] Code quality checks passed
- [ ] Security scan passed

---

## Appendix A: File Manifest

[Complete list of all files created/modified across all prompts]

### New Files
- `path/to/file1.ts` - Created in Prompt N - [Purpose]
- `path/to/file2.tsx` - Created in Prompt N - [Purpose]

### Modified Files
- `existing/file.ts` - Modified in Prompts [N, M] - [Changes]

---

## Appendix B: API Reference

[Complete API documentation for all endpoints created]

---

## Appendix C: Database Schema

[Complete database schema with all tables, columns, relationships]

---

```

---

## Usage Instructions

### For Template Customization

When adapting this template for a specific domain:

1. **Add Domain-Specific Sections**
   - E.g., for mobile apps: add deployment to app stores
   - E.g., for ML projects: add model training/evaluation
   - E.g., for embedded systems: add hardware integration

2. **Customize Technology Stack**
   - Update default technologies in the template
   - Add domain-specific tools and libraries
   - Modify architectural patterns

3. **Adjust Prompt Sizing**
   - Modify the complexity formula for your domain
   - Adjust the typical prompt count range
   - Update estimated hours per prompt

### For Script Integration

To integrate with a generation script (like `00-generate-seed-story.js`):

**Template Variables:**
```
{SPECIFICATION_DOCUMENT_PATH} - Path to input specification
{WIREFRAME_PATH} - Path to existing wireframe (optional)
{CODEBASE_PATH} - Path to existing codebase (optional)
{RELATED_DOCS_PATHS} - Paths to related documentation (optional)
{PROJECT_NAME} - Name of the project
{PROJECT_ABBREVIATION} - Short code for the project
{OUTPUT_PATH} - Where to write the generated prompts
{GENERATION_DATE} - ISO date string
{TOTAL_PROMPTS} - Number determined by analysis
```

**Script Requirements:**
1. Read the specification document
2. Prompt user for optional paths (wireframe, codebase, etc.)
3. Execute Phase 1 (Analysis) - use LLM to analyze spec
4. Execute Phase 2 (Planning) - use LLM to determine sequence
5. Execute Phase 3 (Generation) - generate each prompt
6. Execute Phase 4 (Validation) - check quality
7. Write output to {OUTPUT_PATH}

---

## Example Usage

### Input
```
Specification: C:\...\iteration-8-multi-chat-figma-conversion.md
Wireframe: C:\...\train-wireframe\src
Codebase: C:\...\v4-show\src
```

### Generated Output
```
Output File: C:\...\04c-wireframe-to-prompts-lora-v1.md

Contents:
- Build Overview (5 prompts, ~40 hours total)
- Prompt 1: Foundation & Infrastructure (8 hours)
  - Database setup, NextAuth, S3 client, Redis
  
- Prompt 2: Core Backend APIs (8 hours)
  - Datasets API, Jobs API, base endpoints
  - Uses: Database schema from Prompt 1
  
- Prompt 3: Frontend Migration - Pages (8 hours)
  - Convert Vite pages to Next.js
  - Uses: API endpoints from Prompt 2, Auth from Prompt 1
  
- Prompt 4: Real-time Features & Integration (8 hours)
  - SSE streaming, job monitoring
  - Uses: APIs from Prompt 2, Pages from Prompt 3
  
- Prompt 5: Models & Polish (8 hours)
  - Model artifacts, cost tracking, testing
  - Uses: All previous deliverables
```

---

## Meta-Prompt Success Criteria

This meta-prompt template is successful when:

1. ✅ **Generates appropriate number of prompts** based on complexity
2. ✅ **Each prompt is standalone executable** in a fresh window
3. ✅ **Clear integration** between prompts with explicit references
4. ✅ **No redundancy** - each feature implemented exactly once
5. ✅ **Logical sequence** that minimizes rework and dependencies
6. ✅ **Complete coverage** of the input specification
7. ✅ **Actionable deliverables** with clear acceptance criteria
8. ✅ **Quality validation** built into each prompt
9. ✅ **Works for ANY specification** not just the example
10. ✅ **Progressive enhancement** where each prompt builds on previous work

---

## Version History

**v0.1** - December 21, 2025
- Initial template creation
- Support for full-stack web applications
- Next.js / React focus
- Database-backed applications
- Progressive build methodology

**Future Enhancements:**
- v0.2: Add support for mobile applications
- v0.3: Add support for machine learning projects
- v0.4: Add support for embedded systems
- v0.5: Add support for microservices architectures

---

**End of Meta-Prompt Template**
