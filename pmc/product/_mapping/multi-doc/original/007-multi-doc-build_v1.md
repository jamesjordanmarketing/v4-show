ok. so now we have the full specification details, all questions answered, all dimensions organized and defined, and the context prompts for the llm engineering.

Next we must take all of this information and write up one final specification for the that will take everything we have documented int the files below.

First read the foundational documentations for this project:
I need you to read the product overview here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

and then read the current Frontier RAg module overview here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\004-rag-frontier-overview_v1.md`
and read the approved decisions made and answers doc here. 
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\006-rag-frontier-questions_v1.md`

Now I need you to generate a final specification that the coding agent will use to develop this module.
This task is to write a detailed specification of how to build this functionality into the current functioning codebase.

Make sure you have deeply internalized the current codebase: 
**Primary Source:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`

Ok please create the detailed, accurate, precise, and comprehensive build specification and put it here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-spec_v1.md`

You can use: `C:\Users\james\Master\BrightHub\brun\multi-chat\pmc\product\_mapping\pipeline\archive\04e-pipeline-integrated-extension-spec_v1-full.md` as an example of effective specification.

Make sure that any steps that a human must take are clearly delineated and easy to cut/paste without interpreting many different sections. Human steps should also be easy to see in the document.

---
## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied)

### Critical Rules

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Use it as described in the SAOL section(s) here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

7. When you create this specification You **must** take into account the actual state of the database and code. This means before building this specification you must validate all assumptions and facts by reading the relevant codebase and database.
