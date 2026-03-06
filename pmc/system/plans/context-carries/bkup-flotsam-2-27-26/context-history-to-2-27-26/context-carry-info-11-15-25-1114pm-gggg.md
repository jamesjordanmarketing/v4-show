# Context Carryover: RAG Golden-Set Test Tool — E06/E07 Complete, E08 Specified

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Read the entire conversation transcript that led to this carryover
3. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. ✅ Read ALL specification documents listed in the "Important Documentation" section below
5. ✅ Understand the current RAG test tool state, the three live errors, and the E08 specification
6. ✅ **STOP and WAIT for explicit human instructions**

The human will provide specific directions on what to work on next. Do NOT assume or suggest implementations.

---

## 🎯 CURRENT STATUS: RAG Golden-Set Test Tool — E06/E07 Deployed & Working, E08 Spec Ready to Execute

### Session Summary (February 17, 2026)

**Primary Achievement**: The RAG golden-set regression test tool (E06 + E07) has been fully implemented and deployed. It is live and working on Vercel at `/rag/test`. The first real test run completed. Results were poor (expected — embeddings not yet upgraded) but three technical errors were identified in the Vercel logs. A comprehensive specification (E08) was written to address all three issues plus add a markdown export capability.

**Session Activities**:
1. ✅ Audited E07 implementation — confirmed the previous agent completed all changes before running out of tokens
2. ✅ TypeScript compilation verified clean (exit code 0) for `route.ts` and `page.tsx`
3. ✅ Human tested the golden-set tool live on Vercel — tool works end-to-end, 20 queries ran in 5 batches
4. ✅ Analyzed three recurring Vercel log errors from the live test run (`vercel-log-25.csv`)
5. ✅ Researched root causes of all three errors in the codebase
6. ✅ Wrote comprehensive E08 specification covering: embedding run visibility, markdown export, and all three error fixes

---

## 🧪 What Is the Golden-Set Test Tool?

The golden-set regression test tool evaluates the RAG pipeline against 20 fixed Q&A pairs from the canonical test document (Sun Chip Bank Policy Document). The tool lives at `/rag/test` and was built in three execution prompts:

- **E05** (spec): `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1.md`
- **E06** (implementation): `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E06.md`
- **E07** (batching fix): `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E07.md`
- **E08** (error fixes + export): `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`

### Current Test Tool Files (All Fully Implemented)

| File | Status | Purpose |
|------|--------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` | ✅ Complete (229 lines) | Types, 20 Q&A pairs (GS-001–GS-020), constants |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` | ✅ Complete (277 lines) | Preflight checks + per-query wrapper |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` | ✅ Complete (104 lines) | API route — accepts `batch` param (0–4), 4 queries per batch, `maxDuration=120` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx` | ✅ Complete (519 lines) | UI page — 5-batch loop, progress bar, client-side `computeSummary()`, result display |

### How the Test Tool Works (E07 Batching Architecture)

The original E06 tool ran all 20 queries in a single serverless invocation, exceeding Vercel's 300s limit. E07 fixed this with client-side batching:

```
Browser (page.tsx) loops 5 times:
  batch 0: POST /api/rag/test/golden-set { batch: 0 } → preflight + queries 1–4
  batch 1: POST /api/rag/test/golden-set { batch: 1 } → queries 5–8
  batch 2: POST /api/rag/test/golden-set { batch: 2 } → queries 9–12
  batch 3: POST /api/rag/test/golden-set { batch: 3 } → queries 13–16
  batch 4: POST /api/rag/test/golden-set { batch: 4 } → queries 17–20

Each batch: ≤4 queries × ~25s max = ~100s, well within 120s maxDuration
After all 5 batches: computeSummary() runs client-side from accumulated results
```

### Golden-Set Question Set

The 20 golden questions target the canonical test document:
- **Canonical Document ID**: `ceff906e-968a-416f-90a6-df2422519d2b`
- **Document**: Sun Chip Bank Policy Document (`.md` file)
- **Difficulty**: 5 easy (direct lookup), 8 medium (rule + exception), 7 hard (synthesis/comparison)
- **Pass threshold**: ≥85% pass rate (17/20 questions)
- **Pass logic**: Response text contains `expectedAnswer` substring (case-insensitive)

---

## 🚨 THREE LIVE ERRORS (From `vercel-log-25.csv`)

Every single test run produces three recurring errors. These are the subject of E08.

### Error A — `search_rag_text` UNION ORDER BY Bug (severity: ERROR)

```
[RAG Embedding] Error in text search: {
  code: '0A000',
  details: 'Only result column names can be used, not expressions or functions.',
  hint: 'Add the expression/function to every SELECT, or move the UNION into a FROM clause.',
  message: 'invalid UNION/INTERSECT/EXCEPT ORDER BY clause'
}
```

**Root Cause**: The `search_rag_text` PostgreSQL function (defined in `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\002-multi-doc-search.js`, line 128) uses `ORDER BY rank DESC` on a `UNION ALL`. PostgreSQL does not allow `ORDER BY <alias>` on `UNION ALL` — it must use column position (`ORDER BY 5 DESC`).

**Impact**: The BM25 keyword text search leg of hybrid retrieval silently fails on every query. All queries fall back to vector-only search. This significantly reduces retrieval quality.

**Code Location**: 
- RPC function definition: `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\002-multi-doc-search.js` lines 91–131
- App call site: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts` lines 186–230 (`searchTextContent()` function, calls RPC `search_rag_text`)

**Fix**: Create migration `003-fix-text-search-order.js` using SAOL that replaces the function with `ORDER BY 5 DESC`.

---

### Error B — `parseJsonResponse` Cosmetic Log Noise (severity: INFO but looks like error)

```
[parseJsonResponse] Direct parse failed (generateResponse): Unexpected token '`', "```json
{
"... is not valid JSON
```

**Root Cause**: Claude wraps JSON responses in `` ```json ... ``` `` markdown fences. The `parseJsonResponse()` function in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` (line ~44) tries `JSON.parse()` directly first, fails on the backtick character, logs this failure via `console.log()`, then succeeds on the fallback brace/bracket extraction.

**Impact**: Pure cosmetic noise. The fallback parser handles the markdown fence case correctly 100% of the time. The `console.log` creates misleading entries in Vercel's log viewer making operators think something is broken when it isn't.

**Code Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts`, `parseJsonResponse<T>()` function, approximately lines 37–100. The noisy log is the `console.log` inside the first `catch` block (~line 47).

**Fix**: Remove the `console.log` from the first `catch` block. The second `catch` (line ~85) already has comprehensive error logging if the fallback also fails.

---

### Error C — Reranking Parse Fallback (severity: WARNING)

```
[RAG Retrieval] Reranking: Could not parse ranking, using original order
```

**Root Cause**: The `rerankWithClaude()` function in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` (lines 289–340) uses regex `/\[[\d,\s]+\]/` to extract a ranked integer array from Claude's response. This regex is too narrow — it fails if Claude includes any tab characters, newlines, or brief explanatory text alongside the array.

**Impact**: Reranking silently falls back to original similarity-score ordering for every query. Result quality is lower because the reranking step (which uses semantic relevance, not just embedding similarity) is never actually applied.

**Code Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts`, `rerankWithClaude()` function, lines 289–340. The problematic regex match is at line ~315.

**Fix**: Replace single-strategy regex with three-strategy extraction (regex → fence extraction → bracket boundary), plus validate parsed indices are within bounds.

---

## 📝 E08 Specification Summary

The full detailed E08 spec is at:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`

### E08 Change Summary (6 Changes, 2 New Files, 4 Modified Files)

| # | Change | File(s) | Action |
|---|--------|---------|--------|
| 1 | Enhanced preflight shows embedding timestamp range | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` | Modify |
| 2 | Markdown report generation API endpoint | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\report\route.ts` | **Create** |
| 3 | "Download Report (.md)" button in test UI | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx` | Modify |
| 4 | Fix `search_rag_text` UNION ORDER BY bug | `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\003-fix-text-search-order.js` | **Create** |
| 5 | Suppress `parseJsonResponse` log noise | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` | Modify |
| 6 | Improve reranking parse robustness | `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | Modify |

### Issue 1 — Embedding Run Selection (Answered & Deferred)

The test tool selects embeddings by `document_id` only via `queryRAG({ documentId })` → `searchSimilarEmbeddings({ documentId })` → RPC `match_rag_embeddings_kb(filter_document_id)`. There is NO parameter to filter by a specific embedding run, batch ID, or ingestion timestamp. All embeddings ever generated for the document are searched together.

The E08 decision: **Do NOT add a run selector now** (requires schema changes to `rag_embeddings`, `queryRAG`, and the RPC function). Instead, add **timestamp range visibility** to the preflight check so operators can see: "You are testing embeddings created between X and Y."

A full embedding run selector is deferred to a future spec requiring:
- `batch_id` column on `rag_embeddings` table
- Pass `batch_id` filter through `queryRAG` → `searchSimilarEmbeddings` → `match_rag_embeddings_kb`
- Dropdown in test UI to select from available embedding runs

### Issue 2 — Markdown Export (E08 Change 2 + 3)

App-wide copy-text is blocked by an architectural limitation. E08 solves this for the test tool specifically:
- New API `POST /api/rag/test/golden-set/report` accepts `TestRunSummary` JSON, returns plain `.md` file
- "Download Report (.md)" button in `SummaryCard` component triggers a browser download
- Report is structured Markdown with: summary table, difficulty breakdown, preflight checks, results grouped by status (errored / failed / passed), per-result diagnostics

---

## 🏗 RAG Retrieval Pipeline Architecture (For Next Agent)

### Query Flow

```
queryRAG({ queryText, documentId, userId, mode: 'rag_only' })
  ├── Lookup knowledgeBaseId from rag_documents
  ├── Fetch document summary for HyDE context
  ├── Load last 3 Q&A pairs for conversation context
  ├── generateHyDE() → hypothetical answer embedding
  ├── retrieveContext()
  │     ├── searchSimilarEmbeddings(tier=2, sections) → match_rag_embeddings_kb RPC
  │     ├── searchSimilarEmbeddings(tier=3, facts)    → match_rag_embeddings_kb RPC
  │     └── searchTextContent()                        → search_rag_text RPC ← ERROR A here
  ├── rerankWithClaude() ← ERROR C here (regex too narrow)
  ├── deduplication + multi-doc balance
  ├── generateResponse() → Claude ✅ (with markdown-fence JSON ← ERROR B logged here)
  ├── selfEvaluate()
  └── Store query in rag_queries table
```

### Key Service Files

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | Main `queryRAG()` function (922 lines), `rerankWithClaude()`, `retrieveContext()` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts` | `searchSimilarEmbeddings()`, `searchTextContent()` — hybrid retrieval (289 lines) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` | All Claude LLM calls: `readDocument`, `generateResponse`, `selfEvaluate`, `generateHyDE`, `rerankWithClaude`, `parseJsonResponse` (920 lines) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` | `processDocument()` pipeline — runs in Inngest (545 lines) |

### RPC Functions in Supabase

| RPC | Purpose | Status |
|-----|---------|--------|
| `match_rag_embeddings_kb` | Vector similarity search (pgvector `<=>`) | ✅ Working |
| `search_rag_text` | BM25 keyword text search | ❌ Bug: `ORDER BY rank DESC` fails on UNION ALL |

---

## 📋 Important Documentation

### Golden-Set Test Tool Specs (CURRENT WORK)

1. **E05 (original spec)**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1.md`
2. **E06 (base implementation)**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E06.md`
3. **E07 (batching fix)**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E07.md`
4. **E08 (error fixes + export) — READY TO EXECUTE**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`

### RAG Multi-Ingestion Upgrade Specs (Parent Work Stream)

- `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1.md` — The E05 spec that defined this whole test tool work stream
- `C:\Users\james\Master\BrightHub\BRun\v4-show\docs\E07_IMPLEMENTATION_COMPLETE.md` — E07 implementation record

### Prior Bug Fix Documentation

5. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md`** — Bugs #1–#12 root cause analysis
6. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`** — Bug #13 (retrieval improvement, hierarchical chunking)
7. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`** — Inngest migration specification
8. **`C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md`** — Inngest implementation summary

### Test Data Files

- **Vercel log from E08 analysis**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\vercel-log-25.csv`
  - Captures the first live golden-set test run
  - Shows all three recurring errors per query
  - 5 batch invocations, ~4 queries each
  - Self-eval scores: mostly 0.15 and 0.35 (poor — expected with unupgraded embeddings)
  - One 0.85 PASS on "wire transfer cutoff times" (GS-003)

- **Canonical test document**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\Sun-Chip-Bank-Policy-Document-v2.0.md`
  - The document whose embeddings are tested
  - Document DB ID: `ceff906e-968a-416f-90a6-df2422519d2b`
  - Contains tables (Human Capital), policy exceptions (DTI 45%), rules (eligibility criteria)

---

## 🔄 Current State & Next Steps

### What Is Working (February 17, 2026)

- ✅ Golden-set test tool live at `/rag/test` on Vercel
- ✅ Client-side batching: 5 batches × 4 queries, each batch safely within 120s timeout
- ✅ Batch progress bar with live query count
- ✅ Preflight checks (document exists, embeddings exist, RPC callable, API keys present)
- ✅ All 20 questions run end-to-end without timeout
- ✅ Results display: per-question pass/fail, self-eval score, diagnostics expandable
- ✅ Summary card: pass rate, breakdown by difficulty, avg response time
- ✅ Diagnostics tab: error phase breakdown for failed queries
- ✅ TypeScript compilation clean (verified)
- ✅ Vercel deployment from `main` branch on push

### What Needs Fixing (E08 — Ready to Execute)

Three errors occur on every single test run query:

| Error | File to Modify | Severity of Impact |
|-------|---------------|-------------------|
| `search_rag_text` ORDER BY bug | Run SAOL migration `003-fix-text-search-order.js` | HIGH — BM25 text search completely broken |
| `parseJsonResponse` log noise | `claude-llm-provider.ts` line ~47 | LOW — cosmetic only |
| Reranking regex too narrow | `rag-retrieval-service.ts` `rerankWithClaude()` line ~315 | MEDIUM — reranking never applies |

Full specification with exact pseudocode, line numbers, and file paths:
`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`

### E08 Execution Order (per spec)

1. **Change 5** — Suppress `parseJsonResponse` log noise in `claude-llm-provider.ts` (smallest, safest)
2. **Change 6** — Improve reranking parse in `rag-retrieval-service.ts` (`rerankWithClaude`)
3. **Change 4** — Run SAOL migration `003-fix-text-search-order.js` (database change, run manually)
4. **Change 1** — Enhance embedding timestamp detail in `test-diagnostics.ts` preflight
5. **Change 2** — Create markdown report API `src/app/api/rag/test/golden-set/report/route.ts`
6. **Change 3** — Add "Download Report" button to `page.tsx` `SummaryCard`

### What Comes After E08 (WAIT FOR HUMAN DIRECTION)

- **Re-test scores**: After fixing the text search bug, re-run the golden-set tool — scores should improve somewhat since BM25 hybrid retrieval will now work
- **Embedding upgrade**: The primary reason for poor scores is that embeddings were generated with the old (pre-multi-ingestion-upgrade) pipeline. The multi-ingestion upgrade (earlier work stream) generates richer, more structured embeddings. Once the canonical document is re-embedded with the new pipeline, the golden-set tool can evaluate whether the new embeddings actually improve scores.
- **Score target**: ≥85% pass rate (17/20 questions), measured purely by substring match + self-eval

---

## 📂 Files Modified / Created in This Session (February 17, 2026)

### Files Verified As Complete (No Changes Needed)

| File | Lines | Verified |
|------|-------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts` | 229 | ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` | 277 | ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts` | 104 | ✅ |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx` | 519 | ✅ |

### Spec Files Created This Session

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md` | Full E08 specification — 6 changes, ready to execute |

### RAG Pipeline Files That E08 Will Modify

| File | E08 Change | Current State |
|------|-----------|---------------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts` | Add timestamp range to embedding preflight detail | ✅ Working, minor enhancement |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` | Remove noisy `console.log` from first parse catch | ✅ Working, cosmetic fix |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | Replace narrow regex with 3-strategy JSON extraction in `rerankWithClaude()` | ✅ Working but reranking silently falls back |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts` | No app code changes — fix is in DB function | ❌ Calls broken `search_rag_text` RPC |

### Files That E08 Will Create

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\scripts\migrations\003-fix-text-search-order.js` | SAOL migration: replace `search_rag_text` function with `ORDER BY 5 DESC` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\report\route.ts` | New API endpoint to generate `.md` report from `TestRunSummary` |

---

## 🔍 Supabase Agent Ops Library (SAOL) Quick Reference

**Version:** 2.1 (Bug Fixes Applied - December 6, 2025)

### Setup & Usage

**Installation**: Already available in project
```bash
# SAOL is installed and configured
# Located in supa-agent-ops/ directory
```

**CRITICAL: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases for you.

**Library Path:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops`
**Quick Start:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\QUICK_START.md` (READ THIS FIRST)
**Troubleshooting:** `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\TROUBLESHOOTING.md`

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query conversation turns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'conversation_turns',select:'*',limit:5});console.log('Turns:',r.data.length);console.log(JSON.stringify(r.data,null,2));})();"

# Query multi-turn conversations
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'multi_turn_conversations',select:'*',orderBy:[{column:'created_at',asc:false}],limit:10});console.log('Conversations:',r.data.length);})();"

# Introspect schema
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'conversation_turns',includeColumns:true,transport:'pg'});console.log('Columns:',r.tables[0]?.columns?.length);})();"
```

---

## 📋 Project Functional Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment process for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw (minimal) and enriched (complete) JSON formats
6. **LoRA Training Pipeline** (SECTIONS E01-E04 COMPLETE):
   - **Section E01 (COMPLETE)**: Database foundation (4 tables, RLS policies, types)
   - **Section E02 (COMPLETE)**: API routes (engines, jobs, datasets, hyperparameters)
   - **Section E03 (COMPLETE)**: UI components (dashboard, wizard, monitoring, evaluation)
   - **Section E04 (COMPLETE)**: Training engine & evaluation system (Claude-as-Judge)
7. **Adapter Download System** (COMPLETE):
   - Download trained adapter files as tar.gz archives
   - On-demand generation (no URL expiry)
   - Intelligent handling of file vs folder storage formats
8. **Manual Adapter Testing** (COMPLETE):
   - Deployed adapter to RunPod text-generation-webui
   - Validated emotional intelligence training effectiveness
   - Documented A/B comparison results
9. **Automated Adapter Testing System** (DUAL-MODE ARCHITECTURE):
   - **Pods Mode** (CURRENT): RunPod Pods with direct vLLM OpenAI API ✅ WORKING
   - **Serverless Mode** (PRESERVED): RunPod Serverless with wrapper format ⚠️ (truncation bug)
   - **A/B testing interface** with side-by-side comparison
   - **Claude-as-Judge evaluation** with detailed metrics
   - **User rating system** and test history
   - **Real-time status updates** with polling
   - **Easy mode switching** via environment variable
10. **Multi-Turn Chat Testing System** (E01-E10 COMPLETE):
    - **Multi-turn conversation management** (up to 10 turns)
    - **Dual A/B response generation** (Control vs Adapted in parallel)
    - **Dual user input fields** (separate prompts for Control vs Adapted)
    - **Response Quality Evaluator (RQE)** with 6 EI dimensions + PAI
    - **Conversation history** maintained per endpoint (siloed)
    - **Dual progress bars** showing Control vs Adapted progression
    - **Winner declaration** with three-signal logic (PAI > RQS > Pairwise)
    - **First turn evaluation** with RQE (no longer baseline)
    - **Internal response scrolling** for long outputs
    - **Page-wide scrolling** for full conversation history
    - **Token tracking** per conversation
    - ⚠️ **Response truncation bug** on serverless endpoint (vLLM v0.15.0)
11. **RAG Frontier** (E09 IMPLEMENTED, ✅ FULLY OPERATIONAL AFTER 15 BUG FIXES + INNGEST MIGRATION):
    - **Knowledge base management**: Create/list knowledge bases
    - **Document upload**: Upload .md, .txt, .pdf files to knowledge base
    - **Document processing pipeline**: Claude LLM extracts sections, facts, entities, expert questions
      - ✅ Now extracts 50-150 facts including each table row, exception, and rule
      - ✅ Hierarchical chunking for structured data
      - ✅ Enhanced with specific extraction instructions for tables/exceptions/rules
    - **Embedding generation**: OpenAI embeddings for 3-tier search
    - **Expert Q&A flow**: Knowledge refinement via expert answers
    - **Retrieval pipeline**: HyDE + self-evaluation + quality scoring
      - ✅ Lowered similarity threshold from 0.5 → 0.4 for better recall
    - **Inngest integration**: Background job processing with unlimited execution time
      - ✅ Handles 32K token Claude responses (up to 20 minutes)
      - ✅ Automatic retries, observability, logging
    - **Diagnostic tools**: Incremental testing UI for Claude API connectivity
    - **Golden-Set Regression Test Tool** (E06+E07 COMPLETE, E08 IN SPEC):
      - ✅ 20 Q&A pairs evaluated against canonical document
      - ✅ 5-batch client-side architecture (no Vercel timeouts)
      - ✅ Preflight checks, per-query diagnostics, summary + breakdown
      - ⚠️ 3 errors to fix in E08: text search SQL bug, log noise, reranking regex
    - ✅ **16 BUGS FIXED** (Bugs #1–#16 from prior sessions)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector extension for embeddings
- **Storage**: Supabase Storage (buckets: conversation-files, training-files, lora-datasets, lora-models, rag-documents)
- **AI**: 
  - Claude API (Anthropic) - `claude-sonnet-4-20250514` (for evaluation)
  - Claude API (Anthropic) - `claude-sonnet-4-5-20250929` (for conversation generation)
  - Claude API (Anthropic) - `claude-haiku-4-5-20251001` (for RAG document understanding, default)
  - OpenAI API - `text-embedding-3-small` (for RAG embeddings)
- **Background Jobs**: Inngest (for RAG document processing with unlimited execution time)
- **UI**: Shadcn/UI + Tailwind CSS
- **State Management**: React Query v5 (TanStack Query)
- **Deployment**: Vercel (frontend + API routes) — **Pro plan** (300s max function timeout, but Inngest used for longer tasks)
- **GPU Training**: RunPod Serverless (endpoint: `ei82ickpenoqlp`)
- **Training Framework**: Transformers + PEFT + TRL 0.16+ + bitsandbytes (QLoRA 4-bit)
- **Inference**: 
  - **Pods** (current): 2x RunPod Pods with vLLM v0.14.0 (control + adapted) ✅ WORKING
  - **Serverless** (preserved): RunPod Serverless vLLM v0.15.0 (endpoint: `780tauhj7c126b`) ⚠️ TRUNCATION BUG
- **Adapter Storage**: HuggingFace Hub (public repositories) + Supabase Storage
- **Testing Environment**: RunPod Pods (for manual testing when needed)

### Database Schema Overview

**Core Tables** (Existing - Legacy System):
- `conversations` - Conversation metadata and status
- `training_files` - Aggregated training file metadata
- `training_file_conversations` - Junction table linking conversations to training files
- `personas` - Client personality profiles
- `emotional_arcs` - Emotional progression patterns
- `training_topics` - Subject matter configuration
- `prompt_templates` - Generation templates (IMPORTANT: contains emotional arc definitions)
- `batch_jobs` - Batch generation job tracking
- `batch_items` - Individual items in batch jobs
- `failed_generations` - Failed generation error records

**Pipeline Tables** (Sections E01-E04):
- `pipeline_training_engines` - Training engine configurations
- `pipeline_training_jobs` - Pipeline job tracking
- `pipeline_evaluation_runs` - Evaluation run metadata
- `pipeline_evaluation_results` - Individual scenario evaluation results

**Inference Tables** (E01 - CREATED & DEPLOYED):
- `pipeline_inference_endpoints` - Endpoint tracking (Control + Adapted)
- `pipeline_test_results` - A/B test history with evaluations and ratings
- `base_models` - Model registry (Mistral-7B, Qwen-32B, DeepSeek-32B, Llama-3)

**Evaluator Tables** (CREATED):
- `evaluation_prompts` - Evaluation prompt templates (response_quality_multi_turn_v1, response_quality_pairwise_v1)

**Multi-Turn Tables** (E01-E10 CREATED):
- `multi_turn_conversations` - Conversation metadata (12 columns)
- `conversation_turns` - Turn data (24+ columns including dual user messages, dual arc progression, RQE evaluations)

**RAG Tables** (E09 CREATED):
- `rag_knowledge_bases` - Knowledge base containers
- `rag_documents` - Document metadata and processing status
- `rag_sections` - Extracted document sections
- `rag_facts` - Extracted atomic facts (including `table_row`, `policy_exception`, `policy_rule` types)
- `rag_expert_questions` - Expert questions for knowledge refinement
- `rag_embeddings` - Vector embeddings for search (using pgvector `vector(1536)` type)
- `rag_queries` - Query history with `knowledge_base_id` constraint

**PostgreSQL Functions** (RAG):
- `match_rag_embeddings_kb(vector(1536), float, int, uuid, uuid, int)` — Vector similarity search ✅ Working
- `search_rag_text(text, uuid, uuid, int)` — BM25 keyword search ❌ ORDER BY bug (E08 fixes this)

---

## 🚫 Final Reminder

**DO NOT start implementing, fixing, or designing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Read the entire transcript of the conversation that led to this carryover
3. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. ✅ Read the E08 specification in full:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`
5. ✅ Read the golden-set test tool files:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\golden-set-definitions.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\testing\test-diagnostics.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\test\golden-set\route.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\(dashboard)\rag\test\page.tsx`
6. ✅ Read the RAG pipeline files that E08 will modify:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-embedding-service.ts`
7. ✅ Read the Vercel error log: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\vercel-log-25.csv`
8. ✅ **WAIT** for human to provide explicit instructions

The human will direct you on what to work on next. This could be:
- Executing E08 (implementing the 6 changes + running the DB migration)
- Something completely different

**Do not assume. Do not start writing code. Wait for instructions.**

---

**Last Updated**: February 17, 2026
**Session Focus**: Golden-set test tool live testing — errors diagnosed, E08 specification written
**Current Mode**: RAG regression testing — tool working, 3 errors identified and fully specified
**Document Version**: context-carry-info-11-15-25-1114pm-gggg
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Build Status**: ✅ TypeScript compilation clean (exit code 0)
**Latest Git**: `git push` successful (exit code 0), `main` branch, Vercel auto-deployed
**Tool Status**: ✅ `/rag/test` live and working on Vercel — 5-batch architecture, 20 queries, preflight, results
**First Test Results**: Poor scores (expected — old embeddings) | 3 errors per query | Full run completed without timeout
**Next Spec to Execute**: E08 — `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\013-rag-multi-ingestion-upgrade-execution-promptE05_v2-golden-test-tool_v1-execution-E08.md`
