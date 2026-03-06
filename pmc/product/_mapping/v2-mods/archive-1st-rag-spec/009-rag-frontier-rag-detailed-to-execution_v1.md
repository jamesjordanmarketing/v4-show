# Frontier RAG Specification to Execution: Analysis & Recommendation

**Date:** February 9, 2026
**Context:** 11 specification files (master + 10 sections) totaling ~15,634 lines exist at `008-rag-frontier-rag-detailed-spec_v1-*.md`. This document analyzes whether they can be used directly for implementation or need conversion to execution prompts.

---

## Question 1: Are the specification files detailed enough to build this module directly?

### Short Answer: **Almost, but not quite.**

The 008 specifications contain more raw code than typical execution prompts -- they have complete, copy-pasteable TypeScript implementations for every file. But they are **architectural specifications**, not **agent directives**. The difference matters when submitting to a contextless Claude-4.5-sonnet Thinking window.

### What the 008 specs DO well (advantages over typical specs):

| Strength | Example |
|----------|---------|
| **Complete code** | Section 3 has the full `rag-ingestion-service.ts` (1,264 lines of TypeScript) ready to copy-paste |
| **Exact file paths** | Every code block is prefixed with `**File**: src/path/to/file.ts` |
| **Acceptance criteria** | Each FR has numbered, testable criteria (31 criteria in Section 3 alone) |
| **Cross-section dependency tracking** | Each section starts with explicit prerequisites |
| **Pattern citations** | Every implementation cites its source in the existing codebase |
| **Human actions consolidated** | Manual steps are callout-blocked and collected in master index |

### What the 008 specs are MISSING (gaps vs. E08 execution prompts):

| Gap | Why It Matters | E08 Has It |
|-----|----------------|------------|
| **No directive framing** | A contextless agent needs to be told "You are building X. Your job is to..." -- the specs are declarative ("here's what should exist") not imperative ("create this file") | Yes -- "Your Mission" section |
| **No codebase reading instructions** | The agent needs to be told WHERE to look in the codebase to understand existing patterns before writing code. The specs assume patterns have already been internalized. | Yes -- "Read these files first" |
| **No SAOL commands for DB operations** | Section 1 says "run SQL via Supabase SQL Editor" (human manual action). E08 gives copy-pasteable SAOL bash commands that the agent can execute directly. But note: Section 1 is mostly a manual DB migration anyway. | Yes -- full SAOL bash commands |
| **No FIND/REPLACE format for edits** | For modifying existing files (Section 10 navigation update, index.ts re-exports), the specs show the target state but not the diff. E08 uses explicit "FIND THIS / REPLACE WITH" blocks. | Yes -- exact before/after |
| **No verification commands** | Section 3 says "verify rag_sections records exist" but doesn't give the agent a runnable command. E08 gives SAOL bash one-liners that produce expected output. | Yes -- SAOL query commands |
| **No troubleshooting section** | If a build fails, the agent has no recovery guidance. E08 has "If Something Goes Wrong" with specific fixes. | Yes -- per-phase troubleshooting |
| **No `========================` / `+++++++++++++++++` delimiters** | The copy-paste boundary markers from the execution prompt format are absent. | Yes -- standard format |
| **No explicit "do NOT change" guardrails** | E08 explicitly states what NOT to modify. The specs list what's new but don't warn against touching existing code. | Yes -- "What This Section Does NOT Change" |

### The Critical Gap: Context Bootstrapping

The E08 prompt is designed for a **200k context window that knows nothing**. It tells the agent:
1. Where the codebase lives
2. What reference files to read
3. What SAOL is and how to use it
4. What the current state of the database is
5. What to build, step by step
6. How to verify each step worked

The 008 specs assume the reader already has this context. A contextless agent receiving Section 3 alone would not know where `@/lib/supabase-server` lives, what SAOL is, or how to verify its work against the live database.

---

## Question 2: How to create execution prompt files given the 10-file structure?

### Recommended Approach: **Execution Wrappers, Not Rewrites**

The 008 section files already contain 90% of what an execution prompt needs -- the complete code, file paths, and acceptance criteria. Creating execution prompts from scratch would duplicate ~14,000 lines of code. Instead, create **thin execution wrappers** that reference the existing section files.

### The Execution Wrapper Pattern

Each execution prompt would follow this structure:

```
========================

# EXECUTION PROMPT E[XX]: [Section Name]

## Your Mission
[Directive framing: what you're building, why it matters]

## Context & Environment
- Codebase: `C:\Users\james\Master\BrightHub\brun\v4-show\src`
- SAOL: `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`
- Specification: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-...-section-N.md`

## Step 0: Read and Understand
Read these files to understand existing patterns:
- [2-4 specific files from the codebase relevant to this section]
- The specification file for this section (listed above)

## Step 1: [First Task]
[Directive language referencing the spec's code blocks]

## Step 2: [Second Task]
...

## Verification
[SAOL commands to validate the work]

## If Something Goes Wrong
[Troubleshooting for common failures]

+++++++++++++++++
```

### Mapping: 10 Spec Sections to Execution Prompts

| Spec Section | Execution Prompt | Approach | Context Window Usage |
|---|---|---|---|
| **Section 1: Database** | **E01** | Mostly HUMAN manual actions (pgvector, SQL migration, storage bucket). Execution prompt would be short -- mainly SAOL verification commands after manual steps. | ~2K prompt + Section 1 reference |
| **Section 2: Types + Providers** | **E02** | All new files (no edits). Agent creates `src/types/rag.ts`, 3 provider files, 1 factory. Spec code is complete and copy-pasteable. Needs `npm install openai` step. | ~3K prompt + Section 2 ref (~1,829 lines) |
| **Section 3: Ingestion** | **E03** | One new service file. Spec has complete code. Agent creates `src/lib/services/rag/rag-ingestion-service.ts`. | ~2K prompt + Section 3 ref (~1,500 lines) |
| **Section 4: Expert Q&A** | **E04** | One new service file. Spec has complete code. | ~2K prompt + Section 4 ref (~1,082 lines) |
| **Section 5: Retrieval** | **E05** | One new service file + one SQL function. The SQL function is also in Section 1 but may need separate execution. | ~2K prompt + Section 5 ref (~1,615 lines) |
| **Section 6: API Routes** | **E06** | 7 new route files. All new code. Largest section (2,780 lines). May need to split into E06a (documents routes) and E06b (query/quality routes). | ~3K prompt + Section 6 ref |
| **Section 7: Hooks + Store** | **E07** | 5 new files. All new code. | ~2K prompt + Section 7 ref (~1,430 lines) |
| **Section 8: UI** | **E08-E09** | 5 pages + 12 components. Likely needs splitting: E08 = pages + layout, E09 = components. Largest visual complexity. | ~4K prompt + Section 8 ref (~2,226 lines) |
| **Section 9: Quality** | **E10** | One new service file. Straightforward. | ~2K prompt + Section 9 ref (~1,207 lines) |
| **Section 10: Cleanup** | **E11** | File deletions + `next.config.js` edit. Needs FIND/REPLACE for the redirect. Needs explicit "do NOT delete these files" guardrails. | ~3K prompt + Section 10 ref (~560 lines) |

**Total: 11-13 execution prompts** (depending on whether Section 6 and Section 8 are split).

### Key Decision: Inline Code vs. File Reference

There are two strategies for how the execution wrapper references the spec code:

**Option A: File Reference ("Read the spec")**
- The execution prompt tells the agent to read the section file
- Pro: Small prompt size, no duplication
- Con: Agent spends tokens reading the spec file; may not follow it exactly
- Best for: Sections with complete, single-file implementations (Sections 3, 4, 5, 9)

**Option B: Inline Code ("Create this file with this exact content")**
- The execution prompt includes the code from the spec directly
- Pro: Agent follows code exactly; no interpretation needed
- Con: Large prompt size; duplicates the spec
- Best for: Sections with multiple small files (Section 2 providers, Section 6 routes, Section 8 components)

**Recommended: Hybrid approach** -- Use Option A for large single-file sections (3, 4, 5, 9) and Option B for multi-file sections (2, 6, 7, 8) where you want exact code placement.

---

## Question 3: What is the best way to build this module given the current 11-file spec?

### Recommended Build Strategy: **Spec-Referenced Execution Prompts with Verification Gates**

#### Phase 0: Human Prerequisites (No Agent Needed)
Complete all 8 Human Actions from the master index before any agent work:
1. Enable pgvector extension
2. Add `DATABASE_URL` to `.env.local`
3. Run the migration SQL from Section 1
4. Create `rag-documents` storage bucket + RLS policies
5. Add `OPENAI_API_KEY` to `.env.local`
6. Install `openai` npm package
7. Verify all tables exist (SAOL introspection)

This takes 15-30 minutes and eliminates the #1 source of agent failures (missing infrastructure).

#### Phase 1: Foundation (E01-E02)
- **E01**: Database verification only (migration was done in Phase 0). Agent runs SAOL commands to confirm all 8 tables, RLS policies, indexes, and the `match_rag_embeddings` SQL function.
- **E02**: Types + Providers. Creates `src/types/rag.ts`, all provider files, factory. Runs `npm run build` to verify.

**Verification Gate**: `npm run build` succeeds with zero errors.

#### Phase 2: Backend Services (E03-E05)
- **E03**: Ingestion service
- **E04**: Expert Q&A service
- **E05**: Retrieval service + `match_rag_embeddings` SQL function

**Verification Gate**: `npm run build` succeeds. All 3 service files compile. SAOL introspection confirms the SQL function exists.

#### Phase 3: API Layer (E06)
- **E06**: All 10 API routes (may split into E06a + E06b if too large for one context window)

**Verification Gate**: `npm run build` succeeds. Manual curl/Postman tests against 2-3 key endpoints (upload, process, query).

#### Phase 4: Frontend (E07-E09)
- **E07**: Hooks + Zustand store
- **E08**: Pages + layout
- **E09**: Components

**Verification Gate**: `npm run build` succeeds. App loads in browser. RAG dashboard page renders. Upload flow reaches the processing status screen.

#### Phase 5: Quality + Cleanup (E10-E11)
- **E10**: Quality measurement service
- **E11**: Delete chunks module, update navigation, run integration checklist

**Verification Gate**: Full end-to-end test: upload document -> process -> answer questions -> chat -> view quality scores.

---

### Why This Approach Over Alternatives

| Alternative | Problem |
|---|---|
| **Submit the 008 specs directly to Cursor** | Specs are 1,000-1,500 lines of DECLARATIVE documentation. A contextless agent would read them as reference material, not as build instructions. It might understand WHAT to build but not the imperative sequence of HOW. |
| **Create full execution prompts from scratch** | Would duplicate ~14,000 lines of already-written code. The 008 specs took significant effort to produce; rewriting them into execution format wastes that work and introduces risk of transcription errors. |
| **Use one massive execution prompt** | Even at 200K tokens, fitting all 10 sections into one prompt would leave no room for codebase reading. And a single failure would require restarting the entire build. |
| **Use the specs as-is with a meta-instruction** | Tempting (prepend "Build everything in this spec") but the specs reference each other across sections. A contextless agent can't hold 10 files of cross-references simultaneously. |

### The Wrapper Approach Wins Because:
1. **Minimal new writing** -- 2-3K lines of wrapper content total vs. 14K+ lines of rewriting
2. **Leverages existing spec quality** -- The 008 specs have battle-tested code with pattern citations
3. **Natural section boundaries** -- Each spec section IS one logical unit of work
4. **Verification gates** -- Each phase has a clear pass/fail checkpoint
5. **Error isolation** -- If E05 fails, E01-E04 are still intact

---

## Summary of Recommendations

1. **Do NOT use the 008 specs as-is** for a contextless agent. They're specifications, not execution directives.

2. **Do NOT rewrite the specs into execution prompts from scratch.** That duplicates 14,000+ lines of code.

3. **DO create 11-13 thin execution wrappers** (~200-400 lines each) that:
   - Frame the mission directively
   - Tell the agent which codebase files to read for patterns
   - Reference the section file for the complete code
   - Add SAOL verification commands
   - Add troubleshooting guidance
   - Use the `========================` / `+++++++++++++++++` delimiters

4. **DO complete all 8 Human Actions first** (Phase 0) before any agent work.

5. **DO enforce verification gates** between phases (`npm run build` must pass before proceeding).

---

**Next Step:** If you'd like to proceed, I can create the 11-13 execution wrapper prompts. Each would be ~200-400 lines, referencing the existing section files for their code content. Total new writing: ~3,000-5,000 lines.

---

---

## Clarification: Separate Driver Files vs. Modifying the Specs

### The Two Options Concretely

**Option A: Separate "driver" files (one per section)**

You get 10 new files. Each one IS the execution prompt. It says "Read the spec, then build it."

```
pmc/product/_mapping/v2-mods/
  008-...-section-3.md          <-- existing spec (UNCHANGED, stays as-is)
  010-rag-execution-E03.md      <-- NEW driver file (the thing you paste into Cursor)
```

The driver file contains:
- `========================` delimiter at top
- Mission framing, environment setup, SAOL reference
- "Step 0: Read this spec file: `008-...-section-3.md`"
- Step-by-step imperative instructions
- Verification commands
- Troubleshooting
- `+++++++++++++++++` delimiter at bottom

You copy-paste the driver file contents into Cursor. The agent reads the spec file as its first action.

**Option B: Add execution instructions directly to each spec file**

You modify the 10 existing section files. Add an execution header at the top, verification commands and troubleshooting at the bottom. The spec file itself becomes the execution prompt.

```
pmc/product/_mapping/v2-mods/
  008-...-section-3.md          <-- MODIFIED: execution instructions added at top and bottom
```

You copy-paste the entire modified spec file into Cursor.

### Recommendation: Option A -- Separate Driver Files

**This is the standard method you should use for all 10 sections.** Here's why:

| Factor | Option A (Separate drivers) | Option B (Modify specs) |
|--------|---------------------------|------------------------|
| **Spec integrity** | Specs stay clean as reference docs | Specs get cluttered with execution boilerplate |
| **Matches E08 pattern** | Identical structure to your proven E08 format | Different structure -- spec-first, not mission-first |
| **Copy-paste target** | Clear: paste the driver file | Ambiguous: paste whole 1,500-line file? Just the header? |
| **Reusability** | Can re-run with a fresh agent if it fails (driver is independent) | If agent partially modifies the spec file, it gets messy |
| **Consistency** | Every driver follows the exact same template | Each spec has different internal structure |
| **File size in Cursor** | Driver is ~300 lines + agent reads ~1,500 lines from spec = ~1,800 lines total | Full spec is ~1,500 lines + ~200 lines added = ~1,700 lines pasted upfront |
| **Agent behavior** | Agent reads spec file intentionally (knows it's a reference) | Agent may get confused about what's instruction vs. reference |

**The decisive factor:** Your E08 execution prompt is a **directive** document. It tells the agent what to DO. The spec sections are **declarative** documents. They describe what should EXIST. Mixing the two in one file creates tonal confusion for the agent. Keeping them separate gives each file a single clear purpose.

### Standard Template for Every Driver File

Every one of the 10 driver files follows this exact structure (no exceptions):

```markdown
# [Module Name] - Execution Prompt E[XX]: [Section Title]

**Version:** 1.0
**Date:** [Date]
**Section:** E[XX] - [Section Title]
**Prerequisites:** [What must be done before this prompt]
**Status:** Ready for Execution

---

## Overview
[2-3 sentences: what this prompt builds and why]

## Critical Instructions

### SAOL for Database Operations
[Standard SAOL block -- identical in every driver]

### Environment
[Standard paths block -- identical in every driver]

---

## Reference Documents
- **Specification:** `[path to 008 section file]`
- **SAOL Guide:** `[path to SAOL instructions]`

---

========================


# EXECUTION PROMPT E[XX]: [Title]

## Your Mission
[3-5 sentences of directive framing]

## Step 0: Read the Specification and Codebase
Read these files completely before writing any code:
1. `[008 spec section file path]` -- contains ALL the code you need to create
2. `[2-3 existing codebase files for pattern reference]`

## Step 1: [First Task]
[Imperative: "Create the file...", "Run this command...", "Verify that..."]

## Step 2: [Second Task]
...

## Step N: Verification
[Specific commands with expected outputs]

## Success Criteria
- [ ] [Checklist items]

## If Something Goes Wrong
[Troubleshooting guidance]

---

**End of E[XX] Prompt**


+++++++++++++++++
```

Every section gets this same template. No hybrid approaches, no exceptions.

---

## Can I Create These Driver Files in This Context Window?

**Yes.** Here's the math:

- Current context usage: ~35% (70k/200k tokens)
- Each driver file: ~200-400 lines (~1,500-3,000 tokens to write)
- 10 driver files total: ~2,000-4,000 lines (~15,000-30,000 tokens)
- I need to read parts of each spec section to write accurate drivers: ~10,000-15,000 tokens
- **Total estimated cost: ~25,000-45,000 tokens**
- **Available: ~130,000 tokens**

I have plenty of room. I can create all 10 driver files in this session, either:
- **Sequentially** (slower but I can show you each one for feedback)
- **In parallel using background agents** (faster, all 10 at once, same approach used for the spec sections)

### What I Need From You to Start

1. **Confirm Option A** (separate driver files) is what you want
2. **File naming convention** -- I'd suggest: `010-rag-execution-E01.md` through `010-rag-execution-E11.md` in the same `v2-mods/` directory. Or a different naming scheme if you prefer.
3. **Phase 0 status** -- Have you completed any of the 8 Human Actions yet (pgvector, env vars, migration, storage bucket)? This affects what E01 contains.

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/009-rag-frontier-rag-detailed-to-execution_v1.md`
**Status:** UPDATED -- Awaiting confirmation to proceed with driver file creation
