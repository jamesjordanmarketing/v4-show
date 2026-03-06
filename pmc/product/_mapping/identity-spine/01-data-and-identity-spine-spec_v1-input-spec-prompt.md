# Data & Identity Spine — Prompt to Write the Full Specification v1


You are to create one detailed spec for our next group of changes:

## Changes

1. Plan and describe the full specification for all of the requirements you just described here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\01-data-and-identity-spine-spec_v1.md`. Don't keep unnecessary context.

---

## SPECIFICATION DIRECTIVE

### 1. Codebase Internalization (MANDATORY FIRST STEP)
Before writing anything, fully read and internalize the current codebase:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

Do a full investigation of the truth as stated in the Investigation Document: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\01-data-and-identity-spine-spec_v1.md`

Make sure the Investigation Document is comprehensive, complete, accurate, and precise.  If you find discrepancies validate against the code base and write this specification with the updated information.

Identify: existing patterns, naming conventions, component structure, data flow, and any related functionality that this change touches or depends on.

### 2. Impact Analysis
Before specifying the solution, document:
- **Files affected:** List every file that will be created, modified, or deleted
- **Dependencies touched:** Any shared utilities, types, hooks, or components impacted
- **Database operations involved:** Tables read from or written to
- **Risk areas:** Where this change could break existing functionality

### 3. Specification Requirements
Write a detailed, complete, accurate, precise, and comprehensive specification that:
- Implements ALL requirements described above with zero omissions
- Integrates cleanly into the existing codebase patterns (don't invent new patterns when existing ones apply)
- Preserves all existing functionality unless explicitly instructed to change it
- Uses GIVEN-WHEN-THEN acceptance criteria for each discrete change
- Includes the specific code locations (file paths + function/component names) where each change applies

### 4. SAOL Constraint (NON-NEGOTIABLE)
**ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

### 5. Specification Structure
Organize the spec as:
1. **Summary** — 2-3 sentences on what this change accomplishes
2. **Impact Analysis** — Files, dependencies, DB tables affected
3. **Changes** — Each discrete change as its own numbered section with:
   - What changes and where (exact file path + location in file)
   - Why (tie back to the requirement it satisfies)
   - Acceptance criteria (GIVEN-WHEN-THEN)
   - Implementation hints if the logic is non-obvious
4. **Testing checkpoints** — How to verify each change works after implementation
5. **Warnings** — Anything the implementing agent must NOT do (common pitfalls for this type of change)

### 6. Output
Write this specification to:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\identity-spine\02-data-and-identity-spine-detailed-specification_v3.md`
