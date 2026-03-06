# RAG Frontier - Execution Prompt E05: Quality Service & API Routes Part 1

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E05 - Quality Service & API Routes Part 1
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅, E03 (ingestion & embedding) ✅, E04 (expert QA & retrieval) ✅ complete
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status (E04 complete), corrected provider method from `chat()` to `evaluateQuality()`, verified config property names, confirmed all E04 exports

---

## Overview

This prompt creates the Quality Evaluation service (Claude-as-Judge) and the first set of API routes for document management and processing.

**What This Section Creates:**
1. `src/lib/rag/services/rag-quality-service.ts` — Claude-as-Judge evaluation, composite scoring, quality history
2. `src/app/api/rag/knowledge-bases/route.ts` — GET (list), POST (create) knowledge bases
3. `src/app/api/rag/documents/route.ts` — GET (list), POST (create) documents
4. `src/app/api/rag/documents/[id]/route.ts` — GET (detail), DELETE (remove) single document
5. `src/app/api/rag/documents/[id]/upload/route.ts` — POST upload file and trigger processing
6. `src/app/api/rag/documents/[id]/process/route.ts` — POST trigger processing on already-uploaded document

**What This Section Does NOT Change:**
- No database schema changes (E01)
- No type changes (E02)
- No service changes to E03/E04 files
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


# EXECUTION PROMPT E05: Quality Service & API Routes Part 1

## Your Mission

Create the RAG quality evaluation service and the first batch of API routes for the RAG Frontier module in a Next.js 14 / TypeScript / Supabase application. You will:

1. Create the quality evaluation service (Claude-as-Judge)
2. Create API routes for knowledge base and document management
3. Verify TypeScript compiles and routes respond correctly

---

## Context: Current State

### E04 Completion Status ✅

**Completed in Previous Session (February 11, 2026):**
- ✅ `src/lib/rag/services/rag-expert-qa-service.ts` — Expert Q&A workflow with knowledge refinement
  - Exports: `getQuestionsForDocument()`, `submitExpertAnswer()`, `skipQuestion()`, `refineKnowledgeWithAnswers()`, `markDocumentVerified()`
- ✅ `src/lib/rag/services/rag-retrieval-service.ts` — Multi-tier retrieval with HyDE, Self-RAG, citation generation
  - Exports: `queryRAG()`, `getQueryHistory()`
  - Internal functions: `generateHyDE()`, `retrieveContext()`, `assembleContext()`, `generateResponse()`, `selfEvaluate()`
- ✅ `src/lib/rag/services/index.ts` — Barrel export updated with all 5 services

### E03 Completion Status ✅
- ✅ `src/lib/rag/services/rag-db-mappers.ts` — All 7 entity mappers including `mapRowToQualityScore()`
- ✅ `src/lib/rag/services/rag-embedding-service.ts` — Exports: `generateAndStoreEmbedding()`, `generateAndStoreBatchEmbeddings()`, `searchSimilarEmbeddings()`, `deleteDocumentEmbeddings()`
- ✅ `src/lib/rag/services/rag-ingestion-service.ts` — Exports: `createKnowledgeBase()`, `getKnowledgeBases()`, `createDocumentRecord()`, `extractDocumentText()`, `uploadDocumentFile()`, `processDocument()`, `getDocuments()`, `getDocument()`

### E02 Completion Status ✅
- ✅ `src/types/rag.ts` — All entity types including `QualityEvaluation` interface
- ✅ `src/lib/rag/config.ts` — `RAG_CONFIG` with quality weights
- ✅ `src/lib/rag/providers/llm-provider.ts` — Interface with `evaluateQuality()` method:
  ```typescript
  evaluateQuality(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    citations: RAGCitation[];
  }): Promise<QualityEvaluation>;
  ```
- ✅ `src/lib/rag/providers/claude-llm-provider.ts` — `evaluateQuality()` implemented, returns `QualityEvaluation` with all scores

### E01 Completion Status ✅
- ✅ All 8 RAG tables with RLS and indexes
- ✅ RPC functions: `match_rag_embeddings`, `increment_kb_doc_count`
- ✅ Storage bucket `rag-documents`

### Existing API Route Patterns
**Pattern Source:** `src/app/api/pipeline/jobs/route.ts`
- **Auth**: `const { user, response } = await requireAuth(request); if (response) return response;`
- **Import**: `import { requireAuth } from '@/lib/supabase-server';`
- **Response**: `return NextResponse.json({ success: true, data: result });`
- **Error**: `return NextResponse.json({ success: false, error: 'message' }, { status: 400 });`
- **Try/catch**: Every handler wrapped, `console.error('METHOD /api/path error:', error);`
- **File structure**: `src/app/api/[resource]/route.ts` for collections, `src/app/api/[resource]/[id]/route.ts` for items

### Key Architecture Decisions
- **Quality Evaluation**: Uses `provider.evaluateQuality()` which returns a `QualityEvaluation` object with all 5 scores already computed
- **No manual JSON parsing needed**: The provider method handles Claude's response internally
- **Composite score**: Already computed by the provider based on RAG_CONFIG weights
- **Config property names**: `answerCompleteness` (not just `completeness`)

---

## Phase 1: Quality Service

### Task 1: Create RAG Quality Service

**File:** `src/lib/rag/services/rag-quality-service.ts`

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { mapRowToQualityScore, mapRowToQuery } from './rag-db-mappers';
import type { RAGQualityScore, RAGQuery, QualityEvaluation } from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Quality Service
// ============================================
// Claude-as-Judge evaluation for RAG query quality.
// Composite RAG Quality Score:
//   0.30 × Faithfulness
//   0.25 × Answer Relevance
//   0.20 × Context Relevance
//   0.15 × Answer Completeness
//   0.10 × Citation Accuracy
// Pattern Source: src/lib/services/evaluation-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Evaluate a Single Query
// ============================================

export async function evaluateQueryQuality(params: {
  queryId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGQualityScore; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    // Fetch the query
    const { data: queryRow, error: queryError } = await supabase
      .from('rag_queries')
      .select('*')
      .eq('id', params.queryId)
      .single();

    if (queryError || !queryRow) {
      return { success: false, error: 'Query not found' };
    }

    const query = mapRowToQuery(queryRow);
    const provider = getLLMProvider();

    console.log(`[RAG Quality] Evaluating query ${params.queryId}...`);

    // Use the provider's evaluateQuality method
    let evaluation: QualityEvaluation;
    try {
      evaluation = await provider.evaluateQuality({
        queryText: query.queryText,
        retrievedContext: query.assembledContext || '',
        responseText: query.responseText,
        citations: query.citations || [],
      });
    } catch (evalError) {
      console.warn('[RAG Quality] Evaluation failed, using defaults:', evalError);
      // Fallback to moderate scores if evaluation fails
      evaluation = {
        faithfulness: 0.5,
        answerRelevance: 0.5,
        contextRelevance: 0.5,
        answerCompleteness: 0.5,
        citationAccuracy: 0.5,
        composite: 0.5,
        details: { error: 'Evaluation failed', reason: String(evalError) },
      };
    }

    // Store the quality score
    const { data: scoreRow, error: insertError } = await supabase
      .from('rag_quality_scores')
      .insert({
        query_id: params.queryId,
        user_id: params.userId,
        faithfulness_score: evaluation.faithfulness,
        answer_relevance_score: evaluation.answerRelevance,
        context_relevance_score: evaluation.contextRelevance,
        answer_completeness_score: evaluation.answerCompleteness,
        citation_accuracy_score: evaluation.citationAccuracy,
        composite_score: Math.round(evaluation.composite * 1000) / 1000,
        evaluation_model: RAG_CONFIG.llm.evaluationModel,
        evaluation_details: evaluation.details,
        evaluated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[RAG Quality] Error storing score:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[RAG Quality] Score: ${evaluation.composite.toFixed(3)} (f:${evaluation.faithfulness.toFixed(2)} ar:${evaluation.answerRelevance.toFixed(2)} cr:${evaluation.contextRelevance.toFixed(2)} c:${evaluation.answerCompleteness.toFixed(2)} ca:${evaluation.citationAccuracy.toFixed(2)})`);

    return { success: true, data: mapRowToQualityScore(scoreRow) };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Quality evaluation failed' };
  }
}

// ============================================
// Get Quality Scores for Document
// ============================================

export async function getQualityScores(params: {
  documentId?: string;
  userId: string;
  limit?: number;
}): Promise<{ success: boolean; data?: RAGQualityScore[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    let query = supabase
      .from('rag_quality_scores')
      .select('*, rag_queries!inner(document_id)')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.documentId) {
      query = query.eq('rag_queries.document_id', params.documentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RAG Quality] Error fetching scores:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQualityScore) };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch quality scores' };
  }
}

// ============================================
// Get Average Quality for Document
// ============================================

export async function getAverageQuality(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; data?: { averageComposite: number; queryCount: number; breakdown: Record<string, number> }; error?: string }> {
  try {
    const result = await getQualityScores({ documentId: params.documentId, userId: params.userId, limit: 100 });
    if (!result.success || !result.data || result.data.length === 0) {
      return { success: true, data: { averageComposite: 0, queryCount: 0, breakdown: {} } };
    }

    const scores = result.data;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      success: true,
      data: {
        averageComposite: Math.round(avg(scores.map(s => s.compositeScore)) * 1000) / 1000,
        queryCount: scores.length,
        breakdown: {
          faithfulness: Math.round(avg(scores.map(s => s.faithfulnessScore)) * 1000) / 1000,
          answerRelevance: Math.round(avg(scores.map(s => s.answerRelevanceScore)) * 1000) / 1000,
          contextRelevance: Math.round(avg(scores.map(s => s.contextRelevanceScore)) * 1000) / 1000,
          answerCompleteness: Math.round(avg(scores.map(s => s.answerCompletenessScore)) * 1000) / 1000,
          citationAccuracy: Math.round(avg(scores.map(s => s.citationAccuracyScore)) * 1000) / 1000,
        },
      },
    };
  } catch (err) {
    console.error('[RAG Quality] Exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to get average quality' };
  }
}
```

**Pattern Source**: `src/lib/services/evaluation-service.ts` — LLM-based evaluation pattern

---

### Task 2: Update Services Barrel Export

Add the quality service to the barrel export.

**File:** `src/lib/rag/services/index.ts`

**FIND THIS:**
```typescript
export * from './rag-retrieval-service';
```

**REPLACE WITH:**
```typescript
export * from './rag-retrieval-service';
export * from './rag-quality-service';
```

---

## Phase 2: Knowledge Base API Routes

### Task 3: Create Knowledge Base Routes

**File:** `src/app/api/rag/knowledge-bases/route.ts`

```typescript
/**
 * RAG Knowledge Bases API
 * GET /api/rag/knowledge-bases — List user's knowledge bases
 * POST /api/rag/knowledge-bases — Create a new knowledge base
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToKnowledgeBase } from '@/lib/rag/services/rag-db-mappers';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_knowledge_bases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/rag/knowledge-bases error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: (data || []).map(mapRowToKnowledgeBase) });
  } catch (error) {
    console.error('GET /api/rag/knowledge-bases error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_knowledge_bases')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('POST /api/rag/knowledge-bases error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: mapRowToKnowledgeBase(data) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/rag/knowledge-bases error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts` — auth, response format, error handling

---

## Phase 3: Document API Routes

### Task 4: Create Document Collection Routes

**File:** `src/app/api/rag/documents/route.ts`

```typescript
/**
 * RAG Documents API
 * GET /api/rag/documents?knowledgeBaseId=xxx — List documents for a knowledge base
 * POST /api/rag/documents — Create a new document record
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { createDocumentRecord, getDocuments } from '@/lib/rag/services/rag-ingestion-service';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const knowledgeBaseId = request.nextUrl.searchParams.get('knowledgeBaseId');
    if (!knowledgeBaseId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: knowledgeBaseId' },
        { status: 400 }
      );
    }

    const result = await getDocuments({ knowledgeBaseId, userId: user.id });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('GET /api/rag/documents error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { knowledgeBaseId, fileName, fileType, description, fastMode } = body;

    if (!knowledgeBaseId || !fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: knowledgeBaseId, fileName, fileType' },
        { status: 400 }
      );
    }

    const validTypes = ['pdf', 'docx', 'txt', 'md'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createDocumentRecord({
      knowledgeBaseId,
      userId: user.id,
      fileName,
      fileType,
      description,
      fastMode: fastMode || false,
    });

    return NextResponse.json(result, { status: result.success ? 201 : 500 });
  } catch (error) {
    console.error('POST /api/rag/documents error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

### Task 5: Create Document Detail Routes

**File:** `src/app/api/rag/documents/[id]/route.ts`

```typescript
/**
 * RAG Document Detail API
 * GET /api/rag/documents/[id] — Get document detail with sections and facts
 * DELETE /api/rag/documents/[id] — Delete a document and all related data
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { mapRowToDocument, mapRowToSection, mapRowToFact } from '@/lib/rag/services/rag-db-mappers';
import { deleteDocumentEmbeddings } from '@/lib/rag/services/rag-embedding-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const documentId = params.id;

    // Fetch document
    const { data: docRow, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !docRow) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Fetch sections
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('section_index', { ascending: true });

    // Fetch facts
    const { data: factRows } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', documentId);

    return NextResponse.json({
      success: true,
      data: {
        document: mapRowToDocument(docRow),
        sections: (sectionRows || []).map(mapRowToSection),
        facts: (factRows || []).map(mapRowToFact),
      },
    });
  } catch (error) {
    console.error('GET /api/rag/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createServerSupabaseAdminClient();
    const documentId = params.id;

    // Verify ownership
    const { data: docRow } = await supabase
      .from('rag_documents')
      .select('id, knowledge_base_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!docRow) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete in order: embeddings → quality_scores (via queries) → queries → questions → facts → sections → document
    await deleteDocumentEmbeddings(documentId);
    
    // Get all query IDs for this document
    const { data: queries } = await supabase
      .from('rag_queries')
      .select('id')
      .eq('document_id', documentId);
    
    const queryIds = queries?.map(q => q.id) || [];
    
    if (queryIds.length > 0) {
      await supabase
        .from('rag_quality_scores')
        .delete()
        .in('query_id', queryIds);
    }
    
    await supabase.from('rag_queries').delete().eq('document_id', documentId);
    await supabase.from('rag_expert_questions').delete().eq('document_id', documentId);
    await supabase.from('rag_facts').delete().eq('document_id', documentId);
    await supabase.from('rag_sections').delete().eq('document_id', documentId);

    const { error: deleteError } = await supabase
      .from('rag_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('DELETE /api/rag/documents/[id] error:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    // Decrement KB document count (note: RPC expects negative value for decrement)
    await supabase.rpc('increment_kb_doc_count', { 
      kb_id: docRow.knowledge_base_id,
      increment: -1 
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/rag/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

### Task 6: Create Document Upload Route

**File:** `src/app/api/rag/documents/[id]/upload/route.ts`

```typescript
/**
 * RAG Document Upload API
 * POST /api/rag/documents/[id]/upload — Upload a file for an existing document, extract text, then trigger processing
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { uploadDocumentFile, processDocument } from '@/lib/rag/services/rag-ingestion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = params.id;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file details
    const fileName = file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const validTypes = ['pdf', 'docx', 'txt', 'md'];

    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type "${fileType}". Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and extract text
    const uploadResult = await uploadDocumentFile({
      userId: user.id,
      documentId,
      file: buffer,
      fileName,
      fileType,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Trigger async processing (don't await — it's long-running)
    processDocument(documentId).catch(err => {
      console.error(`[RAG Upload] Background processing failed for ${documentId}:`, err);
    });

    return NextResponse.json({
      success: true,
      data: { documentId, filePath: uploadResult.filePath, status: 'processing' },
    }, { status: 202 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/upload error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts` — auth pattern; file upload follows standard `formData` approach

---

### Task 7: Create Document Process Route

**File:** `src/app/api/rag/documents/[id]/process/route.ts`

```typescript
/**
 * RAG Document Process API
 * POST /api/rag/documents/[id]/process — Re-trigger processing on a document that already has extracted text
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { processDocument } from '@/lib/rag/services/rag-ingestion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const documentId = params.id;

    // Verify ownership and text existence
    const supabase = createServerSupabaseAdminClient();
    const { data: doc } = await supabase
      .from('rag_documents')
      .select('id, original_text, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (!doc.original_text) {
      return NextResponse.json(
        { success: false, error: 'Document has no extracted text. Upload a file first.' },
        { status: 400 }
      );
    }

    // Trigger async processing
    processDocument(documentId).catch(err => {
      console.error(`[RAG Process] Background processing failed for ${documentId}:`, err);
    });

    return NextResponse.json({
      success: true,
      data: { documentId, status: 'processing' },
    }, { status: 202 });
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/process error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

**Pattern Source**: `src/app/api/pipeline/jobs/route.ts`

---

## Verification

### Step 1: Verify Service and Route Files Exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/lib/rag/services/rag-quality-service.ts && ls -la src/app/api/rag/knowledge-bases/route.ts && ls -la src/app/api/rag/documents/route.ts
```

### Step 2: Check for Linter Errors

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npx next lint 2>&1 | head -n 20
```

**Expected:** No errors in the new files.

### Step 3: Test Route Accessibility (Dev Server)

Start the dev server:
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && npm run dev
```

Then test (requires authentication cookie — test in browser console or with a token):

```bash
curl -s http://localhost:3000/api/rag/knowledge-bases
```

Expected: 401 unauthorized (no auth cookie), confirming the route exists and auth is enforced.

---

## Success Criteria

- [ ] `rag-quality-service.ts` exports: `evaluateQueryQuality`, `getQualityScores`, `getAverageQuality`
- [ ] Services barrel export updated with quality service
- [ ] `/api/rag/knowledge-bases` — GET, POST work
- [ ] `/api/rag/documents` — GET, POST work
- [ ] `/api/rag/documents/[id]` — GET, DELETE work
- [ ] `/api/rag/documents/[id]/upload` — POST accepts multipart form data
- [ ] `/api/rag/documents/[id]/process` — POST triggers processing
- [ ] All routes use `requireAuth` for authentication
- [ ] All routes return `{ success, data/error }` format
- [ ] Quality service uses `provider.evaluateQuality()` (NOT `provider.chat()`)
- [ ] No TypeScript/linter errors

---

## What's Next

**E06** will create the remaining API routes: Expert Q&A endpoints, RAG query endpoint, and quality evaluation endpoint.

---

## If Something Goes Wrong

### Route Not Found (404)
- Verify the `route.ts` file is in the correct directory under `src/app/api/rag/`
- Dynamic routes must use `[id]` folder name (with brackets)
- Check Next.js dev server restart after creating new routes

### Auth Always Returns 401
- The dev server must be running with valid Supabase credentials in `.env.local`
- Test from the browser while logged in (cookies are needed)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Upload Route Fails
- Ensure the request uses `multipart/form-data` content type
- The file field name must be `file`
- Check file size limits (default: 50MB in RAG_CONFIG)

### Quality Evaluation Returns Default Scores
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify Claude API is accessible (not rate-limited)
- Check console logs for the actual error from Claude

### TypeScript Errors on QualityEvaluation
- Ensure `QualityEvaluation` type is imported from `@/types/rag`
- Verify the type has all required properties: `faithfulness`, `answerRelevance`, `contextRelevance`, `answerCompleteness`, `citationAccuracy`, `composite`, `details`

---

## Notes for Agent

1. **Create ALL files listed above.** The `src/app/api/rag/` directory is new — you'll need to create the full folder structure.
2. **CRITICAL: The quality service uses `provider.evaluateQuality()`** — NOT `provider.chat()`. The v1 prompt had this wrong. The `evaluateQuality()` method returns a complete `QualityEvaluation` object with all scores already computed.
3. **Document deletion must cascade** — delete embeddings, quality scores, queries, questions, facts, sections before the document itself. The order matters because of foreign key constraints.
4. **Upload route returns 202** (Accepted) because processing is async and runs in the background.
5. **The RPC function `increment_kb_doc_count`** expects an `increment` parameter. For deletion, pass `-1`.
6. **Do NOT create hooks, components, or pages** — those are E07-E10.
7. **Quality evaluation might fail** — the service handles this gracefully with fallback scores (0.5 across the board).
8. **Config uses `answerCompleteness`** — not just `completeness`. Watch for this in property access.

---

**End of E05 Prompt v2**


+++++++++++++++++
