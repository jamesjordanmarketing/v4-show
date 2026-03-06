# Codebase Extension Meta-Prompt

**Version:** 2.0  
**Purpose:** Generate extension documentation for implementing a structured specification as a new module in an existing production codebase  
**Input:** Structured specification + Existing codebase directory  
**Output:** Three extension documents (Infrastructure Inventory, Extension Strategy, Implementation Guide)

---

## CRITICAL FRAMING: EXTENSION, NOT INTEGRATION

**READ THIS FIRST - THIS DEFINES THE ENTIRE APPROACH**

You are NOT comparing two independent applications for compatibility.
You are NOT looking for "mismatches" or "incompatibilities" between tech stacks.
You are NOT recommending building a separate application.
You are NOT performing a gap analysis between two systems.

**You ARE:**
- Analyzing an existing production codebase to understand what infrastructure it provides
- Reading a structured specification to understand what FEATURES need to be built
- Determining how to ADD these new features as a MODULE that sits alongside existing code
- Using the EXISTING infrastructure (auth, database, storage, components) for ALL new features
- Specifying exactly what to CREATE NEW (tables, APIs, pages, components) using existing patterns

**The Goal:**
> Build the new module as an extension that sits alongside existing code, with direct access to existing objects, artifacts, and interfaces, functioning holistically as part of the same application.

**Key Mindset Shift:**
- The structured spec describes **FEATURES** (what to build)
- The structured spec's infrastructure choices (Prisma, NextAuth, S3, BullMQ, etc.) are **IRRELEVANT**
- Your job is to implement the spec's **FEATURES** using the **EXISTING** codebase's infrastructure
- The core technologies of the existing codebase always take priority over the structured spec, unless the structured spec has some functionality that cannot be achieved using the current technologies in the existing codebase

**NEVER recommend building separately.** The new module WILL be added to the existing codebase.

---

## CORE PRINCIPLES

1. **Extension First**: New features extend the existing application using its infrastructure
2. **Preservation Always**: Existing functionality must continue working - no breaking changes
3. **Reuse Over Create**: Use existing infrastructure wherever possible
4. **Pattern Consistency**: New code must match existing conventions and patterns
5. **Feature Focus**: Extract and implement the FEATURES from the spec, ignore its tech stack assumptions
6. **Practical Guidance**: Provide specific, actionable implementation instructions

---

## INPUT FILES

### Input 1: Structured Specification
**File Path**: `{{STRUCTURED_SPEC_PATH}}`

This file contains the complete structured specification for the new module. It describes **WHAT FEATURES** need to be built. The technology choices in this spec are assumptions for a greenfield project and should be IGNORED in favor of the existing codebase's infrastructure.

**Read the spec to extract**:
- ✅ Features and functionality
- ✅ User workflows and interactions
- ✅ Data models and relationships (conceptually)
- ✅ Business logic and validation rules
- ✅ UI components and pages needed

**Ignore from the spec**:
- ❌ Technology choices (frameworks, libraries, services)
- ❌ Infrastructure assumptions (auth providers, ORMs, storage services)
- ❌ Build configurations
- ❌ Deployment strategies

### Input 2: Existing Production Codebase  
**Directory Path**: `{{CODEBASE_PATH}}`

This directory contains the current production codebase where the new module will be added as an extension. You must analyze its structure, patterns, and existing infrastructure to understand what is AVAILABLE for the new module to USE.

### Output Destination
**Directory Path**: `{{OUTPUT_PATH}}`

You will create three markdown documents in this directory:
1. `04d-infrastructure-inventory_v1.md` - What infrastructure exists and is available to use
2. `04d-extension-strategy_v1.md` - How new features will use existing infrastructure
3. `04d-implementation-guide_v1.md` - Exact steps to implement new features

---

## PHASE 1: INFRASTRUCTURE INVENTORY

Before creating any documentation, perform a thorough inventory of the existing codebase to understand what infrastructure is AVAILABLE for the new module to use.

**Purpose**: Document what EXISTS and is READY TO USE by the new module.

---

### Step 1.1: Project Architecture Inventory

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

**Available for New Module**:
- ✅ New routes can be added following [pattern]
- ✅ Route protection is available via [pattern]
- ✅ Navigation can be extended via [pattern]
```

---

### Step 1.2: Authentication Infrastructure Inventory

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
### Authentication Infrastructure

**Provider**: [Name and version]
**Location**: [File paths]
**Configuration**: 
- Provider setup: [File path and key config]
- Session strategy: [JWT/Database/etc.]
- Session storage: [Cookies/localStorage/etc.]

**User Model Available to New Module**:
```typescript
interface User {
  // Document actual user model structure
  id: string;
  email: string;
  // ... all fields available
}
```

**API Protection Pattern (USE THIS)**:
```typescript
// Show actual pattern used in codebase
// e.g., requireAuth() helper, middleware, etc.
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Client Protection Pattern (USE THIS)**:
```typescript
// Show actual pattern for protecting pages
// e.g., useSession() hook, HOC, etc.
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Available for New Module**:
- ✅ Authentication is already set up
- ✅ User object is available in all authenticated contexts
- ✅ API routes can be protected using [pattern]
- ✅ Pages can be protected using [pattern]
- ✅ User ID can be used as foreign key in new tables: `[field_name]`
```

---

### Step 1.3: Database Infrastructure Inventory

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
### Database Infrastructure

**Database**: [Type and version]
**ORM/Client**: [Name and version]
**Location**: [Schema files path]

**Existing Tables Overview**:

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

[Document ALL existing tables]

**Database Client Pattern (USE THIS)**:
```typescript
// Show how database is accessed in codebase
import { db } from '@/lib/db';

// Example query pattern
const user = await db.user.findUnique({ ... });
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Migration System**: [Describe migration approach]

**Available for New Module**:
- ✅ Database connection is already set up
- ✅ New tables can be added via [migration pattern]
- ✅ New module can reference existing tables (e.g., `users` table via user_id foreign key)
- ✅ Query pattern is established and should be followed
- ✅ RLS policies [are/are not] in use - new tables should follow same pattern
```

---

### Step 1.4: API Architecture Inventory

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

**Standard Response Format (USE THIS)**:
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
// NEW MODULE APIS MUST USE THIS EXACT FORMAT
```

**Validation (USE THIS)**: [Approach and library]

**Existing API Endpoints**:

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/users` | GET | Yes | List users |
| `/api/users/[id]` | GET | Yes | Get user |
[List ALL existing API routes]

**Middleware Pattern (USE THIS)**:
```typescript
// Show actual middleware usage
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Available for New Module**:
- ✅ API routes can be added following [pattern]
- ✅ Authentication middleware is available at [location]
- ✅ Error handling is standardized via [pattern]
- ✅ Validation is done using [library]
- ✅ Response format is consistent and must be followed
```

---

### Step 1.5: Component Library Inventory

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
   - Note which are available for reuse

**Output Format**:
```markdown
### Component Library

**UI Framework**: [Name and version]
**Location**: `/components/` (or applicable path)
**Styling System**: [Tailwind/CSS Modules/etc.]
**Theme Config**: [Location and approach]

**Available Components for Reuse**:

**Layout Components** (`/components/layout/`):
- `AppLayout.tsx` - Main application layout wrapper - **USE THIS for new pages**
- `Sidebar.tsx` - Navigation sidebar - **EXTEND THIS to add new nav items**
- `Header.tsx` - Top navigation header - **REUSE AS-IS**
[List all layout components with reuse guidance]

**UI Components** (`/components/ui/`):
- `Button.tsx` - [Description, props, usage] - **REUSE THIS**
- `Card.tsx` - [Description, props, usage] - **REUSE THIS**
- `Input.tsx` - [Description, props, usage] - **REUSE THIS**
[List all UI components with brief descriptions]

**Feature Components** (`/components/[feature]/`):
[List feature-specific components if applicable]

**Component Pattern (FOLLOW THIS)**:
```typescript
// Show typical component structure
export interface ComponentNameProps {
  // ...
}

export function ComponentName({ ... }: ComponentNameProps) {
  // ...
}
// NEW MODULE COMPONENTS SHOULD FOLLOW THIS EXACT PATTERN
```

**Available for New Module**:
- ✅ [N] UI components ready to use
- ✅ Layout system ready to extend
- ✅ Styling approach is [system] - use this for new components
- ✅ Component pattern is established - follow it
```

---

### Step 1.6: State Management Infrastructure Inventory

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
### State Management Infrastructure

**Global State**: [Library or approach]
**Location**: [File paths]
**Store Structure**:
```typescript
// Show actual store structure if applicable
```

**Data Fetching (USE THIS)**: [Library and version]
**Pattern**:
```typescript
// Show typical data fetching pattern
const { data, error, isLoading } = useSWR('/api/endpoint', fetcher);
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Form Handling (USE THIS)**: [Library if applicable]
**Pattern**:
```typescript
// Show form handling pattern
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Available for New Module**:
- ✅ Data fetching pattern is established - use [library]
- ✅ Form handling pattern is established - use [library]
- ✅ Global state (if any) can be extended via [pattern]
- ✅ Caching strategy is in place - follow it
```

---

### Step 1.7: File Storage Infrastructure Inventory

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
### File Storage Infrastructure

**Provider**: [S3/R2/Supabase/etc.]
**Configuration**: [Location]
**Client**: [File path to storage client]

**Upload Pattern (USE THIS)**:
```typescript
// Show actual upload pattern in codebase
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

**Download Pattern (USE THIS)**:
```typescript
// Show actual download pattern
// NEW MODULE SHOULD USE THIS EXACT PATTERN
```

### Background Jobs Infrastructure

**Queue System**: [Name or "None"]
**Location**: [If applicable]
**Patterns**: [Description]

**Available for New Module**:
- ✅ File storage is set up - use [provider]
- ✅ Upload pattern is established - follow it
- ✅ Download/access pattern is established - follow it
- ✅ Background jobs [are/are not] available - [guidance]
```

---

### Step 1.8: Utility Functions & Helpers Inventory

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

**Available Utility Functions (USE THESE)**:
- `formatDate()` - [Description] - **USE THIS for date formatting**
- `cn()` - [Description] - **USE THIS for className merging**
- `formatCurrency()` - [Description] - **USE THIS for currency display**
[List all utility functions]

**Custom Hooks Available** (`/hooks/`):
- `useAuth()` - [Purpose] - **USE THIS for auth state**
- `useApi()` - [Purpose] - **USE THIS for API calls**
[List all custom hooks]

**Type Definitions** (`/types/`):
```typescript
// Key shared types
export interface ApiResponse<T> {
  // ...
}
// USE THESE TYPES in new module
```

**Available for New Module**:
- ✅ [N] utility functions ready to use
- ✅ [N] custom hooks ready to use
- ✅ Shared types available - import and use
- ✅ Follow established naming conventions
```

---

### Step 1.9: Testing Infrastructure Inventory

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

**Test Location Pattern**: [Pattern, e.g., `__tests__/`, `*.test.ts`]
**Coverage**: [Current coverage if known]

**Test Pattern (FOLLOW THIS)**:
```typescript
// Show typical test structure
// NEW MODULE TESTS SHOULD FOLLOW THIS PATTERN
```

**Available for New Module**:
- ✅ Testing framework is set up - [framework]
- ✅ Test patterns are established - follow them
- ✅ Mock utilities available at [location]
- ✅ New tests should follow [pattern]
```

---

### Step 1.10: Environment & Configuration Inventory

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

**Available for New Module**:
- ✅ Environment setup is in place
- ✅ New variables can be added to [file]
- ✅ Configuration follows [pattern]
```

---

## PHASE 2: EXTENSION STRATEGY DEVELOPMENT

Now that you understand what infrastructure exists and is available, develop a strategy for how the new module will USE this infrastructure to implement the features specified in the structured spec.

**Purpose**: Define HOW new features will use existing infrastructure and what needs to be CREATED NEW.

---

### Step 2.1: Feature Extraction from Structured Spec

Extract the actual FEATURES from the structured specification, ignoring technology choices.

**Analysis Required**:

```markdown
### Features Extracted from Structured Spec

For EACH section of the structured spec, extract:

## Section [N]: [Section Name]

**Features Described**:

| Feature ID | Feature Description | Data/Models Needed | APIs Needed | UI Pages/Components Needed |
|------------|---------------------|-------------------|-------------|----------------------------|
| F[N].1 | [What user can do] | [Conceptual data] | [API actions] | [UI elements] |
| F[N].2 | [What user can do] | [Conceptual data] | [API actions] | [UI elements] |

**Technology Choices in Spec (IGNORE THESE)**:
- Auth: [What spec says] → IGNORE, use existing [existing auth]
- Database: [What spec says] → IGNORE, use existing [existing DB]
- Storage: [What spec says] → IGNORE, use existing [existing storage]
- Components: [What spec says] → IGNORE, use existing [existing components]
- State: [What spec says] → IGNORE, use existing [existing state management]

[Repeat for ALL sections]
```

---

### Step 2.2: Infrastructure Mapping Strategy

For each infrastructure area, define HOW the new module will use it.

**Strategy Format**:

```markdown
### Infrastructure Mapping Strategy

#### Authentication Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: USE_EXISTING

**How New Module Will Use It**:
1. Import authentication from `[file path]`
2. Protect API routes using `[existing pattern]`
3. Protect pages using `[existing pattern]`
4. Access user object via `[existing pattern]`
5. Use `[user_id_field]` as foreign key in new tables

**Implementation Notes**:
- DO NOT install [spec's auth solution]
- DO NOT create new auth configuration
- DO USE existing auth throughout
- NEW user fields (if needed): Add via migration to existing users table

---

#### Database Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: EXTEND_EXISTING

**How New Module Will Use It**:
1. Use existing database connection from `[file path]`
2. Create NEW tables for module-specific data
3. Reference existing `users` table via foreign key
4. Follow existing query patterns
5. Add migrations using existing migration system

**New Tables to Create**:
- `[table_1]` - [Purpose]
- `[table_2]` - [Purpose]
[List all new tables needed]

**Existing Tables to Reference**:
- `users` - via `user_id` foreign key
[List any existing tables the new module will reference]

**Implementation Notes**:
- DO NOT install [spec's ORM]
- DO NOT create separate database connection
- DO USE existing database client pattern
- NEW tables should follow existing naming conventions
- NEW tables should use RLS policies if existing tables do

---

#### Storage Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: USE_EXISTING

**How New Module Will Use It**:
1. Use existing storage client from `[file path]`
2. Create NEW bucket(s) for module files
3. Follow existing upload/download patterns
4. Use existing presigned URL approach (if applicable)

**New Storage Buckets/Folders**:
- `[bucket/folder_1]` - [Purpose]
[List new storage areas needed]

**Implementation Notes**:
- DO NOT install [spec's storage solution]
- DO NOT create new storage configuration
- DO USE existing storage client and patterns

---

#### API Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: EXTEND_EXISTING

**How New Module Will Use It**:
1. Create NEW API routes under `/api/[module-namespace]/`
2. Use existing response format
3. Use existing authentication middleware
4. Use existing error handling
5. Use existing validation library

**New API Routes to Create**:
- `POST /api/[module]/[resource]` - [Purpose]
- `GET /api/[module]/[resource]` - [Purpose]
[List all new API routes needed]

**Implementation Notes**:
- DO NOT create different response format
- DO NOT create custom error handling
- DO USE existing patterns throughout

---

#### Component Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: REUSE_AND_CREATE

**How New Module Will Use It**:
1. REUSE existing UI components (Button, Card, Input, etc.)
2. EXTEND existing layout components (add nav items)
3. CREATE NEW feature-specific components
4. Follow existing component patterns
5. Use existing styling approach

**Components to Reuse**:
- `Button` - existing at `[path]`
- `Card` - existing at `[path]`
[List all components to reuse]

**Components to Create**:
- `[NewComponent1]` - [Purpose] - using existing patterns
- `[NewComponent2]` - [Purpose] - using existing patterns
[List all new components needed]

**Implementation Notes**:
- DO NOT recreate existing UI components
- DO NOT use different styling approach
- DO USE existing component library
- NEW components should match existing patterns

---

#### State Management Strategy

**Existing Infrastructure**: [What exists - from Phase 1]
**Spec Assumes**: [What spec says - for context only]
**Strategy**: USE_EXISTING

**How New Module Will Use It**:
1. Use existing data fetching library for API calls
2. Follow existing caching strategy
3. Use existing form handling library
4. Follow existing state patterns

**Implementation Notes**:
- DO NOT install different data fetching library
- DO NOT install different form library
- DO USE existing patterns throughout

---

[Continue for all infrastructure areas]
```

---

### Step 2.3: Routing Extension Strategy

**Analysis Required**:

```markdown
### Routing Extension Strategy

**Existing Routes**:
```
/ (home)
/dashboard
/[existing routes]
```

**New Routes to Add for Module**:
```
/[module]
├── /[module] (list view)
├── /[module]/[id] (detail view)
├── /[module]/create (create view)
└── ... [all new routes]
```

**Navigation Integration**:
- Extend sidebar navigation at `[file path]` to include:
  - [New nav item 1]
  - [New nav item 2]
- Add to dashboard (if applicable) at `[file path]`
- Use existing route protection patterns

**Implementation Notes**:
- DO NOT change existing routes
- DO ADD new routes following existing patterns
- DO EXTEND navigation components
```

---

### Step 2.4: Implementation Phases

Organize implementation into logical phases:

```markdown
### Implementation Phases

**Phase 1: Database Foundation** (Est: [hours])
- Create database migrations
- Add new tables
- Set up relationships and constraints
- Test database connectivity

**Phase 2: API Layer** (Est: [hours])
- Create API routes for [features]
- Implement authentication
- Add validation
- Test API endpoints

**Phase 3: UI Components** (Est: [hours])
- Create feature-specific components
- Integrate with existing UI components
- Implement forms and interactions
- Test component rendering

**Phase 4: Pages & Routing** (Est: [hours])
- Create page routes
- Integrate with layout
- Add navigation items
- Test routing and protection

**Phase 5: Integration & Testing** (Est: [hours])
- End-to-end feature testing
- Ensure existing features still work
- Performance testing
- Bug fixes

**Total Estimated Effort**: [hours]
```

---

## PHASE 3: IMPLEMENTATION GUIDE GENERATION

Create detailed, step-by-step implementation instructions.

**Purpose**: Provide EXACT instructions for implementing new features using existing infrastructure.

---

### Implementation Guide Structure

```markdown
# Implementation Guide - [Module Name]

**Date**: [Date]
**Structured Spec**: [Reference]
**Infrastructure Inventory**: [Reference to inventory doc]
**Extension Strategy**: [Reference to strategy doc]

---

## PURPOSE

This document provides exact implementation instructions for adding the [Module Name] to the existing codebase. Follow sections in order for systematic implementation.

**Implementation Approach**:
1. Database setup (migrations)
2. Type definitions (TypeScript interfaces)
3. API routes (backend logic)
4. React hooks (data fetching)
5. Components (UI building blocks)
6. Pages (full views)
7. Navigation (app integration)
8. Background processing (if applicable)
9. Testing

---

## PHASE 1: DATABASE SETUP

### Step 1.1: Create Database Migration

**File**: `[migration file path following existing convention]`

```sql
-- Create new tables for [Module Name]

-- Table: [table_1]
CREATE TABLE [table_1] (
  id [TYPE] PRIMARY KEY [DEFAULT],
  user_id [TYPE] REFERENCES users(id) ON DELETE CASCADE,  -- Reference existing users table
  [other fields],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy (if applicable)
[RLS policies following existing patterns]

-- Indexes
[Indexes following existing patterns]

[Continue for all new tables]
```

**Implementation Notes**:
- Use existing user table reference: `user_id REFERENCES users(id)`
- Follow existing naming conventions (snake_case, etc.)
- Follow existing timestamp patterns
- Follow existing RLS policy patterns (if applicable)

### Step 1.2: Run Migration

**Command**:
```bash
[Command to run migration in existing system]
```

### Step 1.3: Verify Database Setup

**Verification**:
```sql
-- Verify tables created
[Verification queries]
```

---

## PHASE 2: TYPE DEFINITIONS

### Step 2.1: Create Module Types

**File**: `[type file path following existing convention]`

```typescript
// Types for [Module Name]

// [Table 1] type
export interface [Type1] {
  id: string;
  user_id: string;
  [other fields];
  created_at: string;
  updated_at: string;
}

// [Request/Response types]
export interface [RequestType] {
  [fields];
}

export interface [ResponseType] {
  [fields];
}

[Continue for all types needed]
```

**Implementation Notes**:
- Follow existing type naming conventions
- Import and use existing types where applicable (e.g., `User` type)
- Place types in existing types directory following conventions

---

## PHASE 3: API ROUTES

### Step 3.1: Create API Route - [Feature 1]

**File**: `[API route path following existing convention]`

```typescript
import { [existing auth] } from '[existing auth path]';
import { [existing db client] } from '[existing db path]';
import { [existing validation] } from '[existing validation path]';

export async function [METHOD](request: Request) {
  // Authenticate using EXISTING pattern
  const user = await [existing auth pattern];
  
  if (!user) {
    return Response.json(
      { success: false, error: 'Unauthorized' },  // Use existing error format
      { status: 401 }
    );
  }
  
  // Parse and validate request using EXISTING pattern
  const body = await request.json();
  const validated = [existing validation pattern](body);
  
  // Database query using EXISTING pattern
  const result = await [existing db pattern];
  
  // Return using EXISTING response format
  return Response.json({
    success: true,
    data: result
  });
}
```

**Implementation Notes**:
- Use existing authentication pattern from `[file]`
- Use existing database client from `[file]`
- Use existing validation library
- Use existing response format
- Use existing error handling

[Repeat for all API routes needed]

---

## PHASE 4: REACT HOOKS

### Step 4.1: Create Data Fetching Hook - [Feature 1]

**File**: `[hook file path following existing convention]`

```typescript
import { [existing data fetching] } from '[existing lib path]';

export function use[Feature]() {
  // Use EXISTING data fetching pattern
  const { data, error, isLoading, mutate } = [existing pattern](
    '/api/[endpoint]',
    [existing fetcher]
  );
  
  return {
    [data name]: data,
    [error name]: error,
    [loading name]: isLoading,
    [refresh name]: mutate
  };
}
```

**Implementation Notes**:
- Use existing data fetching library (SWR, React Query, etc.)
- Follow existing hook naming conventions
- Follow existing hook patterns

[Repeat for all hooks needed]

---

## PHASE 5: COMPONENTS

### Step 5.1: Create Component - [Component 1]

**File**: `[component file path following existing convention]`

```typescript
import { [existing components] } from '[existing UI lib]';
import { [existing hooks] } from '[existing hooks path]';

interface [Component]Props {
  [props];
}

export function [Component]({ [props] }: [Component]Props) {
  // Use existing hooks
  const [hook] = [existing hook]();
  
  return (
    <div>
      {/* Use EXISTING UI components */}
      <[ExistingComponent]>
        [implementation]
      </[ExistingComponent]>
    </div>
  );
}
```

**Implementation Notes**:
- Import and use existing UI components
- Follow existing component structure
- Use existing styling approach
- Follow existing naming conventions

[Repeat for all components needed]

---

## PHASE 6: PAGES

### Step 6.1: Create Page - [Page 1]

**File**: `[page file path following existing routing convention]`

```typescript
import { [existing layout] } from '[existing layout path]';
import { [new components] } from '[new component paths]';
import { [existing auth] } from '[existing auth path]';

export default async function [Page]() {
  // Use EXISTING page protection pattern
  const user = await [existing protection pattern]();
  
  return (
    <[ExistingLayout]>
      {/* Use new feature components */}
      <[NewComponent1] />
      <[NewComponent2] />
    </[ExistingLayout]>
  );
}
```

**Implementation Notes**:
- Use existing layout components
- Use existing page protection patterns
- Follow existing page structure
- Follow existing routing conventions

[Repeat for all pages needed]

---

## PHASE 7: NAVIGATION UPDATES

### Step 7.1: Extend Navigation

**File**: `[navigation file path]`

**Modification**:
```typescript
// Add to existing navigation array
const navigation = [
  // ... existing items
  {
    name: '[New Module]',
    href: '/[module]',
    icon: [Icon],
  },
  // ... additional items
];
```

**Implementation Notes**:
- Add to existing navigation structure
- Follow existing navigation patterns
- Use existing icon library
- Test navigation integration

---

## PHASE 8: BACKGROUND PROCESSING (If Applicable)

[Include only if spec requires background jobs and existing infrastructure supports it]

### Step 8.1: [Background Task Implementation]

[Instructions following existing patterns]

---

## PHASE 9: TESTING

### Step 9.1: Write Tests

**Pattern**: Follow existing test patterns from `[test examples]`

**Tests to Create**:
- API route tests for `/api/[endpoints]`
- Component tests for `[components]`
- Integration tests for `[features]`

**Example Test**:
```typescript
// Follow EXISTING test patterns
import { [existing test utils] } from '[existing test path]';

describe('[Feature]', () => {
  it('[test case]', async () => {
    // Use existing test patterns
    [test implementation]
  });
});
```

---

## IMPLEMENTATION CHECKLIST

### Database
- [ ] Migration created following existing pattern
- [ ] Tables reference existing users table correctly
- [ ] RLS policies added (if applicable)
- [ ] Migration run successfully

### API Routes
- [ ] Routes created following existing convention
- [ ] Authentication uses existing pattern
- [ ] Validation uses existing library
- [ ] Response format matches existing
- [ ] Error handling matches existing

### Components & Pages
- [ ] Components use existing UI library
- [ ] Components follow existing patterns
- [ ] Pages use existing layout
- [ ] Pages use existing protection patterns

### Navigation
- [ ] Navigation extended with new items
- [ ] Routing follows existing conventions

### Testing
- [ ] Tests follow existing patterns
- [ ] All tests passing
- [ ] Existing tests still passing

### Verification
- [ ] Existing features still work
- [ ] New features work as specified
- [ ] No breaking changes introduced
- [ ] Code follows existing conventions
```

---

## OUTPUT DOCUMENT 1: INFRASTRUCTURE INVENTORY

**File**: `04d-infrastructure-inventory_v1.md`

**Structure**:

```markdown
# Infrastructure Inventory - [Project Name]

**Inventory Date**: [Date]
**Codebase Path**: [Path]
**Structured Spec**: [Reference to spec file]

---

## EXECUTIVE SUMMARY

This document inventories the existing [Project Name] infrastructure available for the new [Module Name] to use. All new features will be implemented using this existing infrastructure.

**Available Infrastructure**:
- ✅ **Authentication**: [What exists] - Ready to use
- ✅ **Database**: [What exists] - Ready to use  
- ✅ **Storage**: [What exists] - Ready to use
- ✅ **Components**: [What exists] - Ready to use
- ✅ **State Management**: [What exists] - Ready to use
- ✅ **API Architecture**: [What exists] - Ready to use

**Approach**: The new [Module Name] will EXTEND this existing application by adding new tables, new API routes, new pages, and new components - all using the patterns documented below.

---

## 1. PROJECT ARCHITECTURE

[Output from Step 1.1]

---

## 2. AUTHENTICATION INFRASTRUCTURE

[Output from Step 1.2]

---

## 3. DATABASE INFRASTRUCTURE

[Output from Step 1.3]

---

## 4. API ARCHITECTURE

[Output from Step 1.4]

---

## 5. COMPONENT LIBRARY

[Output from Step 1.5]

---

## 6. STATE MANAGEMENT INFRASTRUCTURE

[Output from Step 1.6]

---

## 7. FILE STORAGE INFRASTRUCTURE

[Output from Step 1.7]

---

## 8. UTILITIES & HELPERS

[Output from Step 1.8]

---

## 9. TESTING INFRASTRUCTURE

[Output from Step 1.9]

---

## 10. ENVIRONMENT & CONFIGURATION

[Output from Step 1.10]

---

## APPENDIX A: COMPLETE FILE STRUCTURE

[Tree output of codebase structure]

---

## APPENDIX B: DEPENDENCY ANALYSIS

[Key dependencies from package.json with versions]

---

## APPENDIX C: REUSABLE ASSETS SUMMARY

**Components**: [Count] - [List key ones]
**Hooks**: [Count] - [List key ones]
**Utilities**: [Count] - [List key ones]
**Types**: [Count] - [List key ones]
**APIs**: [Count endpoints] - [List namespaces]

**Summary**: The existing codebase provides substantial infrastructure that the new module will use, minimizing new code needed and ensuring consistency.
```

---

## OUTPUT DOCUMENT 2: EXTENSION STRATEGY

**File**: `04d-extension-strategy_v1.md`

**Structure**:

```markdown
# Extension Strategy - [Module Name]

**Strategy Date**: [Date]
**Codebase**: [Path]
**Structured Spec**: [Reference]
**Infrastructure Inventory**: [Reference to inventory doc]

---

## EXECUTIVE SUMMARY

This document defines how the new [Module Name] EXTENDS the existing [Project Name] by using existing infrastructure to implement the features specified in the structured specification.

**Critical Understanding**:
- **Structured Spec describes**: FEATURES to build ([list key features])
- **Structured Spec's tech choices**: IGNORED ([list ignored techs])
- **Existing Codebase provides**: INFRASTRUCTURE to use ([list infrastructure])
- **This Strategy defines**: HOW to implement spec's FEATURES using existing INFRASTRUCTURE

**Key Decisions**:
1. ✅ Use existing [auth] for all authentication
2. ✅ Use existing [database] for all database operations
3. ✅ Use existing [storage] for all file operations
4. ✅ Use existing [components] for all UI
5. ✅ Use existing [state management] for data fetching
6. ✅ Only CREATE NEW: [list what's new]

---

## 1. FEATURES EXTRACTED FROM SPEC

[Output from Step 2.1]

---

## 2. INFRASTRUCTURE MAPPING STRATEGY

[Output from Step 2.2 - all infrastructure areas]

---

## 3. ROUTING EXTENSION STRATEGY

[Output from Step 2.3]

---

## 4. IMPLEMENTATION PHASES

[Output from Step 2.4]

---

## RISK ASSESSMENT

**Extension Complexity**: [LOW | MEDIUM | HIGH]
**Breaking Change Risk**: [LOW | MEDIUM | HIGH]

**Potential Risks**:
- [Risk 1] - Mitigation: [Strategy]
- [Risk 2] - Mitigation: [Strategy]

---

## VALIDATION CHECKLIST

Before beginning implementation:
- [ ] Existing infrastructure fully documented
- [ ] All features extracted from spec
- [ ] Extension strategy defined for all areas
- [ ] No breaking changes planned
- [ ] Reuse opportunities maximized
- [ ] Implementation phases defined
```

---

## OUTPUT DOCUMENT 3: IMPLEMENTATION GUIDE

**File**: `04d-implementation-guide_v1.md`

[Use structure from Phase 3 above]

---

## QUALITY CHECKLIST

Before finalizing your three documents, verify:

### Infrastructure Inventory Document
- [ ] All major areas inventoried (architecture, auth, database, API, components, state, storage, utilities, testing, config)
- [ ] Actual code examples included (not generic descriptions)
- [ ] File paths specific and accurate
- [ ] Existing patterns clearly documented with "USE THIS" markers
- [ ] All reusable components identified
- [ ] "Available for New Module" section for each area
- [ ] Focus is on WHAT EXISTS and HOW TO USE IT

### Extension Strategy Document
- [ ] Features extracted from spec (ignoring tech choices)
- [ ] Every infrastructure area has USE_EXISTING or EXTEND strategy
- [ ] Clear rationale for using existing infrastructure
- [ ] Specific list of what NEW things to create
- [ ] No language about "mismatches" or "incompatibilities"
- [ ] No recommendations to build separately
- [ ] Implementation phases with time estimates
- [ ] Language consistently frames this as EXTENSION

### Implementation Guide Document
- [ ] Step-by-step instructions for EVERY feature
- [ ] Specific file paths following existing conventions
- [ ] Code examples using EXISTING patterns
- [ ] Clear "USE EXISTING [pattern]" instructions
- [ ] Database migrations reference existing tables
- [ ] API routes use existing auth/validation/responses
- [ ] Components use existing UI library
- [ ] Pages use existing layouts
- [ ] Implementation checklist provided

### Cross-Document Consistency
- [ ] Documents reference each other correctly
- [ ] Terminology consistent across all three
- [ ] File paths match across documents
- [ ] Strategy aligns with implementation guide
- [ ] No contradictions between documents
- [ ] Consistent "extension" framing throughout

### Practical Usability
- [ ] Developer can follow without ambiguity
- [ ] Specific enough to implement immediately
- [ ] All edge cases addressed
- [ ] Migration path clear
- [ ] Testing guidance provided
- [ ] Focus on reuse and consistency

---

## FINAL OUTPUT SUMMARY

You will create THREE comprehensive markdown documents:

1. **04d-infrastructure-inventory_v1.md** (~2,000-3,000 lines)
   - Complete inventory of existing infrastructure
   - What exists, where, and how to use it
   - Reusable assets documented
   - Focus: "Here's what's AVAILABLE for you to USE"

2. **04d-extension-strategy_v1.md** (~1,500-2,500 lines)
   - Features extracted from spec (ignoring tech choices)
   - How new module uses existing infrastructure
   - What new things need to be created
   - Implementation phases
   - Focus: "Here's HOW to use existing infrastructure for new features"

3. **04d-implementation-guide_v1.md** (~2,000-4,000 lines)
   - Exact implementation steps
   - Code examples using existing patterns
   - File paths and naming conventions
   - Implementation checklist
   - Focus: "Here's EXACTLY what to do"

**Total Expected Output**: ~5,500-9,500 lines of comprehensive extension documentation

---

## REMEMBER: THE CRITICAL FRAMING

**This is NOT integration - this is EXTENSION.**

Your goal is to enable a developer to:

1. ✅ Understand exactly what infrastructure EXISTS and is AVAILABLE
2. ✅ Know exactly HOW to USE existing infrastructure for new features
3. ✅ Have specific, actionable instructions for what to CREATE NEW
4. ✅ Implement new features WITHOUT breaking existing functionality
5. ✅ Maximize code reuse and pattern consistency
6. ✅ Build new features as an EXTENSION alongside existing code

**The structured spec describes FEATURES.**
**The existing codebase provides INFRASTRUCTURE.**
**Your job is to document HOW TO IMPLEMENT THE FEATURES USING THE INFRASTRUCTURE.**

**NEVER suggest building separately. ALWAYS frame as extension.**

---

**Meta-Prompt Version**: 2.0  
**Date**: December 24, 2024  
**Status**: Ready for Generator Script


