# Context Carryover: Multi-Document RAG Retrieval — Round 2 Fixes Ready for Implementation

## CRITICAL INSTRUCTION FOR NEXT AGENT

**Your job upon receiving this context is to:**
1. Read and internalize ALL context files listed in this document
2. Understand the multi-document retrieval system and the 3 remaining bugs
3. Read the diagnosis document at `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v2.md`
4. **Implement the 3 fixes described in Section 4 of that document**
5. After implementing, deploy to Vercel and retest using the same KB and test questions

---

## CURRENT STATUS: Multi-Doc RAG Round 2 — 3 Fixes to Implement

### What We've Been Working On (This Session — February 20-21, 2026)

We discovered and fixed a critical multi-document retrieval bug where the RAG "Chat with all documents" feature only returned answers from one document (Sun Bank) while completely ignoring the second document (Moon Bank) in the same knowledge base.

### Session Timeline

1. **Investigation**: User reported that multi-doc chat only returned Sun Bank answers. We read Vercel logs (`test-data/vercel-50.csv`), traced the full pipeline via SAOL queries, and identified 4 root causes.

2. **Round 1 Fixes (v1)** — 4 changes implemented and deployed:
   - **Fix 1: `generateResponse` prompt** — Added explicit multi-doc completeness instruction with document name enumeration
   - **Fix 2: `classifyQuery` prompt** — Added implicit comparison detection for same-type documents
   - **Fix 3: `assembleContext` interleaving** — Replaced sequential document grouping with round-robin section interleaving
   - **Fix 4: `selfEvaluate` prompt** — Added multi-document completeness check with proportional scoring

3. **Build fix** — `Array.from(sectionsByDoc.values())` needed for TS target compatibility (logged in `test-data/build-bugs-07.md`)

4. **Round 2 Testing** — User submitted 3 new queries. Results:
   - **Q1 (rag_only, margin call)**: PASS ✅ — Both banks addressed, score 0.92
   - **Q2 (rag_and_lora, Tuscany lockout)**: FAIL ❌ — Sun Bank only, score 0.42
   - **Q3 (rag_only, same Tuscany question)**: FAIL ❌ — Sun Bank only, score 0.42

5. **Round 2 Diagnosis** — Investigated via SAOL and Vercel logs (`test-data/vercel-51.csv`), identified 3 remaining issues

### Round 1 Fixes That ARE Working
- **Interleaving**: Moon Bank content now at 3.3% into context (was 67% pre-fix)
- **Self-eval**: Correctly scores 0.42 FAIL for single-doc answers (was 0.95 false PASS)
- **generateResponse**: Works when content is balanced (Q1 margin call, both banks have LTV policies)

### 3 Remaining Bugs to Fix (Detailed in QA v2)

**RC-A: `classifyQuery` crashes 100% of the time (CRITICAL)**
- All 3 post-fix queries show: `"[RAG Retrieval] Query classification failed, defaulting to simple"`
- The enhanced prompt (from Round 1 Fix 2) likely causes Claude Haiku to return non-JSON text that breaks `JSON.parse()`
- The `catch` block silently swallows errors: `catch {` (no parameter to log)
- This means the multi-hop/comparative branch is NEVER taken — all queries default to "simple"
- **Fix**: Log actual error, replace `→` Unicode arrows with ASCII, add JSON extraction fallback (find first `{` to last `}`), increase `maxTokens` from 300 to 500, add "RESPOND WITH ONLY THE JSON OBJECT" instruction

**RC-B: LoRA mode (`rag_and_lora`) bypasses multi-doc prompt entirely (HIGH)**
- `generateLoRAResponse()` at line ~738 has hardcoded system prompt with zero multi-doc awareness
- The RunPod LoRA model receives the assembled context (with `## From:` headers) but has no instruction to address all documents
- **Fix**: Detect multi-doc context in `generateLoRAResponse()`, extract document names, inject multi-doc instruction into the LoRA system prompt

**RC-C: `generateResponse` multi-doc prompt not strong enough for skewed content (MEDIUM)**
- Works for balanced content (Q1: 64:36 section ratio) but fails when one doc dominates (Q3: 75:25 ratio)
- **Fix**: Strengthen wording to "ALWAYS present equivalent policies from EACH document," add "explain how documents differ," add comparative summary suffix

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

### Key Files for This Task

| File | Purpose |
|---|---|
| `src/lib/rag/services/rag-retrieval-service.ts` (~1494 lines) | Main retrieval pipeline — `queryRAG()`, `classifyQuery()`, `assembleContext()`, `generateResponse()`, `generateLoRAResponse()`, `selfEvaluate()`, `balanceMultiDocCoverage()` |
| `src/lib/rag/providers/claude-llm-provider.ts` (~978 lines) | Claude API calls — `selfEvaluate()` prompt, `generateLightweightCompletion()`, `generateResponse()` |
| `src/lib/rag/config.ts` | `RAG_CONFIG` — model settings, thresholds, token limits |
| `src/lib/rag/services/rag-embedding-service.ts` | Embedding search RPCs — `match_rag_embeddings_kb`, `search_rag_text` |

### Test Environment

- **KB ID**: `4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303`
- **Sun Bank Doc**: `f7c6f1dd-ac72-491e-9b07-06dbee8e5b19` (Sun-Chip-Bank-Policy-Document-v2.0.md, status: ready)
- **Moon Bank Doc**: `c29471f9-12c6-42e0-915d-78bdc2dab0ee` (Moon-Banc-Policy-Document-v1.0.md, status: ready)
- **Last deployment**: `dpl_75c1mBbkGcFJoJsZbQzZpDBJQJ6V`

### Test Queries Used

**Q1 (PASS — margin call):**
> "My broker just called and said my global equities took a massive hit and I'm facing a margin call! I am hyperventilating, I cannot lose my collateral! What is the exact maximum Loan-to-Value (LTV) rat..."

**Q2/Q3 (FAIL — Tuscany lockout):**
> "I am trying to log in from my vacation villa in Tuscany and my account is totally locked! Plus, I left that stupid plastic challenge card and USB key thing at home! I need to move money right now. Ca..."

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
# Query RAG queries for this KB
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, created_at, query_text, mode, self_eval_score, self_eval_passed, response_time_ms',orderBy:{column:'created_at',ascending:false},limit:10});r.data.forEach(q=>console.log(q.created_at,q.mode,q.self_eval_score,q.self_eval_passed?'PASS':'FAIL'));})();"

# Query documents in KB
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',where:[{column:'knowledge_base_id',operator:'eq',value:'4fc8fa25-0b5d-4dbb-9db4-6bd70fb84303'}],select:'id, file_name, status'});r.data.forEach(d=>console.log(d.id, d.file_name, d.status));})();"

# Read a query response
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',where:[{column:'id',operator:'eq',value:'QUERY_ID_HERE'}],select:'response_text, assembled_context'});console.log(r.data[0].response_text);})();"
```

### SAOL for DDL/Migrations
```bash
# Execute DDL with dry-run first
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:'YOUR_SQL_HERE',dryRun:true,transaction:true,transport:'pg'});console.log(JSON.stringify(r,null,2));})();"
```

---

## Important Documentation

### Multi-Document Retrieval Specs & QA (CURRENT FOCUS)

1. **Multi-Doc Retrieval Spec v1:**
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v1.md`

2. **Multi-Doc Retrieval Spec v3 (implemented):**
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\002-multi-doc-retrieval-specification_v3.md`

3. **QA Round 1 Notes (v1 fixes detailed):**
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v1.md`

4. **QA Round 2 Notes (v2 diagnosis — THE FIX SPEC):** ⬅️ **READ THIS FIRST**
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\004-multi-doc-retrieval-QA_v2.md`

### Vercel Test Logs

5. `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data\vercel-50.csv` — Pre-fix test (original bug discovery)
6. `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data\vercel-51.csv` — Post-fix test (Q1 pass, Q2/Q3 fail)
7. `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi-doc\test-data\build-bugs-07.md` — Build error from Array.from fix

### SAOL Instructions

8. `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\multi\workfiles\supabase-agent-ops-library-use-instructions.md`

### Prior Context Carryover

9. `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\system\plans\context-carries\context-carry-info-11-15-25-1114pm.md`
   — Contains full bug history (#1-#16), E09 spec info, complete architecture overview, database schema

---

## v1 Fixes Already Applied (DO NOT RE-IMPLEMENT)

These changes are ALREADY in the codebase and deployed. Do not overwrite them — build on top of them.

### In `src/lib/rag/services/rag-retrieval-service.ts`:

1. **`generateResponse()` (~line 662)**: Multi-doc prompt extracts doc names from `## From:` headers via regex, lists them explicitly, mandates addressing each document. The wording needs strengthening (RC-C fix).

2. **`classifyQuery()` (~line 882)**: Enhanced prompt with implicit comparison detection. Currently CRASHING — needs RC-A fix (JSON parse robustness + error logging).

3. **`assembleContext()` (~line 284)**: Round-robin interleaving with `Array.from(sectionsByDoc.values())`. Each section heading has `[DocName]` prefix. `## From:` headers pre-emitted at top. This is WORKING correctly.

### In `src/lib/rag/providers/claude-llm-provider.ts`:

4. **`selfEvaluate()` (~line 392)**: System prompt updated to "hallucination and completeness detector." Evaluation criterion #4 added for multi-doc completeness. Scoring bands revised. This is WORKING correctly (scoring 0.42 for single-doc answers).

---

## Exact Fixes to Implement Now (from QA v2, Section 4)

### Fix 1: Repair classifyQuery (CRITICAL — blocking multi-hop branch)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `classifyQuery()`

Changes needed:
1. Change `catch {` to `catch (err) {` and log the actual error
2. Replace `→` Unicode arrows with `-->` or `=` in prompt examples
3. Add JSON extraction fallback: find first `{` to last `}` before `JSON.parse()`
4. Increase `maxTokens` from 300 to 500
5. Add "RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT." at end of system prompt

### Fix 2: Add multi-doc awareness to generateLoRAResponse (HIGH)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `generateLoRAResponse()`

Changes needed:
1. Detect multi-doc context: `assembledContext.includes('## From:')`
2. Extract document names via regex (same pattern as `generateResponse`)
3. Inject multi-doc instruction into the LoRA system prompt

### Fix 3: Strengthen generateResponse multi-doc prompt (MEDIUM)

**File:** `src/lib/rag/services/rag-retrieval-service.ts` → `generateResponse()`

Changes needed:
1. Wording change: "ALWAYS present the equivalent policies from EACH document, even if they approach the topic differently"
2. Add: "If a document handles this topic differently than described, explain how that document's approach differs"
3. Add: "End your response with a brief comparison noting the key differences between the documents"

---

## Defense-in-Depth Architecture (Current State)

```
Layer 1: classifyQuery     → BROKEN (crashes, defaults to simple)  ← FIX 1
Layer 2: balanceMultiDoc   → WEAK (60% cap allows 75:25 ratios)
Layer 3: assembleContext    → FIXED ✅ (interleaving working)
Layer 4: generateResponse   → PARTIALLY EFFECTIVE                  ← FIX 3
Layer 5: generateLoRAResponse → MISSING (no multi-doc awareness)   ← FIX 2
Layer 6: selfEvaluate       → FIXED ✅ (correctly catches failures)
```

After implementing Fixes 1-3, Layers 1, 4, and 5 will be operational. The system needs at least 2 of Layers 1-5 working to consistently produce multi-doc answers.

---

## Retest Plan (After Implementation)

1. **Deploy to Vercel** (push to main)
2. **Resubmit Q2/Q3 Tuscany lockout question** in `rag_only` mode — verify both banks addressed
3. **Resubmit Q2/Q3 Tuscany lockout question** in `rag_and_lora` mode — verify LoRA path also addresses both banks
4. **Resubmit Q1 margin call** — regression check, should still PASS
5. **Check Vercel logs** for: classification type (should be "comparative"), no "classification failed" warning
6. **Query SAOL** for new query records: confirm self-eval > 0.8, response text mentions both banks

---

**Last Updated**: February 21, 2026  
**Session Focus**: Multi-document RAG retrieval — Round 2 diagnosis of remaining failures  
**Current Mode**: Diagnosis complete, 3 fixes ready for implementation  
**Document Version**: context-carry-info-11-15-25-1114pm-jjjj  
**Implementation Location**: `C:\Users\james\Master\BrightHub\brun\v4-show\`  
**Build Status**: TypeScript build successful, deployed  
**Latest Deployment**: `dpl_75c1mBbkGcFJoJsZbQzZpDBJQJ6V`  
**Deployment**: Auto-deployed to Vercel from main branch push  
**Next Action**: Implement Fix 1 (classifyQuery), Fix 2 (LoRA multi-doc), Fix 3 (strengthen prompt), then retest
