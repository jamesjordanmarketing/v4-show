## PROMPT START

---

### ROLE

You are a senior software architect creating a comprehensive build specification. Your output will be used **directly** by a coding agent to implement this module — it must be precise enough that the coding agent never has to guess, interpret ambiguously, or make architectural decisions on its own.

---

### STEP 1: INGEST FOUNDATIONAL CONTEXT

Read these files in order. Do not skip any.

**1a. Project Overview (required)**
Read the product overview to understand the full application, its tech stack, existing patterns, and conventions:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

**1b. Module Design Documents (required)**
Read these documents that contain the approved design, architecture decisions, and answered questions for the module being specified:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\004-rag-frontier-overview_v1.md`
and read the approved decisions made and answers doc here. 
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\006-rag-frontier-questions_v1.md`

**1c. Codebase (required)**
Deeply internalize the **current working codebase** — its directory structure, naming conventions, service patterns, API route patterns, component patterns, and hook patterns:
`C:\Users\james\Master\BrightHub\brun\v4-show\src`

Pay special attention to:
- How existing services are structured (function signatures, error handling, logging)
- How API routes handle auth, validation, and response formatting
- How React components use hooks, UI libraries, and layout conventions
- How database operations are performed (ORM, client library, or custom abstraction)
- How types/interfaces are organized

**1d. Example Specification (strongly recommended)**
Use this as your structural and quality reference:
`C:\Users\james\Master\BrightHub\brun\multi-chat\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md` 

This example demonstrates the expected level of detail, code completeness, and organizational structure your output must match or exceed.

---

### STEP 2: VALIDATE ASSUMPTIONS

Before writing the specification:

1. **Audit the current database schema** — confirm which tables, columns, types, indexes, and RLS policies already exist. Do NOT assume columns or tables exist; verify them.
2. **Audit the current codebase** — confirm which services, routes, components, hooks, types, and utilities already exist and can be reused.
3. **Identify reusable code** — look for existing modules that can be repurposed or extended rather than rebuilt from scratch.
4. **Resolve conflicts** — if the design documents contradict what actually exists in the codebase or database, flag the discrepancy and resolve it in the specification (do not silently ignore it).

---

### STEP 3: WRITE THE SPECIFICATION

Write the final specification document to:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1.md`

---

#### HANDLING LARGE SPECIFICATIONS (> 4000 lines)

If your specification will **exceed 4000 lines**, split it into multiple files organized by section:

**Naming Convention:**
- `008-rag-frontier-rag-detailed-spec_v1-master.md` — Master index (always create this first)
- `008-rag-frontier-rag-detailed-spec_v1-section-1.md` — Section 1: [Name]
- `008-rag-frontier-rag-detailed-spec_v1-section-2.md` — Section 2: [Name]
- `008-rag-frontier-rag-detailed-spec_v1-section-N.md` — Section N: [Name]

**Master Index Requirements:**

The master file must contain:
1. **Document Overview** — summary of what's being built, total scope, integration summary
2. **Table of Contents** — linked list of all section files with brief descriptions
3. **Human Actions Checklist** — consolidated list of all manual steps across all sections (with section file references)
4. **Complete Feature List Appendix** — inventory of all FRs across all sections
5. **Implementation Order** — recommended sequence for implementing sections
6. **Cross-Section Dependencies Map** — which sections depend on which other sections

**Section File Requirements:**

Each section file must:
- Be fully self-contained for implementation (all code, all context needed)
- Start with a header clearly stating which section it covers
- Include a "Dependencies" section referencing other section files if needed
- Include its own acceptance criteria and verification steps
- Not exceed 1500 lines per file (split large sections further if needed)

**Why 4000 lines?** This ensures:
- Easier navigation and review
- Faster agent processing when implementing specific sections
- Clearer separation of concerns
- Reduced cognitive load for human reviewers

---

#### STRUCTURAL REQUIREMENTS

The specification **must** follow this exact section structure for each major feature group:

```
## SECTION N: [Feature Group Name]

**Extension Status**: [What already exists vs. what's new]

---

### Overview
- What this section accomplishes
- User value delivered
- What already exists (reused) vs. what's being added (new)

### Dependencies
- **Codebase Prerequisites**: Files/modules that MUST exist before this section
- **Previous Section Prerequisites**: Which earlier sections must be completed first

### Features & Requirements

#### FR-N.M: [Feature Name]

**Type**: [Data Model | Service | API Route | UI Component | Background Process | etc.]

**Description**: [What this feature does]

**Implementation Strategy**: [EXTENSION of existing | NEW build | REPLACE existing]

---

[FULL IMPLEMENTATION — see Quality Standards below]

---

**Acceptance Criteria**:
1. [Specific, testable criteria]
2. [...]

**Verification Steps**:
1. [Exact steps to verify this feature works]
2. [...]

---

### Section Summary

**What Was Added**: [List of new files/tables/components]
**What Was Reused**: [List of existing infrastructure leveraged]
**Integration Points**: [How this section connects to the rest of the system]
```

---

#### QUALITY STANDARDS — WHAT "COMPLETE" MEANS

Every Feature Requirement (FR) must include **full, copy-pasteable implementation code** — not pseudocode, not summaries, not "implement similar to X." Specifically:

| Artifact Type | Required Detail |
|---|---|
| **Database Migrations** | Complete SQL with `CREATE TABLE`, column types, defaults, indexes, RLS policies, triggers. Specify the exact migration file path. |
| **TypeScript Types** | Complete interface/type definitions with all fields typed. Specify the exact file path. |
| **Service Functions** | Complete function implementations with proper error handling, logging, input validation, and return types. Specify the exact file path. |
| **API Routes** | Complete route handlers with authentication, request validation, database queries, error responses, and response formatting. Specify the exact file path. |
| **React Hooks** | Complete hook implementations with React Query (or equivalent), mutation logic, cache invalidation, and toast notifications. Specify the exact file path. |
| **React Components** | Complete component code with props interfaces, state management, conditional rendering, loading/error states, and event handlers. Specify the exact file path. |
| **Pages** | Complete page components with data fetching, layout, child components, and routing. Specify the exact file path. |
| **Edge Functions / Workers** | Complete implementations with all processing logic. Specify the exact file path. |

**Critical:** Every code block must be preceded by its target **file path** in this format:
```
**File**: `src/path/to/file.ts`
```

---

#### INTEGRATION SUMMARY (Document Header)

At the top of the specification, provide:

1. **A numbered inventory** of what is being added:
   - N new database tables
   - N new API routes
   - N new pages
   - N new components
   - N new hooks
   - N new services
   - N new Edge Functions (if applicable)

2. **A list of what is NOT being created** (existing infrastructure being reused)

3. **A list of what is being removed or replaced** (if any existing modules are being deprecated)

---

#### HUMAN STEPS

Any step that requires **manual human action** (e.g., creating a Supabase storage bucket, setting an environment variable, running a migration from a dashboard, enabling a database extension) must be:

1. **Visually distinct** — use a callout block:
   ```
   > ⚠️ **HUMAN ACTION REQUIRED**
   > 
   > **What:** [Exact action]
   > **Where:** [Exact location — dashboard URL, settings page, terminal command]
   > **Values:** [Exact values to enter — copy-pasteable]
   ```

2. **Self-contained** — the human should be able to complete the action by reading only the callout, without cross-referencing other sections.

3. **Consolidated** — at the end of the specification, include a **"Human Actions Checklist"** appendix that lists all human steps in order, with section references.

---

#### PATTERN FIDELITY

- **Follow existing codebase patterns exactly.** If the project uses `requireAuth()` for authentication, use `requireAuth()`. If it uses `createServerSupabaseClient()`, use that. Do NOT introduce new patterns unless explicitly justified.
- **Cite pattern origins** — after each implementation, add: `**Pattern Source**: [where this pattern comes from in the existing codebase]`
- **Match naming conventions** — file names, function names, component names, and directory structures must follow the existing project's conventions.

---

#### COMPLETENESS CHECKLIST (for your self-review)

Before considering the specification complete, verify:

- [ ] Every FR has a complete code implementation (not pseudocode)
- [ ] Every code block has an exact file path
- [ ] Every database change includes the full SQL migration
- [ ] Every new table has RLS policies defined
- [ ] Every API route has authentication, validation, and error handling
- [ ] Every component has loading, error, and empty states
- [ ] Every section has acceptance criteria AND verification steps
- [ ] All human actions are in callout blocks AND in the appendix checklist
- [ ] The integration summary at the top is accurate and complete
- [ ] No assumptions are made about database state without verification
- [ ] Existing codebase patterns are followed (not reinvented)
- [ ] The document compiles a complete feature list appendix at the end

---

### STEP 4: ADDITIONAL INSTRUCTIONS


#### Database Operations Library
**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Use it as described in the SAOL section(s) here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

#### Chunks Module Replacement
Replace the current chunks module
We are abandoning the "chunks" module. We have already archived it so you may delete, or reuse functionality in that module.
This spec can re use the codebase from the chunks functionality if it increases the quality of the new Frontier Rag module.
Delete or repurpose these current chunks pages and routes:

/dashboard
/workflow/[id]/stage1
/upload
/chunks/[id]
etc...
Make sure to NOT break any of the other existing functionality.

#### Technology Constraints
Use the current codebase as a reference for the current technology stack.

#### Phasing
This specification covers **Phase 1 only**. Do not implement features designated for Phase 2 or later in the design documents. If a Phase 1 feature requires awareness of a Phase 2 design decision, note it as a `// TODO: Phase 2` comment.

---

## PROMPT END

---

