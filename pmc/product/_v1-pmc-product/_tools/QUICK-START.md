# Extension Pipeline - Quick Start (v2)

**Status:** ✅ Ready to Run  
**Version:** 2.0 (Meta-Prompt Workflow)

---

## Three-Stage Pipeline Workflow

### Stage 0: Generate Integration Prompt

```bash
# Navigate to tools directory
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_tools"

# Run interactive prompt generator
node 04e-merge-integration-spec_v2.js "LoRA Pipeline" pipeline

# The script will interactively prompt for:
# 1. Infrastructure Inventory path (press Enter for default)
# 2. Extension Strategy path (press Enter for default)
# 3. Implementation Guide path (press Enter for default)
# 4. Output location (press Enter for default)
```

**Output:** `04e-pipeline-merge-integration-prompt_v1.md` (ready-to-execute prompt)

**Note:** All prompts have sensible defaults. Just press Enter to accept each default path.

---

### Stage 1: Execute Integration Analysis (Manual AI Execution)

**Process:**
1. Open the generated prompt: `04e-custom-integration-prompt_v1.md`
2. Provide the prompt to an AI assistant (Claude, ChatGPT, etc.)
3. Save the three generated documents to `_run-prompts/` directory:
   - `04d-infrastructure-inventory_v1.md`
   - `04d-extension-strategy_v1.md`
   - `04d-implementation-guide_v1.md`

**Note:** This is a manual step requiring AI analysis of the codebase.

---

### Stage 2: Segment into Execution Prompts

```bash
# After Stage 1 is complete, run segmentation
node 04f-segment-integrated-spec_v1.js \
  --inventory "../_mapping/pipeline/_run-prompts/04d-infrastructure-inventory_v1.md" \
  --strategy "../_mapping/pipeline/_run-prompts/04d-extension-strategy_v1.md" \
  --guide "../_mapping/pipeline/_run-prompts/04d-implementation-guide_v1.md" \
  --output-dir "../_mapping/pipeline/_execution-prompts/"
```

**Output:** Progressive execution prompts in `_execution-prompts/` directory

---

## Complete Workflow (All Commands)

```bash
# Navigate to tools directory
cd "C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_tools"

# ===== STAGE 0: Generate Integration Prompt =====
node 04e-merge-integration-spec_v2.js "LoRA Pipeline" pipeline
# Interactive prompts will appear - press Enter to accept defaults

# ===== STAGE 1: Execute with AI (Manual) =====
# 1. Open: pmc/product/_mapping/pipeline/_run-prompts/04e-pipeline-merge-integration-prompt_v1.md
# 2. Copy entire prompt and paste into Claude/ChatGPT
# 3. AI will generate: 04e-pipeline-integrated-extension-spec_v1.md
# 4. Save AI output to the specified location

# ===== STAGE 2: Segment (After Stage 1 complete) =====
node 04f-segment-integrated-spec_v1.js \
  --inventory "../_mapping/pipeline/_run-prompts/04d-pipeline-infrastructure-inventory_v1.md" \
  --strategy "../_mapping/pipeline/_run-prompts/04d-pipeline-extension-strategy_v1.md" \
  --guide "../_mapping/pipeline/_run-prompts/04d-pipeline-implementation-guide_v1.md" \
  --output-dir "../_mapping/pipeline/_execution-prompts/"
```

---

## Validate Before Running

```bash
node validate-pipeline.js
```

Expected: `✅ VALIDATION PASSED - Ready to run pipeline!`

---

## Output Files

**After Stage 0:**
- `04e-[product-abbrev]-merge-integration-prompt_v1.md` (~46 KB)

**After Stage 1 (AI execution):**
- `04e-[product-abbrev]-integrated-extension-spec_v1.md` (~100-200 KB)

**After Stage 2:**
- `_execution-prompts/` directory
  - `EXECUTION-INDEX.md` (start here)
  - `04f-execution-E01-P01.md` through `04f-execution-E07-P04.md`

---

## Next Steps After Pipeline

1. Open `_execution-prompts/EXECUTION-INDEX.md`
2. Review execution order
3. Start with `04f-execution-E01-P01.md`
4. Execute prompts progressively

---

## Key Files Reference

| File | Purpose | Type | Size |
|------|---------|------|------|
| `04d-integrate-existing-codebase_v2.md` | Generic meta-prompt template | Template | 44 KB |
| `04e-merge-integration-spec_v2.js` | Prompt generator (Stage 0) | Script | 9 KB |
| `04f-segment-integrated-spec_v1.js` | Segmentation (Stage 2) | Script | 20 KB |
| `validate-pipeline.js` | Validation script | Script | 7 KB |
| `PIPELINE-USAGE-GUIDE.md` | Complete guide | Docs | 18 KB |
| `QUICK-START.md` | This file | Docs | 4 KB |

---

## v2 vs v1 Changes

**v2 Workflow:**
- Stage 0: Interactive prompt generator (`"Project Name" product-abbrev` args)
- Stage 1: AI merges three 04d docs into integrated spec (manual execution)
- Stage 2: Segment into execution prompts

**v1 Workflow (deprecated):**
- Stage 1: Hardcoded merge transformation with many command-line flags
- Stage 2: Segment into execution prompts

**Why v2?**
- Interactive prompts with sensible defaults
- Product/project agnostic meta-prompt
- Same UX pattern as 04c script (consistent)
- Better framing (EXTENSION, not integration)
- Cleaner usage: just two arguments

---

## Documentation

- **Complete Guide**: `../product/_mapping/pipeline/PIPELINE-USAGE-GUIDE.md`
- **Generic Template**: `../product/_prompt_engineering/04d-integrate-existing-codebase_v2.md`
- **This Quick Start**: `QUICK-START.md`

---

**Ready to run!** Execute Stage 0 command above to start the pipeline.
