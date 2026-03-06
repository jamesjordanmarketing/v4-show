# Frontier RAG Module - Execution Prompt E03: Ingestion Pipeline Service

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E03 - Ingestion Pipeline Service
**Prerequisites:** E01 complete (database tables), E02 complete (types + providers)
**Status:** Ready for Execution

---

## Overview

This prompt creates the Ingestion Pipeline service -- the core engine that transforms a raw uploaded document into a fully indexed, searchable knowledge representation. It handles file upload, text extraction, LLM document reading, contextual retrieval, and multi-tier embedding generation.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_documents',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-3.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E03: Ingestion Pipeline - Upload, Extract, Process, Embed

## Your Mission

You are creating the ingestion pipeline service for a Frontier RAG module in an existing Next.js 14 + Supabase application. This service is the most critical component -- everything downstream depends on it.

You will create 1 new file:
- `src/lib/services/rag/rag-ingestion-service.ts` -- 5 exported functions + 3 private helpers

The service handles:
1. `uploadDocument()` -- Upload file to Supabase Storage + create DB record
2. `extractText()` -- Extract raw text from PDF/DOCX/TXT/MD
3. `processDocument()` -- Full pipeline orchestrator (extract -> LLM read -> store knowledge -> contextual retrieval -> embed)
4. `applyContextualRetrieval()` -- Generate contextual preambles per section (Anthropic technique)
5. `generateAndStoreEmbeddings()` -- Multi-tier embedding generation (document/section/fact)

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains the COMPLETE implementation code):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-3.md`

2. **Existing service patterns** (follow these conventions for error handling, logging, Supabase client usage):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\batch-generation-service.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\inference-service.ts`

3. **Supabase server client** (this is how you get DB and Storage access):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\supabase-server.ts`

4. **Error classes** (use AppError with ErrorCode for all thrown errors):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\errors\error-classes.ts`

---

## Step 1: Verify Prerequisites

### 1a. Verify types and providers exist (from E02)

Check that these files exist:
- `src/types/rag.ts`
- `src/lib/providers/llm-provider.ts`
- `src/lib/providers/embedding-provider.ts`
- `src/lib/providers/index.ts`

If any are missing, STOP and inform the user to run E02 first.

### 1b. Verify database tables exist (from E01)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_documents',includeColumns:false,transport:'pg'});console.log('rag_documents:',r.tables[0]?.exists?'EXISTS':'MISSING');})();"
```

---

## Step 2: Create the Service Directory

Create the `src/lib/services/rag/` directory if it doesn't exist.

---

## Step 3: Create the Ingestion Service

Create `src/lib/services/rag/rag-ingestion-service.ts` with the complete implementation from the specification.

The specification file contains the **entire file** as a single code block under **"Complete Implementation"**. Create the file with that exact code.

Key things to verify in the code:
- Imports use `@/lib/supabase-server` (not relative path)
- Imports use `@/lib/errors/error-classes` (not relative path)
- Imports use `@/lib/providers/llm-provider` and `@/lib/providers/embedding-provider`
- Imports use `@/types/rag` for type definitions
- All console.log statements use `[RAG-INGESTION]` prefix
- Error handling uses `AppError` with `ErrorCode` enum values
- `pdf-parse` and `mammoth` are imported via `require()` (not ES import) for Next.js compatibility

---

## Step 4: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

### Common Build Errors:

- **"Cannot find module 'pdf-parse'"** -- This should already be installed. Check `package.json`. If missing: `npm install pdf-parse`
- **"Cannot find module 'mammoth'"** -- This should already be installed. Check `package.json`. If missing: `npm install mammoth`
- **Type mismatch with provider methods** -- Verify that the `LLMProvider` interface methods in `src/types/rag.ts` match what the ingestion service calls. Check method names and parameter types.
- **"Property 'xxx' does not exist on type 'RAGDocument'"** -- The `mapDocumentRow()` function at the bottom of the file must match the `RAGDocument` interface exactly. Cross-reference with `src/types/rag.ts`.

---

## Step 5: Verify File Structure

```
src/lib/services/rag/                          (NEW directory)
src/lib/services/rag/rag-ingestion-service.ts  (NEW file)
```

Confirm the file exports these 5 functions:
- `uploadDocument`
- `extractText`
- `processDocument`
- `applyContextualRetrieval`
- `generateAndStoreEmbeddings`

---

## Success Criteria

- [ ] `src/lib/services/rag/rag-ingestion-service.ts` exists with all 5 exported functions
- [ ] File imports resolve correctly (supabase-server, error-classes, providers, types)
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] File uses `createServerSupabaseAdminClient()` for all DB operations (not `createServerSupabaseClient`)
- [ ] File uses `[RAG-INGESTION]` prefix for all console.log statements
- [ ] Upload function includes rollback logic if storage upload fails after DB insert
- [ ] Process function handles both `fast_mode: true` (status='ready') and `fast_mode: false` (status='needs_questions')
- [ ] Embedding generation uses batching with `EMBEDDING_BATCH_SIZE = 50`

---

## If Something Goes Wrong

### Import Resolution Errors
- Verify `tsconfig.json` has `"@/*": ["./src/*"]` path mapping
- Verify provider files from E02 are in the correct locations

### Type Mismatches Between Service and Types
- The specification was designed with consistent types across sections
- If there's a mismatch, the `src/types/rag.ts` definition is the source of truth
- Adjust the service code to match the type definitions

### pdf-parse or mammoth Not Found
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm install pdf-parse mammoth
```

---

## What's Next

**E04** will create the Expert Q&A service, which refines the knowledge extracted by this ingestion pipeline.

---

**End of E03 Prompt**


+++++++++++++++++
