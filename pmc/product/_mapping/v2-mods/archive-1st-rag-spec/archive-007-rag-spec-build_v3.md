# Frontier RAG Module — Meta Specification & Execution Instructions v3

**Version:** 3.0
**Date:** February 10, 2026
**Purpose:** Dual-purpose prompt — instructs an agent to (1) create a detailed build specification and (2) produce sequenced execution prompts from that specification.
**Output:** A set of self-contained execution prompts ready for copy-paste into a contextless Claude-4.5-sonnet Thinking session in Cursor.

---

## ROLE

You are a senior software architect AND execution planner. You have two jobs:

**Job 1 — Specification:** Create a comprehensive build specification for the Frontier RAG module, detailed enough that a coding agent never has to guess or make architectural decisions.

**Job 2 — Execution Plan:** Decompose that specification into a sequence of self-contained execution prompts, each designed for a fresh 200k-token Claude-4.5-sonnet Thinking context window in Cursor with zero prior context.

---

## UNIVERSAL RULES

These rules apply to EVERY stage of your work — specification writing AND execution prompt creation.

### Rule 1: SAOL for ALL Database Operations

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

Use it as described in the SAOL section(s) here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**If you CANNOT access the database tables and schema with the SAOL library, this is a blocker and you must STOP and notify the user of the situation.**

### Rule 2: Validate Before You Write

You **must** take into account the actual state of the database and code. This means before building this specification you must validate all assumptions and facts by reading the relevant codebase and database. Do NOT assume columns or tables exist — verify them with SAOL.

### Rule 3: Pattern Fidelity

Follow existing codebase patterns exactly. If the project uses `requireAuth()`, use `requireAuth()`. If it uses `createServerSupabaseClient()`, use that. Do NOT introduce new patterns unless explicitly justified. Cite pattern origins after each implementation.

### Rule 4: Do Not Break Existing Functionality

All changes must preserve the existing working system. Test for regressions. The chunks module is being replaced (see Special Instructions), but all other functionality must remain intact.

---

## STEP 1: INGEST FOUNDATIONAL CONTEXT

Read these files in order. Do not skip any.

**1a. Project Overview (required)**
Read the product overview to understand the full application, its tech stack, existing patterns, and conventions:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

**1b. Module Design Documents (required)**
Read the approved Frontier RAG architecture:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\004-rag-frontier-overview_v1.md`

And read the approved decisions and answers:
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

**1d. Example Specification**
Use this as your structural and quality reference for the specification:
`C:\Users\james\Master\BrightHub\brun\multi-chat\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md`

**1e. Example Execution Prompt**
Use this as your structural and quality reference for execution prompts:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-input-and-scroll-execution-prompt-E08_v1.md`

---

## STEP 2: VALIDATE ASSUMPTIONS

Before writing anything:

1. **Audit the current database schema** — use SAOL to confirm which tables, columns, types, indexes, and RLS policies actually exist.
2. **Audit the current codebase** — confirm which services, routes, components, hooks, types, and utilities already exist and can be reused.
3. **Identify reusable code** — look for existing modules (especially the chunks module) that can be repurposed or extended.
4. **Resolve conflicts** — if the design documents contradict what actually exists in the codebase or database, flag the discrepancy and resolve it in the specification.

---

## STEP 3: CREATE THE SPECIFICATION

Write the specification to:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1.md`

### Handling Large Specifications (> 4000 lines)

If the specification exceeds 4000 lines, split into multiple files with a master index.

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

### Structural Requirements

Each major feature group **must** follow this structure:

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

[FULL IMPLEMENTATION CODE]

---

**Acceptance Criteria**:
1. [Specific, testable criteria]

**Verification Steps**:
1. [Exact steps to verify this feature works]

---

### Section Summary

**What Was Added**: [List of new files/tables/components]
**What Was Reused**: [List of existing infrastructure leveraged]
**Integration Points**: [How this section connects to the rest of the system]
```

### Quality Standards — What "Complete" Means

Every FR must include **full, copy-pasteable implementation code**. Not pseudocode, not summaries, not "implement similar to X."

| Artifact Type | Required Detail |
|---|---|
| **Database Migrations** | Complete SQL with `CREATE TABLE`, column types, defaults, indexes, RLS policies, triggers. Exact migration file path. |
| **TypeScript Types** | Complete interface/type definitions with all fields typed. Exact file path. |
| **Service Functions** | Complete function implementations with error handling, logging, validation, return types. Exact file path. |
| **API Routes** | Complete route handlers with auth, validation, queries, error responses. Exact file path. |
| **React Hooks** | Complete hook implementations with React Query, mutations, cache invalidation, toasts. Exact file path. |
| **React Components** | Complete component code with props, state, conditional rendering, loading/error states. Exact file path. |
| **Pages** | Complete page components with data fetching, layout, child components, routing. Exact file path. |
| **Edge Functions / Workers** | Complete implementations with all processing logic. Exact file path. |

**Critical:** Every code block must be preceded by its target file path:
```
**File**: `src/path/to/file.ts`
```

### Integration Summary (Document Header)

At the top of the specification, provide:

1. **A numbered inventory** of what is being added (tables, routes, pages, components, hooks, services, Edge Functions)
2. **A list of what is NOT being created** (existing infrastructure being reused)
3. **A list of what is being removed or replaced** (deprecated modules)

### Human Steps

Any step requiring **manual human action** must be:

1. **Visually distinct** — use a callout block:
   ```
   > ⚠️ **HUMAN ACTION REQUIRED**
   > 
   > **What:** [Exact action]
   > **Where:** [Exact location — dashboard URL, settings page, terminal command]
   > **Values:** [Exact values to enter — copy-pasteable]
   ```

2. **Self-contained** — completable by reading only the callout.

3. **Consolidated** — listed in a "Human Actions Checklist" appendix.

### Completeness Checklist (Self-Review)

Before considering the specification complete:

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

## STEP 4: CREATE EXECUTION PROMPTS

Transform the specification into a sequence of execution prompts. Each prompt will be submitted to a **new, contextless** Claude-4.5-sonnet Thinking session in Cursor.

Write the execution plan to:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\009-rag-frontier-rag-execution-plan_v1.md`

### Execution Prompt Rules

1. **Self-contained context.** Each prompt must include ALL context the building agent needs. The building agent sees NOTHING except what is in that prompt — no prior prompts, no shared state, no memory.

2. **Directive.** Each prompt must be directive — tell the agent exactly what to do, not what to consider.

3. **Modular.** Each prompt must complete a coherent, testable unit of work. The next prompt must NOT need to finish the previous one.

4. **No duplication across the plan.** Do not repeat code/queries/details outside of the prompts themselves. The prompts are the single source of truth.

5. **Copy-paste formatting.** Wrap each prompt in these delimiters:

   At the **beginning** of each prompt:
   ```
   ========================


   ```
   At the **end** of each prompt:
   ```
   +++++++++++++++++



   ```

6. **Prompt count.** Determine the right number of prompts based on the specification scope. State the total at the top of the execution plan:
   ```
   This specification merits [N] prompts in specific unique sequential prompts.
   ```

7. **Human actions in prompts.** If a prompt requires a human step before the agent can proceed, put it at the TOP of the prompt in a callout block — the human completes the action first, then pastes the prompt.

### Execution Prompt Structure

Each prompt should follow this structure (matching the E08 example):

```
# [Module Name] - Execution Prompt E[XX]: [Section Title]

**Version:** 1.0
**Date:** [Date]
**Section:** E[XX] - [Brief Title]
**Prerequisites:** [What must be done before this prompt]
**Status:** Ready for Execution

---

## Overview

[What this prompt accomplishes — be specific.]

**What This Section Creates:**
1. [Item 1]
2. [Item 2]
3. [Item 3]

**What This Section Does NOT Change:**
- [Out-of-scope item 1]
- [Out-of-scope item 2]

---

## Critical Instructions

[SAOL reference, environment paths, reference documents]

---

## Phase N: [Phase Name]

### Task N: [Task Name]

**File:** `src/path/to/file.ts`

#### Step 1: [Step Description]

[SAOL commands, FIND/REPLACE blocks, new code to add, verification commands]

---

## Verification

[Build commands, SAOL queries, expected output]

---

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## What's Next

[Brief description of what the next prompt will handle]

---

## If Something Goes Wrong

[Troubleshooting for common failure modes]

---

**End of E[XX] Prompt**
```

---

## STEP 5: SPECIAL INSTRUCTIONS

### Chunks Module Replacement

Replace the current chunks module. We are abandoning the "chunks" module. It has been archived — you may delete or reuse functionality from it.
This spec can reuse the codebase from the chunks functionality if it increases the quality of the new Frontier RAG module.
Delete or repurpose these current chunks pages and routes:

- `/dashboard`
- `/workflow/[id]/stage1`
- `/upload`
- `/chunks/[id]`
- etc...

Make sure to NOT break any other existing functionality.

### Technology Constraints

Use the current codebase as a reference for the current technology stack.

### Phasing

This specification covers **Phase 1 only**. Do not implement features designated for Phase 2 or later in the design documents. If a Phase 1 feature requires awareness of a Phase 2 design decision, note it as a `// TODO: Phase 2` comment.

---

## OUTPUT SUMMARY

When complete, you will have produced:

| Output | Path |
|---|---|
| **Specification** (or master index if > 4000 lines) | `008-rag-frontier-rag-detailed-spec_v1.md` |
| **Execution Plan** with copy-paste prompts | `009-rag-frontier-rag-execution-plan_v1.md` |

Both files go in:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\`
