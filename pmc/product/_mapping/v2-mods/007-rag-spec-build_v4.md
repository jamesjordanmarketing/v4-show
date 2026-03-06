## PROMPT START

---

### ROLE

You are a senior software architect creating **sequential execution prompts** that will be submitted one-at-a-time to a **contextless Claude-4.5-sonnet Thinking LLM** in a **200k token Cursor context window**. Each execution prompt must be completely self-contained — the executing agent has zero context beyond what is in that prompt. Your output is NOT a specification document. Your output is a set of ready-to-paste execution prompt files.

---

### GOAL

Produce a numbered sequence of execution prompts (E01, E02, E03, ...) that, when executed in order, fully implement the RAG Frontier module (Phase 1 only). Each prompt is a standalone instruction set that a coding agent can execute without referencing any other prompt or document.

---

### OUTPUT FORMAT

Your deliverables are **execution prompt files only**. Write them here:

```
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E01_v1.md
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E02_v1.md
...
```

Additionally, write a **single index file** that lists all prompts in order with brief descriptions:

```
C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-index_v1.md
```

**No other output files.** Do not write a separate specification document. The execution prompts ARE the specification.

---

### STEP 1: INGEST FOUNDATIONAL CONTEXT

Read these files in order. Do not skip any.

**1a. Project Overview (required)**
Read the product overview to understand the full application, its tech stack, existing patterns, and conventions:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

**1b. Module Design Documents (required)**
Read the approved design and architecture decisions for the RAG Frontier module:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\004-rag-frontier-overview_v1.md`

Read the approved decisions and answers:
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

**1d. Example Execution Prompt (required — use as structural template)**
Use this as your quality and structural reference for execution prompts:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-input-and-scroll-execution-prompt-E08_v1.md`

Study this file carefully. Your execution prompts must match or exceed its level of detail, directiveness, and self-containedness.

---

### STEP 2: VALIDATE ASSUMPTIONS

Before writing any execution prompts, you MUST verify the actual state of the database and codebase. Do not assume — confirm.

1. **Audit the current database schema** — use SAOL to confirm which tables, columns, types, indexes, and RLS policies already exist. Do NOT assume columns or tables exist; verify them.
2. **Audit the current codebase** — confirm which services, routes, components, hooks, types, and utilities already exist and can be reused.
3. **Identify reusable code** — look for existing modules that can be repurposed or extended rather than rebuilt from scratch.
4. **Resolve conflicts** — if the design documents contradict what actually exists in the codebase or database, flag the discrepancy and resolve it in the execution prompts (do not silently ignore it).

If you CANNOT access the database tables and schema with the SAOL library, this is a **blocker** and you must **STOP** and notify the user of the situation.

---

### STEP 3: PLAN THE EXECUTION SEQUENCE

Before writing any prompt files, create a plan:

1. **Decompose the RAG Frontier module** into logical, sequential implementation phases (e.g., Database Schema → Types → Services → API Routes → Hooks → Components → Pages → Verification).
2. **Determine the number of prompts needed.** Each prompt should cover a cohesive, completable unit of work.
3. **Enforce the 1500-line limit.** If any single execution prompt would exceed 1500 lines, split it into two prompts (e.g., E03a, E03b or E03 Part 1, E03 Part 2).
4. **Ensure sequential independence.** Each prompt assumes only that the previous prompts have been executed successfully. A prompt must never require partially completing a previous prompt.
5. **Map dependencies.** Each prompt must clearly state which prior prompts are prerequisites and what state they leave the system in.
6. **No duplication across prompts.** Never include the same code, query, or implementation detail in more than one prompt.

---

### STEP 4: WRITE THE EXECUTION PROMPTS

Write each execution prompt file following these mandatory rules. **Every rule below applies to EVERY execution prompt.**

---

#### RULE 1: SELF-CONTAINEDNESS

Each execution prompt will be submitted to a **new contextless Claude-4.5-sonnet Thinking LLM** chat with zero prior context. Therefore, each prompt MUST include:

- **Mission statement** — what this prompt accomplishes and why
- **Current state** — what exists right now (DB state, files, etc.) as of the previous prompt's completion
- **Environment** — codebase path, SAOL path, relevant file paths
- **All implementation code** — complete, copy-pasteable code blocks (not pseudocode, not "implement similar to X")
- **All context needed** — the agent should never need to reference another prompt file or external document to complete its work
- **Verification steps** — how to confirm the work is done correctly
- **Success criteria** — a checklist of what done looks like

---

#### RULE 2: COPY-PASTE FORMATTING

Every execution prompt must use this delimiter structure:

At the **beginning** of the copy-paste execution block, insert:
```
========================


```

At the **end** of the copy-paste execution block, insert:
```
+++++++++++++++++



```

Content before the `========================` delimiter is metadata/overview (not pasted to the agent). Content between the delimiters is what gets pasted.

---

#### RULE 3: EXECUTION PROMPT STRUCTURE

Each prompt file must follow this structure:

```markdown
# RAG Frontier - Execution Prompt E[##]: [Title]

**Version:** 1.0
**Date:** [Current Date]
**Section:** E[##] - [Short Name]
**Prerequisites:** [Which prior prompts must be complete]
**Status:** Ready for Execution

---

## Overview

[What this prompt accomplishes. What it creates. What it does NOT change.]

**What This Section Creates:**
1. [Item 1]
2. [Item 2]
...

**What This Section Does NOT Change:**
- [Item — handled by E##]
...

---

## Critical Instructions

### SAOL for Database Operations
[SAOL usage block — required in every prompt that touches the database]

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents
[Only list files the agent MUST read to complete this prompt]

---

========================


# EXECUTION PROMPT E[##]: [Title]

## Your Mission
[Detailed assignment]

---

## Context: Current State
[What exists, what doesn't, what dependencies are met]

---

## Phase N: [Phase Title]

### Task N: [Task Title]
[Complete implementation with exact file paths, FIND/REPLACE blocks, full code, SAOL commands]

---

## Verification
[Exact steps to confirm everything works]

---

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
...

---

## What's Next
[Brief preview of next prompt]

---

## If Something Goes Wrong
[Troubleshooting for common issues]

---

## Notes for Agent
1. [Critical reminders]
...

---

**End of E[##] Prompt**


+++++++++++++++++
```

---

#### RULE 4: CODE COMPLETENESS

Every implementation artifact in every prompt must include **full, copy-pasteable code** — not pseudocode, not summaries, not "implement similar to X." Specifically:

| Artifact Type | Required Detail |
|---|---|
| **Database Migrations** | Complete SQL with `CREATE TABLE`, column types, defaults, indexes, RLS policies, triggers. Wrapped in SAOL `agentExecuteDDL` calls with dry-run first. |
| **TypeScript Types** | Complete interface/type definitions with all fields typed. Exact file path specified. |
| **Service Functions** | Complete function implementations with error handling, logging, input validation, and return types. Exact file path specified. |
| **API Routes** | Complete route handlers with authentication, request validation, database queries, error responses, and response formatting. Exact file path specified. |
| **React Hooks** | Complete hook implementations with React Query, mutation logic, cache invalidation, and toast notifications. Exact file path specified. |
| **React Components** | Complete component code with props interfaces, state management, conditional rendering, loading/error states, and event handlers. Exact file path specified. |
| **Pages** | Complete page components with data fetching, layout, child components, and routing. Exact file path specified. |

**Critical:** Every code block must be preceded by its target **file path** in this format:
```
**File**: `src/path/to/file.ts`
```

---

#### RULE 5: PATTERN FIDELITY

- **Follow existing codebase patterns exactly.** If the project uses `requireAuth()` for authentication, use `requireAuth()`. If it uses `createServerSupabaseClient()`, use that. Do NOT introduce new patterns unless explicitly justified.
- **Cite pattern origins** — after each implementation, add: `**Pattern Source**: [where this pattern comes from in the existing codebase]`
- **Match naming conventions** — file names, function names, component names, and directory structures must follow the existing project's conventions.

---

#### RULE 6: HUMAN ACTIONS

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

---

#### RULE 7: SAOL FOR ALL DATABASE OPERATIONS

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

Use it as described in the SAOL section(s) here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

Every database operation in every execution prompt must use SAOL. Include the SAOL command template in each prompt that touches the database:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{ /* operation */ })();"
```

---

#### RULE 8: DIRECTIVE LANGUAGE

Execution prompts must be **directive**, not suggestive. Use:
- "Create this file" — not "You may want to create"
- "Add this column" — not "Consider adding"
- "Use this pattern" — not "A possible approach is"
- "FIND THIS / REPLACE WITH" — for modifications to existing files

The executing agent should never have to make architectural or design decisions. Every decision must be made in the prompt.

---

#### RULE 9: VERIFICATION AT EVERY STAGE

Every prompt must end with concrete verification steps:
- **Database prompts**: SAOL introspection commands to confirm schema changes
- **Type prompts**: `npm run build` to confirm TypeScript compiles
- **Service prompts**: Build verification + sample SAOL queries
- **API prompts**: `curl` commands or test scripts to hit endpoints
- **UI prompts**: Build verification + manual visual checks described
- **Integration prompts**: End-to-end test scenarios

---

#### RULE 10: CHUNKS MODULE REPLACEMENT

We are abandoning the "chunks" module. It has already been archived. The execution prompts may reuse functionality from the chunks module where it increases quality.

Delete or repurpose these current chunks pages and routes:
```
/dashboard
/workflow/[id]/stage1
/upload
/chunks/[id]
```

**Critical:** Do NOT break any other existing functionality. Each prompt that removes or replaces chunks code must verify that non-chunks features still work.

---

#### RULE 11: PHASE 1 ONLY

This specification covers **Phase 1 only**. Do not implement features designated for Phase 2 or later in the design documents. If a Phase 1 feature requires awareness of a Phase 2 design decision, note it as a `// TODO: Phase 2` comment in the code.

---

#### RULE 12: LINE LIMIT

No single execution prompt file may exceed **1500 lines**. If an execution prompt would exceed this limit, split it into two sequential prompts (e.g., E03 Part 1 and E03 Part 2), each self-contained and independently executable.

---

### STEP 5: WRITE THE INDEX FILE

After all execution prompts are written, create the index file at:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-index_v1.md`

The index file must contain:

1. **Module Summary** — one-paragraph description of what the RAG Frontier module is
2. **Prompt Inventory** — numbered list of all execution prompts with:
   - Prompt number (E01, E02, ...)
   - Title
   - File path
   - Brief description (1-2 sentences)
   - Prerequisites
   - Estimated scope (new files, modified files, DB changes)
3. **Implementation Order** — the required sequence (which is the E## numbering)
4. **Cross-Prompt Dependencies** — which prompts depend on which
5. **Human Actions Summary** — consolidated list of all manual steps across all prompts, with prompt references
6. **Total Scope Summary**:
   - N new database tables
   - N new API routes
   - N new pages
   - N new components
   - N new hooks
   - N new services
   - N chunks items removed/replaced
7. **What Is NOT Being Created** — existing infrastructure being reused
8. **What Is Being Removed** — chunks modules being deprecated

---

### COMPLETENESS CHECKLIST (for your self-review)

Before considering your work complete, verify:

- [ ] Every execution prompt is fully self-contained (a new agent can execute it with zero outside context)
- [ ] Every execution prompt has the `========================` and `+++++++++++++++++` delimiters
- [ ] Every code block has an exact file path
- [ ] Every database change uses SAOL (not raw SQL or supabase-js)
- [ ] Every database migration includes dry-run first, then execute
- [ ] Every new table has RLS policies defined
- [ ] Every API route has authentication, validation, and error handling
- [ ] Every component has loading, error, and empty states
- [ ] Every prompt has verification steps and success criteria
- [ ] All human actions are in callout blocks
- [ ] No prompt exceeds 1500 lines
- [ ] No duplication of code/queries across prompts
- [ ] All prompts are directive (not suggestive)
- [ ] Existing codebase patterns are followed (not reinvented)
- [ ] Chunks module removal does not break other functionality
- [ ] Phase 2 features are excluded (only `// TODO: Phase 2` comments)
- [ ] The index file is complete with all summaries
- [ ] Assumptions were validated via SAOL and codebase audit before writing

---

## PROMPT END
