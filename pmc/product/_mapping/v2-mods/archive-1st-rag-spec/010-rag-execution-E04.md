# Frontier RAG Module - Execution Prompt E04: Expert Q&A System

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E04 - Expert Q&A System
**Prerequisites:** E01 complete (database tables), E02 complete (types + providers), E03 complete (ingestion service)
**Status:** Ready for Execution

---

## Overview

This prompt creates the Expert Q&A service -- the human-in-the-loop system where domain experts answer targeted questions to refine the AI's understanding of their document. This is what makes the RAG system "frontier" -- it doesn't just chunk and embed, it actively learns from human expertise.

## Critical Instructions

### SAOL for Database Operations

Use SAOL for all database operations:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_expert_questions',limit:1});console.log(JSON.stringify(r,null,2));})();"
```

### Environment

**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents

- **Specification:** `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-4.md`
- **SAOL Guide:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E04: Expert Q&A - Question Presentation, Answer Collection, Knowledge Refinement

## Your Mission

You are creating the Expert Q&A service for a Frontier RAG module. This service manages the human-in-the-loop workflow where domain experts answer LLM-generated questions to improve document understanding.

You will create 1 new file:
- `src/lib/services/rag/rag-expert-qa-service.ts` -- 6 exported functions

The service handles:
1. `getQuestionsForDocument()` -- Fetch and sort expert questions by impact level
2. `submitExpertAnswers()` -- Persist answers and trigger knowledge refinement
3. `skipQuestion()` -- Mark a question as skipped
4. `refineKnowledge()` -- The core 9-step refinement pipeline (re-process sections, facts, embeddings based on expert answers)
5. `generateVerificationSamples()` -- Generate sample Q&A pairs for the expert to verify
6. `confirmVerification()` -- Mark the document as verified

**Do NOT modify any existing files. Only create new files.**

---

## Step 0: Read the Specification and Codebase

Read these files completely before writing any code:

1. **The specification** (contains the COMPLETE implementation code):
   `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\_mapping\v2-mods\008-rag-frontier-rag-detailed-spec_v1-section-4.md`

2. **The ingestion service** (the Q&A service calls back into ingestion for re-embedding):
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\services\rag\rag-ingestion-service.ts`

3. **Existing service patterns**:
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\supabase-server.ts`
   `C:\Users\james\Master\BrightHub\brun\v4-show\src\lib\errors\error-classes.ts`

---

## Step 1: Verify Prerequisites

Check that these files exist (from E02 and E03):
- `src/types/rag.ts`
- `src/lib/providers/llm-provider.ts`
- `src/lib/providers/index.ts`
- `src/lib/services/rag/rag-ingestion-service.ts`

If any are missing, STOP and inform the user to run the prerequisite prompts first.

---

## Step 2: Create the Expert Q&A Service

Create `src/lib/services/rag/rag-expert-qa-service.ts` with the complete implementation from the specification.

The specification file contains the entire file as code blocks. Create the file with that exact code.

Key things to verify in the code:
- Uses `createServerSupabaseAdminClient()` for all DB operations
- Console logging uses `[RAG Expert QA]` prefix
- `refineKnowledge()` implements the full 9-step pipeline:
  1. Fetch document with raw_text
  2. Fetch current sections and facts
  3. Fetch answered questions
  4. Call `llmProvider.refineKnowledge()` with expert answers
  5. Update section summaries
  6. Create new facts for expert-provided knowledge
  7. Regenerate contextual preambles
  8. Regenerate embeddings (delete old, insert new)
  9. Update document metadata and status to 'ready'
- Individual section/fact failures are logged but don't abort the pipeline
- If refinement fails entirely, document status is set to 'error' with error_message

---

## Step 3: Verify TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Build succeeds with exit code 0.

---

## Step 4: Verify File Structure

```
src/lib/services/rag/rag-expert-qa-service.ts  (NEW file)
```

Confirm the file exports these 6 functions:
- `getQuestionsForDocument`
- `submitExpertAnswers`
- `skipQuestion`
- `refineKnowledge`
- `generateVerificationSamples`
- `confirmVerification`

---

## Success Criteria

- [ ] `src/lib/services/rag/rag-expert-qa-service.ts` exists with all 6 exported functions
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] `refineKnowledge()` implements all 9 steps (not abbreviated)
- [ ] Service calls `getLLMProvider()` for LLM operations (not direct Anthropic SDK)
- [ ] Service calls `getEmbeddingProvider()` for embedding operations
- [ ] Questions are sorted by impact_level (high -> medium -> low) then by question_number
- [ ] Non-fatal continuation: individual section/fact updates don't abort the whole refinement

---

## If Something Goes Wrong

### Type Mismatch with LLM Provider
- The `refineKnowledge` method on `LLMProvider` must accept the parameters this service passes
- Cross-reference with `src/types/rag.ts` and `src/lib/providers/claude-llm-provider.ts`

### Import Errors for Ingestion Service
- If `refineKnowledge()` calls functions from the ingestion service (like `generateAndStoreEmbeddings`), verify the import path is correct
- Should be: `import { generateAndStoreEmbeddings } from './rag-ingestion-service'`

### Build Errors in Previous Files
- If E02 or E03 files have errors, fix those first before proceeding

---

## What's Next

**E05** will create the Retrieval Pipeline service, which uses the knowledge refined by this Q&A system to answer user queries.

---

**End of E04 Prompt**


+++++++++++++++++
