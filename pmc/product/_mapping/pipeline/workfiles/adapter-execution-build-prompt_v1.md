## Task Overview

You are going to write the execution prompts which will implement the comprehensive specification for this module.
You have plenty of tokens and time. Do slow, step-by-step reasoning. First, deeply analyze this prompt then create a plan; then execute the plan carefully.

The comprehensive specification is here:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`

The task of this prompt is to convert the implementation specification into a well structured markdown execution plan with 5 distinct prompts which divide the work specified 
in:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md`
into 5 individual prompts in 5 individual files. The output prompts will be:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E01-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E02-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E03-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E04-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E05-execution-prompts.md`

C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\implement-pipeline\

## Background Files to Read

Read all of these:

Operational Background: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-training-application-interface_v1.md`

Also read and fully understand the SAOL tool here:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md` to update, modify, create, or delete any Supbase objects.


## Problem Description

You are writing the execution prompts which will implement the comprehensive specification for the Adapter Application module. 

The task of this prompt is to convert

- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\adapter-build-implementation-spec_v1.md` into well structured markdown execution prompts with 5 distinct prompts in 5 distinct files. 

I need you to build an execution plan from this specification using our Execution Plan Execution Standards & Protocols:

### Execution Plan Execution Standards & Protocols

1. **Include prompts** to submit to the `Claude-4.5-sonnet Thinking LLM` to execute the product build and coding changes.  
   - I must be able to cut and paste these prompts into a **200k Claude-4.5-sonnet Thinking context window in Cursor**.

2. Make sure you **do not leave any context or instructions outside of the prompts**.  
   The coding agent will only see what is in the prompt(s).

3. **Organize successive prompts** so that each one can be executed in a new 200k token context window.
Each subsequent prompt should build on the work of the previous prompt. Where possible include specific build artifacts which the previous prompt intended to be used by subsequent prompts.

4. **Avoid duplication.**  
   Do not include the same code/query/details outside the prompt sections if that information is already inside the prompts.

5. **Formatting requirement for copy-paste sections:**

   - At the **beginning** of any cut-and-paste Prompt block, insert:
     ```
     ========================    
     

     ```
   - At the **end** of any cut-and-paste Prompt block, insert:
     ```
     +++++++++++++++++
     
     
     
     ```
7. When you create this specification You **must** take into account the actual state of the database and code. This means before building this specification you must validate all assumptions and facts by reading the relevant codebase and database usage in: `C:\Users\james\Master\BrightHub\brun\train-data\src\`

8. Use this file: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\implement-pipeline\04f-pipeline-implement-section-E04-execution-prompts.md` as an example and a template of a good execution file.

9. **Create the final execution files here:**
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E01-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E02-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E03-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E04-execution-prompts.md`
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\adapter-app-build\04f-pipeline-implement-section-E05-execution-prompts.md`
