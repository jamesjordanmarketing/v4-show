# Codebase Integration Analysis Meta-Prompt

**Version:** 1.0  
**Purpose:** Generate integration documentation for implementing a structured specification into an existing production codebase  
**Input:** Structured specification + Existing codebase directory  
**Output:** Three integration documents (Discovery, Strategy, Deltas)

---

## CRITICAL INSTRUCTIONS FOR AI AGENT

You are analyzing an existing production codebase to determine how to integrate a new module specified in a structured specification document. Your task is to perform comprehensive discovery of the existing codebase, develop an integration strategy, and document specific modifications required to the structured specification.

### Core Principles

1. **Preservation First**: Existing functionality must continue working - no breaking changes
2. **Reuse Over Rebuild**: Leverage existing infrastructure wherever possible
3. **Pattern Consistency**: New code must match existing conventions and patterns
4. **Explicit Integration**: Document every interface, dependency, and integration point
5. **Practical Deltas**: Provide specific, actionable modifications to the structured spec

---

## INPUT FILES

### Input 1: Structured Specification
**File Path**: `{{STRUCTURED_SPEC_PATH}}`

This file contains the complete structured specification for the new module, written as if for a greenfield project. Your task is to adapt this specification to integrate with the existing codebase.

### Input 2: Existing Production Codebase  
**Directory Path**: `{{CODEBASE_PATH}}`

This directory contains the current production codebase where the new module will be integrated. You must analyze its structure, patterns, and existing implementations.

### Output Destination
**Directory Path**: `{{OUTPUT_PATH}}`

You will create three markdown documents in this directory:
1. `04d-codebase-discovery_v1.md`
2. `04d-integration-strategy_v1.md`
3. `04d-implementation-deltas_v1.md`

---

## PHASE 1: COMPREHENSIVE CODEBASE DISCOVERY

Before creating any integration documentation, perform a thorough analysis of the existing codebase.

### Step 1.1: Project Architecture Analysis

**Required Analysis**:

1. **Framework & Build System**
   - Identify framework (Next.js, React, Vue, etc.) and version
   - Build configuration (next.config.js, vite.config.js, etc.)
   - TypeScript or JavaScript? Configuration strictness
   - Package manager (npm, yarn, pnpm) and version

2. **Directory Structure**
   - Map out key directories and their purposes
   - Identify patterns (feature-based, layer-based, etc.)
   - Document file naming conventions
   - Note any monorepo or workspace setup

3. **Routing Architecture**
   - Routing system (Next.js App Router, Pages Router, React Router, etc.)
   - Existing routes and their purposes
   - Route protection/middleware patterns
   - Dynamic routing conventions

**Output Format**:
```markdown
### Project Architecture

**Framework**: [Name] [Version]
**Build System**: [Webpack/Vite/etc.]
**TypeScript**: [Yes/No] - [Config details]
**Package Manager**: [npm/yarn/pnpm]

**Directory Structure**:
```
/src or /app
  ├── /components - [Purpose and patterns]
  ├── /lib - [Purpose and patterns]
  ├── /hooks - [Purpose and patterns]
  └── ... [Map all major directories]
```

**Routing System**: [Description]
- Existing routes: [List key routes]
- Protection pattern: [How routes are protected]
- Route grouping: [How routes are organized]
```

---

### Step 1.2: Authentication & Authorization Discovery

**Required Analysis**:

1. **Authentication System**
   - Provider (NextAuth.js, Supabase Auth, Auth0, custom, etc.)
   - Configuration location
   - Session management approach
   - Login/logout flow
   - Token storage and validation

2. **Authorization Patterns**
   - Role-based access control (RBAC)
   - Permission checking approach
   - API route protection patterns
   - Client-side protection patterns

3. **User Model**
   - User schema/type definition
   - Required fields
   - Optional fields
   - Related models (profiles, roles, etc.)

**Output Format**:
```markdown
### Authentication System

**Provider**: [Name and version]
**Location**: [File paths]
**Configuration**: 
- Provider setup: [File path and key config]
- Session strategy: [JWT/Database/etc.]
- Session storage: [Cookies/localStorage/etc.]

**User Model**:
```typescript
interface User {
  // Document actual user model structure
  id: string;
  email: string;
  // ... all fields
}
```

**API Protection Pattern**:
```typescript
// Show actual pattern used in codebase
// e.g., requireAuth() helper, middleware, etc.
```

**Client Protection Pattern**:
```typescript
// Show actual pattern for protecting pages
// e.g., useSession() hook, HOC, etc.
```
```

---

### Step 1.3: Database & ORM Discovery

**Required Analysis**:

1. **Database Technology**
   - Database type (PostgreSQL, MySQL, MongoDB, etc.)
   - ORM/Client (Prisma, Drizzle, Mongoose, Supabase client, etc.)
   - Schema location and structure
   - Migration system

2. **Existing Schema**
   - All existing tables/collections
   - Field definitions
   - Relationships
   - Indexes
   - Constraints

3. **Database Client Pattern**
   - Client initialization
   - Query patterns
   - Transaction handling
   - Connection pooling

**Output Format**:
```markdown
### Database System

**Database**: [Type and version]
**ORM/Client**: [Name and version]
**Location**: [Schema files path]

**Schema Overview**:

**Table: users**
```typescript
// Actual schema definition
{
  id: string;
  email: string;
  // ... all fields with types
}
```
**Relationships**: [List relationships]
**Indexes**: [List indexes]

[Repeat for ALL existing tables]

**Database Client Pattern**:
```typescript
// Show how database is accessed in codebase
import { db } from '@/lib/db';

// Example query pattern
const user = await db.user.findUnique({ ... });
```

**Migration System**: [Describe migration approach]
```

---

### Step 1.4: API Architecture Discovery

**Required Analysis**:

1. **API Patterns**
   - REST/GraphQL/tRPC/other
   - Route naming conventions
   - Response format standards
   - Error handling patterns
   - Validation approach (Zod, Yup, etc.)

2. **Existing Endpoints**
   - List all API routes
   - Document patterns (CRUD, custom, etc.)
   - Authentication requirements per route
   - Response structures

3. **Middleware & Interceptors**
   - Request/response middleware
   - Error handlers
   - Logging patterns
   - Rate limiting

**Output Format**:
```markdown
### API Architecture

**API Style**: [REST/GraphQL/tRPC]
**Location**: [Directory path for APIs]

**Standard Response Format**:
```typescript
// Success response
{
  success: true,
  data: T,
  meta?: { ... }
}

// Error response  
{
  success: false,
  error: {
    code: string,
    message: string,
    // ... additional fields
  }
}
```

**Validation**: [Approach and library]

**Existing API Endpoints**:

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/users` | GET | Yes | List users |
| `/api/users/[id]` | GET | Yes | Get user |
[List ALL existing API routes]

**Middleware Pattern**:
```typescript
// Show actual middleware usage
```
```

---

### Step 1.5: Component Library Discovery

**Required Analysis**:

1. **UI Library/Framework**
   - Component library (shadcn/ui, Material-UI, Chakra, custom, etc.)
   - Location of reusable components
   - Styling system (Tailwind, CSS Modules, styled-components, etc.)
   - Theme configuration

2. **Component Patterns**
   - File structure (co-location, separate, etc.)
   - Naming conventions
   - Props patterns
   - State management approach

3. **Existing Components Inventory**
   - List all reusable components
   - Document their purposes
   - Note which are candidates for reuse

**Output Format**:
```markdown
### Component Library

**UI Framework**: [Name and version]
**Location**: `/components/` (or applicable path)
**Styling System**: [Tailwind/CSS Modules/etc.]
**Theme Config**: [Location and approach]

**Reusable Components Inventory**:

**Layout Components** (`/components/layout/`):
- `AppLayout.tsx` - Main application layout wrapper
- `Sidebar.tsx` - Navigation sidebar
- `Header.tsx` - Top navigation header
[List all layout components]

**UI Components** (`/components/ui/`):
- `Button.tsx` - [Description, props, usage]
- `Card.tsx` - [Description, props, usage]
[List all UI components with brief descriptions]

**Feature Components** (`/components/[feature]/`):
[Organize by feature if applicable]

**Component Pattern Example**:
```typescript
// Show typical component structure
export interface ComponentNameProps {
  // ...
}

export function ComponentName({ ... }: ComponentNameProps) {
  // ...
}
```
```

---

### Step 1.6: State Management Discovery

**Required Analysis**:

1. **State Management Solution**
   - Library (Redux, Zustand, Jotai, Context, none, etc.)
   - Configuration location
   - Store structure
   - Actions/reducers patterns

2. **Data Fetching**
   - Library (SWR, React Query, Apollo, native fetch, etc.)
   - Caching strategy
   - Revalidation patterns
   - Error handling

3. **Form State**
   - Form library (React Hook Form, Formik, etc.)
   - Validation approach
   - Submit patterns

**Output Format**:
```markdown
### State Management

**Global State**: [Library or approach]
**Location**: [File paths]
**Store Structure**:
```typescript
// Show actual store structure if applicable
```

**Data Fetching**: [Library and version]
**Pattern**:
```typescript
// Show typical data fetching pattern
const { data, error, isLoading } = useSWR('/api/endpoint', fetcher);
```

**Form Handling**: [Library if applicable]
**Pattern**:
```typescript
// Show form handling pattern
```
```

---

### Step 1.7: File Storage & External Services Discovery

**Required Analysis**:

1. **File Storage**
   - S3, Cloudflare R2, Supabase Storage, local, etc.
   - Configuration location
   - Upload/download patterns
   - Presigned URL handling

2. **External Integrations**
   - Third-party services integrated
   - API clients location
   - Configuration patterns

3. **Background Jobs**
   - Queue system (BullMQ, Inngest, none, etc.)
   - Worker patterns
   - Scheduled tasks

**Output Format**:
```markdown
### File Storage

**Provider**: [S3/R2/Supabase/etc.]
**Configuration**: [Location]
**Client**: [File path to storage client]

**Upload Pattern**:
```typescript
// Show actual upload pattern in codebase
```

**Download Pattern**:
```typescript
// Show actual download pattern
```

### Background Jobs

**Queue System**: [Name or "None"]
**Location**: [If applicable]
**Patterns**: [Description]
```

---

### Step 1.8: Utility Functions & Helpers Discovery

**Required Analysis**:

1. **Common Utilities**
   - Location (`/lib/utils.ts`, `/utils/`, etc.)
   - Available helper functions
   - Formatting utilities
   - Validation helpers

2. **Custom Hooks**
   - Location (`/hooks/`)
   - Available hooks and their purposes
   - Data fetching hooks
   - UI interaction hooks

3. **Type Definitions**
   - Location (`/types/`, `*.d.ts`)
   - Shared types and interfaces
   - Naming conventions

**Output Format**:
```markdown
### Utilities & Helpers

**Utilities Location**: `/lib/` (or applicable)

**Available Utility Functions**:
- `formatDate()` - [Description]
- `cn()` - [Description]  
- `formatCurrency()` - [Description]
[List all utility functions]

**Custom Hooks** (`/hooks/`):
- `useAuth()` - [Purpose]
- `useApi()` - [Purpose]
[List all custom hooks]

**Type Definitions** (`/types/`):
```typescript
// Key shared types
export interface ApiResponse<T> {
  // ...
}
```
```

---

### Step 1.9: Testing Infrastructure Discovery

**Required Analysis**:

1. **Testing Framework**
   - Test runner (Jest, Vitest, etc.)
   - Testing library (React Testing Library, etc.)
   - E2E framework (Playwright, Cypress, etc.)

2. **Test Patterns**
   - Test file organization
   - Naming conventions
   - Mock patterns
   - Test utilities

**Output Format**:
```markdown
### Testing Infrastructure

**Unit Testing**: [Framework]
**Component Testing**: [Library]
**E2E Testing**: [Framework if present]

**Test Location**: [Pattern, e.g., `__tests__/`, `*.test.ts`]
**Coverage**: [Current coverage if known]

**Test Pattern Example**:
```typescript
// Show typical test structure
```
```

---

### Step 1.10: Environment & Configuration Discovery

**Required Analysis**:

1. **Environment Variables**
   - Required variables
   - Configuration files
   - Secrets management

2. **Build Configuration**
   - Build scripts
   - Environment-specific configs
   - Feature flags

**Output Format**:
```markdown
### Environment & Configuration

**Environment Variables** (`.env*`):
```bash
# List all environment variables in use
DATABASE_URL=
NEXT_PUBLIC_API_URL=
# ... etc.
```

**Configuration Files**:
- `next.config.js` - [Key settings]
- `tailwind.config.js` - [Key settings]
[List all config files]
```

---

## PHASE 2: INTEGRATION STRATEGY DEVELOPMENT

Now that you understand the existing codebase, develop a comprehensive integration strategy.

### Step 2.1: Compare Architectures

**Analysis Required**:

For each major area, compare structured spec assumptions vs. codebase reality:

```markdown
### Architecture Comparison

| Area | Structured Spec | Existing Codebase | Gap Analysis |
|------|----------------|-------------------|--------------|
| **Framework** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **Authentication** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **Database/ORM** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **API Pattern** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **Styling** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **State Management** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **File Storage** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |
| **Job Queue** | [Spec assumption] | [Actual] | [Match/Mismatch/Partial] |

**Critical Mismatches**: [List areas requiring significant adaptation]
**Easy Integrations**: [List areas that align well]
```

---

### Step 2.2: Define Integration Strategies

For each area with gaps, define the integration strategy:

**Strategy Options**:
1. **USE_EXISTING** - Use existing implementation, skip spec's approach
2. **EXTEND_EXISTING** - Build upon existing implementation
3. **CREATE_NEW** - Implement as specified (no conflict)
4. **ADAPT_SPEC** - Modify spec to match existing patterns
5. **MIGRATE** - Gradually migrate existing to match spec

**Required Output**:

```markdown
### Integration Strategy: Authentication

**Gap**: Spec assumes NextAuth.js v5, codebase uses Supabase Auth

**Strategy**: USE_EXISTING
**Rationale**: 
- Supabase Auth is working and integrated throughout app
- Migrating would break existing modules
- Supabase provides equivalent functionality
- More efficient to adapt new module than migrate entire app

**Implementation Approach**:
1. Skip NextAuth.js installation
2. Reuse existing Supabase auth from `/lib/auth.ts`
3. Adapt API protection to use Supabase session checking
4. Modify login/signup flows to use Supabase client
5. Update user model references to match existing User table

**Files to Reuse**:
- `/lib/auth.ts` - Supabase client and helpers
- `/lib/middleware.ts` - Existing route protection
- `/types/auth.ts` - User and session types

**Files NOT to Create**:
- Do NOT create `/lib/auth.ts` as specified (already exists)
- Do NOT create NextAuth configuration
- Do NOT create `/middleware.ts` (exists with different implementation)

**Modifications Required**:
- Update all `import { auth } from '@/lib/auth'` to use Supabase equivalent
- Change `requireAuth()` implementation to use Supabase
- Update session type references

**Testing Considerations**:
- Verify new module authentication works with existing Supabase setup
- Test that existing module auth still works
- Validate session sharing between old and new modules
```

[Repeat this analysis for EVERY major area: Database, API, Components, Storage, etc.]

---

### Step 2.3: Component Reuse Strategy

**Analysis Required**:

```markdown
### Component Reuse Strategy

**UI Components to Reuse**:

| Spec Component | Existing Component | Decision | Rationale |
|----------------|-------------------|----------|-----------|
| `Button` | `/components/ui/button.tsx` | REUSE | Same functionality |
| `Card` | `/components/ui/card.tsx` | REUSE | Same functionality |
| `DataTable` | None exists | CREATE | New component needed |
| `Modal` | `/components/ui/dialog.tsx` | REUSE (adapt) | Similar, adapt usage |

**Layout Components to Reuse**:

| Spec Component | Existing Component | Decision | Rationale |
|----------------|-------------------|----------|-----------|
| `DashboardLayout` | `/components/layout/DashboardLayout.tsx` | EXTEND | Add to existing layout |
| `Sidebar` | `/components/layout/Sidebar.tsx` | EXTEND | Add new nav items |
| `Header` | `/components/layout/Header.tsx` | REUSE | No changes needed |

**Feature Components to Create**:
[List new components that don't exist and must be built per spec]

**Styling Consistency**:
- Existing: [Describe existing style patterns]
- Spec: [Describe spec style patterns]
- Strategy: [How to ensure consistency]
```

---

### Step 2.4: Database Integration Strategy

**Analysis Required**:

```markdown
### Database Integration Strategy

**Schema Analysis**:

**Existing Tables**:
[List all existing tables with fields]

**Spec Requires**:
[List all tables from structured spec]

**Tables Overlap Analysis**:

| Table | Status | Strategy |
|-------|--------|----------|
| `users` | EXISTS | EXTEND - Add fields: [list] |
| `datasets` | NEW | CREATE - Per spec |
| `training_jobs` | NEW | CREATE - Per spec |
| `cost_records` | EXISTS (partial) | EXTEND - Add fields: [list] |

**Migration Strategy**:

**Migration 1: Extend Users Table**
```sql
-- Add new fields to existing users table
ALTER TABLE users 
ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'FREE',
ADD COLUMN monthly_budget DECIMAL(10,2);
```

**Migration 2: Create New Tables**
```sql
-- Create datasets table as specified
CREATE TABLE datasets (
  -- Per spec
);
```

[Continue for all database changes]

**ORM Adaptation**:
- Existing ORM: [Prisma/Drizzle/etc.]
- Spec assumes: [ORM from spec]
- Strategy: [How to adapt schema definitions]

**Example Schema Translation**:

Spec shows (Prisma):
```prisma
model Dataset {
  id String @id @default(cuid())
  // ...
}
```

Translate to (Drizzle example):
```typescript
export const datasets = pgTable('datasets', {
  id: text('id').primaryKey().default(cuid()),
  // ...
});
```
```

---

### Step 2.5: API Integration Strategy

**Analysis Required**:

```markdown
### API Integration Strategy

**Route Namespace Strategy**:

**Existing API Routes**:
- `/api/users/*`
- `/api/auth/*`
- `/api/projects/*`
[List all existing routes]

**Spec Adds Routes**:
- `/api/datasets/*`
- `/api/jobs/*`
- `/api/models/*`
- `/api/costs/*`
- `/api/notifications/*`

**Conflict Analysis**:
- Conflicts: [Any route conflicts]
- Resolution: [How to resolve]

**Pattern Consistency**:

Existing pattern:
```typescript
// Example from codebase
export async function GET(request: Request) {
  const session = await getServerSession();
  // ...
}
```

Spec pattern:
```typescript
// Example from spec
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  // ...
}
```

**Adaptation Strategy**:
- Use existing `getServerSession()` pattern
- Adapt spec's `requireAuth()` to call existing auth
- Match existing error response format
- Use existing validation patterns
```

---

### Step 2.6: Routing Integration Strategy

**Analysis Required**:

```markdown
### Routing Integration Strategy

**Existing Routes**:
```
/
├── / (home/dashboard)
├── /login
├── /signup
├── /dashboard
├── /projects
└── /settings
```

**Spec Adds Routes**:
```
/datasets
├── /datasets (list)
└── /datasets/[id] (detail)

/training
├── /training/configure
└── /training/jobs/[jobId] (monitor)

/models
└── /models/[id] (artifacts)
```

**Navigation Integration**:
- Update sidebar to include new sections
- Add to existing dashboard nav
- Maintain existing routing patterns

**Route Protection**:
- Existing: [How routes are protected]
- Apply same pattern to new routes
- Ensure consistency
```

---

### Step 2.7: State Management Integration Strategy

**Analysis Required**:

```markdown
### State Management Integration Strategy

**Existing State Approach**: [SWR/React Query/Zustand/etc.]
**Spec Assumes**: [State approach from spec]

**Strategy**: [USE_EXISTING | ADAPT]

**Data Fetching Pattern**:

Existing:
```typescript
const { data, error } = useSWR('/api/users', fetcher);
```

Adapt spec to use this pattern for new endpoints.

**Cache Coordination**:
- Ensure new module data fetching integrates with existing cache
- Revalidation strategy: [Describe]
- Optimistic updates: [Describe]
```

---

## PHASE 3: IMPLEMENTATION DELTAS SPECIFICATION

Create detailed, actionable modifications to the structured specification.

### Delta Document Structure

For EACH section of the structured specification, create a corresponding delta section:

```markdown
## Section [N] Deltas: [Section Name from Spec]

### DELTA [N].1: [Specific Area]

**Structured Spec Says** (Reference: FR-X.Y.Z):
[Quote or summarize what the spec instructs]

**Codebase Reality**:
[What actually exists in the codebase]

**Delta Decision**: [USE_EXISTING | EXTEND | ADAPT | CREATE_NEW | SKIP]

**Rationale**:
[Why this decision was made]

**Specific Modifications**:

**DO NOT CREATE**:
- File: `/path/to/file.ts` - Reason: [Already exists with equivalent functionality]
- File: `/path/to/other.ts` - Reason: [Conflicts with existing pattern]

**DO CREATE**:
- File: `/new/path/file.ts` - As specified in spec
- File: `/new/path/other.ts` - With modifications: [describe modifications]

**DO MODIFY**:
- File: `/existing/file.ts`
  - Add: [What to add]
  - Change: [What to change]
  - Reason: [Why]

**DO USE (from existing)**:
- File: `/existing/util.ts` 
  - Function: `helperFunction()` - Use instead of creating new
  - Location: Line 45-60
  - Purpose: [What it does]

**Code Modifications Required**:

Instead of (from spec):
```typescript
import { auth } from '@/lib/auth';  // Spec version

export async function GET(request: NextRequest) {
  const user = await auth();
  // ...
}
```

Use (adapted for codebase):
```typescript
import { getServerSession } from '@/lib/auth';  // Existing implementation

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = session.user;
  // ...
}
```

**Testing Modifications**:
- Adapt tests to use existing test utilities
- Use existing mock patterns
- Ensure integration tests verify both old and new functionality

**Documentation Updates**:
- Note deviations from spec in code comments
- Update internal docs to reflect actual implementation
```

### Critical Delta Areas

Provide deltas for AT MINIMUM:

1. **Authentication & Authorization Deltas**
2. **Database Schema Deltas**
3. **API Endpoint Deltas**
4. **Component Creation Deltas**
5. **Routing Deltas**
6. **State Management Deltas**
7. **File Storage Deltas**
8. **Background Jobs Deltas**
9. **Testing Strategy Deltas**
10. **Environment Configuration Deltas**

---

## OUTPUT DOCUMENT 1: CODEBASE DISCOVERY

**File**: `04d-codebase-discovery_v1.md`

**Structure**:

```markdown
# Codebase Discovery - [Project Name]

**Discovery Date**: [Date]
**Codebase Path**: [Path]
**Structured Spec**: [Reference to spec file]

---

## Executive Summary

[2-3 paragraph overview of what was discovered]

**Key Findings**:
- [Major finding 1]
- [Major finding 2]
- [Major finding 3]

**Integration Complexity**: [LOW | MEDIUM | HIGH]
**Estimated Integration Effort**: [Hours]

---

## 1. Project Architecture

[Output from Step 1.1]

---

## 2. Authentication & Authorization

[Output from Step 1.2]

---

## 3. Database & ORM

[Output from Step 1.3]

---

## 4. API Architecture

[Output from Step 1.4]

---

## 5. Component Library

[Output from Step 1.5]

---

## 6. State Management

[Output from Step 1.6]

---

## 7. File Storage & External Services

[Output from Step 1.7]

---

## 8. Utilities & Helpers

[Output from Step 1.8]

---

## 9. Testing Infrastructure

[Output from Step 1.9]

---

## 10. Environment & Configuration

[Output from Step 1.10]

---

## Appendix A: Complete File Structure

[Tree output of codebase structure]

---

## Appendix B: Dependency Analysis

[Key dependencies from package.json with versions]

---

## Appendix C: Reusable Assets Inventory

**Components**: [Count]
**Hooks**: [Count]
**Utilities**: [Count]
**Types**: [Count]
**APIs**: [Count endpoints]

[Detailed inventory]
```

---

## OUTPUT DOCUMENT 2: INTEGRATION STRATEGY

**File**: `04d-integration-strategy_v1.md`

**Structure**:

```markdown
# Integration Strategy - [Module Name]

**Strategy Date**: [Date]
**Codebase**: [Path]
**Structured Spec**: [Reference]
**Discovery Doc**: [Reference to 04d-codebase-discovery_v1.md]

---

## Executive Summary

[2-3 paragraph summary of integration approach]

**Integration Approach**: [USE_EXISTING | HYBRID | ADAPT_HEAVY | GREENFIELD]

**Key Decisions**:
1. [Major decision 1]
2. [Major decision 2]
3. [Major decision 3]

**Risk Assessment**: [LOW | MEDIUM | HIGH]
**Breaking Change Risk**: [LOW | MEDIUM | HIGH]

---

## 1. Architecture Comparison

[Output from Step 2.1]

---

## 2. Authentication Integration

[Output from Step 2.2 - Authentication section]

---

## 3. Database Integration

[Output from Step 2.4]

---

## 4. API Integration

[Output from Step 2.5]

---

## 5. Component Reuse Strategy

[Output from Step 2.3]

---

## 6. Routing Integration

[Output from Step 2.6]

---

## 7. State Management Integration

[Output from Step 2.7]

---

## 8. File Storage Integration

[Integration strategy for file storage]

---

## 9. Background Jobs Integration

[Integration strategy for job queue if applicable]

---

## 10. Testing Strategy Integration

[How tests will integrate with existing test suite]

---

## Integration Risk Matrix

| Area | Risk Level | Mitigation Strategy |
|------|-----------|---------------------|
| Authentication | [LOW/MED/HIGH] | [Strategy] |
| Database | [LOW/MED/HIGH] | [Strategy] |
| API Routes | [LOW/MED/HIGH] | [Strategy] |
| Components | [LOW/MED/HIGH] | [Strategy] |
| State | [LOW/MED/HIGH] | [Strategy] |

---

## Implementation Phases

**Phase 1: Foundation** (Est: [hours])
- [Tasks]

**Phase 2: Core Features** (Est: [hours])
- [Tasks]

**Phase 3: Integration & Testing** (Est: [hours])
- [Tasks]

**Total Estimated Effort**: [hours]

---

## Validation Checklist

Before beginning implementation:
- [ ] All existing features documented
- [ ] All integration points identified
- [ ] No breaking changes in strategy
- [ ] Reuse opportunities maximized
- [ ] Testing strategy defined
- [ ] Rollback plan exists
```

---

## OUTPUT DOCUMENT 3: IMPLEMENTATION DELTAS

**File**: `04d-implementation-deltas_v1.md`

**Structure**:

```markdown
# Implementation Deltas - [Module Name]

**Deltas Date**: [Date]
**Structured Spec**: [Reference]
**Discovery**: [Reference to discovery doc]
**Strategy**: [Reference to strategy doc]

---

## Purpose

This document specifies EXACT MODIFICATIONS to the structured specification required for integration with the existing codebase. Developers must read the structured spec alongside this document.

**Usage**:
1. Read structured spec section
2. Check corresponding delta section below
3. Apply deltas during implementation
4. Skip, modify, or extend as indicated

---

## How to Read Deltas

**SKIP**: Do not implement - already exists
**USE**: Use existing implementation - reference provided  
**EXTEND**: Add to existing - modification details provided
**ADAPT**: Change spec approach - new approach detailed
**CREATE**: Implement as specified - no changes needed

---

## Section 1 Deltas: [Section Name from Spec]

### Overview of Section 1 Changes

**Summary**: [Brief overview]
**Major Changes**: [Count and list]
**Effort Impact**: [Increases/Decreases/Same] - [Reason]

---

### DELTA 1.1: [Specific Feature/Component]

[Complete delta following template from Phase 3]

---

### DELTA 1.2: [Next Feature/Component]

[Complete delta]

---

[Continue for all deltas in Section 1]

---

## Section 2 Deltas: [Section Name from Spec]

[Repeat structure for Section 2]

---

## Section 3 Deltas: [Section Name from Spec]

[Repeat structure for Section 3]

---

[Continue for ALL sections in structured spec]

---

## Quick Reference: Files to Skip

**Complete list of files specified in structured spec that should NOT be created**:

- `/path/to/file.ts` - Exists: `/existing/path/equivalent.ts`
- `/another/file.ts` - Exists: `/existing/other.ts`
[Complete list]

---

## Quick Reference: Files to Create

**Complete list of NEW files to create per spec** (no modifications):

- `/path/to/new/file.ts` - Section X, FR-X.Y.Z
- `/path/to/another.ts` - Section Y, FR-Y.A.B
[Complete list]

---

## Quick Reference: Files to Modify

**Complete list of EXISTING files to modify**:

- `/existing/file.ts`
  - Add: [Specific additions]
  - Change: [Specific changes]
  - Reference: Section X, FR-X.Y.Z

[Complete list]

---

## Testing Delta Summary

**Test Files to Skip**: [List]
**Test Patterns to Change**: [List with changes]
**Integration Tests Required**: [List new integration tests]

---

## Environment Variables Delta

**New Variables Required**:
```bash
NEW_VAR_1=
NEW_VAR_2=
```

**Variables to Modify**:
```bash
EXISTING_VAR= # Change from X to Y
```

**Variables Already Set**: [List variables spec requires that already exist]

---

## Migration Delta

**Database Migrations Required**: [Number]

**Migration Order**:
1. [Migration description] - File: `0001_migration.sql`
2. [Migration description] - File: `0002_migration.sql`

---

## Deployment Delta

**Changes to Deployment Process**:
- [Change 1]
- [Change 2]

**New Environment Setup Required**: [Yes/No]
**Backward Compatibility**: [Maintained/Broken/Partial]

---

## Developer Checklist

Use this checklist during implementation:

**Section 1**: Foundation & Authentication
- [ ] Delta 1.1: [Description] - Status: [Skip/Use/Extend/Create]
- [ ] Delta 1.2: [Description] - Status: [Skip/Use/Extend/Create]
[All deltas from Section 1]

**Section 2**: [Section Name]
- [ ] Delta 2.1: [Description] - Status: [Skip/Use/Extend/Create]
[All deltas from Section 2]

[Continue for all sections]

---

## Validation

Before marking implementation complete:

- [ ] All deltas applied correctly
- [ ] No files from "Skip" list were created
- [ ] All files from "Modify" list were updated
- [ ] Existing features still functional
- [ ] New features working as specified
- [ ] Tests passing (existing + new)
- [ ] No breaking changes introduced
- [ ] Code review completed with delta awareness
```

---

## QUALITY CHECKLIST

Before finalizing your three documents, verify:

### Codebase Discovery Document
- [ ] All major areas analyzed (architecture, auth, database, API, components, state, storage, utilities, testing, config)
- [ ] Actual code examples included (not generic descriptions)
- [ ] File paths specific and accurate
- [ ] Existing patterns clearly documented
- [ ] Reusable components identified
- [ ] Complete dependency inventory

### Integration Strategy Document
- [ ] Every major area has clear strategy (USE_EXISTING | EXTEND | ADAPT | CREATE_NEW)
- [ ] Rationale provided for each decision
- [ ] Risk assessment for each integration point
- [ ] No breaking changes or mitigation plan provided
- [ ] Implementation phases with time estimates
- [ ] Validation checklist for strategy review

### Implementation Deltas Document
- [ ] Delta for EVERY section of structured spec
- [ ] Specific file paths (create, skip, modify)
- [ ] Code examples showing exact changes
- [ ] Clear action verbs (SKIP, USE, EXTEND, ADAPT, CREATE)
- [ ] Quick reference sections for easy lookup
- [ ] Developer checklist for implementation tracking

### Cross-Document Consistency
- [ ] Documents reference each other correctly
- [ ] Terminology consistent across all three
- [ ] File paths match across documents
- [ ] Strategies align with deltas
- [ ] No contradictions between documents

### Practical Usability
- [ ] Developer can follow without ambiguity
- [ ] Specific enough to implement
- [ ] All edge cases addressed
- [ ] Migration path clear
- [ ] Rollback strategy documented
- [ ] Testing guidance provided

---

## FINAL OUTPUT SUMMARY

You will create THREE comprehensive markdown documents:

1. **04d-codebase-discovery_v1.md** (~2,000-3,000 lines)
   - Complete analysis of existing codebase
   - What exists, where, and how it works
   - Reusable assets inventory

2. **04d-integration-strategy_v1.md** (~1,500-2,500 lines)
   - How new module integrates with existing
   - Strategic decisions with rationale
   - Risk assessment and mitigation
   - Implementation phases

3. **04d-implementation-deltas_v1.md** (~2,000-4,000 lines)
   - Specific modifications to structured spec
   - Delta for every section
   - Quick reference guides
   - Developer checklists

**Total Expected Output**: ~5,500-9,500 lines of comprehensive integration documentation

---

## REMEMBER

Your goal is to enable a developer to:

1. ✅ Understand exactly what exists in the current codebase
2. ✅ Know precisely how the new module integrates
3. ✅ Have specific, actionable modifications to the spec
4. ✅ Implement without breaking existing functionality
5. ✅ Maximize code reuse and pattern consistency
6. ✅ Deliver production-ready, integrated code

**This is not just documentation - this is an implementation guide that bridges greenfield specification with production codebase reality.**

Begin your analysis now.

---

**Meta-Prompt Version**: 1.0  
**Date**: December 22, 2024  
**Status**: Ready for Generator Script

