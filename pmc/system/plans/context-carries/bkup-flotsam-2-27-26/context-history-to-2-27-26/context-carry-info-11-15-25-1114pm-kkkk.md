# Context Carryover: Multi-Document RAG Retrieval — Round 4 Retest Required

## CRITICAL INSTRUCTION FOR NEXT AGENT

**Your job upon receiving this context is to:**
1. Read and internalize this document fully
2. Understand that ALL code fixes are implemented and deployed — the task is **retesting**
3. Retest using the test queries below in both `rag_only` and `rag_and_lora` modes
4. Verify Vercel logs show: `classifyQuery` succeeds as "comparative", `[LoRA-INFERENCE]` log appears for `rag_and_lora` queries, self-eval scores > 0.8
5. Query SAOL for the new test records to confirm results
6. If any test fails, diagnose from Vercel logs and SAOL data, then propose/implement fixes
7. Read the QA v3 report for architectural understanding: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v3.md`

---

## CURRENT STATUS: All Fixes Deployed — Awaiting Round 4 Retest

### What We Fixed This Session (February 21, 2026)

We implemented **5 fixes across 2 commits** to the multi-document RAG retrieval pipeline in `src/lib/rag/services/rag-retrieval-service.ts`. All fixes target the "Chat with all documents" feature where a 2-document knowledge base (Sun Bank + Moon Bank) was only returning answers from one document.

### Commit 1: `44e24cf` — Round 2 Fixes (3 changes)

**Fix 1 (CRITICAL): `classifyQuery()` JSON parsing robustness**
- Replaced `→` Unicode arrows with `-->` ASCII in all prompt examples
- Changed `"Return JSON only:"` to `"RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT.\nFormat:"`
- Increased `maxTokens` from 300 to 500
- Added JSON extraction fallback: strips markdown code fences, then finds first `{` to last `}` to handle preamble text from Haiku
- Changed `catch {` to `catch (err) {` with error logging
- Added success log: `[RAG Retrieval] Query classified as: ${type}, subQueries: [...]`
- **Result**: classifyQuery now correctly classifies as "comparative" — confirmed in vercel-52.csv logs

**Fix 2 (HIGH): `generateLoRAResponse()` multi-doc awareness**
- Detects multi-doc context via `assembledContext.includes('## From:')`
- Extracts document names with regex matching `## From:` headers
- When 2+ documents detected, injects `CRITICAL:` instruction into the LoRA system prompt
- **Result**: Code is correct but was initially unreachable due to the routing bug found in Round 3

**Fix 3 (MEDIUM): `generateResponse()` strengthened multi-doc prompt**
- Changed instruction (a) to: "ALWAYS present the equivalent policies from EACH document, even if they approach the topic differently"
- Changed instruction (c) to require `## From:` headings for EVERY document
- Changed instruction (e) to: explain how a document's approach differs rather than omitting it
- Added new instruction (f): "End your response with a brief comparative summary"
- Strengthened closing: "will receive a failing score"
- **Result**: Confirmed working — all Round 3 queries scored 0.92 for multi-doc completeness

### Commit 2: `52b63bf` — Round 3 Fix (LoRA routing in comparative branch)

**Fix 4 (CRITICAL): Multi-hop/comparative branch now routes to LoRA**
- **Root cause discovered**: Fixing classifyQuery (Fix 1) ironically bypassed LoRA. When classifyQuery succeeded and returned "comparative", the multi-hop branch (lines 1173-1268) hardcoded `generateResponse()` (Claude) and never called `generateLoRAResponse()`. Previously, classifyQuery crashed → defaulted to "simple" → standard path → LoRA was called.
- Added `if (mode === 'rag_and_lora' && params.modelJobId)` branching in the comparative path
- Introduced `mhResponseText` / `mhCitations` variables to replace hardcoded `claudeResult` references
- Updated all downstream references (self-eval, DB insert) to use new variables

**Fix 5 (MEDIUM): Multi-doc detection regex for multi-hop context format**
- `generateLoRAResponse()` detection updated: `assembledContext.includes('## From:') || assembledContext.includes('### From:')`
- Regex changed from `/## From: (.+)/g` to `/##?# From: (.+)/g` to match both `## From:` (standard context) and `### From:` (multi-hop context)

### Round 3 Test Results (Pre-Fix 4, deployment `dpl_x13KJLCW6cQWP9DF8XS3cK9y6ER3`)

| # | Mode | Question | Self-Eval | Multi-Doc? | LoRA Called? |
|---|---|---|---|---|---|
| T1 | rag_only | Margin call / LTV | 0.92 PASS | YES ✅ | N/A |
| T2 | rag_and_lora | Margin call / LTV | 0.92 PASS | YES ✅ | **NO** ❌ |
| T3 | rag_and_lora | Margin call / LTV | 0.92 PASS | YES ✅ | **NO** ❌ |

- Multi-doc coverage and classifyQuery are fully working
- LoRA was bypassed in comparative branch (fixed by commit `52b63bf`)
- **Round 4 retest needed** to confirm LoRA is now called AND produces emotionally intelligent multi-doc answers

---

## Defense-in-Depth Architecture (Post All Fixes)

```
Layer 1: classifyQuery        → FIXED ✅ (correctly classifies as "comparative")
Layer 2: balanceMultiDoc      → WORKING (applied in both paths)
Layer 3: assembleContext       → FIXED ✅ (interleaving in standard path)
Layer 3b: assembleMultiHopCtx → WORKING (per-document grouping in comparative path)
Layer 4: generateResponse      → FIXED ✅ (strengthened multi-doc prompt)
Layer 5: generateLoRAResponse  → FIXED ✅ (multi-doc prompt + now reachable in comparative branch)
Layer 6: selfEvaluate          → FIXED ✅ (correctly evaluates multi-doc completeness)
```

---

## Retest Plan (Round 4)

1. **Deployment**: Latest commit `52b63bf` should be auto-deployed to Vercel from main. Confirm new deployment ID.
2. **Test Q1 — Margin call in `rag_only`**: Regression check. Should still PASS with score ≥ 0.9, both banks addressed.
3. **Test Q2 — Margin call in `rag_and_lora`**: Verify `[LoRA-INFERENCE] Calling endpoint` appears in logs. Response should have warmer/more empathetic tone than rag_only. Both banks addressed.
4. **Test Q3 — Tuscany lockout in `rag_only`**: This was the hardest case (75:25 section ratio). Should now PASS with strengthened prompt.
5. **Test Q4 — Tuscany lockout in `rag_and_lora`**: Same as Q3 but through LoRA. Verify LoRA is called and produces multi-doc answer.
6. **Vercel log checks**: No "classification failed" warnings. Classification should be "comparative" for all queries.
7. **SAOL verification**: Query new records, confirm self_eval_score > 0.8, response_text mentions both Sun Bank and Moon Bank.

### Test Queries

**Margin call (Q1/Q2):**
> "My broker just called and said my global equities took a massive hit and I'm facing a margin call! I am hyperventilating, I cannot lose my collateral! What is the exact maximum Loan-to-Value (LTV) rat..."

**Tuscany lockout (Q3/Q4):**
> "I am trying to log in from my vacation villa in Tuscany and my account is totally locked! Plus, I left that stupid plastic challenge card and USB key thing at home! I need to move money right now. Ca..."

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
10. **RAG Frontier** (ACTIVE DEVELOPMENT — multi-doc retrieval being fixed):
    - Knowledge base management, document upload, processing pipeline
    - Multi-document chat ("Chat with all documents" mode)
    - HyDE + hybrid search (vector + BM25) + Claude reranking
    - Self-evaluation with multi-doc completeness check
    - Inngest background job processing
    - Golden-Set Regression Test (20 Q&A pairs)

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) with pgvector extension
- **AI**: Claude Haiku 4.5 (RAG default), Claude Sonnet 4.5 (ingestion), OpenAI `text-embedding-3-small` (embeddings)
- **Background Jobs**: Inngest
- **Deployment**: Vercel Pro (300s timeout, Inngest for longer tasks)
- **Inference**: RunPod Pods with vLLM (for LoRA+RAG mode)

### Key Files

| File | Purpose |
|---|---|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1540 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs — `match_rag_embeddings_kb`, `search_rag_text` |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
- **Latest commit**: `52b63bf` (pushed to main, Vercel auto-deploy)

---

## 🚨 CRITICAL: SAOL Tool Usage (MUST READ)

**You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**
Do not use raw `supabase-js` or PostgreSQL scripts. SAOL is safe, robust, and handles edge cases.

**Library Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`
**Quick Start:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`
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
```

### SAOL for DDL/Migrations
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## Important Documentation

### Multi-Document Retrieval Specs & QA

| Doc | Path |
|---|---|
| Multi-Doc Spec v3 (implemented) | `pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md` |
| QA Round 1 (v1 fixes) | `pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v1.md` |
| QA Round 2 (v2 diagnosis) | `pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v2.md` |
| QA Round 3 (v3 — LoRA routing bug) | `pmc\product\_mapping\v2-mods\008-rag-module-QA_v3.md` |

### Vercel Test Logs

| Log | Contents |
|---|---|
| `test-data/vercel-50.csv` | Pre-fix (original single-doc bug) |
| `test-data/vercel-51.csv` | Post Round 1 (Q1 pass, Q2/Q3 fail) |
| `test-data/vercel-52.csv` | Post Round 2 (classifyQuery works, LoRA bypassed) |

### Prior Context Carryover

`pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md` — Contains full bug history (#1-#16), E09 spec info, complete architecture overview, database schema

---

## Complete Fix History (This Session)

| Round | Fix | Commit | What Changed | Status |
|---|---|---|---|---|
| R1 | generateResponse multi-doc prompt | (prior session) | Added doc enumeration, per-doc sections | ✅ Working |
| R1 | classifyQuery enhanced prompt | (prior session) | Implicit comparison detection | ⚠️ Caused crash (fixed R2) |
| R1 | assembleContext interleaving | (prior session) | Round-robin section ordering | ✅ Working |
| R1 | selfEvaluate multi-doc check | (prior session) | Added criterion #4, scoring bands | ✅ Working |
| R2 | classifyQuery JSON robustness | `44e24cf` | ASCII arrows, JSON extraction fallback, maxTokens 500, error logging | ✅ Working |
| R2 | generateLoRAResponse multi-doc | `44e24cf` | Detect `## From:`, inject multi-doc instruction | ✅ Code correct |
| R2 | generateResponse prompt strengthening | `44e24cf` | ALWAYS present each doc, comparative summary | ✅ Working |
| R3 | Multi-hop branch LoRA routing | `52b63bf` | `if (mode === 'rag_and_lora')` in comparative branch | 🔄 Deployed, needs retest |
| R3 | Multi-doc regex for `### From:` | `52b63bf` | Detection matches both `##` and `###` headers | 🔄 Deployed, needs retest |

---

**Last Updated**: February 21, 2026  
**Session Focus**: Multi-document RAG retrieval — Rounds 2-3 implementation  
**Current Mode**: All fixes deployed, Round 4 retest required  
**Document Version**: context-carry-info-11-15-25-1114pm-kkkk  
**Implementation Location**: `C:\Users\james\Master\BrightHub\brun\v4-show\`  
**Build Status**: TypeScript compiles clean, pushed to main  
**Latest Commit**: `52b63bf` (auto-deploying to Vercel)  
**Deployment**: Auto-deployed to Vercel from main branch push  
**Next Action**: Retest Q1-Q4 (margin call + Tuscany lockout, both rag_only and rag_and_lora modes), verify LoRA is called and produces emotionally intelligent multi-doc answers
