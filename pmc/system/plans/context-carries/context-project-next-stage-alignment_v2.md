# Next-Stage Alignment

You have just finished implementing **E[N]**. Before closing out, you need to update the next stage's execution prompt so the next agent can execute it successfully.

---

## Step 1: Read the Next Stage Prompt

Read the next stage execution prompt carefully:
`rag-frontier-execution-prompt-E[N+1]_v1.md`

## Step 2: Examine What You Actually Built

Look at everything you implemented in this session:
- The **files you created or modified** — exact exports, function signatures, type names
- The **patterns you followed** — imports, clients, error handling
- Any **corrections or deviations** from the spec you were given
- Any **environment details** you confirmed — env vars, installed packages, DB state
- Any **provider methods, interfaces, or types** the next stage will depend on
- Any **gotchas or things that broke** and how you fixed them

## Step 3: Write the Updated Next Stage Prompt

Write the corrected version to:
`rag-frontier-execution-prompt-E[N+1]_v2.md`

Make these specific updates:

1. **Prerequisites section** — Mark E[N] as ✅ complete. List exactly what was created with confirmed exports.
2. **Context section** — Update to reflect the real state of the codebase. Real function names, real type names, real import paths. No aspirational descriptions — only what actually exists now.
3. **Code blocks** — If the next stage's code references your outputs (imports, method calls, type usage), verify every reference is correct against what you actually built. Fix any mismatches.
4. **Provider/interface methods** — If you implemented methods the next stage will call, confirm the exact signatures and return types. Call out any differences from what the prompt assumed.
5. **Environment** — Note any env vars, packages, RPC functions, or DB state the next agent should know about.
6. **Notes for Agent section** — Add warnings about specific things that would have broken if you hadn't caught them. These are the most valuable part.
7. **Verification section** — Update to reflect realistic checks given the current codebase state.

### What NOT to Change

- Don't alter the next stage's core architecture or scope
- Don't add new features that weren't in the original prompt
- Don't remove tasks — only correct and clarify them
- Keep the same structure and section order
