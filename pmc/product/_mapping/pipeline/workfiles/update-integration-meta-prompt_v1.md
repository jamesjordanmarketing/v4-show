First read:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md` so you understand the current context.

Then do this analysis and work:

I asked another agent:
"I just want to build this as a new app module that sits alongside the existing code. Why is it not compatible?"

and read it's answer: 
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\why-incompatible-apps_v1.md`

So while I now know what we need to do to move forward with integration the answer another agent gave was based on this meta prompt template: 
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_prompt_engineering\04d-integrate-existing-codebase_v1.md`

Which was used by this script:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_tools\04d-generate-wireframe-integration-plan_v1.js`

to generate the personalized prompt: 
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\_run-prompts\04d-pipeline-integration-analysis_v1-build.md`

Then when I ran the personalized prompt it created these three files:

- 'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\_run-prompts\04d-integration-strategy_v1.md`
- 'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\_run-prompts\04d-implementation-deltas_v1.md`
- 'C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\_run-prompts\04d-codebase-discovery_v1.md`

This points out a major defect in our originating meta prompt: 
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_prompt_engineering\04d-integrate-existing-codebase_v1.md`

When I say "integrate" I really meant "build this as a new app module that sits alongside the existing code and has direct access to the objects, artifacts, and interfaces needed for the new pipeline module to function holistically. "

So I need you to write a new version of:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_prompt_engineering\04d-integrate-existing-codebase_v1.md` which adjusts the meta prompt, so the personalized prompt can do a proper analysis of how to integrate based on "sitting alongside with access to the objects, artifacts, and interfaces needed for the new pipeline module to function holistically. "
Write the new version of the meta prompt here:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_prompt_engineering\04d-integrate-existing-codebase_v2.md` 