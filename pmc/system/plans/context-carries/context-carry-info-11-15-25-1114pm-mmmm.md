# Context Carryover: Self-Evaluation Fix for LoRA+RAG Mode — Round 6

## CRITICAL INSTRUCTION FOR NEXT AGENT

**Your job upon receiving this context is to:**
1. Read and internalize this document fully
2. Read the full specification: `pmc\product\_mapping\v2-mods\008-rag-module-QA_v5.md`
3. Execute **Fix A** (Context Parity) and **Fix B** (Mode-Aware Self-Evaluation) as specified in that document
4. Verify TypeScript compiles clean
5. Deploy to Vercel
6. Retest Q4 (Bitcoin/custody/duress) in `rag_and_lora` mode — expect score ≥ 0.55 with amber badge
7. Retest Q1 (margin call) in `rag_and_lora` mode — expect no regression from 0.92
8. Retest Q4 in `rag_only` mode — expect no regression from 0.92
9. Use SAOL for all database operations (see 🚨 CRITICAL section below)

---

## CURRENT STATUS: Round 6 — Self-Evaluation Prompt Unfairly Penalizes LoRA Responses

### What Was Accomplished in This Chat Session (February 21, 2026)

This session involved **two phases** of successful work plus specification of the next fix:

#### Phase 1: Context Overflow Fix (Round 5 Resolution) — COMPLETED ✅

The LoRA endpoint was failing with context overflow errors (29,086 tokens sent to a 16,384-token model). This was diagnosed and fixed with a combined approach:

**Changes made to `src/lib/rag/config.ts`:**
- Added `loraMaxContextTokens: 13836` to `RAG_CONFIG.retrieval` — reserves ~2,048 for model response + ~500 for system prompt out of the 16,384 token context window.

**Changes made to `src/lib/rag/services/rag-retrieval-service.ts`:**
1. **`assembleMultiHopContext()`** — Complete rewrite with budget-aware assembly:
   - Added optional `maxTokens` parameter
   - Sections emitted in round-robin order across documents (balanced truncation)
   - Each doc's sections pre-sorted by similarity descending (highest quality survives)
   - 85% of budget → sections, 15% → facts
   - Console logs token usage for debugging
2. **`generateLoRAResponse()`** — Added defense-in-depth pre-flight truncation:
   - Checks `assembledContext` against `loraMaxContextTokens` before building prompt
   - If over budget, hard-truncates at character level, then cuts at last `\n####` section boundary
   - Logs warnings when truncation occurs
3. **Multi-hop call site** — When `mode === 'rag_and_lora'`, passes `maxTokens: RAG_CONFIG.retrieval.loraMaxContextTokens` to `assembleMultiHopContext()`. Claude mode gets `undefined` (unlimited).

**Verification:** User deployed to Vercel (`dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa`) and ran Q4 (Bitcoin query) in `rag_and_lora` mode — **LoRA inference succeeded** for the first time on a multi-doc comparative query.

Vercel-55 log confirmed the budget system worked:
```
[assembleMultiHopContext] Truncated sections to fit 13836 token budget (used ~11752 for sections)
[assembleMultiHopContext] Truncated facts to fit budget
[assembleMultiHopContext] Assembled ~13785 tokens (budget: 13836)
[LoRA-INFERENCE] Context too large (13785 tokens), truncating to ~13536 tokens for 16k LoRA window
[LoRA-INFERENCE] Truncated context to ~10937 tokens
[LoRA-INFERENCE] Calling endpoint for job 6fd5ac79, mode=rag_and_lora
✅ Attempt 1 SUCCEEDED, responseLength: 1735, tokensUsed: 382
```

#### Phase 2: Self-Evaluation Bug Diagnosis — COMPLETED ✅

Although the LoRA inference succeeded, the self-evaluation scored the response **0.15** (FAIL), while the **identical query** in `rag_only` mode scores **0.92** (PASS). The LoRA response was substantively correct but got the red "I couldn't find a confident answer" badge in the UI.

**Root cause analysis identified three problems:**

**Problem A — Context Asymmetry (Critical):** `selfEvaluate()` receives the full 13,785-token multi-hop context, but `generateLoRAResponse()` further truncated it to ~10,937 tokens. The evaluator judges the LoRA against evidence the LoRA never saw → guaranteed incompleteness penalty.

**Problem B — Format Expectations:** The self-eval prompt checks for `## From:` headers. Claude produces these; LoRA produces conversational paragraphs that mention bank names inline. The 0.92-scoring LoRA margin call response had `## From:` headers (format match). The 0.15-scoring Bitcoin response didn't. The evaluator is format-sensitive, not content-sensitive.

**Problem C — Hallucination Over-Detection:** The LoRA said "Moon Banc does not hold Bitcoin offline" — a factual error caused by the Alpine Vault section being truncated away. The evaluator gave 0.15 (catastrophic hallucination band) for one incorrect claim, ignoring that LTV ratios and duress protection were correctly addressed.

**Full specification written to:** `pmc\product\_mapping\v2-mods\008-rag-module-QA_v5.md`

---

## Next Action: Execute Fixes A and B from QA_v5 Specification

### SPECIFICATION TO EXECUTE

**Read this document first:** `pmc\product\_mapping\v2-mods\008-rag-module-QA_v5.md`

It contains the complete, precise specification for two fixes:

### Fix A — Context Parity (Section 4.1)

`generateLoRAResponse()` must return `effectiveContext` (the post-truncation context) so the caller passes **that** to `selfEvaluate()` instead of the pre-truncation context.

**Changes required:**
1. Update `generateLoRAResponse()` return type to include `effectiveContext: string | null`
2. Return `effectiveContext: assembledContext` (the truncated version) from all return paths
3. Update multi-hop call site: use `effectiveContext` for `selfEvaluate()` and `assembled_context` DB field
4. Update standard-path call site: override `assembledContext` when `effectiveContext` is returned

### Fix B — Mode-Aware Self-Evaluation Prompt (Section 4.2)

Add `mode` parameter to `selfEvaluate()` and use mode-aware evaluation prompt.

**Changes required:**
1. Add `mode?: RAGQueryMode` to `selfEvaluate()` in `rag-retrieval-service.ts`
2. Add `mode?: string` to `selfEvaluate()` in `claude-llm-provider.ts`
3. Implement mode-aware prompt branching (detailed prompt template in spec Section 4.2.3)
4. Update all `selfEvaluate()` call sites to pass `mode`

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` | `generateLoRAResponse()` return type, `selfEvaluate()` mode param, 3 call site updates |
| `src/lib/rag/providers/claude-llm-provider.ts` | `selfEvaluate()` mode-aware prompt branching |

### Expected Outcomes After Fix

| Mode | Query | Current Score | Expected Score |
|------|-------|--------------|----------------|
| `rag_and_lora` | Bitcoin / custody / duress | 0.15 | 0.55–0.70 (amber badge) |
| `rag_and_lora` | Margin call | 0.92 | 0.92 (no regression) |
| `rag_only` | All queries | 0.92 | 0.92 (no regression) |

### Test Queries for Validation

**Q4 — Bitcoin / Custody / Duress (Primary test):**
```
With the global banking system collapsing, I need to move a massive portion of my wealth into Bitcoin immediately, but I am terrified of getting hacked! Will you hold my Bitcoin completely offline for me, and if so, exactly what maximum percentage can I borrow against it? Also, what happens if someone physically kidnaps me and forces me to scan my hand on my biometric tablet to sign a transfer against my will?!
```

**Q1 — Margin Call (Regression test):**
```
My broker just called and said my global equities took a massive hit and I'm facing a margin call. What is the exact maximum loan-to-value ratio allowed for equities, at what specific percentage does the margin call trigger, and exactly how many hours do I have to add more collateral before forced liquidation?
```

---

## Complete Test Results Summary (All Rounds)

| # | Deployment | Mode | Query | LoRA Called? | Score | Result |
|---|---|---|---|---|---|---|
| R4-1 | `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM` | rag_only | Bitcoin | N/A | 0.92 | ✅ PASS (Claude) |
| R4-2 | `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM` | rag_only | Bitcoin | N/A | 0.92 | ✅ PASS (Claude) |
| R5-1 | `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH` | rag_and_lora | Margin call | ✅ YES | 0.00 | ❌ FAIL (29,086 token overflow) |
| R5-2 | `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH` | rag_and_lora | Bitcoin | ✅ YES | 0.00 | ❌ FAIL (20,152 token overflow) |
| R5.5-1 | `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa` | rag_and_lora | Bitcoin | ✅ YES | 0.15 | ⚠️ LoRA succeeded but self-eval too strict |
| R5.5-rag | `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa` | rag_only | Bitcoin | N/A | 0.92 | ✅ PASS (same query, Claude) |

**Key insight from R5.5:** The LoRA endpoint works — inference succeeded (1,735 chars, 382 tokens). The only remaining issue is the self-evaluation algorithm penalizing LoRA responses unfairly.

---

## Defense-in-Depth Architecture (Current State)

```
Layer 1: classifyQuery        → FIXED ✅ (correctly classifies as "comparative")
Layer 2: balanceMultiDoc      → WORKING ✅ (applied in both paths)
Layer 3: assembleContext       → FIXED ✅ (interleaving in standard path)
Layer 3b: assembleMultiHopCtx → FIXED ✅ (budget-aware, round-robin balanced)
Layer 4: generateResponse      → FIXED ✅ (strengthened multi-doc prompt)
Layer 5: generateLoRAResponse  → FIXED ✅ (multi-doc prompt + truncation)
   └──> Context budget         → FIXED ✅ (13,836 token limit + safety truncation)
   └──> Effective context return → ❌ PENDING (Fix A — return what LoRA actually saw)
Layer 6: selfEvaluate          → FIXED ✅ (multi-doc completeness check)
   └──> Context parity         → ❌ PENDING (Fix A — judge against effective context)
   └──> Mode-aware prompt      → ❌ PENDING (Fix B — LoRA-adjusted evaluation criteria)
```

---

## Complete Fix History (All Sessions)

| Round | Fix | Commit | What Changed | Status |
|-------|-----|--------|-------------|--------|
| R1 | generateResponse multi-doc prompt | (prior session) | Added doc enumeration, per-doc sections | ✅ Working |
| R1 | classifyQuery enhanced prompt | (prior session) | Implicit comparison detection | ⚠️ Caused crash (fixed R2) |
| R1 | assembleContext interleaving | (prior session) | Round-robin section ordering | ✅ Working |
| R1 | selfEvaluate multi-doc check | (prior session) | Added criterion #4, scoring bands | ✅ Working |
| R2 | classifyQuery JSON robustness | `44e24cf` | ASCII arrows, JSON extraction fallback, maxTokens 500, error logging | ✅ Working |
| R2 | generateLoRAResponse multi-doc | `44e24cf` | Detect `## From:`, inject multi-doc instruction | ✅ Working |
| R2 | generateResponse prompt strengthening | `44e24cf` | ALWAYS present each doc, comparative summary | ✅ Working |
| R3 | Multi-hop branch LoRA routing | `52b63bf` | `if (mode === 'rag_and_lora')` in comparative branch | ✅ Working |
| R3 | Multi-doc regex for `### From:` | `52b63bf` | Detection matches both `##` and `###` headers | ✅ Working |
| R5 | Context budget — config | (this session) | `loraMaxContextTokens: 13836` in `RAG_CONFIG.retrieval` | ✅ Working |
| R5 | Context budget — assembleMultiHopContext | (this session) | Budget-aware assembly with round-robin, similarity-sorted truncation | ✅ Working |
| R5 | Context budget — generateLoRAResponse | (this session) | Safety truncation at `\n####` boundary before LoRA call | ✅ Working |
| R5 | Context budget — call site | (this session) | Pass `maxTokens` to `assembleMultiHopContext()` in LoRA mode | ✅ Working |
| R6 | Context parity for self-eval (Fix A) | **PENDING** | Return `effectiveContext` from `generateLoRAResponse()`, pass to `selfEvaluate()` | ❌ Not yet |
| R6 | Mode-aware self-eval prompt (Fix B) | **PENDING** | LoRA-adjusted evaluation criteria — format-agnostic, proportional scoring | ❌ Not yet |

---

## 📋 Project Context

### What This Application Does

**Bright Run LoRA Training Data Platform** - A Next.js 14 application that generates high-quality AI training conversations for fine-tuning large language models. The platform enables non-technical domain experts to transform proprietary knowledge into LoRA-ready training datasets and execute GPU training jobs.

**Core Capabilities**:
1. **Conversation Generation**: AI-powered generation using Claude API with predetermined field structure
2. **Enrichment Pipeline**: 5-stage validation and enrichment for quality assurance
3. **Storage System**: File storage (Supabase Storage) + metadata (PostgreSQL)
4. **Management Dashboard**: UI for reviewing, downloading, and managing conversations
5. **Download System**: Export both raw and enriched JSON formats
6. **LoRA Training Pipeline** (E01-E04 COMPLETE): Database, API routes, UI, training engine & evaluation
7. **Adapter Download System** (COMPLETE): Download trained adapter files as tar.gz archives
8. **Automated Adapter Testing** (DUAL-MODE): RunPod Pods (working) + Serverless (preserved)
9. **Multi-Turn Chat Testing** (E01-E10 COMPLETE): A/B testing, RQE evaluation, dual progress
10. **RAG Frontier** (ACTIVE DEVELOPMENT — self-eval fix in progress):
    - Knowledge base management, document upload, processing pipeline
    - Multi-document chat ("Chat with all documents" mode)
    - HyDE + hybrid search (vector + BM25) + Claude reranking
    - Self-evaluation with multi-doc completeness check
    - Inngest background job processing
    - Golden-Set Regression Test (20 Q&A pairs)
    - **LoRA+RAG multi-doc inference working** — context budget fixed
    - **Self-evaluation mode-awareness** — specification ready, implementation pending

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Pods with vLLM (for LoRA+RAG mode) — **16,384 token context window**

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1635 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()`, `assembleMultiHopContext()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits, `loraMaxContextTokens` |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs — `match_rag_embeddings_kb`, `search_rag_text` |
| `src/components/rag/RAGChat.tsx` | Chat UI — `getConfidenceDisplay()` renders green/amber/red badges based on self-eval score |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
- **LoRA Endpoint**: `virtual-inference-6fd5ac79-adapted` (status: ready, adapter_path: `lora-models/adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz`)
- **Latest Deployment**: `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa` (with context budget fix)

---

## 🚨 CRITICAL: SAOL Tool Usage (MUST READ)

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases.

**Library Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`
**Quick Start:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`
**Full Instructions:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\pipeline\workfiles\supabase-agent-ops-library-use-instructions.md`
**Troubleshooting:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\TROUBLESHOOTING.md`

### Key Rules
1. **Use Service Role Key:** Operations require admin privileges. Ensure `SUPABASE_SERVICE_ROLE_KEY` is loaded.
2. **Run Preflight:** Always run `agentPreflight({ table })` before modifying data.
3. **No Manual Escaping:** SAOL handles special characters automatically.
4. **Parameter Flexibility:** SAOL accepts both `where`/`column` (recommended) and `filters`/`field` (backward compatible).

### Quick Reference: One-Liner Commands

```bash
# Query RAG queries for this KB (most recent first)
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, query_text, mode, self_eval_score, self_eval_passed, response_time_ms',orderBy:{column:'created_at',ascending:false},limit:10});r.data.forEach(q=>console.log(q.created_at,q.mode,q.self_eval_score,q.self_eval_passed?'PASS':'FAIL'));})();"

# Query documents in KB
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, file_name, status'});r.data.forEach(d=>console.log(d.id, d.file_name, d.status));})();"

# Read a query response by ID
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'id',operator:'eq',value:'QUERY_ID_HERE'}],select:'response_text, assembled_context'});console.log(r.data[0].response_text);})();"

# Compare rag_and_lora vs rag_only scores for recent queries
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});var saol=require('.');(async function(){var r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, mode, self_eval_score, self_eval_passed, query_text',orderBy:{column:'created_at',ascending:false},limit:15});r.data.forEach(function(q){console.log(q.created_at,q.mode,'score='+q.self_eval_score,q.query_text.slice(0,50));});})();"
```

### SAOL for DDL/Migrations
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## Important Documentation

### Multi-Document Retrieval Specs & QA

| Doc | Path |
|-----|------|
| Multi-Doc Spec v3 (implemented) | `pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md` |
| QA Round 1 (v1 fixes) | `pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v1.md` |
| QA Round 2 (v2 diagnosis) | `pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v2.md` |
| QA Round 3 (v3 — LoRA routing bug) | `pmc\product\_mapping\v2-mods\008-rag-module-QA_v3.md` |
| QA Round 4 (v4 — mode was rag_only) | `pmc\product\_mapping\v2-mods\008-rag-module-QA_v4.md` |
| **QA Round 6 (v5 — self-eval fix spec)** | **`pmc\product\_mapping\v2-mods\008-rag-module-QA_v5.md`** ← **EXECUTE THIS** |

### Vercel Test Logs

| Log | Contents |
|-----|----------|
| `test-data/vercel-50.csv` | Pre-fix (original single-doc bug) |
| `test-data/vercel-51.csv` | Post Round 1 (Q1 pass, Q2/Q3 fail) |
| `test-data/vercel-52.csv` | Post Round 2 (classifyQuery works, LoRA bypassed) |
| `test-data/vercel-53.csv` | Round 3 (LoRA routing fixed; user submitted rag_only by mistake) |
| `test-data/vercel-54.csv` | Round 5 (LoRA called; context overflow 29k/20k tokens) |
| `test-data/vercel-55.csv` | Round 5.5 (context budget fix working; LoRA succeeded; self-eval too strict at 0.15) |

### Important DB Query IDs

| Query ID | Mode | Score | Notes |
|----------|------|-------|-------|
| `d8fc082c-7812-43e4-ba0c-302e5f36f7cc` | rag_and_lora | 0.15 | Bitcoin Q4 — self-eval too strict (Round 5.5) |
| `6f5eb053-ea59-4d36-b1df-9dea0b06ff3e` | rag_only | 0.92 | Bitcoin Q4 — same query, Claude scored well |
| `2ac4b53a-62ee-4a75-887c-b0bdb5b11030` | rag_and_lora | 0.92 | Margin call Q1 — LoRA passed (had `## From:` headers) |

---

**Last Updated**: February 21, 2026  
**Session Focus**: LoRA context budget fix (completed) + Self-evaluation mode-awareness (spec written, execution pending)  
**Current Mode**: Self-eval fix specification ready — next agent executes Fix A + Fix B  
**Document Version**: context-carry-info-11-15-25-1114pm-mmmm  
**Implementation Location**: `C:\Users\james\Master\BrightHub\brun\v4-show\`  
**Build Status**: TypeScript compiles clean  
**Latest Deployment**: `dpl_9aG1r6jMjVH58GiDBBpuZ36d23oa` (context budget fix deployed and working)  
**Next Action**: Execute Fix A (context parity) + Fix B (mode-aware self-eval prompt) from `008-rag-module-QA_v5.md`, deploy, and retest
