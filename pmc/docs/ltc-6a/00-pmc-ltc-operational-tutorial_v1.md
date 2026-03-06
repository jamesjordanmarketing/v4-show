# PMC Operational Process Guide
**Version:** 1.0.0  
**Date:** December 16, 2025  
**Purpose:** Operational process documentation for PMC tools  
**Category:** Process Guide & FAQ

---

## About This Document

This document provides operational guidance for running the PMC (Project Memory Core) generation scripts located in `pmc/product/_tools/`. It answers common questions about how the scripts work, what they produce, and how to use them in the correct sequence.

**Intended Audience:** Non-technical operators who need to run the PMC process

**Companion Document:** See `00-pmc-ltc-overview-tutorial_v4.md` for technical details and system architecture

---

## Quick Reference: Script Execution Order

```
1. node 00-generate-seed-story.js
2. node 01-generate-overview.js "Project Name" abbrev
3. node 02a-generate-user-story-spec.js "Project Name" abbrev
4. node 02b-generate-user-journey_v1.js "Project Name" abbrev
5. node 03-generate-functional-requirements.js "Project Name" abbrev
6. node 04-generate-FR-wireframe-segments_v4.js "Project Name" abbrev
```

**Note:** `01-02-generate-product-specs.js` has been deprecated and split into separate scripts for operational consistency.

---

## Script Analysis & FAQ

### 02a-generate-user-story-spec.js

#### Q: What does this script do operationally?

**A:** This script generates ONE AI prompt for creating user stories specification:

**User Stories Prompt** (Step 02)
- Creates: `_run-prompts/02-product-{abbrev}-user-stories-prompt-v1.md`
- Purpose: This is an AI prompt you copy and paste into your AI assistant
- Final Output: After running the prompt in AI, you save the result as `02-{abbrev}-user-stories.md`

#### How to Use the File Created:

**Step-by-Step Process:**

1. **Prerequisite:** Ensure `01-{abbrev}-overview.md` exists (run `01-generate-overview.js` first)

2. Run the script:
   ```bash
   cd pmc/product/_tools
   node 02a-generate-user-story-spec.js "Project Name" project-abbrev
   ```

3. The script will:
   - Validate that overview file exists
   - Generate user stories prompt
   - Save prompt to `_run-prompts/` folder

4. For User Stories:
   - Open `_run-prompts/02-product-{abbrev}-user-stories-prompt-v1.md`
   - Copy the entire prompt content
   - Paste into your AI assistant (like Claude or ChatGPT)
   - Save the AI's response as `pmc/product/02-{abbrev}-user-stories.md`

#### Final Output After Complete Process:

- `02-{abbrev}-user-stories.md` - User stories specification

---

#### Q: Why is it called "02a"? How does it relate to "02b"?

**A: Naming Convention:**

The PMC process has sub-steps at the 02 level:
- **Step 02a:** User Stories (uses `02a-generate-user-story-spec.js`)
- **Step 02b:** User Journey (uses `02b-generate-user-journey_v1.js`)

Both are part of the broader "Step 02" phase, which focuses on user-centric documentation:
- `02a` defines **what** users need (user stories)
- `02b` defines **how** users interact (user journey)

**Execution Order:**
```
Step 01 (Overview) → Step 02a (User Stories) → Step 02b (User Journey) → Step 03 (Functional Requirements)
```

---

#### Q: Does 02a-generate-user-story-spec.js require the 01 overview file as input?

**A: YES - Required:**

**Input required:** 
- `00-{abbrev}-seed-story.md` (from step 00)
- `01-{abbrev}-overview.md` (from step 01) **← MUST EXIST**

**Conclusion:** You MUST run `01-generate-overview.js` and create the `01-{abbrev}-overview.md` file BEFORE running `02a-generate-user-story-spec.js`.

**Why?**
1. The user stories prompt template references the overview file
2. The AI needs the overview context to generate meaningful user stories
3. The script will prompt you for the `01-{abbrev}-overview.md` file path and validate it exists

**Recommended Sequence:**

```
Step 00: node 00-generate-seed-story.js
         ↓ (creates 00-{abbrev}-seed-story.md)
         
Step 01: node 01-generate-overview.js "Project Name" abbrev
         ↓ (creates prompt, you run in AI, save as 01-{abbrev}-overview.md)
         
Step 02a: node 02a-generate-user-story-spec.js "Project Name" abbrev
          ↓ (creates user stories prompt)
          ↓ (requires 01-{abbrev}-overview.md to exist)
```

---

### DEPRECATED: 01-02-generate-product-specs.js

**Status:** This script has been moved to `archive/` and deprecated as of December 16, 2025.

**Reason for Deprecation:**
- Violated operational consistency (one script should do one thing)
- Generated BOTH overview (step 01) AND user stories (step 02) prompts
- Caused duplication with `01-generate-overview.js` (both wrote identical overview prompts)
- Made process flow unclear

**What Replaced It:**
- **Step 01:** Use `01-generate-overview.js` (generates overview prompt only)
- **Step 02:** Use `02a-generate-user-story-spec.js` (generates user stories prompt only)

**Migration:**
If you were previously using `01-02-generate-product-specs.js`, update your workflow:

**Old Way:**
```bash
node 01-02-generate-product-specs.js "Project Name" abbrev
# (generated both prompts in one session)
```

**New Way:**
```bash
node 01-generate-overview.js "Project Name" abbrev
node 02a-generate-user-story-spec.js "Project Name" abbrev
# (each script does one thing)
```

**Reference:** The deprecated script is archived at `pmc/product/_tools/archive/01-02-generate-product-specs.js`

---

## Complete Operational Workflow

### Step 00: Seed Story
```bash
node 00-generate-seed-story.js
```
- Creates seed narrative and seed story documents
- No AI prompting required - script does everything

### Step 01: Overview
```bash
node 01-generate-overview.js "Project Name" abbrev
```
- Creates: `_run-prompts/01-product-{abbrev}-overview-prompt-v1.md`
- **Action Required:** Copy prompt → Paste in AI → Save as `01-{abbrev}-overview.md`

### Step 02a: User Stories
```bash
node 02a-generate-user-story-spec.js "Project Name" abbrev
```
- **Prerequisite:** Must have `01-{abbrev}-overview.md` from Step 01
- Creates: `_run-prompts/02-product-{abbrev}-user-stories-prompt-v1.md`
- **Action Required:** Copy prompt → Paste in AI → Save as `02-{abbrev}-user-stories.md`

### Step 02b: User Journey
```bash
node 02b-generate-user-journey_v1.js "Project Name" abbrev
```
- Creates: `_run-prompts/02b-product-{abbrev}-user-journey-prompt-v1.md`
- **Action Required:** Copy prompt → Paste in AI → Save as `02b-{abbrev}-user-journey.md`

### Step 03: Functional Requirements
```bash
node 03-generate-functional-requirements.js "Project Name" abbrev
```
- Creates multiple prompts for FR generation
- **Action Required:** Follow script instructions for each prompt

### Step 04: Wireframes
```bash
node 04-generate-FR-wireframe-segments_v4.js "Project Name" abbrev
```
- Creates wireframe prompts organized by section
- **Action Required:** Follow script instructions for each section

---

## Key Operational Concepts

### What is a "Prompt File"?

A prompt file is a markdown document containing instructions for an AI assistant. You:
1. Open the file in a text editor
2. Copy the entire content
3. Paste into your AI tool (Claude, ChatGPT, etc.)
4. The AI generates the specification document
5. You save the AI's output to the specified filename

### Where Files Are Saved

**Prompts (for you to copy):**
- Location: `pmc/product/_run-prompts/`
- These are what you paste into AI

**Final Specifications (you create these):**
- Location: `pmc/product/`
- These are the AI outputs you save
- Examples: `01-{abbrev}-overview.md`, `02-{abbrev}-user-stories.md`

### Script Dependencies

Each step requires outputs from previous steps:

```
00-seed-story.md
    ↓
01-overview.md
    ↓
02-user-stories.md
    ↓
02b-user-journey.md
    ↓
03-functional-requirements.md
    ↓
04-wireframe-specs/
```

**Important:** You cannot skip steps. Each document builds on the previous ones.

---

## Common Issues

### "File not found" errors
- Make sure you completed the previous step
- Check the filename matches exactly (case-sensitive)
- Verify files are in `pmc/product/` folder

### "Which script should I use for step 01?"
- Use `01-generate-overview.js` for a focused step 01 only
- Use `01-02-generate-product-specs.js` if you want to generate both overview and user stories in one session

### "Do I need to run AI prompts for every step?"
- Step 00: NO - script handles everything automatically
- Steps 01, 02, 02b, 03, 04: YES - you must copy prompts to AI

---

## Script Output Summary

| Script | Creates Prompts | Final Specs (you create) |
|--------|----------------|--------------------------|
| `00-generate-seed-story.js` | None | `00-{abbrev}-seed-narrative.md`<br>`00-{abbrev}-seed-story.md` |
| `01-generate-overview.js` | `01-product-{abbrev}-overview-prompt-v1.md` | `01-{abbrev}-overview.md` |
| `01-02-generate-product-specs.js` | `01-product-{abbrev}-overview-prompt-v1.md`<br>`02-product-{abbrev}-user-stories-prompt-v1.md` | `01-{abbrev}-overview.md`<br>`02-{abbrev}-user-stories.md` |
| `02b-generate-user-journey_v1.js` | `02b-product-{abbrev}-user-journey-prompt-v1.md` | `02b-{abbrev}-user-journey.md` |
| `03-generate-functional-requirements.js` | Multiple FR prompts | `03-{abbrev}-functional-requirements.md` |
| `04-generate-FR-wireframe-segments_v4.js` | Multiple wireframe prompts | Multiple wireframe specifications |

---

**For technical details, troubleshooting, and system architecture, see:** `00-pmc-ltc-overview-tutorial_v4.md`
