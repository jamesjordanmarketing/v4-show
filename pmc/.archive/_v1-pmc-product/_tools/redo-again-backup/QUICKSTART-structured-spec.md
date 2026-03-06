# Quick Start: Progressive Structured Specification Builder

## 5-Minute Setup

### Step 1: Run the Script (30 seconds)
```bash
cd pmc/product/_tools
node 04c-generate-structured-spec-prompt.js
```

### Step 2: Answer Two Questions (1 minute)

**Question 1**: Where is your unstructured specification?
```
Default: ../mapping/pipeline/iteration-8-multi-chat-figma-conversion.md
Just press Enter to use default, or type your path
```

**Question 2**: Where should the structured output go?
```
Default: ../mapping/pipeline/lora-structured-spec-[timestamp].md
Just press Enter to use default, or type your path
```

### Step 3: Copy Generated Prompt (30 seconds)

Script outputs:
```
✅ Prompt saved to: pmc/product/_mapping/pipeline/_run-prompts/04c-build-structured-spec-prompt-[timestamp].md
```

Open that file and copy ALL contents.

### Step 4: Run in Claude (3-10 minutes)

1. Open Claude Sonnet 4.5 (200k context)
2. Paste the entire prompt
3. Wait for Claude to analyze and generate
4. Save Claude's output to the path from Step 2

### Step 5: Done! ✅

You now have a progressive, cumulative structured specification where:
- Each section explicitly builds on previous sections
- No functionality is duplicated
- All integrations are explicitly documented
- UI specifications are wireframe-ready
- API schemas are complete

---

## What You Get

### Input (Unstructured)
```markdown
# Big Technical Document

...3000 lines of mixed architecture, features, APIs, UI descriptions...
```

### Output (Structured)
```markdown
## Section 1: Foundation
- Component: `AuthContext`
- API: `POST /api/auth/login`
- Returns: `UserSession`

## Section 2: User Management
- Builds Upon: Section 1, `AuthContext`, `UserSession`
- NEW Component: `UserProfile`
- Uses: `UserSession` from Section 1
- API: `GET /api/users/:id` (NEW in this section)

## Section 3: Dashboard
- Builds Upon:
  - Section 1: `AuthContext` for authentication
  - Section 2: `UserProfile` component for display
- NEW Component: `Dashboard`
- Enhances: `UserProfile` (adds stats overlay)
- API: `GET /api/dashboard/stats` (calls Section 2's user API)
```

**Key Difference**: Every section explicitly states what it's using from previous sections and what's NEW.

---

## Common Issues & Fixes

### "Script can't find template"
```bash
# Ensure you're in the right directory
cd pmc/product/_tools

# Template should be at:
# pmc/product/_prompt_engineering/04c-build-structured-with-wirframe-spec_v1.md
```

### "File not found"
Use relative paths from `_tools/` directory:
- `../mapping/pipeline/your-file.md` ✅
- `C:\Users\james\Master\...\your-file.md` ✅
- `mapping/pipeline/your-file.md` ❌ (wrong)

### "Claude's output is vague"
Ask Claude:
> "Expand Section [N] with explicit component names, exact API endpoints, and specific references to previous sections using backticks"

---

## Validation Checklist

After Claude generates the structured spec, verify:

- [ ] Each section (2+) has "Builds Upon" listing specific items
- [ ] Cross-references use backticks: `ComponentName`, `apiEndpoint`
- [ ] No feature appears in multiple sections
- [ ] UI specs include layout, interactions, states
- [ ] APIs include request/response schemas
- [ ] Database schemas include relationships
- [ ] Each section adds clear NEW value

If any checkbox fails, ask Claude to fix that specific issue.

---

## Example Session

```
$ node 04c-generate-structured-spec-prompt.js

╔════════════════════════════════════════════════════════════╗
║   Progressive Structured Specification Prompt Generator    ║
╚════════════════════════════════════════════════════════════╝

Step 1: Locate Unstructured Specification
─────────────────────────────────────────

Enter path to unstructured specification:
Default: pmc/product/_mapping/pipeline/iteration-8-multi-chat-figma-conversion.md
Exists: TRUE
Path (press Enter for default): 
✓ Using unstructured spec: pmc/product/_mapping/pipeline/iteration-8-multi-chat-figma-conversion.md


Step 2: Choose Output Location for Structured Specification
──────────────────────────────────────────────────────────

Enter path where Claude will save the structured specification:
Default: pmc/product/_mapping/pipeline/lora-structured-spec-2025-12-19-16-30-15.md
Exists: FALSE
Path (press Enter for default): 
✓ Structured spec will be saved to: pmc/product/_mapping/pipeline/lora-structured-spec-2025-12-19-16-30-15.md


Step 3: Generate Prompt
───────────────────────
Prompt will be saved to: pmc/product/_mapping/pipeline/_run-prompts/04c-build-structured-spec-prompt-1734630615000.md

Loading template...
Replacing placeholders...
Saving prompt...

✅ Prompt saved to: pmc/product/_mapping/pipeline/_run-prompts/04c-build-structured-spec-prompt-1734630615000.md


╔════════════════════════════════════════════════════════════╗
║                    ✅ PROMPT GENERATED                      ║
╚════════════════════════════════════════════════════════════╝

📋 Summary:
─────────
Unstructured Input: pmc/product/_mapping/pipeline/iteration-8-multi-chat-figma-conversion.md
Output Destination: pmc/product/_mapping/pipeline/lora-structured-spec-2025-12-19-16-30-15.md
Generated Prompt:   pmc/product/_mapping/pipeline/_run-prompts/04c-build-structured-spec-prompt-1734630615000.md


📖 Next Steps:
─────────────
1. Open the generated prompt file:
   pmc/product/_mapping/pipeline/_run-prompts/04c-build-structured-spec-prompt-1734630615000.md

2. Copy the ENTIRE contents of the prompt file

3. Paste into Claude Sonnet 4.5 (200k context window)

4. Claude will analyze the unstructured spec and create
   a progressive, cumulative structured specification

5. Save Claude's output to:
   pmc/product/_mapping/pipeline/lora-structured-spec-2025-12-19-16-30-15.md
```

---

## That's It!

You're ready to transform any unstructured specification into a progressive, cumulative structured specification.

For detailed documentation, see: `README-structured-spec-builder.md`
