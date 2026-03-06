First read:

`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`
So you fully understand our current situation.

Then I need you to read the current spec we are working on described here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`

This golden test tool is a core quality control function, that must be developed and integrated with the production codebase.

So I have decided that we need to execute everything in that spec **INCLUDING** **ALL** the "deferred" or postponed features.
**ESPECIALLY** the following:

```
- **Embedding Run Selector:** Tag embeddings with `run_id` at ingestion time, add a dropdown to the test UI to select which run to evaluate. Requires schema change + `queryRAG` parameter additions.
- **Historical Report Storage:** Save test reports to the database for trend analysis across multiple test runs.

A full "run selector" added by tagging embeddings with a `batch_id` or `run_id` at ingestion time. 
```

Also we need to fully fix the other issues including:
1. The errors in the Vercel log no longer showing (we must not limit the ability of the system to diagnose future issues)
2. The text and download version of the tool report as described.

So the first thing I need you to do is create 
write a detailed, complete, accurate, precise, and comprehensive specification that will implement these requirements and code changes necessary to implement into our current codebase here:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

Make sure you have internalized the current codebase so your specification will properly be implemented into this code base.
Make sure you consider all of the code, function, and operations that will be touched by changing any Supabase tables and changing the code in the tool.
Do not break other functionality while implementing these changes.

e. SAOL: **ALL database operations MUST use SAOL.** Do not use raw `supabase-js` or PostgreSQL scripts directly.
Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

Write this detailed, complete, accurate, precise, and comprehensive specification here: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E09.md`
