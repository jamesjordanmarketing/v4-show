# Frontier RAG Module - Execution Prompt E02: TypeScript Types & Provider Abstraction

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E02 - TypeScript Types & Provider Abstraction
**Prerequisites:** E01 complete (all 8 database tables exist, pgvector enabled, openai package installed)
**Status:** Ready for Execution

---

## Overview

This prompt creates all TypeScript type definitions for the RAG module and implements the provider abstraction layer (LLM Provider + Embedding Provider). These types and providers are used by every subsequent prompt (E03-E10).

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

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-2.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E02: TypeScript Types & Provider Abstraction Layer

## Your Mission

You are creating the type system and provider abstraction layer for a Frontier RAG module in an existing Next.js 14 + Supabase + TypeScript application. You will create 6 new files:

1. `src/types/rag.ts` -- All RAG type definitions (8 table row types, API types, service types, provider interfaces)
2. `src/lib/providers/llm-provider.ts` -- LLM provider interface re-export
3. `src/lib/providers/claude-llm-provider.ts` -- Claude implementation with complete prompts
4. `src/lib/providers/embedding-provider.ts` -- Embedding provider interface re-export
5. `src/lib/providers/openai-embedding-provider.ts` -- OpenAI text-embedding-3-small implementation
6. `src/lib/providers/index.ts` -- Provider factory with environment-based switching

You will also update `src/types/index.ts` to re-export RAG types.

**Do NOT modify any existing files other than `src/types/index.ts`.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains ALL the code you need to create):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-2.md`

2. **Existing type conventions** (follow this naming and structure pattern):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\types\conversation.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\types\pipeline.ts`

3. **Existing provider/service patterns** (follow this singleton and config pattern):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\inference-service.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\ai-config.ts`

4. **Existing type index** (you will add a re-export here):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\types\index.ts`

---

## Step 1: Verify Database Tables Exist

Before creating types that map to database tables, verify the tables are in place:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let ok=true;for(const t of tables){const r=await saol.agentIntrospectSchema({table:t,includeColumns:false,transport:'pg'});if(!r.tables[0]?.exists){console.log('MISSING:',t);ok=false;}}console.log(ok?'All tables present - proceed':'STOP: Missing tables - run E01 first');})();"
```

**Expected:** `All tables present - proceed`

If any tables are missing, STOP and inform the user to run E01 first.

---

## Step 2: Create the RAG Types File

Create `src/types/rag.ts` with ALL the type definitions from the specification (FR-2.1).

The specification contains the complete code for this file. Create it exactly as specified, including:
- 8 database row types (matching table column names with camelCase conversion)
- Status and mode union types
- API request/response types
- Service-internal types
- Provider interfaces (`LLMProvider` with 9 methods, `EmbeddingProvider` with 4 methods)
- Quality constants and composite score function
- Display label records

---

## Step 3: Update the Types Index

Add a re-export line to `src/types/index.ts`:

**FIND** the end of the existing exports.

**ADD** this line:
```typescript
export * from './rag';
```

---

## Step 4: Create the Providers Directory

Create the `src/lib/providers/` directory if it doesn't already exist.

---

## Step 5: Create Provider Files

Create all 5 provider files exactly as specified in FR-2.2 and FR-2.3:

1. **`src/lib/providers/llm-provider.ts`** -- Re-exports the `LLMProvider` interface from `@/types/rag`
2. **`src/lib/providers/claude-llm-provider.ts`** -- Complete Claude implementation with all 9 methods and their full system prompts. This is the MOST IMPORTANT file -- the prompts define the quality of the entire RAG system.
3. **`src/lib/providers/embedding-provider.ts`** -- Re-exports the `EmbeddingProvider` interface from `@/types/rag`
4. **`src/lib/providers/openai-embedding-provider.ts`** -- OpenAI implementation using `text-embedding-3-small` (1536 dimensions)
5. **`src/lib/providers/index.ts`** -- Provider factory with `getLLMProvider()` and `getEmbeddingProvider()` factory functions, environment variable switching (`LLM_PROVIDER`, `EMBEDDING_PROVIDER`), and singleton pattern

---

## Step 6: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0 and no TypeScript errors.

### Common Build Errors and Fixes:

- **"Cannot find module '@/types/rag'"** -- Verify the file was created at `src/types/rag.ts` and `tsconfig.json` has `@/*` path mapping
- **"Cannot find module 'openai'"** -- Run `npm install openai` in the `src/` directory
- **"Cannot find module '@anthropic-ai/sdk'"** -- This should already be installed. Check `package.json`
- **Import errors in provider files** -- Verify the provider interface is correctly exported from `src/types/rag.ts`

---

## Step 7: Verify File Structure

Confirm all files were created:

```
src/types/rag.ts                              (NEW)
src/types/index.ts                            (MODIFIED - added re-export)
src/lib/providers/llm-provider.ts             (NEW)
src/lib/providers/claude-llm-provider.ts      (NEW)
src/lib/providers/embedding-provider.ts       (NEW)
src/lib/providers/openai-embedding-provider.ts (NEW)
src/lib/providers/index.ts                    (NEW)
```

---

## Success Criteria

- [ ] `src/types/rag.ts` exists with all 8 database row types, all status unions, all API types, both provider interfaces
- [ ] `src/types/index.ts` re-exports RAG types
- [ ] `src/lib/providers/` directory exists with 5 files
- [ ] Claude LLM provider has all 9 methods with complete system prompts (NOT placeholder text)
- [ ] OpenAI embedding provider uses `text-embedding-3-small` model with 1536 dimensions
- [ ] Provider factory uses environment variable switching with sensible defaults
- [ ] `npm run build` succeeds with zero TypeScript errors

---

## If Something Goes Wrong

### TypeScript Errors After Creating Types
1. Check that type names match exactly what the spec defines
2. Check that imports use `@/types/rag` (not relative paths)
3. Verify `tsconfig.json` has path aliases configured

### Provider Import Circular Dependencies
- Provider files should import types from `@/types/rag`
- The factory (`index.ts`) should import implementations, not the other way around
- Follow the singleton pattern from `src/lib/services/inference-service.ts`

### OpenAI Package Not Found
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm install openai
```

### Build Errors in Unrelated Files
- If existing files have build errors, those are pre-existing and not caused by this prompt
- Focus only on ensuring RAG-related files compile cleanly

---

## What's Next

**E03** will create the Ingestion Pipeline service, which uses the types and providers created in this prompt.

---

**End of E02 Prompt**


+++++++++++++++++
