# Quick Start: Codebase Integration Analysis Workflow

**Version:** 1.0  
**Purpose:** Generate integration documentation for implementing structured specifications into existing codebases

---

## Overview

This workflow extends the structured specification process with codebase integration analysis. It produces three integration documents that bridge the gap between greenfield specifications and production codebase reality.

### Workflow Diagram

```
Phase 1: Structured Spec (Existing - Already Complete) ✓
└─ Output: 04c-pipeline-structured-from-wireframe_v1.md

Phase 2: Integration Analysis (New - This Workflow)
├─ Generator Script: 04d-generate-wireframe-integration-plan_v1.js
├─ Generated Prompt: 04d-pipeline-integration-analysis_v1-build.md
└─ AI Execution → 3 Integration Documents:
    ├─ 04d-codebase-discovery_v1.md
    ├─ 04d-integration-strategy_v1.md
    └─ 04d-implementation-deltas_v1.md

Phase 3: Development (Use All Documents)
```

---

## Prerequisites

✅ Completed structured specification from Phase 1  
✅ Existing production codebase at `/src` (or equivalent)  
✅ Node.js installed (for running generator script)

---

## Step-by-Step Guide

### Step 1: Generate Integration Analysis Prompt

**From terminal, run:**

```bash
cd pmc/product/_tools

# Example for LoRA Pipeline project:
node 04d-generate-wireframe-integration-plan_v1.js \
  --spec _mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md \
  --codebase ../../../src \
  --project pipeline
```

**What this does:**
- Loads meta-prompt template: `04d-integrate-existing-codebase_v1.md`
- Validates structured spec exists
- Validates codebase directory exists
- Replaces placeholders with your paths
- Saves executable prompt to: `_mapping/pipeline/_run-prompts/04d-pipeline-integration-analysis_v1-build.md`

**Interactive Mode:**

If you don't provide all arguments, the script will prompt you:

```bash
node 04d-generate-wireframe-integration-plan_v1.js --project pipeline

# Script will prompt for:
# - Structured spec path (with default)
# - Codebase path (with default)
# - Validates each path exists
```

---

### Step 2: Execute Integration Analysis

**Open the generated prompt:**
- File: `pmc/product/_mapping/pipeline/_run-prompts/04d-pipeline-integration-analysis_v1-build.md`

**Copy to NEW AI Agent Session:**
1. Open a FRESH AI agent session (important: new context window)
2. Copy the ENTIRE prompt file content
3. Paste into the AI agent
4. Wait for AI to complete analysis (~30-60 minutes for large codebases)

**What the AI will do:**
1. Read your structured specification
2. Systematically analyze your `/src` codebase
3. Compare spec assumptions vs. codebase reality
4. Determine integration strategies for each area
5. Generate three comprehensive integration documents

---

### Step 3: Review Integration Documents

**AI will create 3 documents in:** `pmc/product/_mapping/pipeline/_run-prompts/`

#### Document 1: Codebase Discovery
**File:** `04d-codebase-discovery_v1.md` (~2,000-3,000 lines)

**Contains:**
- Complete analysis of existing codebase
- Authentication system (what provider, how it works)
- Database schema (all existing tables, ORM, patterns)
- API architecture (existing endpoints, patterns)
- Component library (reusable components inventory)
- State management (approach, patterns)
- File storage (S3 setup, upload patterns)
- Utilities and helpers (available functions)
- Testing infrastructure (frameworks, patterns)

**Use this to:** Understand what already exists before coding

---

#### Document 2: Integration Strategy
**File:** `04d-integration-strategy_v1.md` (~1,500-2,500 lines)

**Contains:**
- Architecture comparison (spec vs. reality)
- Integration strategies for each area:
  - USE_EXISTING - Use what's there, skip spec
  - EXTEND - Build upon existing
  - ADAPT - Modify spec approach
  - CREATE_NEW - Implement as specified
- Risk assessment for each integration point
- Implementation phases with time estimates

**Use this to:** Understand HOW to integrate the new module

---

#### Document 3: Implementation Deltas
**File:** `04d-implementation-deltas_v1.md` (~2,000-4,000 lines)

**Contains:**
- Delta for EVERY section of structured spec
- Specific file-level guidance:
  - **SKIP**: List of files NOT to create (already exist)
  - **USE**: List of existing files to use instead
  - **EXTEND**: List of files to modify with exact changes
  - **CREATE**: List of new files to create per spec
- Code examples showing exact modifications
- Quick reference sections for easy lookup
- Developer implementation checklist

**Use this to:** Know EXACTLY what to modify during implementation

---

### Step 4: Development with Integration Documents

**Your reference documents:**

1. **Structured Specification** (What to build)
   - File: `04c-pipeline-structured-from-wireframe_v1.md`
   - Purpose: Complete feature specification

2. **Codebase Discovery** (What exists)
   - File: `04d-codebase-discovery_v1.md`
   - Purpose: Current infrastructure inventory

3. **Integration Strategy** (How to integrate)
   - File: `04d-integration-strategy_v1.md`
   - Purpose: Integration approach and decisions

4. **Implementation Deltas** (What to modify)
   - File: `04d-implementation-deltas_v1.md`
   - Purpose: Specific modifications to spec

---

### Step 5: Implementation Workflow

**For each section in structured spec:**

```
1. Read Section N in Structured Spec
   └─ Understand what features to build

2. Read Section N Deltas in Implementation Deltas
   └─ Understand modifications required

3. Apply Deltas:
   ├─ SKIP files that already exist
   ├─ USE existing implementations (don't recreate)
   ├─ EXTEND existing files (add to them)
   └─ CREATE new files (as specified)

4. Code Implementation:
   ├─ Follow spec for new functionality
   ├─ Reuse existing components/utilities
   ├─ Match existing patterns and conventions
   └─ Apply delta modifications

5. Testing:
   ├─ Test new features work
   └─ CRITICAL: Test existing features still work

6. Mark section complete in delta checklist
```

---

## Command Reference

### Full Command (All Options)

```bash
node 04d-generate-wireframe-integration-plan_v1.js \
  --spec _mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md \
  --codebase ../../../src \
  --project pipeline \
  --output _mapping/pipeline/_run-prompts
```

### Quick Command (Interactive)

```bash
node 04d-generate-wireframe-integration-plan_v1.js --project pipeline
# Will prompt for missing paths with defaults
```

### Show Help

```bash
node 04d-generate-wireframe-integration-plan_v1.js --help
```

---

## Troubleshooting

### Issue: "Structured spec not found"

**Solution:**
```bash
# Verify path is relative to pmc/product/
ls pmc/product/_mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md

# Use correct relative path:
node 04d-generate-wireframe-integration-plan_v1.js \
  --spec _mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md \
  --project pipeline
```

### Issue: "Codebase directory not found"

**Solution:**
```bash
# Verify codebase path (usually src/)
# From _tools directory, path is: ../../../src
ls ../../../src

# Or use absolute path:
node 04d-generate-wireframe-integration-plan_v1.js \
  --codebase C:/Users/james/Master/BrightHub/BRun/v4-show/src \
  --project pipeline
```

### Issue: "AI agent runs out of context"

**Cause:** Codebase is very large (>500 files)

**Solution:** AI agent should analyze codebase incrementally:
- Reads files one-by-one or by directory
- Builds analysis progressively
- The meta-prompt includes instructions for incremental analysis

If still too large, consider:
- Excluding `node_modules/` (already handled)
- Excluding test files temporarily
- Focusing on core directories first

---

## Example: Complete Workflow for LoRA Pipeline

```bash
# Step 1: Navigate to tools directory
cd pmc/product/_tools

# Step 2: Generate integration analysis prompt
node 04d-generate-wireframe-integration-plan_v1.js \
  --spec _mapping/pipeline/04c-pipeline-structured-from-wireframe_v1.md \
  --codebase ../../../src \
  --project pipeline

# Output: 
# ✅ Prompt saved to: 
# pmc/product/_mapping/pipeline/_run-prompts/04d-pipeline-integration-analysis_v1-build.md

# Step 3: Open generated prompt
code ../product/_mapping/pipeline/_run-prompts/04d-pipeline-integration-analysis_v1-build.md

# Step 4: Copy prompt content to NEW AI session

# Step 5: AI generates 3 integration documents:
# - 04d-codebase-discovery_v1.md
# - 04d-integration-strategy_v1.md  
# - 04d-implementation-deltas_v1.md

# Step 6: Begin development using all 4 documents:
# - Structured spec + 3 integration docs
```

---

## Best Practices

### ✅ DO:
- Run integration analysis in a FRESH AI session (clean context)
- Review all 3 integration documents before coding
- Apply deltas section-by-section during development
- Test existing features after each integration
- Use delta checklist to track progress
- Refer to codebase discovery when unsure what exists
- Follow integration strategy for architectural decisions

### ❌ DON'T:
- Skip the delta document review
- Create files listed in "SKIP" section
- Ignore existing patterns and conventions
- Modify shared code without understanding impact
- Assume structured spec applies exactly as written
- Forget to test existing features
- Work on multiple sections simultaneously

---

## File Locations Reference

### Generator Script
```
pmc/product/_tools/04d-generate-wireframe-integration-plan_v1.js
```

### Meta-Prompt Template
```
pmc/product/_prompt_engineering/04d-integrate-existing-codebase_v1.md
```

### Generated Prompt (example)
```
pmc/product/_mapping/pipeline/_run-prompts/04d-pipeline-integration-analysis_v1-build.md
```

### Integration Documents Output (example)
```
pmc/product/_mapping/pipeline/_run-prompts/
├── 04d-codebase-discovery_v1.md
├── 04d-integration-strategy_v1.md
└── 04d-implementation-deltas_v1.md
```

---

## Support & Documentation

- **Full Analysis**: `pmc/pmct/scratch/04d-integrate-codebase-analysis.md`
- **Meta-Prompt**: `pmc/product/_prompt_engineering/04d-integrate-existing-codebase_v1.md`
- **This Guide**: `pmc/product/_tools/QUICKSTART-integration-analysis.md`

---

## Success Criteria

Integration analysis is successful when:

✅ All existing features continue working  
✅ New module integrates seamlessly  
✅ No code duplication (reuses existing infrastructure)  
✅ Patterns and conventions are consistent  
✅ All integration points are documented  
✅ Developer has clear, actionable guidance  

---

**Last Updated:** December 22, 2024  
**Version:** 1.0  
**Status:** Ready for Use

