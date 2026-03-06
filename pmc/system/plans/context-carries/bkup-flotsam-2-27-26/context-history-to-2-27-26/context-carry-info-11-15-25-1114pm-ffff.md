# Context Carryover: RAG Document Processing — Inngest Migration Complete, Pending Final Verification

## 📌 CRITICAL INSTRUCTION FOR NEXT AGENT

**⚠️ DO NOT start implementing, fixing, deploying, or writing anything.**

Your ONLY job upon receiving this context is to:
1. ✅ Read and internalize ALL context files listed in this document
2. ✅ Read the entire conversation transcript that led to this carryover
3. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. ✅ Read ALL specification and QA documents listed in the "Important Documentation" section below
5. ✅ Understand the current RAG module state, including the Inngest migration and all bug fixes
6. ✅ **STOP and WAIT for explicit human instructions**

The human will provide specific directions on what to work on next. Do NOT assume or suggest implementations.

---

## 🎯 CURRENT STATUS: RAG Document Processing — Core Pipeline Working, Database Schema Fix Needed

### Session Summary (February 15, 2026)

**Primary Achievement**: Successfully migrated RAG document processing from Vercel serverless functions (300s timeout limit) to Inngest background jobs (unlimited execution time). Core pipeline is now working end-to-end with Claude processing 18,844 output tokens in 2.7 minutes.

**Session Activities**:
1. ✅ Diagnosed and fixed 15 distinct bugs in RAG document processing pipeline
2. ✅ Implemented Inngest integration for long-running Claude API calls
3. ✅ Enhanced prompt to extract 50-150 facts including tables, exceptions, and policy rules
4. ✅ Increased Claude output token limit from 16,384 to 32,768 tokens
5. ✅ Set 20-minute timeout on Anthropic client for large document processing
6. ✅ **VERIFIED**: Bug #15 fix working — Claude processing completes successfully with no truncation
7. ⚠️ **NEW BUG FOUND**: Database constraint violation prevents storing new fact types (`policy_rule`, `policy_exception`, `table_row`)

### Latest Issue (Bug #16 — Discovered During Verification)

**Bug #16: Database Check Constraint Rejects New Fact Types**

**Status**: ⚠️ **BLOCKING FACT STORAGE** — Document processing completes but 0 facts stored

**Verification Test Results** (`vercel-log-21.csv`, document ID: `aaf4ff3f-27a7-4e69-90c8-db620b606544`):
- ✅ Claude API call: 163 seconds (2.7 minutes) — well within 20-minute timeout
- ✅ Input tokens: 27,475 | Output tokens: 18,844 (no truncation, 32K limit working)
- ✅ JSON parsing: Successful (robust extraction working)
- ✅ Sections stored: 10 sections
- ❌ Facts stored: 0 facts (constraint violation)
- ✅ Expert questions stored: 5 questions
- ✅ Embeddings generated: 11 embeddings (document + 10 sections, no facts)
- ✅ Status: Completed successfully

**Bug #15 (Previous Issue) Verification**:

**Status**: ✅ **VERIFIED WORKING** — 20-minute timeout successfully allows large document processing

**Problem**: After increasing `maxTokens` to 32,768, the Anthropic SDK calculated that the request could take longer than 10 minutes. The SDK has a built-in safety check that rejects requests immediately without an explicit timeout configured. This caused Inngest to report completion in 1 second with `success: true`, but the actual processing never started.

**Error From Vercel Logs** (`vercel-log-20.csv`):
```
[RAG Ingestion] LLM processing failed: Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details
```

**Fix**: Set explicit 20-minute timeout in Anthropic client constructor:
```typescript
constructor() {
  this.client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    timeout: 20 * 60 * 1000, // 20 minutes in milliseconds
  });
}
```

This tells the SDK to allow requests up to 20 minutes, which is safe in the Inngest environment with unlimited execution time.

**Verification Result**: ✅ **WORKING** — Test document processed successfully in 2.7 minutes with 18,844 output tokens. No truncation, no timeout errors.

### Bug #16: Database Constraint Violation for New Fact Types (CURRENT ISSUE)

**Status**: ⚠️ **BLOCKING FACT STORAGE** — Discovered February 15, 2026 at 4:22 AM Pacific

**Problem**: The `rag_facts` table has a check constraint `rag_facts_fact_type_check` that only allows the original fact types: `fact`, `entity`, `definition`, `relationship`. When Claude extracts the new enhanced fact types (`policy_rule`, `policy_exception`, `table_row`), the database rejects them with constraint violation.

**Error From Vercel Logs** (`vercel-log-21.csv`):
```
code: '23514',
message: 'new row for relation "rag_facts" violates check constraint "rag_facts_fact_type_check"'
details: 'Failing row contains (..., policy_rule, R1: Prospective clients must demonstrate a minimum of $10,000,00..., ...)'
```

**Root Cause**: 
- ✅ TypeScript types were updated to include new fact types
- ✅ Claude prompt was updated to extract new fact types
- ❌ Database check constraint was NOT updated to allow new fact types

**Impact**: 
- Document processing completes successfully (status = `completed`)
- Sections and expert questions are stored correctly
- **ALL facts are rejected** by the database (0 facts stored)
- Embeddings are generated only for document + sections (not facts)
- User sees expert Q&A questions but no extracted facts

**Example Rejected Fact**:
```typescript
{
  fact_type: "policy_rule",  // ← Database constraint rejects this value
  content: "R1: Prospective clients must demonstrate a minimum of $10,000,000.00 in liquid, unencumbered U.S. assets during the onboarding phase.",
  source_text: "BC-ELIG-001, Policy Rules, R1",
  confidence: 0.99
}
```

**Fix Required**: Update the `rag_facts` table check constraint to allow the new fact types:
```sql
ALTER TABLE rag_facts 
DROP CONSTRAINT rag_facts_fact_type_check;

ALTER TABLE rag_facts 
ADD CONSTRAINT rag_facts_fact_type_check 
CHECK (fact_type IN (
  'fact', 
  'entity', 
  'definition', 
  'relationship',
  'table_row',          -- NEW
  'policy_exception',   -- NEW
  'policy_rule'         -- NEW
));
```

**Note**: This fix must be applied via SAOL using a database migration script, similar to the `fix-match-rag-embeddings.js` approach used for Bug #8.

---

## 🚨 COMPLETE BUG HISTORY: 16 Bugs (15 Fixed, 1 Active)

### Bug #3v1 & #3v2: JSON Parsing with Code Fences (FIXED)
- **Problem**: Claude returned JSON wrapped in markdown code fences (````json ... ````)
- **Fix v1**: Regex-based extraction (failed in production)
- **Fix v2**: Robust string-based extraction (find first `{`/`[`, last `}`/`]`)
- **Status**: ✅ Fixed, verified working

### Bug #4: Vercel Runtime Timeout (FIXED)
- **Problem**: Claude API call exceeding Vercel's 300s serverless function limit
- **Fix v1**: Added 120-second `AbortController` timeout to Claude API call
- **Status**: ⚠️ This became insufficient after enhanced prompts; led to Inngest migration

### Bug #5: Model Performance Issues (FIXED)
- **Problem**: `claude-sonnet-4-5-20250929` too slow for analysis (hitting 120s timeout)
- **Fix**: Switched default model to `claude-haiku-4-5-20251001`, added `RAG_LLM_MODEL` env var override
- **Diagnostic Tools Created**:
  - API route: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\documents\[id]\diagnostic-test\route.ts`
  - UI panel in document detail page
  - Local test script: `test-claude-api.js`
- **Status**: ✅ Fixed, Haiku is default model

### Bug #5b: Vercel Build Failure with Diagnostic Route (FIXED)
- **Problem**: `const` scope issues for `timeout1` and `timeout2` variables
- **Fix**: Changed to `let` declarations outside `try` blocks with null checks
- **Status**: ✅ Fixed

### Bug #6: Haiku + 8192 Tokens Insufficient (FIXED)
- **Problem**: Claude hit `max_tokens` at 8,192 output tokens (`stopReason: 'max_tokens'`), truncating JSON
- **Fix**: Increased `llm.maxTokens` from 8,192 to 16,384 in `config.ts`
- **Status**: ✅ Fixed, then later increased again to 32,768

### Bug #7: Missing OpenAI API Key for RAG Chat (FIXED)
- **Problem**: RAG chat queries failed with 401: "You didn't provide an API key"
- **Fix**: Added explicit validation in `OpenAIEmbeddingProvider` constructor to throw clear error if `OPENAI_API_KEY` missing
- **Status**: ✅ Fixed, user added key to Vercel environment variables

### Bug #8: PostgreSQL Function Type Mismatch (FIXED)
- **Problem**: `function jsonb_array_elements(vector) does not exist` error in `match_rag_embeddings`
- **Fix**: Created `fix-match-rag-embeddings.js` script to drop old function and create correct version using `vector(1536)` type with pgvector's `<=>` operator
- **Status**: ✅ Fixed, script executed against production database

### Bug #9: NULL `knowledge_base_id` Constraint Violation (FIXED)
- **Problem**: RAG queries failed with "null value in column 'knowledge_base_id' violates not-null constraint"
- **Fix**: Modified `rag-retrieval-service.ts` to fetch `knowledge_base_id` from `rag_documents` if not provided
- **Status**: ✅ Fixed

### Bug #10: Response Generation Returning NULL (FIXED)
- **Problem**: Chat showed empty AI response area with low self-eval score (15%)
- **Root Cause**: Schema mismatch - `systemPrompt` asked for `"answer"` field but code expected `"responseText"`
- **Fix**: Updated `systemPrompt` in `rag-retrieval-service.ts` to use `"responseText"` and corrected citation structure
- **Status**: ✅ Fixed

### Bug #11: LoRA Query Fails - Serverless Workers Stuck (FIXED)
- **Problem**: LoRA-only queries never returned, workers perpetually "initializing"
- **Fix**: Enhanced error messages in `inference-serverless.ts` to immediately throw actionable error, recommending switch to "pods" mode
- **Status**: ✅ Fixed, user switched to pods mode

### Bug #12: Log Clarity Improvement (FIXED)
- **Problem**: Confusing `[RAG+LoRA]` log prefix for both `lora_only` and `rag_and_lora` modes
- **Fix**: Renamed `generateResponseWithLoRA` to `generateLoRAResponse`, updated log prefix to `[LoRA-INFERENCE]`
- **Status**: ✅ Fixed

### Bug #13: RAG Retrieval Missing Specific Information (FIXED)
- **Problem**: RAG failed to retrieve specific age ranges from tables and DTI exceptions from policy document
- **Root Cause**: Overly coarse chunking, lack of specific extraction instructions for structured data
- **Solution 1 - Hierarchical Chunking (IMPLEMENTED)**:
  - Enhanced Claude prompt to extract 50-150 facts (up from 20-50)
  - Added specific instructions to extract EACH table row as `table_row` fact
  - Added specific instructions to extract EACH exception/rule as `policy_exception`/`policy_rule` fact
  - Updated `factType` enum in prompt schema
- **Solution 2 - Lower Similarity Threshold (IMPLEMENTED)**:
  - Changed `similarityThreshold` from 0.5 to 0.4 in `config.ts`
- **Status**: ✅ Both solutions implemented
- **Documentation**: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`

### Bug #14: Claude API Timeout After Prompt Enhancement (FIXED via Inngest Migration)
- **Problem**: Enhanced prompt (50-150 facts) caused Claude API calls to exceed 120s timeout, approaching Vercel's 300s limit
- **Solution**: Migrate `processDocument()` to Inngest background jobs with unlimited execution time
- **Implementation**:
  - Created detailed specification: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`
  - Created Inngest client: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts`
  - Created Inngest function: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts`
  - Created webhook endpoint: `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\route.ts`
  - Modified upload route to trigger Inngest event instead of `waitUntil()`
  - Modified process route to trigger Inngest event instead of `waitUntil()`
  - Added `inngest` dependency to both root and `src/package.json`
  - Configured Vercel integration with deployment protection bypass
  - Lowered concurrency from 10 to 5 to comply with Inngest free tier
  - Removed 120-second `AbortController` timeout from `claude-llm-provider.ts`
- **Status**: ✅ Inngest integration complete and deployed

### Bug #14b: JSON Truncation at 16K Tokens (FIXED)
- **Problem**: Enhanced prompt produced >16K output tokens, causing JSON truncation mid-response
- **Evidence**: `vercel-log-19.csv` showed parse error at position 59,273 with "Ages 16-22" table row incomplete
- **Fix**: Increased `llm.maxTokens` from 16,384 to 32,768 in `config.ts`
- **Status**: ✅ Fixed, committed in `441e396`

### Bug #15: Anthropic SDK Timeout Enforcement (LATEST FIX - PENDING VERIFICATION)
- **Problem**: With 32K `maxTokens`, SDK calculated >10min request time and rejected it immediately
- **Fix**: Set explicit 20-minute timeout in Anthropic client constructor
- **Status**: ⚠️ Deployed in commit `f733fea`, needs verification

---

## 🏗 RAG Module Architecture (For Next Agent)

### Overview

The RAG (Retrieval-Augmented Generation) module is called **RAG Frontier** in the UI. It lets users upload documents, processes them via Claude LLM to extract structured knowledge (sections, facts, entities, expert questions), generates embeddings via OpenAI, and then supports querying against the document knowledge base.

### RAG Processing Pipeline (`processDocument()`)

**NOW RUNS IN INNGEST BACKGROUND JOBS** (unlimited execution time)

Located in `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-ingestion-service.ts` (545 lines)

| Step | Operation | Estimated Time | External Calls |
|------|-----------|---------------|----------------|
| 1 | Fetch document from DB | <1s | Supabase |
| 2 | Update status to `processing` | <1s | Supabase |
| 3 | `provider.readDocument()` — Full document understanding | **2-10 minutes** | **1 large Claude call** (32K tokens) |
| 4 | Store sections in DB | <1s | Supabase |
| 5 | Generate contextual preamble per section | **10-60s** | **N Claude calls** (1 per section) |
| 6 | Store facts in DB | <1s | Supabase |
| 7 | Store expert questions in DB | <1s | Supabase |
| 8 | Generate embeddings (3 tiers) via OpenAI | **5-20s** | OpenAI |
| 9 | Update final document status | <1s | Supabase |

**Total estimated: 2-12 minutes** — runs in Inngest with unlimited execution time

### Inngest Integration Architecture

**Trigger Flow**:
1. User uploads document via `/api/rag/documents/[id]/upload`
2. API route stores file in Supabase Storage, creates DB record
3. API route sends Inngest event: `inngest.send({ name: 'rag/document.uploaded', data: { documentId, userId } })`
4. Returns HTTP 202 immediately to user
5. Inngest worker picks up event asynchronously
6. Inngest calls `processDocument()` with unlimited execution time
7. Inngest provides automatic retries (3 attempts), observability, and logging

**Key Files**:
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` — Inngest client configuration, event type definitions
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` — Main Inngest function (concurrency: 5)
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` — Function registry
- `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\route.ts` — Webhook endpoint for Inngest communication
- `C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md` — Complete implementation summary

**Environment Variables**:
- `INNGEST_EVENT_KEY` — For sending events to Inngest
- `INNGEST_SIGNING_KEY` — For webhook authentication
- Both set in Vercel environment variables and `.env.local`

**Inngest Dashboard**: https://app.inngest.com/
- Monitor job status, view traces, debug failures
- Production URL: `https://v4-show.vercel.app/api/inngest?x-vercel-protection-bypass=<bypass-key>`

### RAG File Structure

#### LLM Providers (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\`)
- `claude-llm-provider.ts` — **⚠️ HEAVILY MODIFIED**
  - Enhanced `readDocument()` prompt to extract 50-150 facts including table rows, exceptions, rules
  - Increased `maxTokens` to 32,768
  - Set 20-minute timeout in Anthropic client constructor
  - Added `parseJsonResponse()` helper with robust string extraction
  - Added `max_tokens` detection and warning
  - Contains 7 methods: `readDocument`, `generateContextualPreamble`, `refineKnowledge`, `generateHyDE`, `selfEvaluate`, `generateResponse`, `evaluateQuality`, `generateVerificationQuestions`
- `llm-provider.ts` — LLM provider interface
- `embedding-provider.ts` — Embedding provider interface
- `openai-embedding-provider.ts` — OpenAI embeddings implementation with API key validation
- `index.ts` — Provider exports

#### Services (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\`)
- `rag-ingestion-service.ts` — **Core pipeline**: `processDocument()` (called by Inngest), `uploadDocumentFile()`, `createDocumentRecord()`, `extractDocumentText()`
- `rag-retrieval-service.ts` — **⚠️ MODIFIED** — Query and search functionality, fixed schema mismatch for response generation, renamed LoRA function
- `rag-embedding-service.ts` — Embedding generation and management
- `rag-expert-qa-service.ts` — Expert question answering
- `rag-quality-service.ts` — Quality evaluation
- `rag-db-mappers.ts` — Database row-to-type mapping
- `index.ts` — Service exports

#### Config (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\config.ts`)
- **⚠️ MODIFIED**: Increased `llm.maxTokens` to 32,768, lowered `similarityThreshold` to 0.4
- `RAG_CONFIG` — LLM model, max tokens, temperature, embedding model settings

#### API Routes (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\`)
- `documents/route.ts` — List/Create documents
- `documents/[id]/route.ts` — Get/Delete document
- `documents/[id]/upload/route.ts` — **⚠️ MODIFIED** — File upload, triggers Inngest event (no longer uses `waitUntil()`)
- `documents/[id]/process/route.ts` — **⚠️ MODIFIED** — Re-trigger processing, triggers Inngest event (no longer uses `waitUntil()`)
- `documents/[id]/diagnostic-test/route.ts` — **⚠️ NEW** — Incremental diagnostic tests for Claude API
- `documents/[id]/questions/route.ts` — Expert questions
- `documents/[id]/verify/route.ts` — Verification
- `knowledge-bases/route.ts` — Knowledge base CRUD
- `models/route.ts` — Model listing
- `quality/route.ts` — Quality evaluation
- `query/route.ts` — Query against knowledge base

#### Inngest Integration (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\`)
- `client.ts` — **⚠️ NEW** — Inngest client configuration, event type definitions
- `functions/process-rag-document.ts` — **⚠️ NEW** — Main background job function
- `functions/index.ts` — **⚠️ NEW** — Function registry

#### API Webhook (`C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\`)
- `route.ts` — **⚠️ NEW** — Inngest webhook endpoint for job communication

### Vercel Deployment Configuration

- **Build root**: `C:\Users\james\Master\BrightHub\BRun\v4-show\src` (the `src` directory is the Next.js root)
- **`vercel.json`** is at `C:\Users\james\Master\BrightHub\BRun\v4-show\vercel.json` (root) — contains only cron configs
- **`maxDuration`** removed from upload/process routes (no longer needed with Inngest)
- **Vercel Plan**: Pro (allows up to 300s function timeout, but now using Inngest for unlimited time)
- **Background processing**: Now uses Inngest instead of `waitUntil()`

### Database Tables (RAG-specific)

- `rag_knowledge_bases` — Knowledge base containers
- `rag_documents` — Document metadata, status, processing info (columns: `status`, `section_count`, `fact_count`, `processing_error`, `processing_started_at`)
- `rag_sections` — Extracted document sections
- `rag_facts` — Extracted atomic facts (now includes `table_row`, `policy_exception`, `policy_rule` types)
- `rag_expert_questions` — Expert questions for knowledge refinement
- `rag_embeddings` — Vector embeddings for search
- `rag_queries` — Query history with `knowledge_base_id` constraint

### Database Scripts Created

- `C:\Users\james\Master\BrightHub\BRun\v4-show\fix-match-rag-embeddings.sql` — SQL to fix PostgreSQL function
- `C:\Users\james\Master\BrightHub\BRun\v4-show\fix-match-rag-embeddings.js` — Node script to apply SQL fix

---

## 📋 Important Documentation

### QA Documents (MUST READ)

1. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md`** (2,531 lines)
   - Documents Bugs #1-#12 with complete root cause analysis
   - Contains questions/answers about button functionality, context persistence, adapter usage
   - Reference for understanding early RAG processing issues

2. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`** (681 lines)
   - Documents Bug #13 (RAG Retrieval Missing Specific Information)
   - Details hierarchical chunking solution with table extraction
   - Explains similarity threshold adjustment rationale

3. **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`** (1,245 lines)
   - **CRITICAL**: Complete specification for Inngest migration
   - Detailed architecture, file changes, environment variables
   - Testing strategy and rollback plan
   - This document was the blueprint for Bug #14 fix

4. **`C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md`** (266 lines)
   - Implementation summary of Inngest migration
   - Lists all new and modified files
   - Environment variable configuration
   - Deployment steps and verification checklist

### Test Document

- **`C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\Sun-Chip-Bank-Policy-Document-v2.0.md`**
  - Primary test document used throughout session
  - Contains complex tables (Human Capital Competency Framework)
  - Contains policy exceptions (E1: High Liquidity Offset, DTI 45%)
  - Used to verify table extraction and hierarchical chunking

### Vercel Log Files (Evidence Trail)

All logs located in `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\test-data\`:

- `vercel-log-7.csv` — Bug #3v2: JSON truncation, 0 sections/data
- `vercel-log-8.csv` — Bug #4: Timeout after 120s
- `vercel-log-9.csv` — Bug #5: Sonnet too slow, 120s timeout
- `vercel-log-10.csv` — Bug #6: Haiku hitting max_tokens at 8K
- `vercel-log-11.csv` — Bug #7: Missing OpenAI API key
- `vercel-log-12.csv` — Bug #8: PostgreSQL function type mismatch
- `vercel-log-13.csv` — Bug #9: NULL knowledge_base_id constraint
- `vercel-log-15.csv` — Bug #11: LoRA serverless workers stuck
- `vercel-log-16.csv` — Questions about button functionality, context persistence
- `vercel-log-17.csv` — Bug #14: Prompt timeout after enhanced extraction
- `vercel-log-18.csv` — Bug #14 recurrence: Still hitting 120s timeout with Inngest
- `vercel-log-19.csv` — Bug #14b: JSON truncation at 16K tokens
- `vercel-log-20.csv` — Bug #15: Anthropic SDK timeout enforcement
- `vercel-log-21.csv` — Bug #15 verification SUCCESS + Bug #16 discovered: Database constraint violation on new fact types

---

## 📂 Files Modified in This Session

### Core RAG Files

| File | Changes |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\claude-llm-provider.ts` | (1) Added `parseJsonResponse()` helper with robust string extraction<br>(2) Enhanced `readDocument()` prompt for 50-150 facts, table rows, exceptions, rules<br>(3) Increased focus on hierarchical chunking<br>(4) Added `max_tokens` detection/warning<br>(5) Set 20-minute timeout in Anthropic client constructor |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\config.ts` | (1) Changed default model to `claude-haiku-4-5-20251001`<br>(2) Added `RAG_LLM_MODEL` env var override<br>(3) Increased `llm.maxTokens` from 16,384 → 32,768<br>(4) Lowered `similarityThreshold` from 0.5 → 0.4<br>(5) Removed `claude-3-7-sonnet-20250219` from comments |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\providers\openai-embedding-provider.ts` | Added validation to throw error if `OPENAI_API_KEY` missing |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\rag\services\rag-retrieval-service.ts` | (1) Fixed `knowledge_base_id` lookup when null<br>(2) Fixed `systemPrompt` schema mismatch (`"responseText"` not `"answer"`)<br>(3) Renamed `generateResponseWithLoRA` → `generateLoRAResponse`<br>(4) Updated log prefix to `[LoRA-INFERENCE]` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\lib\services\inference-serverless.ts` | Enhanced error messages for worker initialization/timeout issues |

### API Routes Modified

| File | Changes |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\documents\[id]\upload\route.ts` | (1) Removed `waitUntil()` and `maxDuration`<br>(2) Added Inngest event trigger: `inngest.send({ name: 'rag/document.uploaded', data: { documentId, userId } })` |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\documents\[id]\process\route.ts` | (1) Removed `waitUntil()` and `maxDuration`<br>(2) Added Inngest event trigger |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\rag\documents\[id]\diagnostic-test\route.ts` | **NEW**: Incremental diagnostic tests (simple prompt, document estimate, full analysis) |

### Inngest Integration Files (NEW)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\client.ts` | Inngest client configuration, event type definitions, retry logic |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\process-rag-document.ts` | Main background job function (concurrency: 5, retries: 3) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\inngest\functions\index.ts` | Function registry exporting all Inngest functions |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\app\api\inngest\route.ts` | Webhook endpoint for Inngest communication (GET, POST, PUT handlers) |

### Database Scripts (NEW)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\fix-match-rag-embeddings.sql` | SQL to fix `match_rag_embeddings` PostgreSQL function type signature |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\fix-match-rag-embeddings.js` | Node script to execute SQL fix against production database |

### Configuration Files Modified

| File | Changes |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\package.json` (root) | Added `"inngest": "^3.29.0"` dependency |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\src\package.json` | Added `"inngest": "^3.29.0"` dependency (CRITICAL for Vercel build) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local` | Added `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` |

### Documentation Files (NEW/UPDATED)

| File | Purpose |
|------|---------|
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md` | Updated with Bugs #1-#12 documentation |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md` | Created for Bug #13 (retrieval improvement) |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md` | Created as Inngest migration specification |
| `C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md` | Created as implementation summary |

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
    - ✅ **15 BUGS FIXED**: All document processing issues resolved
    - ⚠️ **PENDING**: Final verification test on production

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
- `match_rag_embeddings(vector(1536), float, int)` - Vector similarity search using pgvector `<=>` operator

---

## 🔄 Current State & Next Steps

### What Works (Verified February 15, 2026)

- ✅ RAG Frontier UI: Knowledge base creation, document upload, document listing
- ✅ Document text extraction (markdown, text, PDF)
- ✅ File storage in Supabase Storage
- ✅ Inngest integration: Background job processing with unlimited execution time (verified 2.7 min processing time)
- ✅ Claude LLM call with enhanced prompt (50-150 facts, table rows, exceptions, rules)
- ✅ JSON parsing with robust string extraction (verified on production)
- ✅ 32K token output capacity (verified: 18,844 tokens generated successfully)
- ✅ 20-minute timeout (verified: no timeout errors, processing completed in 163 seconds)
- ✅ Enhanced retrieval with 0.4 similarity threshold
- ✅ Section storage (10 sections stored successfully)
- ✅ Expert question storage (5 questions stored successfully)
- ✅ Embedding generation (11 embeddings for document + sections)
- ✅ Status updates (document marked as `completed`)
- ✅ TypeScript build passes
- ✅ Vercel deployment successful
- ✅ Bug #15 fix verified and working

### What Needs Fixing

- ⚠️ **Bug #16 (ACTIVE)**: Database constraint violation prevents storing facts with new types (`policy_rule`, `policy_exception`, `table_row`)
  - **Impact**: 0 facts stored despite Claude extracting them successfully
  - **Fix**: Update `rag_facts_fact_type_check` constraint to allow new fact types
  - **Priority**: HIGH — blocking core RAG functionality

### What Needs Testing (After Verification)

- RAG query functionality end-to-end
- RAG chat with different query modes (RAG-only, LoRA-only, RAG+LoRA)
- RAG + LoRA integration (spec exists at `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\implement-rag\rag-frontier-execution-prompt-E12-lora-rag-integration_v1.md`)

### Possible Next Actions (WAIT FOR HUMAN DIRECTION)

**Option 1: Fix Bug #16 — Database Constraint for New Fact Types (HIGHEST PRIORITY)**
- Create database migration script similar to `fix-match-rag-embeddings.js`
- Use SAOL to update `rag_facts` table check constraint
- Add new fact types: `table_row`, `policy_exception`, `policy_rule`
- Re-process test document to verify facts are stored
- Expected result: ~50-150 facts stored (currently 0)

**Option 2: Verify Full RAG Pipeline After Bug #16 Fix**
- Confirm facts stored correctly with new types
- Verify embeddings generated for facts (not just document + sections)
- Test fact retrieval with similarity search
- Verify enhanced chunking strategy is working

**Option 3: Test RAG Query Pipeline**
- After fact storage works, test end-to-end query functionality
- Verify HyDE generation, embedding search, response generation, self-evaluation
- Test all three chat modes (RAG-only, LoRA-only, RAG+LoRA)
- Verify hierarchical chunking improves retrieval (Bug #13 solution)

**Option 4: Continue RAG Development**
- Begin E12 LoRA + RAG integration per specification
- Implement RAG context injection into LoRA prompts
- Build combined evaluation metrics

**DO NOT choose any option without explicit human direction.**

---

## 🚫 Final Reminder

**DO NOT start implementing, fixing, or designing anything without explicit human direction.**

Your job is to:
1. ✅ Read and internalize ALL the above context
2. ✅ Read the entire transcript of the conversation that led to this carryover
3. ✅ Understand the codebase at `C:\Users\james\Master\BrightHub\BRun\v4-show\src`
4. ✅ Read ALL QA and specification documents:
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v1.md`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\008-rag-module-QA_v2.md`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\v2-mods\009-rag-process-doc-upgrade_v1.md`
   - `C:\Users\james\Master\BrightHub\BRun\v4-show\INNGEST_IMPLEMENTATION_SUMMARY.md`
5. ✅ Understand the Inngest architecture and all 15 bug fixes
6. ✅ **WAIT** for human to provide explicit instructions

The human will direct you on what to work on next. This could be:
- Verifying the Bug #15 fix on production
- Testing RAG query pipeline
- Working on E12 LoRA + RAG integration
- Adding more diagnostic capabilities
- Something completely different

**Do not assume. Wait for instructions.**

---

**Last Updated**: February 15, 2026 (4:30 AM Pacific)
**Session Focus**: RAG document processing debugging — 15 bugs fixed, Inngest migration complete and VERIFIED, Bug #16 discovered (database constraint)
**Current Mode**: RAG debugging — core pipeline working, database schema update needed
**Document Version**: context-carry-info-11-15-25-1114pm-ffff (updated with Bug #16)
**Implementation Location**: `C:\Users\james\Master\BrightHub\BRun\v4-show\`
**Build Status**: ✅ TypeScript build successful
**Latest Commit**: `f733fea` ("fix(rag): set 20-minute timeout for Claude API client") — pushed to main
**Deployment**: Auto-deployed to Vercel from main branch push
**Inngest Status**: ✅ Fully integrated, operational, and verified (2.7 min processing time, 18,844 output tokens)
**Inngest Dashboard**: https://app.inngest.com/env/production/apps
**Latest Test**: ✅ Document `aaf4ff3f-27a7-4e69-90c8-db620b606544` processed successfully
**Test Results**: 10 sections ✅ | 0 facts ❌ (constraint violation) | 5 questions ✅ | 11 embeddings ✅
**Next Action**: Fix Bug #16 — update `rag_facts` table constraint to allow new fact types
