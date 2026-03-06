
I need you to build an execution plan from this specification using our Execution Plan Execution Instructions:

### Execution Plan Execution Instructions

1. Your job is to create the execution instructions to implement this specification in a sequence of [#] prompts, each of which will be submitted to a new contextless `Claude-4.5-sonnet Thinking LLM` chat that has zero other context than that in each execution prompt. 


This specification merits [#] prompts in specific unique sequential prompts.

2. **Include prompts** to submit to the `Claude-4.5-sonnet Thinking LLM` to execute the product build and coding changes.  
   - You must be able to cut and paste these prompts into a **200k Claude-4.5-sonnet Thinking context window in Cursor**.
   - The prompts must be directive.
   - The prompts must have all the context they need for each execution.

3. Make sure you **do not leave any context or instructions outside of the prompts**.  
   The building agent will only see what is in the prompt(s).

4. **Organize successive prompts** so that each one can be executed in a new 200k token context window.  
   Each should be modular — the next prompt should not need to finish the previous component.

5. **Avoid duplication.**  
   Do not include the same code/query/details outside the prompt sections if that information is already inside the prompts.

6. **Formatting requirement for copy-paste sections:**

   - At the **beginning** of any cut-and-paste block, insert:
     ```
     ========================     
     

     ```
   - At the **end** of any cut-and-paste block, insert:
     ```
     +++++++++++++++++
     
     
     
     ```
7. When you create this specification You **must** take into account the actual state of the database and code. This means before building this specification you must validate all assumptions and facts by reading the relevant codebase and database.

8. ## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

### Critical Rule

**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Use it as described in the SAOL section(s) here:
`C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-project-overview_v1.md`

Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

If you CANNOT access the database tables and schema with the SAOL library, this is a blocker and you must STOP and notify the user of the situation.


9. Use this file: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi\implement-multi\multi-input-and-scroll-execution-prompt-E08_v1.md` as an example and a template of a good execution file.
