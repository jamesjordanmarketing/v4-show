Ok now you are going to read and use both documents:

`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-RQE-framework-E11c_v1.md`
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-refactor-E11_v1.md`

to write a detailed, complete, accurate, precise, and comprehensive specification that will implement the new evaluator prompts and code changes that is implementable into our current codebase here:
- `C:\Users\james\Master\BrightHub\BRun\lora-pipeline\src`

The new evaluator option on `/pipeline/jobs/[id]/test` will:
a. be called `response_quality_multi_turn_v1` and it will **REPLACE** the Multi Turn Arc Aware Evaluator v1 option

b. it will measure the model's responses (including the 1st turn) as per the specification here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-RQE-framework-E11c_v1.md`

c. If a new JSON or updated JSON spec is updated describe that carefully.

d. Make sure you have internalized the current codebase so your specification will properly be implemented into this code base.

e. SAOL: **ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

Write this detailed, complete, accurate, precise, and comprehensive specification here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\arc-measurement-multi-turn-claude-as-judge-RQE-build-spec-E11_v1.md`