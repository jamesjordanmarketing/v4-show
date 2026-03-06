# Frontier RAG Module - Execution Prompt E05: Retrieval Pipeline

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E05 - Retrieval Pipeline
**Prerequisites:** E01 complete (database + match_rag_embeddings function), E02 complete (types + providers), E03-E04 complete (ingestion + Q&A services)
**Status:** Ready for Execution

---

## Overview

This prompt creates the Retrieval Pipeline service -- the engine that takes a user query, finds relevant context from the knowledge base, and generates a grounded response. It implements three frontier RAG techniques: HyDE, Multi-Tier Retrieval, and Self-RAG/Corrective RAG.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_queries',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-5.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E05: Retrieval Pipeline - HyDE, Multi-Tier Search, Self-RAG, Response Generation

## Your Mission

You are creating the retrieval pipeline service for a Frontier RAG module. This is the service that answers user questions by searching the knowledge base and generating grounded responses.

You will create 1 new file:
- `src/lib/services/rag/rag-retrieval-service.ts` -- 5+ exported functions

The service implements three frontier RAG techniques:
1. **HyDE (Hypothetical Document Embeddings)** -- Generate a hypothetical answer to bridge the vocabulary gap between user queries and formal document language
2. **Multi-Tier Retrieval** -- Search across document, section, and fact tiers for comprehensive context
3. **Self-RAG / Corrective RAG** -- Evaluate retrieval quality and re-query with broader search if context is insufficient

Plus the main orchestrator:
4. **`queryKnowledgeBase()`** -- Three-way mode selector (RAG Only / LoRA Only / RAG + LoRA) with full pipeline orchestration

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains the COMPLETE implementation code):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-5.md`

2. **Existing inference service** (the retrieval service calls this for LoRA model inference):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\inference-service.ts`

3. **Provider files** (retrieval uses LLM + embedding providers):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\providers\index.ts`

---

## Step 1: Verify Prerequisites

### 1a. Verify match_rag_embeddings function exists

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteSQL({sql:\"SELECT proname FROM pg_proc WHERE proname = 'match_rag_embeddings';\",transport:'pg'});console.log('match_rag_embeddings:',r.data?.length>0?'EXISTS':'MISSING - run E01 Step 3');})();"
```

### 1b. Verify prerequisite files exist

Check that these files exist:
- `src/types/rag.ts`
- `src/lib/providers/index.ts`
- `src/lib/services/rag/rag-ingestion-service.ts`
- `src/lib/services/rag/rag-expert-qa-service.ts`

---

## Step 2: Create the Retrieval Service

Create `src/lib/services/rag/rag-retrieval-service.ts` with the complete implementation from the specification.

Key things to verify in the code:
- Uses `createServerSupabaseAdminClient()` for DB operations
- Calls `match_rag_embeddings` via Supabase RPC (`.rpc('match_rag_embeddings', {...})`)
- HyDE generates a hypothetical answer via `llmProvider.generateHypotheticalAnswer()`
- Multi-tier search runs BOTH direct query embedding AND HyDE embedding, then merges results (union dedup)
- Self-RAG evaluates retrieval quality via `llmProvider.evaluateRetrieval()`
- If Self-RAG fails (score < threshold), `reQueryWithBroaderSearch()` is called with relaxed parameters
- `queryKnowledgeBase()` implements the three-way mode selector:
  - `rag_only` -- Retrieve context, generate response with LLM provider
  - `lora_only` -- Skip retrieval, send to inference endpoint
  - `rag_lora` -- Retrieve context, send to inference endpoint with context
- Query results are logged to `rag_queries` table
- Console logging uses `[RAG-RETRIEVAL]` prefix

---

## Step 3: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

---

## Success Criteria

- [ ] `src/lib/services/rag/rag-retrieval-service.ts` exists with all exported functions
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] HyDE implementation calls `llmProvider.generateHypotheticalAnswer()` with graceful fallback
- [ ] Multi-tier retrieval searches both query and HyDE embeddings, merges with dedup
- [ ] Self-RAG evaluates context quality and triggers re-query if insufficient
- [ ] Three-way mode selector correctly routes `rag_only`, `lora_only`, and `rag_lora` modes
- [ ] Query results are logged to `rag_queries` table with all metadata
- [ ] Citation extraction parses `[Section N]` markers from response text

---

## If Something Goes Wrong

### RPC Call to match_rag_embeddings Fails
- Verify the function was created in E01 Step 3
- Check that GRANT statements were executed for `authenticated` and `service_role` roles
- Test manually: `SELECT * FROM match_rag_embeddings(NULL::vector(1536), 0.5, 10);` should return empty (not error)

### Inference Service Import Errors
- The retrieval service may import from `src/lib/services/inference-service.ts` for LoRA mode
- If `callInferenceEndpoint` doesn't exist with the expected signature, adapt the import
- For Phase 1, LoRA mode can return a placeholder response with a `// TODO: Phase 2` comment

### Type Mismatches with Provider Methods
- Cross-reference the provider interface in `src/types/rag.ts` with what the service calls
- The specification was designed with consistent method signatures

---

## What's Next

**E06** will create all 10 API routes that expose these services to the frontend.

---

**End of E05 Prompt**


+++++++++++++++++
