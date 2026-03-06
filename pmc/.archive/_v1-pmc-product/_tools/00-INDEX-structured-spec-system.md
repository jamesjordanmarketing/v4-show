# Progressive Structured Specification Builder - System Index

## 📑 Quick Navigation

This index helps you find the right document for your needs.

---

## 🚀 Getting Started

### First Time User?
**Start here**: [`QUICKSTART-structured-spec.md`](./QUICKSTART-structured-spec.md)
- 5-minute quick start guide
- Shows exact commands to run
- Minimal explanation, maximum action

### Want to Understand the System?
**Read this**: [`SYSTEM-SUMMARY.md`](./SYSTEM-SUMMARY.md)
- Complete overview of what was created
- Explains the problem it solves
- Shows examples of progressive vs traditional specs
- 20-minute read

### Need Detailed Documentation?
**Reference**: [`README-structured-spec-builder.md`](./README-structured-spec-builder.md)
- Comprehensive documentation
- Use cases and examples
- Advanced usage patterns
- Troubleshooting guide
- FAQ section
- Full reference manual

---

## 🔧 System Components

### 1. The Template (The Brain)
**File**: `../product/_prompt_engineering/04c-build-structured-with-wirframe-spec_v1.md`
**Purpose**: Instructs AI how to transform unstructured → progressive structured specs
**Size**: ~850 lines of detailed instructions
**Edit When**: You want to change how specs are structured

### 2. The Script (The Generator)
**File**: `04c-generate-structured-spec-prompt.js`
**Purpose**: Interactive script that generates ready-to-use prompts
**Usage**: `node 04c-generate-structured-spec-prompt.js`
**Edit When**: You want to add features to the script (validation, templates, etc.)

### 3. Generated Prompts (The Output)
**Location**: `../product/_mapping/[project]/_run-prompts/`
**Format**: `04c-build-structured-spec-prompt-[timestamp].md`
**Purpose**: Ready-to-paste prompts for Claude
**Usage**: Copy entire contents → paste in Claude

---

## 📖 Documentation Files

| File | Purpose | Time to Read | When to Use |
|------|---------|--------------|-------------|
| `QUICKSTART-structured-spec.md` | Get started fast | 5 min | First time using system |
| `SYSTEM-SUMMARY.md` | Understand the system | 20 min | Want conceptual overview |
| `README-structured-spec-builder.md` | Complete reference | 45 min | Need detailed docs or troubleshooting |
| `00-INDEX-structured-spec-system.md` | Find the right doc | 2 min | Navigation (you are here!) |

---

## 🎯 Common Tasks

### Task: Run the System for First Time
1. Read: `QUICKSTART-structured-spec.md` (5 min)
2. Run: `node 04c-generate-structured-spec-prompt.js`
3. Follow prompts
4. Copy generated prompt to Claude
5. Done!

### Task: Understand What This Does
1. Read: `SYSTEM-SUMMARY.md` (20 min)
2. See examples of progressive vs traditional specs
3. Understand the key innovations
4. Ready to use confidently

### Task: Troubleshoot an Issue
1. Check: `QUICKSTART-structured-spec.md` → Common Issues section (2 min)
2. If not there, check: `README-structured-spec-builder.md` → Troubleshooting section (5 min)
3. If still stuck, check: `SYSTEM-SUMMARY.md` → Validation Checklist (3 min)

### Task: Modify the System
1. Read: `README-structured-spec-builder.md` → Support & Maintenance section
2. Edit template: `../product/_prompt_engineering/04c-build-structured-with-wirframe-spec_v1.md`
3. OR edit script: `04c-generate-structured-spec-prompt.js`
4. Test changes
5. Update docs

### Task: Validate Output Quality
1. Get structured spec from Claude
2. Use: `SYSTEM-SUMMARY.md` → Validation Checklist
3. Check all boxes
4. If any fail, ask Claude to fix specific issues
5. Validate again until all pass

---

## 🗺️ File Locations Map

```
v4-show//
└── pmc/
    └── product/
        ├── _prompt_engineering/
        │   └── 04c-build-structured-with-wirframe-spec_v1.md  ← TEMPLATE
        │
        ├── _tools/
        │   ├── 04c-generate-structured-spec-prompt.js         ← SCRIPT
        │   ├── 00-INDEX-structured-spec-system.md             ← YOU ARE HERE
        │   ├── QUICKSTART-structured-spec.md                  ← 5-MIN GUIDE
        │   ├── SYSTEM-SUMMARY.md                              ← 20-MIN OVERVIEW
        │   └── README-structured-spec-builder.md              ← FULL DOCS
        │
        └── _mapping/
            └── pipeline/
                ├── iteration-8-multi-chat-figma-conversion.md  ← INPUT (unstructured)
                ├── lora-structured-spec-[timestamp].md            ← OUTPUT (structured)
                └── _run-prompts/
                    └── 04c-build-structured-spec-prompt-[timestamp].md  ← GENERATED PROMPTS
```

---

## 📋 Quick Reference: File Purposes

### Input Files (You Provide)
- **Unstructured Spec**: Your raw technical document (any format)
  - Example: `iteration-8-multi-chat-figma-conversion.md`

### System Files (We Provide)
- **Template**: Instructions for AI transformation
  - Location: `_prompt_engineering/04c-build-structured-with-wirframe-spec_v1.md`
- **Script**: Generates customized prompts
  - Location: `_tools/04c-generate-structured-spec-prompt.js`

### Generated Files (Script Creates)
- **Prompt**: Ready to paste in Claude
  - Location: `_run-prompts/04c-build-structured-spec-prompt-[timestamp].md`

### Output Files (Claude Creates)
- **Structured Spec**: Progressive, cumulative specification
  - Location: Wherever you specify (e.g., `lora-structured-spec.md`)

---

## 🔄 Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  1. You Have: Unstructured Spec (3000+ lines)               │
│     Example: iteration-8-multi-chat-figma-conversion.md  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Run Script: node 04c-generate-structured-spec-prompt.js │
│     Script asks for input/output paths                      │
│     Script generates customized prompt                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Use Prompt: Copy generated prompt → Paste in Claude     │
│     Claude analyzes unstructured spec                       │
│     Claude determines optimal sections (6-8 for your case)  │
│     Claude creates progressive structured spec              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Get Result: Structured Spec (4000-6000 lines)           │
│     Each section explicitly builds on previous              │
│     All integrations documented with exact names            │
│     Wireframe-level UI detail included                      │
│     Complete API schemas with integration points            │
│     Database relationships clearly documented               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Use It: Generate granular FigMa prompts (your next step)│
│     Or: Hand to developers for implementation               │
│     Or: Use as foundation for further refinement            │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Time Estimates

| Activity | Time Required | Note |
|----------|--------------|------|
| First-time setup understanding | 5-30 min | Depends on detail level desired |
| Running the script | 2 min | Interactive, validates paths |
| Claude processing | 5-10 min | Depends on input size |
| Validating output | 10-20 min | Review with checklist |
| **Total first run** | **22-62 min** | One-time investment |
| **Subsequent runs** | **7-12 min** | Just script + Claude + quick validation |

---

## 🎓 Learning Path

### Level 1: Quick Start (30 minutes)
1. Read: `QUICKSTART-structured-spec.md` (5 min)
2. Run script with defaults (2 min)
3. Use prompt in Claude (10 min)
4. Review output (10 min)
5. Validate with checklist (3 min)

### Level 2: Understanding (1 hour)
1. Complete Level 1
2. Read: `SYSTEM-SUMMARY.md` (20 min)
3. Study example comparisons (15 min)
4. Review validation checklist thoroughly (10 min)

### Level 3: Mastery (2 hours)
1. Complete Level 2
2. Read: `README-structured-spec-builder.md` (45 min)
3. Study advanced usage patterns (20 min)
4. Review template structure (15 min)
5. Understand script internals (10 min)

---

## 🆘 When Things Go Wrong

### Script Won't Run
**Check**: Node.js installed? → `node --version`
**Location**: Are you in `pmc/product/_tools/`?
**Read**: `QUICKSTART-structured-spec.md` → Common Issues

### Template Not Found
**Check**: File exists at `../product/_prompt_engineering/04c-build-structured-with-wirframe-spec_v1.md`
**Fix**: Template path is relative to script location
**Read**: `README-structured-spec-builder.md` → Troubleshooting

### Claude's Output Is Vague
**Problem**: Sections lack explicit integration points
**Fix**: Ask Claude to "expand with specific component names and exact API endpoints"
**Read**: `SYSTEM-SUMMARY.md` → Validation Checklist

### Too Many/Few Sections
**Problem**: Claude created 15 sections or only 2
**Fix**: Guide Claude: "Reorganize into 6-8 sections"
**Read**: `README-structured-spec-builder.md` → Troubleshooting → Too many/few sections

### Duplicate Functionality
**Problem**: Same feature in multiple sections
**Fix**: Ask Claude to remove duplication, keep in one section
**Read**: `SYSTEM-SUMMARY.md` → Progressive Building validation

---

## 📞 Support Resources

### Documentation Files (In Priority Order)
1. `QUICKSTART-structured-spec.md` - First stop for quick answers
2. `SYSTEM-SUMMARY.md` - Conceptual understanding and examples
3. `README-structured-spec-builder.md` - Comprehensive reference
4. This file - Navigation and quick reference

### Key Sections to Bookmark
- **Validation**: `SYSTEM-SUMMARY.md` → Validation Checklist
- **Troubleshooting**: `README-structured-spec-builder.md` → Troubleshooting
- **Examples**: `SYSTEM-SUMMARY.md` → What Makes This Special
- **Quick Commands**: `QUICKSTART-structured-spec.md` → Step 1

---

## 🎯 Success Criteria

You'll know the system is working when:

✅ Script runs without errors
✅ Generated prompt includes your file paths
✅ Claude produces 4-12 logical sections
✅ Each section has "Builds Upon" block (section 2+)
✅ Cross-references use exact names in backticks
✅ No functionality is duplicated across sections
✅ UI specs include layout diagrams
✅ APIs include complete schemas
✅ Database tables show relationships
✅ All validation checkboxes pass

If ANY of these fail, the output isn't ready. Use troubleshooting guides to fix specific issues.

---

## 🚀 Ready?

**Start here**: [`QUICKSTART-structured-spec.md`](./QUICKSTART-structured-spec.md)

Or run immediately:
```bash
cd pmc/product/_tools
node 04c-generate-structured-spec-prompt.js
```

Good luck! 🎉
