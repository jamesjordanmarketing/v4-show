# RAG Frontier - Execution Prompt E06: API Routes Part 2

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E06 - API Routes Part 2
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅, E03 (ingestion & embedding) ✅, E04 (expert QA & retrieval) ✅, E05 (quality service & API routes) ✅ complete
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E05 complete), corrected `RAGQueryMode` values (`'rag_and_lora'` not `'rag_plus_lora'`), verified all service exports and function signatures, confirmed E05 route structure

---

## Overview

This prompt creates the remaining API routes: Expert Q&A endpoints, RAG query/chat endpoint, and quality evaluation endpoint.

**What This Section Creates:**
1. `src/app/api/rag/documents/[id]/questions/route.ts` — GET (list questions), POST (submit answer or skip)
2. `src/app/api/rag/documents/[id]/verify/route.ts` — POST (mark document verified after Q&A)
3. `src/app/api/rag/query/route.ts` — POST (query the RAG system), GET (query history)
4. `src/app/api/rag/quality/route.ts` — GET (quality scores & summary), POST (evaluate a query)

**What This Section Does NOT Change:**
- No database schema changes (E01)
- No type changes (E02)
- No service changes (E03-E05)
- No changes to E05 routes
- No hooks, components, or pages (E07-E10)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

### Required Environment Variables (Already Set)
**Confirmed in `.env.local`:**
- ✅ `ANTHROPIC_API_KEY` — Claude API access
- ✅ `OPENAI_API_KEY` — OpenAI embedding access  
- ✅ `DATABASE_URL` — PostgreSQL connection for SAOL operations
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — Admin DB access

---

========================


# EXECUTION PROMPT E06: API Routes Part 2

## Your Mission

Create the remaining API routes for the RAG Frontier module in a Next.js 14 / TypeScript / Supabase application:
1. Expert Q&A routes (get questions, submit answers/skip, verify document)
2. RAG query route (chat with documents, get query history)
3. Quality evaluation route (evaluate query quality, get scores)

---

## Context: Current State

### E05 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**
- ✅ `src/lib/rag/services/rag-quality-service.ts` — Claude-as-Judge evaluation, composite scoring, quality history
  - Exports: `evaluateQueryQuality()`, `getQualityScores()`, `getAverageQuality()`
  - Function signatures confirmed:
    ```typescript
    evaluateQueryQuality(params: { queryId: string; userId: string }): Promise<{ success: boolean; data?: RAGQualityScore; error?: string }>
    getQualityScores(params: { documentId?: string; userId: string; limit?: number }): Promise<{ success: boolean; data?: RAGQualityScore[]; error?: string }>
    getAverageQuality(params: { documentId: string; userId: string }): Promise<{ success: boolean; data?: { averageComposite: number; queryCount: number; breakdown: Record<string, number> }; error?: string }>
    ```
- ✅ `src/lib/rag/services/index.ts` — Barrel export updated with quality service
- ✅ `src/app/api/rag/knowledge-bases/route.ts` — GET (list), POST (create) knowledge bases
- ✅ `src/app/api/rag/documents/route.ts` — GET (list with `?knowledgeBaseId=`), POST (create) documents
- ✅ `src/app/api/rag/documents/[id]/route.ts` — GET (detail with sections/facts), DELETE (cascade delete)
- ✅ `src/app/api/rag/documents/[id]/upload/route.ts` — POST upload file, extract text, trigger processing (returns 202)
- ✅ `src/app/api/rag/documents/[id]/process/route.ts` — POST re-trigger processing (returns 202)

### E04 Completion Status ✅
- ✅ `src/lib/rag/services/rag-expert-qa-service.ts` — Expert Q&A workflow with knowledge refinement
  - Exports: `getQuestionsForDocument()`, `submitExpertAnswer()`, `skipQuestion()`, `refineKnowledgeWithAnswers()`, `markDocumentVerified()`
  - Function signatures confirmed:
    ```typescript
    getQuestionsForDocument(params: { documentId: string; userId: string; includeAnswered?: boolean }): Promise<{ success: boolean; data?: RAGExpertQuestion[]; error?: string }>
    submitExpertAnswer(params: { questionId: string; userId: string; answerText: string }): Promise<{ success: boolean; data?: RAGExpertQuestion; error?: string }>
    skipQuestion(params: { questionId: string; userId: string }): Promise<{ success: boolean; data?: RAGExpertQuestion; error?: string }>
    markDocumentVerified(params: { documentId: string; userId: string }): Promise<{ success: boolean; data?: RAGDocument; error?: string }>
    ```
- ✅ `src/lib/rag/services/rag-retrieval-service.ts` — Multi-tier retrieval with HyDE, Self-RAG, citation generation
  - Exports: `queryRAG()`, `getQueryHistory()`
  - Function signatures confirmed:
    ```typescript
    queryRAG(params: { queryText: string; documentId?: string; knowledgeBaseId?: string; userId: string; mode?: RAGQueryMode }): Promise<{ success: boolean; data?: RAGQuery; error?: string }>
    getQueryHistory(params: { documentId?: string; knowledgeBaseId?: string; userId: string; limit?: number }): Promise<{ success: boolean; data?: RAGQuery[]; error?: string }>
    ```

### E03 Completion Status ✅
- ✅ `src/lib/rag/services/rag-db-mappers.ts` — All 7 entity mappers including `mapRowToQualityScore()`
- ✅ `src/lib/rag/services/rag-embedding-service.ts` — Exports: `generateAndStoreEmbedding()`, `generateAndStoreBatchEmbeddings()`, `searchSimilarEmbeddings()`, `deleteDocumentEmbeddings()`
- ✅ `src/lib/rag/services/rag-ingestion-service.ts` — Exports: `createKnowledgeBase()`, `getKnowledgeBases()`, `createDocumentRecord()`, `extractDocumentText()`, `uploadDocumentFile()`, `processDocument()`, `getDocuments()`, `getDocument()`

### E02 Completion Status ✅
- ✅ `src/types/rag.ts` — All entity types including `QualityEvaluation` interface
- ✅ **CRITICAL**: `RAGQueryMode = 'rag_only' | 'lora_only' | 'rag_and_lora'` (note: `'rag_and_lora'` NOT `'rag_plus_lora'`)
- ✅ `src/lib/rag/config.ts` — `RAG_CONFIG` with quality weights
- ✅ `src/lib/rag/providers/llm-provider.ts` — Interface with all methods
- ✅ `src/lib/rag/providers/claude-llm-provider.ts` — All methods implemented

### E01 Completion Status ✅
- ✅ All 8 RAG tables with RLS and indexes
- ✅ RPC functions: `match_rag_embeddings`, `increment_kb_doc_count`
- ✅ Storage bucket `rag-documents`

### Existing API Route Pattern (from E05)
**Pattern Source:** `src/app/api/rag/documents/route.ts` and other E05 routes
- **Auth**: `const { user, response } = await requireAuth(request); if (response) return response;`
- **Import**: `import { requireAuth } from '@/lib/supabase-server';`
- **Response**: `return NextResponse.json({ success: true, data: result });` or `return NextResponse.json(result, { status: result.success ? 200 : 500 });`
- **Error**: `return NextResponse.json({ success: false, error: 'message' }, { status: 400 });`
- **Try/catch**: Every handler wrapped, `console.error('METHOD /api/path error:', error);`
- **Service calls**: All services return `{ success: boolean; data?: T; error?: string }`
- **Status codes**: 200 (success), 201 (created), 202 (accepted), 400 (bad request), 404 (not found), 500 (error)

---

## Phase 1: Expert Q&A Routes

### Task 1: Create Questions Route

**File:** `src/app/api/rag/documents/[id]/questions/route.ts`

```typescript
/**
 * RAG Expert Questions API
 * GET /api/rag/documents/[id]/questions — List expert questions for a document
 * POST /api/rag/documents/[id]/questions — Submit an answer to a question or skip it
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import {
  getQuestionsForDocument,
  submitExpertAnswer,
  skipQuestion,
} from '@/lib/rag/services/rag-expert-qa-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const includeAnswered = request.nextUrl.searchParams.get('includeAnswered') === 'true';

    const result = await getQuestionsForDocument({
      documentId: params.id,
      userId: user.id,
      includeAnswered,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/documents/[id]/questions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { questionId, answerText, skip } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: questionId' },
        { status: 400 }
      );
    }

    // Skip or answer
    if (skip) {
      const result = await skipQuestion({ questionId, userId: user.id });
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: answerText (or set skip: true)' },
        { status: 400 }
      );
    }

    const result = await submitExpertAnswer({
      questionId,
      userId: user.id,
      answerText: answerText.trim(),
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/questions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/rag/documents/[id]/route.ts` — E05 dynamic route pattern

---

### Task 2: Create Document Verify Route

**File:** `src/app/api/rag/documents/[id]/verify/route.ts`

```typescript
/**
 * RAG Document Verify API
 * POST /api/rag/documents/[id]/verify — Mark document as verified after expert Q&A
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { markDocumentVerified } from '@/lib/rag/services/rag-expert-qa-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const result = await markDocumentVerified({
      documentId: params.id,
      userId: user.id,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/verify error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/rag/documents/[id]/process/route.ts` — E05 simple POST route pattern

---

## Phase 2: RAG Query Route

### Task 3: Create Query Route

**File:** `src/app/api/rag/query/route.ts`

```typescript
/**
 * RAG Query API
 * POST /api/rag/query — Query the RAG system (chat with documents)
 * GET /api/rag/query — Get query history
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { queryRAG, getQueryHistory } from '@/lib/rag/services/rag-retrieval-service';
import type { RAGQueryMode } from '@/types/rag';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { queryText, documentId, knowledgeBaseId, mode } = body;

    if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: queryText' },
        { status: 400 }
      );
    }

    if (!documentId && !knowledgeBaseId) {
      return NextResponse.json(
        { success: false, error: 'At least one of documentId or knowledgeBaseId is required' },
        { status: 400 }
      );
    }

    const validModes: RAGQueryMode[] = ['rag_only', 'lora_only', 'rag_and_lora'];
    const queryMode: RAGQueryMode = validModes.includes(mode) ? mode : 'rag_only';

    const result = await queryRAG({
      queryText: queryText.trim(),
      documentId,
      knowledgeBaseId,
      userId: user.id,
      mode: queryMode,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/query error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = request.nextUrl.searchParams.get('documentId') || undefined;
    const knowledgeBaseId = request.nextUrl.searchParams.get('knowledgeBaseId') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    const result = await getQueryHistory({
      documentId,
      knowledgeBaseId,
      userId: user.id,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/query error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/rag/documents/route.ts` — E05 collection route with GET/POST pattern

---

## Phase 3: Quality Route

### Task 4: Create Quality Route

**File:** `src/app/api/rag/quality/route.ts`

```typescript
/**
 * RAG Quality API
 * GET /api/rag/quality?documentId=xxx — Get quality scores (or summary with ?summary=true)
 * POST /api/rag/quality — Evaluate a query's quality
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { evaluateQueryQuality, getQualityScores, getAverageQuality } from '@/lib/rag/services/rag-quality-service';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = request.nextUrl.searchParams.get('documentId') || undefined;
    const summary = request.nextUrl.searchParams.get('summary') === 'true';

    if (summary && documentId) {
      const result = await getAverageQuality({ documentId, userId: user.id });
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    const result = await getQualityScores({ documentId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/quality error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { queryId } = body;

    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: queryId' },
        { status: 400 }
      );
    }

    const result = await evaluateQueryQuality({ queryId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('POST /api/rag/quality error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/rag/documents/route.ts` — E05 collection route with conditional GET logic

---

## Verification

### Step 1: Verify All Route Files Exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && find src/app/api/rag -name "route.ts" -type f 2>/dev/null | sort
```

Expected 9 route files:
- `documents/[id]/process/route.ts`
- `documents/[id]/questions/route.ts` ← NEW (E06)
- `documents/[id]/route.ts`
- `documents/[id]/upload/route.ts`
- `documents/[id]/verify/route.ts` ← NEW (E06)
- `documents/route.ts`
- `knowledge-bases/route.ts`
- `quality/route.ts` ← NEW (E06)
- `query/route.ts` ← NEW (E06)

### Step 2: Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx next lint 2>&1 | head -n 20
```

**Expected:** No errors in the new files.

### Step 3: Test Route Accessibility (Without Starting Server)

Test import resolution:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && node -e "require('./src/app/api/rag/query/route.ts')" 2>&1 | head -n 5
```

Or start dev server and test (requires authentication cookie):

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/rag/knowledge-bases
```

Expected: `401` (unauthorized — confirms route exists and auth is enforced)

---

## Success Criteria

- [ ] `src/app/api/rag/documents/[id]/questions/route.ts` — GET lists questions, POST submits answers or skips
- [ ] `src/app/api/rag/documents/[id]/verify/route.ts` — POST marks document verified
- [ ] `src/app/api/rag/query/route.ts` — POST queries RAG system, GET returns query history
- [ ] `src/app/api/rag/quality/route.ts` — GET returns quality scores or summary, POST evaluates a query
- [ ] All 9 RAG API routes exist and use `requireAuth`
- [ ] All routes follow E05 pattern: `{ success, data/error }` format
- [ ] All routes have proper error handling with try/catch
- [ ] No TypeScript/linter errors

---

## What's Next

**E07** will create the React hooks that consume these API routes: `useRAGKnowledgeBases`, `useRAGDocuments`, `useExpertQA`, `useRAGQuery`, `useRAGQuality`.

---

## If Something Goes Wrong

### Dynamic Route Params
- In Next.js 14 App Router, params are passed as the second argument: `({ params }: { params: { id: string } })`
- The folder must be named `[id]` (with brackets), not `{id}` or `:id`

### Query String Parsing
- Use `request.nextUrl.searchParams.get('key')` — not `request.query` (that's Pages Router)
- Returns `null` if not present, so use `|| undefined` for optional params
- Convert to boolean: `=== 'true'`
- Convert to number: `parseInt(value || '50', 10)`

### Service Import Errors
- All services are exported from `@/lib/rag/services/index.ts` (barrel export)
- If barrel export fails, import directly: `@/lib/rag/services/rag-quality-service`

### RAGQueryMode Type Error
- **CRITICAL**: Valid values are `'rag_only' | 'lora_only' | 'rag_and_lora'`
- Note: It's `'rag_and_lora'` NOT `'rag_plus_lora'` (common mistake from v1)

### Route Not Found (404)
- Verify the `route.ts` file is in the correct directory structure
- Dynamic routes: `src/app/api/rag/documents/[id]/questions/route.ts`
- Collection routes: `src/app/api/rag/query/route.ts`
- Restart Next.js dev server after creating new routes

---

## Notes for Agent

1. **Create ALL 4 route files listed above.** They go under `src/app/api/rag/`.
2. **Every route uses `requireAuth`** — no public RAG endpoints.
3. **The query route** supports both `documentId` and `knowledgeBaseId` params. At least one must be provided.
4. **Quality evaluation is triggered explicitly** via POST — not automatic on every query (too expensive).
5. **Do NOT create hooks, components, or pages** — those are E07-E10.
6. **RAGQueryMode values**: Use `'rag_only'`, `'lora_only'`, or `'rag_and_lora'` (NOT `'rag_plus_lora'`).
7. **Service return format**: All services return `{ success: boolean; data?: T; error?: string }`
8. **Route response pattern**: Use `return NextResponse.json(result, { status: result.success ? 200 : 500 });` when calling services
9. **Questions route POST**: Handles both answer submission (`answerText`) and skipping (`skip: true`)
10. **Quality route GET**: Supports two modes — list scores (default) or summary (`?summary=true&documentId=xxx`)

---

**End of E06 Prompt v2**


+++++++++++++++++
