# Customized Meta-Prompt: Section E01

**Product:** PIPELINE  
**Section:** 1 - Foundation & Authentication  
**Generated:** 2025-12-26  
**Source Section File:** `04f-pipeline-build-section-E01.md`

---

## 🎯 Purpose

This is a **customized meta-prompt** for generating progressive execution prompts for Section E01.

**What This Document Does:**
- Provides section-specific context and requirements
- Guides you through analyzing this specific section
- Helps you generate progressive execution prompts
- Outputs a single file with all prompts for this section

**What You'll Generate:**
- **Output File:** `04f-pipeline-build-section-E01-execution-prompts.md`
- **Location:** Same directory as this file
- **Contents:** Progressive execution prompts (P01, P02, P03, etc.)

---

## 📊 Section Statistics

- **Section Number:** E01
- **Title:** Foundation & Authentication
- **Features:** 1 identified
- **Complexity:** LOW
- **Estimated Hours:** 3-5
- **Expected Prompts:** 1
- **Source File:** `04f-pipeline-build-section-E01.md`

---

## 📋 Section Overview

This section establishes the foundational infrastructure. However, since we're EXTENDING an existing application, most of this already exists.

**What Already Exists**:
- ✅ Next.js 14 App Router with TypeScript
- ✅ Supabase Auth with protected routes
- ✅ Supabase PostgreSQL database
- ✅ Supabase Storage
- ✅ shadcn/ui components (47+ components)
- ✅ Dashboard layout and routing
- ✅ React Query for data fetching

**What We're Adding** (LoRA Training specific):
- New database tables: `datasets`, `training_jobs`, `metrics_points`, `model_artifacts`, `cost_records`, `notifications`
- New storage buckets: `lora-datasets`, `lora-models`

---

---

## 🔗 Integration Context

### No Previous Sections

This is the first section (E01 - Foundation). No previous sections exist.


---

## 📖 Instructions

### Step 1: Read the Base Meta-Prompt Template

The complete meta-prompt methodology is defined in:
`pmc/product/_prompt_engineering/04f-integrated-spec-to-progressive-prompts_v2.md`

**Key sections to reference:**
- Phase 1: Section Analysis (how to parse features)
- Phase 2: Prompt Planning (how to group features)
- Phase 3: Prompt Generation (the prompt template)
- Phase 4: Cross-Prompt Validation (quality checks)

### Step 2: Read the Section File

Load and analyze the complete section specification:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E01.md`

**What to extract:**
- All features (FR-1.X format)
- Code blocks (SQL, TypeScript, TSX, etc.)
- File specifications (paths, new vs modify)
- Dependencies (on previous sections and within section)
- Acceptance criteria

### Step 3: Apply the Meta-Prompt Phases

Follow the methodology from the base meta-prompt:

#### Phase 1: Section Analysis
- Parse section metadata (already done above)
- Extract all 1 features
- Assess complexity for each feature
- Build dependency graph

#### Phase 2: Prompt Planning
- Determine grouping strategy (Layer-Based, Feature-Based, or Single Prompt)
- Group features into logical prompts (target 6-8 hours each)
- Define integration points between prompts
- Ensure correct dependency order

#### Phase 3: Prompt Generation
- Use the prompt template from base meta-prompt
- Generate one prompt for each group
- Include all code blocks from section file
- Specify integration points with previous sections: None
- Add acceptance criteria and testing steps

#### Phase 4: Cross-Prompt Validation
- Verify all features covered
- Check dependencies are correct
- Ensure no redundancy
- Validate integration points

### Step 4: Generate Output File

Create a single markdown file with this structure:

```markdown
# PIPELINE - Section E01: Foundation & Authentication - Execution Prompts

**Product:** PIPELINE  
**Section:** 1 - Foundation & Authentication  
**Generated:** [Today's date]  
**Total Prompts:** [Number you determined]  
**Estimated Total Time:** [Total hours] hours  
**Source Section File:** 04f-pipeline-build-section-E01.md

---

## Section Overview

[Copy from section file]

---

## Prompt Sequence for This Section

[List all prompts you're generating]

---

## Integration Context

### Dependencies from Previous Sections
[List what this section needs from sections: None]

### Provides for Next Sections
[List what future sections will use]

---

## Dependency Flow (This Section)

[Show the flow between prompts in this section]

---

# PROMPT 1: [Title]

[Full prompt using template from base meta-prompt]

---

# PROMPT 2: [Title]

[Full prompt using template from base meta-prompt]

---

[Continue for all prompts...]

---

## Section Completion Checklist

[Comprehensive checklist for this section]

---

**End of Section E01 Execution Prompts**
```

### Step 5: Save Output

**File Path:**
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build/04f-pipeline-build-section-E01-execution-prompts.md`

---

## ✅ Success Criteria

Your generated execution prompts file is complete when:

1. ✅ All 1 features from section file are covered
2. ✅ Each prompt is 6-8 hours of work (not too large/small)
3. ✅ Prompts are in correct dependency order
4. ✅ Integration points with previous sections are explicit
5. ✅ All code blocks from section file are included in appropriate prompts
6. ✅ Acceptance criteria and testing steps are specific
7. ✅ File follows the template structure exactly
8. ✅ Output file name matches: `04f-pipeline-build-section-E01-execution-prompts.md`

---

## 📚 Reference Materials

### Section File Location
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\full-build\04f-pipeline-build-section-E01.md`

### Base Meta-Prompt Template
`pmc/product/_prompt_engineering/04f-integrated-spec-to-progressive-prompts_v2.md`

### Previous Section Files
(None - this is the first section)

---

## 🚀 Ready to Generate

You now have all the information needed to generate execution prompts for Section E01.

**Next Steps:**
1. Open the section file: `04f-pipeline-build-section-E01.md`
2. Reference the base meta-prompt for methodology
3. Apply the 4 phases (Analysis → Planning → Generation → Validation)
4. Generate the output file with all prompts

**Expected Output:**
- File: `04f-pipeline-build-section-E01-execution-prompts.md`
- Prompts: 1 progressive build prompts
- Total Time: 3-5 hours of implementation work

---

**Let's generate execution prompts for Foundation & Authentication!** 🎯
