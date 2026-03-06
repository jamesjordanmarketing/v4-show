# RAG Frontier - Execution Prompt E06: API Routes Part 2

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E06 - API Routes Part 2
**Prerequisites:** E01-E05 complete
**Status:** Ready for Execution

---

## Overview

This prompt creates the remaining API routes: Expert Q&A endpoints, RAG query/chat endpoint, and quality evaluation endpoint.

**What This Section Creates:**
1. `src/app/api/rag/documents/[id]/questions/route.ts` — GET (list questions), POST (submit answer)
2. `src/app/api/rag/documents/[id]/verify/route.ts` — POST (mark document verified after Q&A)
3. `src/app/api/rag/query/route.ts` — POST (query the RAG system)
4. `src/app/api/rag/quality/route.ts` — GET (quality scores), POST (evaluate a query)

**What This Section Does NOT Change:**
- No database schema (E01)
- No types (E02)
- No services (E03-E05)
- No routes from E05
- No hooks, components, or pages (E07-E10)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

========================


# EXECUTION PROMPT E06: API Routes Part 2

## Your Mission

Create the remaining API routes for the RAG Frontier module in a Next.js 14 / TypeScript / Supabase application:
1. Expert Q&A routes (get questions, submit answers, verify document)
2. RAG query route (chat with documents)
3. Quality evaluation route (evaluate and fetch scores)

---

## Context: Current State

### What Exists (from E01-E05)
- **Database**: 8 RAG tables, pgvector, RLS, indexes, RPC functions
- **Types**: `src/types/rag.ts` — all interfaces and types
- **Providers**: `src/lib/rag/providers/` — ClaudeLLMProvider, OpenAIEmbeddingProvider
- **Services**: `src/lib/rag/services/` — ingestion, embedding, expert-qa, retrieval, quality, db-mappers
- **API Routes (E05)**:
  - `GET/POST /api/rag/knowledge-bases`
  - `GET/POST /api/rag/documents`
  - `GET/DELETE /api/rag/documents/[id]`
  - `POST /api/rag/documents/[id]/upload`
  - `POST /api/rag/documents/[id]/process`

### API Route Pattern (MUST follow exactly)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

export async function METHOD(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;
    // ... business logic ...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('METHOD /api/path error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Phase 1: Expert Q&A Routes

### Task 1: Create Questions Route

**File:** `src/app/api/rag/documents/[id]/questions/route.ts`

```typescript
/**
 * RAG Expert Questions API
 * GET /api/rag/documents/[id]/questions — List expert questions for a document
 * POST /api/rag/documents/[id]/questions — Submit an answer to a question
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

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

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

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

## Phase 2: RAG Query Route

### Task 3: Create Query Route

**File:** `src/app/api/rag/query/route.ts`

```typescript
/**
 * RAG Query API
 * POST /api/rag/query — Query the RAG system (chat with documents)
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

    const validModes: RAGQueryMode[] = ['rag_only', 'lora_only', 'rag_plus_lora'];
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

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

## Phase 3: Quality Route

### Task 4: Create Quality Route

**File:** `src/app/api/rag/quality/route.ts`

```typescript
/**
 * RAG Quality API
 * GET /api/rag/quality?documentId=xxx — Get quality scores
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

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

## Verification

### Step 1: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx tsc --noEmit
```

**Expected:** Exit code 0, no TypeScript errors.

### Step 2: Verify All Route Files Exist

```bash
find src/app/api/rag -name "route.ts" -type f
```

Expected 9 route files:
- `knowledge-bases/route.ts`
- `documents/route.ts`
- `documents/[id]/route.ts`
- `documents/[id]/upload/route.ts`
- `documents/[id]/process/route.ts`
- `documents/[id]/questions/route.ts`
- `documents/[id]/verify/route.ts`
- `query/route.ts`
- `quality/route.ts`

### Step 3: Test Routes Respond

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/rag/knowledge-bases
```

Expected: `401` (auth required — confirms route exists and auth works)

---

## Success Criteria

- [ ] `/api/rag/documents/[id]/questions` — GET lists questions, POST submits answers
- [ ] `/api/rag/documents/[id]/verify` — POST marks document verified
- [ ] `/api/rag/query` — POST queries RAG system, GET returns query history
- [ ] `/api/rag/quality` — GET returns quality scores, POST evaluates a query
- [ ] All 9 RAG API routes exist and use `requireAuth`
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

**E07** will create the React hooks that consume these API routes: `useRAGDocuments`, `useExpertQA`, `useRAGChat`, `useRAGQuality`.

---

## If Something Goes Wrong

### Dynamic Route Params
- In Next.js 14 App Router, params are passed as the second argument to route handlers
- The folder must be named `[id]` (with brackets)

### Query String Parsing
- Use `request.nextUrl.searchParams.get('key')` — not `request.query`
- Returns `null` if not present

### Service Import Errors
- Verify the barrel export at `src/lib/rag/services/index.ts` includes all service modules
- Or import directly from the service file

---

## Notes for Agent

1. **Create ALL route files listed above.** They go under `src/app/api/rag/`.
2. **Every route uses `requireAuth`** — no public RAG endpoints.
3. **The query route** supports both `documentId` and `knowledgeBaseId` params. Phase 1 will primarily use `documentId`.
4. **Quality evaluation is triggered explicitly** via POST — not automatic on every query.
5. **Do NOT create hooks or components** — those are E07-E09.

---

**End of E06 Prompt**


+++++++++++++++++
