# Context Carryover: Multi-Document RAG Retrieval — Round 5 Retest Required

## CRITICAL INSTRUCTION FOR NEXT AGENT

**Your job upon receiving this context is to:**
1. Read and internalize this document fully
2. Understand the current blocker: LoRA endpoint context window overflow (29,086 tokens sent, 16,384 token limit)
3. Investigate why the multi-hop context is this large — specifically whether conversation history is being appended to the context window
4. Reference the error files listed in the Next Investigation section
5. Diagnose and fix the context overflow bug
6. Retest Q1 (margin call) and Q2 (Bitcoin) in `rag_and_lora` mode after fixing
7. Use SAOL for all database operations (see 🚨 CRITICAL section below)

---

## CURRENT STATUS: Round 5 — Context Overflow Bug

### What Happened in This Chat Session (February 21, 2026)

This session involved **two phases** of work:

#### Phase A: Round 4 Test Investigation — Mode Was rag_only (NOT a Code Bug)

User reported that "RAG + LoRA does not add emotional intelligence." Investigation via `vercel-53.csv` revealed:
- Both Q4 tests (Bitcoin question) on new deployment `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM` were submitted as **`rag_only`** with `modelJobId=none`
- LoRA was never invoked — the user had not selected "RAG + LoRA" mode in the UI
- No code changes were needed; this was a test execution issue
- Full findings written to `pmc\product\_mapping\v2-mods\008-rag-module-QA_v4.md`

#### Phase B: Round 5 — LoRA Is Called But Context Overflows

After the user re-ran tests with `rag_and_lora` properly selected, a **new deployment** was used (`dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH`). The LoRA endpoint was now correctly called:

```
[LoRA-INFERENCE] Calling endpoint for job 6fd5ac79, mode=rag_and_lora
```

However, **both queries failed** with context overflow errors. Vercel log `vercel-54.csv` and error transcript `length-bug-54.txt` document this.

**Error 1** (Margin call query):
```
This model's maximum context length is 16384 tokens.
However, your request has 29086 input tokens.
```

**Error 2** (Bitcoin query):
```
This model's maximum context length is 16384 tokens.
However, your request has 20152 input tokens.
```

The LoRA model (vLLM serverless on RunPod, base model likely Llama-3.1-8B or similar) has a **16,384 token context window**. The multi-hop assembled context being sent to it exceeds this limit significantly.

---

## Next Investigation: Context Overflow Root Cause

### Files to Read

| File | Contents |
|---|---|
| `pmc\product\_mapping\multi-doc\test-data\length-bug-54.txt` | Error screenshots transcription — shows both overflow errors and exact token counts |
| `pmc\product\_mapping\multi-doc\test-data\vercel-54.csv` | Full Vercel logs for Round 5 — contains the actual prompt payload that was sent to the LoRA endpoint at line ~377 |

### Key Question to Investigate

**Why is the margin call query 29,086 tokens?** The Bitcoin query was 20,152 tokens — why is one 9,000 tokens longer than the other?

The user's main concern: **"I thought each question starts with a new context window in the RAG/LoRA chat interface — why is context growing?"**

The vercel-54.csv log at line ~377 shows the full prompt payload sent to the LoRA endpoint. The next agent should:

1. **Read the full prompt in vercel-54.csv** (the `content` field in the API payload at ~line 377) to see exactly what was sent to the LoRA endpoint for each query
2. **Check if conversation history is being appended** — look for prior exchanges in the prompt, not just the current query + assembled_context
3. **Check `generateLoRAResponse()` in `rag-retrieval-service.ts`** — specifically the `prompt` construction at line ~760-763:
   ```typescript
   prompt = `Context from knowledge base:\n\n${assembledContext}\n\n---\n\nQuestion: ${queryText}\n\nAnswer using the context above, maintaining your natural tone:`;
   ```
   Is `assembledContext` being passed its full multi-hop context (which is known to be very large)?
4. **Check `assembleMultiHopContext()`** — how many sections/facts are being included? The multi-hop context assembles results from 3 sub-queries × 2 documents — it could be very long
5. **Check `RAG_CONFIG` in `src/lib/rag/config.ts`** — are there token limits configured for the LoRA model context? Claude can handle 200k tokens but the LoRA model can only handle 16,384
6. **Check if context history (conversationContext) is being passed** into the LoRA branch — it should NOT be, since `generateLoRAResponse()` doesn't accept `conversationContext`, but verify

### Likely Fix Options

After diagnosing the root cause, the fix will be one or more of:

**Option A (Truncate assembled context before sending to LoRA):**
Add a pre-flight token budget check in `generateLoRAResponse()`. Reserve ~2,048 tokens for the model's response and ~500 for the system prompt. That leaves ~13,836 tokens for context. Truncate `assembledContext` to fit.

**Option B (Reduce multi-hop context size):**
In `assembleMultiHopContext()`, apply a stricter `maxSections` or `maxFacts` limit when mode is `rag_and_lora`. The multi-hop assembler currently collects sections from all 3 sub-queries across both documents with no hard cap — this can produce 15,000+ tokens of context alone.

**Option C (Use a different context format for LoRA):**
The multi-hop context includes the original question, all 3 sub-questions, and per-document sections. Strip it down to just the essential evidence sections when passing to LoRA, removing the verbose headers.

**Likely actual cause:** Multi-hop context is large because 3 sub-queries × 2 documents × many retrieved sections = a lot of content, all assembled verbatim into the prompt. There is probably **no conversation history carryover** — the UI starts fresh each time — but the assembled_context itself is huge. The margin call query (29k tokens) being larger than the Bitcoin query (20k tokens) suggests the number of sections retrieved varies per query.

---

## Round 4 & 5 Test Results Summary

| # | Deployment | Mode | Query | LoRA Called? | Result |
|---|---|---|---|---|---|
| R4-1 | `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM` | rag_only | Bitcoin | N/A | 0.92 PASS (Claude) |
| R4-2 | `dpl_6CCpdYLiPfjGHiaCXvrGJbz2tinM` | rag_only | Bitcoin | N/A | 0.92 PASS (Claude) |
| R5-1 | `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH` | rag_and_lora | Margin call | ✅ YES | ❌ FAIL (29,086 token overflow) |
| R5-2 | `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH` | rag_and_lora | Bitcoin | ✅ YES | ❌ FAIL (20,152 token overflow) |

**Key milestone achieved:** LoRA IS now being called in the comparative/multi-hop branch. Commits `44e24cf` + `52b63bf` are working correctly for routing. The remaining issue is context size, not routing.

---

## Defense-in-Depth Architecture (Post All Routing Fixes)

```
Layer 1: classifyQuery        → FIXED ✅ (correctly classifies as "comparative")
Layer 2: balanceMultiDoc      → WORKING ✅ (applied in both paths)
Layer 3: assembleContext       → FIXED ✅ (interleaving in standard path)
Layer 3b: assembleMultiHopCtx → WORKING ✅ (per-document grouping) ⚠️ MAY BE TOO VERBOSE
Layer 4: generateResponse      → FIXED ✅ (strengthened multi-doc prompt)
Layer 5: generateLoRAResponse  → FIXED ✅ (multi-doc prompt + routed correctly)
           └──> Context budget → ❌ BUG: No token limit, sends full multi-hop context to 16k-token LoRA
Layer 6: selfEvaluate          → FIXED ✅ (correctly evaluates multi-doc completeness)
```

---

## Complete Fix History (All Sessions)

| Round | Fix | Commit | What Changed | Status |
|---|---|---|---|---|
| R1 | generateResponse multi-doc prompt | (prior session) | Added doc enumeration, per-doc sections | ✅ Working |
| R1 | classifyQuery enhanced prompt | (prior session) | Implicit comparison detection | ⚠️ Caused crash (fixed R2) |
| R1 | assembleContext interleaving | (prior session) | Round-robin section ordering | ✅ Working |
| R1 | selfEvaluate multi-doc check | (prior session) | Added criterion #4, scoring bands | ✅ Working |
| R2 | classifyQuery JSON robustness | `44e24cf` | ASCII arrows, JSON extraction fallback, maxTokens 500, error logging | ✅ Working |
| R2 | generateLoRAResponse multi-doc | `44e24cf` | Detect `## From:`, inject multi-doc instruction | ✅ Working |
| R2 | generateResponse prompt strengthening | `44e24cf` | ALWAYS present each doc, comparative summary | ✅ Working |
| R3 | Multi-hop branch LoRA routing | `52b63bf` | `if (mode === 'rag_and_lora')` in comparative branch | ✅ Working |
| R3 | Multi-doc regex for `### From:` | `52b63bf` | Detection matches both `##` and `###` headers | ✅ Working |
| R5 | Context budget for LoRA endpoint | **PENDING** | Need to truncate/limit multi-hop context before sending to LoRA | ❌ Not yet fixed |

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
10. **RAG Frontier** (ACTIVE DEVELOPMENT — context budget fix in progress):
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
- **Inference**: RunPod Pods with vLLM (for LoRA+RAG mode) — **16,384 token context window**

### Key Files

| File | Purpose |
|---|---|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1540 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()`, `assembleMultiHopContext()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs — `match_rag_embeddings_kb`, `search_rag_text` |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **LoRA Model Job ID**: `6fd5ac79-c54b-4927-8138-ca159108bcae`
- **LoRA Endpoint**: `virtual-inference-6fd5ac79-adapted` (status: ready, adapter_path: `lora-models/adapters/6fd5ac79-c54b-4927-8138-ca159108bcae.tar.gz`)
- **Latest commit**: `52b63bf` (deployed as `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH`)

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
| QA Round 4 (v4 — mode was rag_only) | `pmc\product\_mapping\v2-mods\008-rag-module-QA_v4.md` |

### Vercel Test Logs

| Log | Contents |
|---|---|
| `test-data/vercel-50.csv` | Pre-fix (original single-doc bug) |
| `test-data/vercel-51.csv` | Post Round 1 (Q1 pass, Q2/Q3 fail) |
| `test-data/vercel-52.csv` | Post Round 2 (classifyQuery works, LoRA bypassed) |
| `test-data/vercel-53.csv` | Round 3 (LoRA routing fixed in code; user submitted rag_only by mistake) |
| `test-data/vercel-54.csv` | Round 5 (LoRA IS called; context overflow 29k/20k tokens — **ACTIVE BUG**) |
| `test-data/length-bug-54.txt` | Error screenshot transcription for Round 5 overflow errors |

---

**Last Updated**: February 21, 2026  
**Session Focus**: Multi-document RAG retrieval — Round 4 diagnosis (mode issue) + Round 5 context overflow  
**Current Mode**: Context overflow bug blocking LoRA inference — investigation + fix required  
**Document Version**: context-carry-info-11-15-25-1114pm-llll  
**Implementation Location**: `C:\Users\james\Master\BrightHub\brun\v4-show\`  
**Build Status**: TypeScript compiles clean  
**Latest Commit**: `52b63bf` (deployed as `dpl_9uRC14t6ucMKimg5R4qiLe9kvgqH`)  
**Next Action**: Investigate context overflow in `generateLoRAResponse()` / `assembleMultiHopContext()` — determine why multi-hop context reaches 29k tokens and fix the token budget logic before LoRA is called
