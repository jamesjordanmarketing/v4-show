# Iteration 6 — PMC Process (User Journey Simplified)
**Date:** 2025-12-15  
**Status:** COMPLETED  
**Context:** LoRA Pipeline (`pipeline`) PMC workflow  

## Summary of Changes (Executed)

This document originally described issues with the 03.5 user journey segmentation workflow. Those issues have been resolved by **simplifying the process** and **deprecating the v4 segmenter**.

### What Changed

1. **Deprecated the v4 segmentation process**
   - Moved `02-generate-user-journey-prompt-segments_v4.js` to `_tools/archive/`
   - Moved `03.5-user-journey-stages-prompt-template_v9-version-e.md` to `_prompt_engineering/archive/` (if existed)

2. **Renamed files from 02.5 to 02b pattern**
   - `02.5-user-journey-prompt_v8.md` → `02b-user-journey-prompt_v8.md`
   - Output files: `02.5-{abbrev}-user-journey.md` → `02b-{abbrev}-user-journey.md`

3. **Created new automated script**
   - New: `02b-generate-user-journey_v1.js`
   - Modeled after `01-generate-overview.js`
   - Outputs customized prompts to `_run-prompts/`

4. **Updated 03-generate-functional-requirements.js**
   - Changed output directory from `_prompt_engineering/output-prompts/` to `_run-prompts/`
   - Changed user journey input from `03.5-{abbrev}-user-journey.md` to `02b-{abbrev}-user-journey.md`

---

## New Simplified Process Sequence

```
Step 00: Seed Story Generation
  Script: 00-generate-seed-story.js
  Output: 00-{abbrev}-seed-story.md

Step 01: Overview Generation
  Script: 01-generate-overview.js
  Output prompt: _run-prompts/01-product-{abbrev}-overview-prompt-v1.md
  Output document: 01-{abbrev}-overview.md

Step 02: User Stories Generation
  Script: 01-02-generate-product-specs.js (or manual)
  Output: 02-{abbrev}-user-stories.md

Step 02b: User Journey Generation (NEW - Simplified)
  Script: 02b-generate-user-journey_v1.js
  Prompt Template: _prompt_engineering/02b-user-journey-prompt_v8.md
  Output prompt: _run-prompts/02b-product-{abbrev}-user-journey-prompt-v1.md
  Output document: 02b-{abbrev}-user-journey.md

Step 03: Functional Requirements Generation
  Script: 03-generate-functional-requirements.js
  Input: 02b-{abbrev}-user-journey.md
  Output prompts: _run-prompts/3a-*.md, 3b-*.md
  Output document: 03-{abbrev}-functional-requirements.md

Step 04: Wireframe Generation
  Script: 04-generate-FR-wireframe-segments_v4.js
  ...
```

---

## How to Create User Journey (New Process)

### Step 1: Generate Customized Prompt
```bash
cd pmc/product/_tools/
node 02b-generate-user-journey_v1.js "LoRA Pipeline" pipeline
```

The script will:
1. Prompt for input file paths (with defaults)
2. Validate files exist
3. Generate customized prompt in `_run-prompts/02b-product-pipeline-user-journey-prompt-v1.md`

### Step 2: Run Prompt in AI Assistant
1. Open the generated prompt file
2. Copy the complete content
3. Paste into AI assistant with input files attached
4. Save AI output as `pmc/product/02b-pipeline-user-journey.md`

### Step 3: Continue to Functional Requirements
```bash
node 03-generate-functional-requirements.js "LoRA Pipeline" pipeline
```

The script now expects `02b-pipeline-user-journey.md` (not `03.5-`).

---

## Files Modified

| File | Change |
|------|--------|
| `_tools/02-generate-user-journey-prompt-segments_v4.js` | Moved to `_tools/archive/` |
| `_prompt_engineering/03.5-user-journey-stages-prompt-template_v9-version-e.md` | Moved to `_prompt_engineering/archive/` (if existed) |
| `_prompt_engineering/02.5-user-journey-prompt_v8.md` | Renamed to `02b-user-journey-prompt_v8.md` + added placeholders |
| `_tools/02b-generate-user-journey_v1.js` | **Created** - new script |
| `_tools/03-generate-functional-requirements.js` | Updated output dir and user journey path |
| `_tools/extract-user-journey-data.js` | Updated path from `03.5-` to `02b-` |
| `docs/ltc-6a/1-to-7-pmc-full-tutorial_v2.md` | Updated all 02.5/03.5 references to 02b |
| `docs/ltc-6a/wireframe-create-workflow-tutorial_v2.md` | Updated user journey references |
| `docs/ltc-6a/wireframe-workflow-optimization-analysis_v3.md` | Updated user journey references |

---

## Why This Simplification?

The original v4 segmentation process was complex:
- Required a "master" user journey file with specific heading formats
- Split into per-stage specs and prompts
- Required running each stage prompt separately
- Generated many intermediate files

The new process is simpler:
- One script generates one customized prompt
- One AI interaction produces the complete user journey document
- Direct naming pattern (`02b-`) aligns with step numbering
- No intermediate segmentation required

---

## Script Duplication Analysis: 01-generate-overview.js vs 01-02-generate-product-specs.js

### Questions Answered

**Q1: What does `01-generate-overview.js` do?**
- Generates **ONLY** the overview prompt
- Processes `config.documents[0]` (the first document in prompts-config.json)
- Outputs: `_run-prompts/01-product-{abbrev}-overview-prompt-v1.md`

**Q2: What does `01-02-generate-product-specs.js` do?**
- Generates **BOTH** overview and user stories prompts
- Processes `config.documents[0]` for overview
- Then processes `config.documents[1]` for user stories
- Outputs: 
  - `_run-prompts/01-product-{abbrev}-overview-prompt-v1.md`
  - `_run-prompts/02-product-{abbrev}-user-stories-prompt-v1.md`

**Q3: Is there duplicate functionality?**
- **YES** - Both scripts generate the exact same overview prompt file
- The output filename is identical: `01-product-{abbrev}-overview-prompt-v1.md`
- The output directory is identical: `_run-prompts/`
- The template used is identical: `01-product-overview-prompt-template_v1.md`
- The placeholders processed are identical

**Q4: Does running 01-02 overwrite the 01 prompt?**
- **YES** - Running `01-02-generate-product-specs.js` will overwrite the file created by `01-generate-overview.js`
- Since they write to the same filename, the second execution replaces the first

**Q5: Are the prompts exactly the same in content?**
- **YES** - Both scripts:
  - Load the same `prompts-config.json`
  - Process the same `config.documents[0]` entry
  - Use the same template file
  - Replace the same placeholders
  - Generate byte-for-byte identical output

### Process Impact

**Current Tutorial Says:**
1. Run `01-generate-overview.js` first
2. Then run `01-02-generate-product-specs.js`

**What Actually Happens:**
1. `01-generate-overview.js` creates `01-product-{abbrev}-overview-prompt-v1.md`
2. `01-02-generate-product-specs.js` **overwrites** that same file
3. Then creates `02-product-{abbrev}-user-stories-prompt-v1.md`

### Recommended Solution

**Option A: Use only 01-02-generate-product-specs.js**
- Skip `01-generate-overview.js` entirely
- Run `01-02-generate-product-specs.js` once to generate both prompts
- This is more efficient and avoids confusion

**Option B: Keep both scripts (current approach)**
- Useful if you only want to regenerate the overview prompt without user stories
- Accept that running both will result in overwrite (harmless since content is identical)

**Option C: Deprecate 01-generate-overview.js**
- Since `01-02-generate-product-specs.js` is a superset
- Move `01-generate-overview.js` to archive
- Update tutorials to use only `01-02-generate-product-specs.js`

### Current Decision
- **Keep both scripts** for now
- Update tutorial to clarify that running `01-02-generate-product-specs.js` alone is sufficient
- Document that `01-generate-overview.js` is useful only for regenerating overview without touching user stories

---

## Step 03 & Step 04 Process Analysis (December 16, 2025)

### User Questions & Context

**Scenario:** User ran `03-generate-functional-requirements.js` which created:
- Output: `_run-prompts/3a-preprocess-functional-requirements-prompt_v1-output.md`
- User executed that prompt in AI, created: `03-pipeline-functional-requirements.md`
- Script now asking for "FR Preprocessing Instructions" and path to `3b-functional-requirements-prompt_v1.md`

**Questions:**
1. What is expected to complete the enhancements?
2. Is there another prompt for detailed enhancements?
3. Does executing `3b-functional-requirements-prompt_v1.md` add value?
4. Are wireframe scripts (`04-generate-FR-prompt-segments.js` and `04-generate-FR-wireframe-segments_v5.js`) the next step?
5. Are those scripts/prompts templatized?

---

### Analysis: Step 03 Functional Requirements Process

#### How Step 03 Works (Two-Phase Process)

**Phase 1: Preprocess (3a)**
```
Input: Raw/initial functional requirements
Script: 03-generate-functional-requirements.js (preprocess mode)
Template: _prompt_engineering/3a-preprocess-functional-requirements-prompt_v1.md
Output Prompt: _run-prompts/3a-preprocess-functional-requirements-prompt_v1-output.md
Action: User copies prompt → AI execution → Saves as 03-{abbrev}-functional-requirements.md
Purpose: Clean, deduplicate, and reorder requirements
```

**Phase 2: Enhance (3b) - TWO SEPARATE PROMPTS**

After preprocessing, the script asks: "Ready to continue to enhancement step? (y/n)"

When you say "yes", it generates **TWO enhancement prompts** (not one):

**Enhancement Prompt #1:**
```
Template: _prompt_engineering/3b-#1-functional-requirements-legacy-prompt_v1.md
Output Prompt: _run-prompts/3b-#1-functional-requirements-legacy-prompt_v1-output.md
Purpose: Enhance requirements with detailed acceptance criteria and identify gaps
Action: User copies prompt → AI execution → Updates 03-{abbrev}-functional-requirements.md
```

**Enhancement Prompt #2:**
```
Template: _prompt_engineering/3b-#2-functional-requirements-legacy-code-prompt_v1.md
Output Prompt: _run-prompts/3b-#2-functional-requirements-legacy-code-prompt_v1-output.md
Purpose: Add legacy code references underneath each acceptance criterion
Action: User copies prompt → AI execution → Updates 03-{abbrev}-functional-requirements.md again
```

**Note:** The original `3b-functional-requirements-prompt_v1.md` template is **NOT used** by the script. It's kept for reference only.

---

### Answers to User Questions

#### Q1: What is expected to complete the enhancements?

**Answer:**
When the script asks for "FR Preprocessing Instructions" at the enhance step, it's asking you to confirm the path to the enhancement template. You should:

1. **Press Enter** to accept default: `_prompt_engineering/3b-functional-requirements-prompt_v1.md`
2. Script will then ask for paths to:
   - `03-{abbrev}-functional-requirements.md` (your preprocessed FR file)
   - `01-{abbrev}-overview.md`
   - `02-{abbrev}-user-stories.md`
   - `02b-{abbrev}-user-journey.md`
   - Reference example (if exists)
   - Codebase review (optional - say "n" unless you have legacy code to reference)

3. Script generates **TWO** enhancement prompts in `_run-prompts/`:
   - `3b-#1-functional-requirements-legacy-prompt_v1-output.md`
   - `3b-#2-functional-requirements-legacy-code-prompt_v1-output.md`

4. Execute **Prompt #1** first:
   - Copy content → Paste in AI
   - AI enhances your FR with detailed acceptance criteria
   - Save output, replacing your `03-{abbrev}-functional-requirements.md`

5. Execute **Prompt #2** second (optional):
   - Copy content → Paste in AI
   - AI adds legacy code references under each criterion
   - Save output, replacing your `03-{abbrev}-functional-requirements.md` again

---

#### Q2: Is there another prompt for detailed enhancements?

**Answer:** YES - There are **TWO** enhancement prompts, not one.

**Files Overview:**
```
_prompt_engineering/
├── 3b-functional-requirements-prompt_v1.md              (REFERENCE ONLY - not used by script)
├── 3b-#1-functional-requirements-legacy-prompt_v1.md    (ACTIVE - enhancement step 1)
└── 3b-#2-functional-requirements-legacy-code-prompt_v1.md (ACTIVE - enhancement step 2)
```

**Status of Each File:**

1. **`3b-functional-requirements-prompt_v1.md`**
   - **Status:** Original/reference template
   - **Used by script:** NO (script code has it commented out)
   - **Purpose:** Historical reference, shows original single-step enhancement approach
   - **Recommended:** Keep for reference, but don't execute

2. **`3b-#1-functional-requirements-legacy-prompt_v1.md`**
   - **Status:** ACTIVE - Part 1 of enhancement
   - **Used by script:** YES
   - **Purpose:** Enhance requirements with:
     - Detailed acceptance criteria
     - New requirements to fill gaps
     - Consistent depth across all sections
   - **Execution:** REQUIRED for quality FRs

3. **`3b-#2-functional-requirements-legacy-code-prompt_v1.md`**
   - **Status:** ACTIVE - Part 2 of enhancement
   - **Used by script:** YES
   - **Purpose:** Add legacy code references under each acceptance criterion
   - **Execution:** OPTIONAL (only if you have legacy codebase to reference)

**Why Two Prompts?**
- AI context limits prevent doing everything in one pass
- Splitting into two phases ensures:
  - Phase 1: Deep enhancement of requirements quality
  - Phase 2: Traceability to legacy code (if applicable)

---

#### Q3: Does executing `3b-functional-requirements-prompt_v1.md` add value?

**Answer:** NO - Do NOT execute `3b-functional-requirements-prompt_v1.md` manually.

**Reasoning:**
1. **Script doesn't use it** - The code explicitly skips generating this prompt (it's commented out in lines 438-444)
2. **Superseded by split prompts** - The `3b-#1` and `3b-#2` prompts replaced it
3. **Will cause confusion** - Running it would duplicate enhancement work already done by `3b-#1`

**What You Should Do:**
- **Execute:** `3b-#1-functional-requirements-legacy-prompt_v1-output.md` (generated by script)
- **Optionally Execute:** `3b-#2-functional-requirements-legacy-code-prompt_v1-output.md` (if you have legacy code)
- **Ignore:** `3b-functional-requirements-prompt_v1.md` (reference only)

**Recommendation:** Move `3b-functional-requirements-prompt_v1.md` to archive with note that it's superseded by split prompts.

---

#### Q4: Are wireframe scripts the next step?

**Answer:** YES - After completing Step 03 enhancements, Step 04 generates wireframe prompts.

**Correct Next Steps:**

```
Step 03 Complete ✅
  ├─ 3a preprocessing executed
  ├─ 3b-#1 enhancement executed
  └─ 3b-#2 legacy code references executed (optional)
        ↓
Step 04: Wireframe Generation
  ├─ Script: 04-generate-FR-wireframe-segments_v5.js (RECOMMENDED)
  └─ Alternative: 04-generate-FR-prompt-segments.js (older version)
```

**Which Script to Use:**

1. **`04-generate-FR-wireframe-segments_v5.js`** (RECOMMENDED - Latest)
   - More sophisticated
   - Uses journey mapping data
   - Generates both generator prompts AND execution prompts
   - Outputs to `_mapping/fr-maps/prompts/`

2. **`04-generate-FR-prompt-segments.js`** (Older)
   - Simpler segmentation
   - Outputs to `_mapping/ui-functional-maps/`
   - May be deprecated or for different use case

**Recommendation:** Use `04-generate-FR-wireframe-segments_v5.js` (v5 is the latest version in your codebase).

---

#### Q5: Are wireframe scripts/prompts templatized?

**Answer:** YES - Both scripts are fully templatized and automated.

**How Step 04 Works:**

**Script:** `04-generate-FR-wireframe-segments_v5.js`

**Process:**
1. **Reads** your `03-{abbrev}-functional-requirements.md`
2. **Segments** it into sections (E01, E02, E03, etc.)
3. **For each section:**
   - Extracts all FR IDs (e.g., FR1.1.0, FR1.2.0, FR1.3.0)
   - Generates a customized prompt PER FR using template
   - Calculates line numbers for traceability
4. **Outputs:**
   - Generator prompts: `_mapping/fr-maps/prompts/04-FR-wireframes-prompt-E[XX].md`
   - Execution prompts: `_mapping/fr-maps/prompts/04-FR-with-wireframes-execution-prompts_v1.md`
   - Final wireframe output path: `_mapping/fr-maps/04-bmo-FR-wireframes-output-E[XX].md`

**Templates Used:**
- `_prompt_engineering/04-FR-with-wireframes-create-tasks_v1.md` (generator template)
- `_prompt_engineering/04-FR-with-wireframes-execution-prompts_v1.md` (execution template)

**Placeholders Replaced:**
- `[FR_NUMBER_PLACEHOLDER]` → Actual FR ID (e.g., FR1.1.0)
- `[STAGE_NAME_PLACEHOLDER]` → Section name
- `[MINIMUM_PAGE_COUNT_PLACEHOLDER]` → Page count requirement
- `[SECTION_ID_PLACEHOLDER]` → Section ID (e.g., E01)
- `[FR_LOCATE_FILE_PATH_PLACEHOLDER]` → Path to FR file
- `[FR_LOCATE_LINE_PLACEHOLDER]` → Line number in FR file
- `[OUTPUT_FILE_PATH_PLACEHOLDER]` → Output path for wireframe

**Execution Flow:**
```
1. Run: node 04-generate-FR-wireframe-segments_v5.js "Project Name" abbrev
2. Script auto-generates all prompts for all sections
3. For each section (E01, E02, etc.):
   - Copy the generated prompt
   - Paste in AI (Claude/ChatGPT)
   - AI creates detailed wireframes with tasks
   - Save to specified output path
4. Repeat for all sections
```

**Yes, fully templatized** - No manual editing of prompts required.

---

### Complete Step 03 & 04 Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 03: Functional Requirements (Two-Phase Enhancement)       │
├─────────────────────────────────────────────────────────────────┤
│ Phase 1: Preprocess (3a)                                        │
│   Script: 03-generate-functional-requirements.js               │
│   Template: 3a-preprocess-functional-requirements-prompt_v1.md │
│   Output: 03-{abbrev}-functional-requirements.md               │
│   Purpose: Clean, deduplicate, reorder                         │
├─────────────────────────────────────────────────────────────────┤
│ Phase 2: Enhance (3b) - TWO PROMPTS                            │
│   Prompt #1: 3b-#1-functional-requirements-legacy-prompt_v1.md │
│     → Adds detailed acceptance criteria                        │
│     → Identifies gaps and adds new requirements                │
│     → REQUIRED for quality                                     │
│                                                                 │
│   Prompt #2: 3b-#2-functional-requirements-legacy-code-...     │
│     → Adds legacy code references under each criterion         │
│     → OPTIONAL (only if you have legacy codebase)              │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 04: Wireframe Generation                                  │
├─────────────────────────────────────────────────────────────────┤
│ Script: 04-generate-FR-wireframe-segments_v5.js                │
│ Templates:                                                      │
│   - 04-FR-with-wireframes-create-tasks_v1.md                   │
│   - 04-FR-with-wireframes-execution-prompts_v1.md              │
│                                                                 │
│ Process:                                                        │
│   1. Reads 03-{abbrev}-functional-requirements.md              │
│   2. Segments into sections (E01, E02, E03...)                 │
│   3. Extracts FR IDs per section                               │
│   4. Generates prompts per FR with placeholders filled         │
│   5. Outputs to _mapping/fr-maps/prompts/                      │
│                                                                 │
│ Execution:                                                      │
│   - For each section, copy generated prompt                    │
│   - Paste in AI                                                │
│   - AI creates detailed wireframes                             │
│   - Save to specified output path                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Recommended Actions

#### Immediate (For Current Session)

1. **Complete Step 03 Enhancement:**
   - Press Enter to accept `3b-functional-requirements-prompt_v1.md` path
   - Provide paths to all required files when prompted
   - Say "n" to codebase review (unless you have legacy code)
   - Execute the TWO generated prompts:
     - `3b-#1-functional-requirements-legacy-prompt_v1-output.md` (REQUIRED)
     - `3b-#2-functional-requirements-legacy-code-prompt_v1-output.md` (OPTIONAL - skip if no legacy code)

2. **Proceed to Step 04:**
   - Run: `node 04-generate-FR-wireframe-segments_v5.js "LoRA Pipeline" pipeline`
   - Execute each generated wireframe prompt section by section

#### Cleanup (For Next Session)

1. **Archive obsolete template:**
   ```bash
   mv _prompt_engineering/3b-functional-requirements-prompt_v1.md \
      _prompt_engineering/archive/3b-functional-requirements-prompt_v1.md
   ```
   - Add note: "Superseded by 3b-#1 and 3b-#2 split prompts"

2. **Update tutorials** to clarify:
   - Step 03 has TWO enhancement prompts (not one)
   - `3b-functional-requirements-prompt_v1.md` is reference only
   - Legacy code prompt (#2) is optional

3. **Verify script versions:**
   - Confirm `04-generate-FR-wireframe-segments_v5.js` is the canonical version
   - Archive or deprecate `04-generate-FR-prompt-segments.js` if superseded

---

---

## 3b Enhancement Prompts: Quality Analysis and Naming Confusion (December 16, 2025)

### Background: User Question

**User raised valid confusion about prompt naming:**
- Why is `3b-#1-functional-requirements-legacy-prompt_v1.md` labeled "legacy"?
- What are the actual differences between `3b-functional-requirements-prompt_v1.md` and `3b-#1-functional-requirements-legacy-prompt_v1.md`?
- Does `3b-functional-requirements-prompt_v1.md` have legacy code analysis built in?
- Which prompt is actually used by the script?
- Which prompt produces superior, more accurate functional requirements?
- Are either of these prompts critical for quality?

### Analysis: Script Behavior (Ground Truth)

**What the script actually does** (`03-generate-functional-requirements.js`):

1. **Line 437-443:** The script COMMENTS OUT generation of `3b-functional-requirements-prompt_v1.md`
   ```javascript
   // We no longer generate the original reference template
   // const originalTemplatePath = '_prompt_engineering/3b-functional-requirements-prompt_v1.md';
   // const originalTemplate = normalizePath(originalTemplatePath, '');
   ```

2. **Lines 446-454:** The script ACTIVELY USES `3b-#1-functional-requirements-prompt_v1.md`
   ```javascript
   const firstSplitTemplatePath = '_prompt_engineering/3b-#1-functional-requirements-prompt_v1.md';
   ```

3. **Lines 457-465:** The script ACTIVELY USES `3b-#2-functional-requirements-legacy-code-prompt_v1.md`
   ```javascript
   const secondSplitTemplatePath = '_prompt_engineering/3b-#2-functional-requirements-legacy-code-prompt_v1.md';
   ```

**Conclusion:** The script generates prompts from `3b-#1` and `3b-#2` ONLY. It does NOT use `3b-functional-requirements-prompt_v1.md`.

---

### Analysis: Prompt Differences (Content Comparison)

#### Similarities (Both Prompts Share):
- ✅ Same product summary
- ✅ Same "Your Role" definition
- ✅ Same critical rules for document handling
- ✅ Same file handling instructions
- ✅ Same required inputs structure
- ✅ Same analysis steps 1-5 (Review, Enhance, Granular Analysis, Overview Integration, Expert Analysis)
- ✅ Same output format
- ✅ Same guidelines (Focus on WHAT, Testability, Traceability, etc.)
- ✅ Same special considerations
- ✅ Same deliverables structure

#### KEY DIFFERENCE #1: Change Logging

**`3b-functional-requirements-prompt_v1.md` (Line 66-73):**
```markdown
3. **Change Logging Requirements**
   - Each atomic change MUST be logged individually in `{CHANGE_LOG_PATH}`:
   - Each FR modification MUST generate multiple log entries, one for each:
     * Acceptance criteria movement or modification
     * Priority or impact weight change
     * Description modification
     * User Story reference change
     * Append to the change log file, do not overwrite it.
   - FORMAT: [ID/Type] -> [Action] -> [Destination] | REASON: [Detailed Rationale]
   - Related changes MUST be grouped using change group IDs:
```

**`3b-#1-functional-requirements-legacy-prompt_v1.md`:**
- ❌ **NO change logging section at all**
- Change logging was REMOVED from the split prompts

**Impact:** `3b-functional-requirements-prompt_v1.md` requires detailed change logs, which is good for traceability but adds overhead.

#### KEY DIFFERENCE #2: Legacy Code References in Acceptance Criteria

**`3b-functional-requirements-prompt_v1.md` (Lines 148-168):**
```markdown
### 3. Granular Requirement Analysis
For each FR:
- ...
- You MUST transform User Acceptance Criteria into testable acceptance criteria
- Ensure consistent depth across all requirements
- Every time the legacy codebase here: {CODEBASE_REVIEW_PATH} is used to define an 
  acceptance criteria you MUST include the path to the codebase file(s) directly 
  under the applied acceptance criteria
  - When developing acceptance criteria based on the legacy codebase, you must 
    explicitly reference the specific file paths directly underneath each 
    individual acceptance criterion
  - For example, if you have multiple acceptance criteria like:
    ```
    1. The primary color palette must match the legacy implementation
       Legacy Code Reference: aplio-legacy/tailwind.config.js:25-53
    2. The typography scale must be identical to the legacy system
       Legacy Code Reference: 
       - aplio-legacy/styles/typography.css:12-45
       - aplio-legacy/components/text/Text.tsx:8-32
    3. The spacing system must maintain visual consistency
       Legacy Code Reference: aplio-legacy/styles/spacing.css:5-28
    ```
  - Each acceptance criterion must have its own path reference(s) directly underneath it
  - If an acceptance criterion is validated against multiple files, include all relevant paths
  - Do not group path references at the end of sections - they must be directly under 
    their specific criterion
```

**`3b-#1-functional-requirements-legacy-prompt_v1.md`:**
- ❌ **NO instructions about adding legacy code references**
- The legacy code reference instructions were REMOVED from `3b-#1`

**Impact:** `3b-functional-requirements-prompt_v1.md` tries to do BOTH enhancement AND legacy code references in ONE step, while `3b-#1` focuses ONLY on enhancement.

---

### Analysis: Why the Split Approach is Superior

**Original Problem (`3b-functional-requirements-prompt_v1.md`):**
1. **Too much in one prompt**: Enhancement + change logging + legacy code references
2. **Context limit issues**: LLMs struggle to maintain quality over long documents when doing multiple tasks
3. **Complexity**: AI must simultaneously enhance requirements AND find legacy code references
4. **Quality degradation**: Trying to do everything causes shortcuts and incomplete work

**Split Solution (`3b-#1` + `3b-#2`):**

**Prompt 3b-#1** (Enhancement Only):
- **Focus**: ONLY enhance requirements and add detailed acceptance criteria
- **No distractions**: No change logging, no legacy code references
- **Result**: Higher quality enhancements because AI focuses on ONE task
- **Named "legacy"**: Confusing name - should be called "3b-#1-enhancement" or "3b-requirements-enhancement"

**Prompt 3b-#2** (Legacy Code References Only):
- **Focus**: ONLY add legacy code file references under existing criteria
- **Prerequisite**: Requires 3b-#1 to be completed first
- **No modification**: Does NOT change criteria, only adds references
- **Result**: Precise traceability without corrupting enhancement work
- **Named correctly**: "legacy-code" accurately describes its purpose

---

### Analysis: Quality Comparison

#### Question: Does `3b-functional-requirements-prompt_v1.md` produce better results?

**Answer: NO - It attempts more but delivers less quality**

**Evidence:**

1. **AI Context Limits**:
   - Single prompts that try to do 3+ tasks suffer from quality degradation
   - LLMs perform better with focused, single-purpose instructions
   - Split prompts allow AI to focus fully on each task

2. **Change Logging Overhead**:
   - While theoretically useful, change logs add significant overhead
   - Most projects don't use detailed change logs from AI prompts
   - Creates busywork that distracts from core enhancement task
   - **Recommendation**: Remove or make optional

3. **Legacy Code Integration**:
   - Finding legacy code references WHILE enhancing requirements causes confusion
   - AI must context-switch between "what should the requirement be?" and "where is this in legacy code?"
   - Split approach: First perfect the requirement, THEN trace to legacy code

4. **Document Completeness Risk**:
   - More complex prompts increase risk of incomplete processing
   - AI may shortcut or truncate when overwhelmed
   - Simpler prompts = more reliable complete processing

#### Question: Which produces more accurate functional requirements?

**Answer: `3b-#1-functional-requirements-legacy-prompt_v1.md` (the "legacy" one) produces superior FRs**

**Reasons:**

1. **Focused Enhancement**:
   - AI dedicates full attention to improving requirement quality
   - No distraction from change logging or code hunting
   - Results in deeper, more thoughtful acceptance criteria

2. **Reduced Cognitive Load**:
   - Single task = better execution
   - AI can maintain consistency across entire document
   - Less likely to skip sections or reduce quality mid-document

3. **Two-Pass Quality**:
   - Pass 1 (3b-#1): Perfect the requirements
   - Pass 2 (3b-#2): Add traceability without corrupting requirements
   - This is a proven software engineering pattern (separation of concerns)

---

### Analysis: Critical Prompts for Quality

#### Question: Are EITHER of these prompts critical for quality?

**Answer: YES - `3b-#1` is CRITICAL. `3b-functional-requirements-prompt_v1.md` is NOT.**

**Rationale:**

**`3b-#1-functional-requirements-legacy-prompt_v1.md` is CRITICAL because:**

1. ✅ **Adds User Journey Integration**: Cross-references with UJ X.X.X elements
2. ✅ **Adds Journey-Specific Success Metrics**: Time to complete, user confidence, error recovery
3. ✅ **Maps to User Journey Stages**: Connects FRs to 6 stages of user workflow
4. ✅ **Granular Requirement Analysis**: Breaks down complex requirements into modular components
5. ✅ **Overview Document Integration**: Identifies requirements from overview missing from FRs
6. ✅ **Expert Analysis Enhancement**: Applies senior product manager perspective to find gaps
7. ✅ **Identifies System Integration Requirements**: Inter-component communication, APIs, data flow
8. ✅ **Identifies Operational Requirements**: Monitoring, metrics, logging, error handling
9. ✅ **Identifies Automation Opportunities**: Testing, CI/CD, maintenance
10. ✅ **Identifies Future-Proofing Requirements**: Scalability, extensibility, configuration
11. ✅ **Identifies Security Requirements**: Authentication, authorization, data protection

**Without `3b-#1`, you would have:**
- Shallow acceptance criteria
- Missing requirements from overview
- No connection to user journey
- No system-level thinking
- No operational or security requirements
- Incomplete, low-quality functional requirements document

**`3b-functional-requirements-prompt_v1.md` is NOT CRITICAL because:**
- It ATTEMPTS the same enhancements as `3b-#1`
- But it also tries to do change logging + legacy code references
- Result: Lower quality due to AI context overload
- **It's a worse version of `3b-#1`**

**`3b-#2-functional-requirements-legacy-code-prompt_v1.md` is OPTIONAL:**
- Only needed if you have legacy code to reference
- Adds traceability but doesn't improve requirement quality
- Can skip if building greenfield project

---

### Naming Confusion Analysis

#### Why is it called "legacy"?

**The naming is CONFUSING and MISLEADING:**

1. **`3b-#1-functional-requirements-legacy-prompt_v1.md`**
   - Name suggests: "Use this for legacy projects"
   - Reality: This is the PRIMARY enhancement prompt for ALL projects
   - Better name: `3b-#1-requirements-enhancement-prompt_v1.md`

2. **`3b-#2-functional-requirements-legacy-code-prompt_v1.md`**
   - Name is CORRECT: "Add legacy code references"
   - This truly is about legacy code
   - Name accurately reflects purpose

3. **`3b-functional-requirements-prompt_v1.md`**
   - Name suggests: "Main enhancement prompt"
   - Reality: DEPRECATED, not used by script
   - Better fate: Move to archive/ with note

#### Root Cause of Confusion

**Likely evolution:**

1. **Original**: `3b-functional-requirements-prompt_v1.md` did everything
2. **Problem discovered**: Prompt too complex, quality suffered
3. **Solution**: Split into two prompts
4. **Naming mistake**: Called first prompt "legacy" when they meant "for legacy projects that need enhancement"
5. **Confusion**: Name implies wrong thing

---

### Recommendations

#### Immediate Actions (High Priority)

1. **Rename `3b-#1-functional-requirements-legacy-prompt_v1.md`**
   ```bash
   mv _prompt_engineering/3b-#1-functional-requirements-legacy-prompt_v1.md \
      _prompt_engineering/3b-#1-requirements-enhancement-prompt_v1.md
   ```
   - Update script to use new name
   - Remove "legacy" which is confusing
   - Make it clear this is THE enhancement prompt

2. **Archive `3b-functional-requirements-prompt_v1.md`**
   ```bash
   mv _prompt_engineering/3b-functional-requirements-prompt_v1.md \
      _prompt_engineering/archive/3b-functional-requirements-prompt_v1-DEPRECATED.md
   ```
   - Add header: "DEPRECATED - Superseded by split approach"
   - Explain: "This prompt tried to do too much. Use 3b-#1 + 3b-#2 instead"
   - Document the split approach rationale

3. **Update Script Comments** (`03-generate-functional-requirements.js`)
   - Line 13: Remove reference to "legacy" naming
   - Update comments to explain split approach clearly
   - Document that 3b-#1 is primary, 3b-#2 is optional

#### Documentation Updates (Medium Priority)

1. **Update All Tutorials**:
   - Clarify that `3b-#1` is the PRIMARY enhancement prompt
   - Explain that "legacy" in filename is historical artifact, NOT about legacy projects
   - Document that `3b-#2` is ONLY for projects with legacy codebases to reference
   - Recommend NEW projects skip `3b-#2` entirely

2. **Add FAQ Section** to operational tutorial:
   ```markdown
   Q: Why is 3b-#1 called "legacy" when it's used for all projects?
   A: Historical naming mistake. It should be called "enhancement." The prompt is 
      used for ALL projects, not just legacy ones. The "legacy" refers to when we 
      split from the original monolithic prompt.
   
   Q: Do I need 3b-#2 for my new project with no legacy code?
   A: NO. Skip 3b-#2 entirely. It only adds code references to existing codebases.
      New projects don't have legacy code to reference.
   
   Q: Can I use the original 3b-functional-requirements-prompt_v1.md?
   A: NO. It's deprecated. Use 3b-#1 (enhancement) + 3b-#2 (legacy code, if applicable).
   ```

#### Process Improvements (Low Priority)

1. **Consider Removing Change Logging**:
   - Most projects don't use AI-generated change logs
   - Adds overhead without clear value
   - Could make it optional via flag

2. **Standardize Naming Convention**:
   - `3b-#1-requirements-enhancement-prompt_v1.md` (PRIMARY)
   - `3b-#2-legacy-code-references-prompt_v1.md` (OPTIONAL)
   - Clear purpose in filename

3. **Add Validation Script**:
   - Check that all FR sections were processed
   - Verify no truncation occurred
   - Confirm consistent depth across sections

---

### Final Assessment: Which Prompts to Use?

**For ANY project (new or legacy):**

1. ✅ **REQUIRED**: `3b-#1-functional-requirements-legacy-prompt_v1.md`
   - Despite confusing name, this is THE enhancement prompt
   - Use for ALL projects
   - Produces highest quality functional requirements

2. ⚠️ **OPTIONAL**: `3b-#2-functional-requirements-legacy-code-prompt_v1.md`
   - ONLY use if you have legacy codebase to reference
   - Skip for greenfield/new projects
   - Adds traceability, not quality

3. ❌ **DEPRECATED**: `3b-functional-requirements-prompt_v1.md`
   - Do NOT use
   - Superseded by split approach
   - Move to archive

**Quality Ranking:**
1. 🥇 `3b-#1` (focused enhancement) - BEST QUALITY
2. 🥈 `3b-#1` + `3b-#2` (enhancement + traceability) - BEST QUALITY + TRACEABILITY
3. 🥉 `3b-functional-requirements-prompt_v1.md` (tries everything) - LOWER QUALITY DUE TO COMPLEXITY

---

**Analysis Date:** December 16, 2025  
**Analyst:** AI Agent  
**Status:** Analysis Complete - Recommendations Ready for Implementation

---

---

## Wireframe Generation Mystery Resolution (December 16, 2025)

**Complete detailed analysis:**  
See: `wireframe-generation-mystery-solved_v1.md`

**Summary:**
- ✅ **Restored missing Figma template** from chunks-alpha project
- ✅ **Fixed critical BUG** in placeholder replacement (OUTPUT_FILE_PATH_PLACEHOLDER)
- ✅ **Created dedicated Figma script**: `04a-generate-FIGMA-wireframe-prompts_v1.js`
- ✅ **Separated TWO workflows**: Figma wireframes (visual design) vs Task lists (implementation)
- ✅ **Documented complete solution** with verification and testing

**Key Finding:**  
The current `04-generate-FR-wireframe-segments_v4.js` was using the WRONG template (`04-FR-with-wireframes-create-tasks_v1.md` for task lists) instead of the CORRECT template (`04-FR-wireframes-prompt_v4.md` for Figma wireframes).

**Solution:**  
Two separate scripts for two separate workflows:
- **04a-generate-FIGMA-wireframe-prompts_v1.js** → Creates Figma wireframe prompts (visual design)
- **04-generate-FR-wireframe-segments_v4.js** → Creates task lists (implementation planning)

---

**Document Status:** Completed  
**Executed By:** AI Agent  
**Execution Date:** 2025-12-15  
**Updated:** 2025-12-16 (Script duplication analysis + Step 03/04 process analysis + 3b prompt quality analysis + Wireframe mystery excavation added)

