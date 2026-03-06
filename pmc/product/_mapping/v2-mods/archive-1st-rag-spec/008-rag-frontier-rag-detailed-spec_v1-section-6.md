# Section 6: API Routes

**Version:** 1.0
**Date:** February 9, 2026
**Parent Document:** `008-rag-frontier-rag-detailed-spec_v1-master.md`
**Phase:** Phase 1 Only

---

## Overview

This section defines all 10 API route handlers across 6 route groups under `src/app/api/rag/`. These routes form the HTTP interface between the React frontend (hooks in Section 7) and the backend services (Sections 3, 4, 5, 9).

**User Value:** Provides a secure, validated, and consistent REST API for the entire RAG module -- document management, processing, expert Q&A, querying, and quality metrics.

**What Already Exists (Reused):**
- `requireAuth()` from `@/lib/supabase-server` -- authentication pattern
- `createServerSupabaseClient()` from `@/lib/supabase-server` -- Supabase client creation
- `zod` -- request validation (already in `package.json`)
- `NextRequest` / `NextResponse` -- Next.js 14 App Router request/response

**What Is Being Added (New):**
- 6 new route files containing 10 route handlers
- Zod validation schemas for each POST route
- Consistent error handling and response formatting

---

## Dependencies

**Codebase Prerequisites:**
- `src/lib/supabase-server.ts` -- must export `requireAuth()` and `createServerSupabaseClient()`
- `zod` package installed

**Previous Section Prerequisites:**
- **Section 1** (Database Foundation) -- all 8 `rag_*` tables must exist
- **Section 2** (TypeScript Types) -- `src/types/rag.ts` must exist with all type definitions
- **Section 3** (Ingestion Pipeline) -- `src/lib/services/rag/ingestion.service.ts` must exist
- **Section 4** (Expert Q&A) -- `src/lib/services/rag/expert-qa.service.ts` must exist
- **Section 5** (Retrieval Pipeline) -- `src/lib/services/rag/retrieval.service.ts` must exist

---

## Features & Requirements

---

### FR-6.1: POST /api/rag/documents -- Upload Document

**Type:** API Route
**Description:** Creates a document record and returns a signed upload URL for the client to upload the file to Supabase Storage.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/route.ts`

```typescript
/**
 * API Route: /api/rag/documents
 *
 * POST - Upload a new document (create record + signed upload URL)
 * GET  - List documents for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const UploadDocumentSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_type: z.enum(['pdf', 'docx', 'txt', 'md']),
  description: z.string().max(1000).optional(),
  fast_mode: z.boolean().optional().default(false),
  knowledge_base_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// POST /api/rag/documents -- Upload document
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    // 2. Validate
    const body = await request.json()
    const validation = UploadDocumentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { file_name, file_type, description, fast_mode, knowledge_base_id } =
      validation.data

    const supabase = await createServerSupabaseClient()

    // 3. Resolve or auto-create knowledge base
    let kbId = knowledge_base_id

    if (!kbId) {
      // Check if user already has a default knowledge base
      const { data: existingKb } = await supabase
        .from('rag_knowledge_bases')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (existingKb) {
        kbId = existingKb.id
      } else {
        // Auto-create a default knowledge base
        const { data: newKb, error: kbError } = await supabase
          .from('rag_knowledge_bases')
          .insert({
            user_id: user.id,
            name: 'My Knowledge Base',
            description: 'Auto-created default knowledge base',
            document_count: 0,
          })
          .select('id')
          .single()

        if (kbError || !newKb) {
          console.error('Knowledge base creation error:', kbError)
          return NextResponse.json(
            {
              error: 'Failed to create knowledge base',
              details: kbError?.message || 'Unknown error',
            },
            { status: 500 }
          )
        }
        kbId = newKb.id
      }
    } else {
      // Verify the provided knowledge base belongs to user
      const { data: kb, error: kbError } = await supabase
        .from('rag_knowledge_bases')
        .select('id')
        .eq('id', kbId)
        .eq('user_id', user.id)
        .single()

      if (kbError || !kb) {
        return NextResponse.json(
          { error: 'Knowledge base not found or access denied' },
          { status: 404 }
        )
      }
    }

    // 4. Determine MIME type for storage
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    }

    // 5. Create document record
    const storagePath = `${user.id}/${kbId}/${crypto.randomUUID()}.${file_type}`

    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .insert({
        user_id: user.id,
        knowledge_base_id: kbId,
        file_name,
        file_type,
        storage_path: storagePath,
        description: description || null,
        fast_mode: fast_mode || false,
        status: 'pending',
      })
      .select()
      .single()

    if (docError || !document) {
      console.error('Document creation error:', docError)
      return NextResponse.json(
        {
          error: 'Failed to create document record',
          details: docError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    // 6. Generate signed upload URL (valid for 10 minutes)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rag-documents')
      .createSignedUploadUrl(storagePath)

    if (uploadError || !uploadData) {
      // Rollback: delete the document record
      await supabase.from('rag_documents').delete().eq('id', document.id)
      console.error('Signed URL generation error:', uploadError)
      return NextResponse.json(
        {
          error: 'Failed to generate upload URL',
          details: uploadError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    // 7. Increment document_count on knowledge base
    await supabase.rpc('increment_kb_document_count', {
      kb_id: kbId,
    })
    // Note: If the RPC does not exist, use a raw update:
    // await supabase
    //   .from('rag_knowledge_bases')
    //   .update({ document_count: supabase.rpc('...') })
    //   ... This is handled by the DB trigger defined in Section 1.

    return NextResponse.json(
      {
        success: true,
        data: {
          document,
          uploadUrl: uploadData.signedUrl,
          token: uploadData.token,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/rag/documents error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/jobs/route.ts` (auth + Zod validation + Supabase insert + response format)

**Acceptance Criteria:**
1. Authenticated users can create a document record and receive a signed upload URL
2. If no `knowledge_base_id` is provided, a default knowledge base is auto-created or reused
3. If `knowledge_base_id` is provided, it must belong to the user (ownership check)
4. Invalid requests return 400 with Zod field errors
5. Unauthenticated requests return 401

**Verification Steps:**
1. Call `POST /api/rag/documents` with valid auth and body `{ file_name: "test.pdf", file_type: "pdf" }` -- expect 201 with document and uploadUrl
2. Call without auth -- expect 401
3. Call with invalid `file_type: "exe"` -- expect 400 with validation error
4. Call with non-existent `knowledge_base_id` -- expect 404

---

### FR-6.2: GET /api/rag/documents -- List Documents

**Type:** API Route
**Description:** Returns a paginated list of documents for the authenticated user, with optional filtering by knowledge base and status.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/route.ts` (same file as FR-6.1, add GET handler)

```typescript
// ---------------------------------------------------------------------------
// GET /api/rag/documents -- List documents
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // 2. Parse query params
    const knowledgeBaseId = searchParams.get('knowledge_base_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

    // 3. Build query
    let query = supabase
      .from('rag_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (knowledgeBaseId) {
      query = query.eq('knowledge_base_id', knowledgeBaseId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Documents fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: documents || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/jobs/route.ts` (GET handler with pagination, status filter, count)

**Acceptance Criteria:**
1. Returns paginated document list scoped to the authenticated user
2. Supports filtering by `knowledge_base_id` and `status`
3. Default page size is 20, max is 100
4. Returns total count and pagination metadata

**Verification Steps:**
1. Call `GET /api/rag/documents` with valid auth -- expect 200 with documents array and pagination
2. Call with `?status=completed` -- expect only completed documents
3. Call with `?page=2&limit=5` -- expect correct offset and page size
4. Call without auth -- expect 401

---

### FR-6.3: POST /api/rag/documents/[id]/process -- Trigger Processing

**Type:** API Route
**Description:** Triggers the full ingestion pipeline for a document: text extraction, LLM reading, knowledge extraction, preamble generation, and embedding. For Phase 1, this runs synchronously.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/process/route.ts`

```typescript
/**
 * API Route: /api/rag/documents/[id]/process
 *
 * POST - Trigger full document processing pipeline
 *
 * This runs the complete ingestion pipeline synchronously:
 * 1. Text extraction (PDF/DOCX/TXT/MD)
 * 2. LLM document reading and comprehension
 * 3. Section identification and knowledge extraction
 * 4. Contextual Retrieval preamble generation
 * 5. Multi-tier embedding generation
 *
 * // TODO: Phase 2 - move to background job for large documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { processDocument } from '@/lib/services/rag/ingestion.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Check document is in a processable state
    if (document.status === 'processing') {
      return NextResponse.json(
        { error: 'Document is already being processed' },
        { status: 409 }
      )
    }

    if (document.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Document has already been processed',
          details: 'Delete and re-upload to reprocess',
        },
        { status: 409 }
      )
    }

    // 4. Update status to processing
    await supabase
      .from('rag_documents')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('id', documentId)

    // 5. Run the full ingestion pipeline
    // TODO: Phase 2 - move to background job for large documents
    try {
      const result = await processDocument(documentId, user.id)

      // 6. Fetch updated document
      const { data: updatedDoc } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          document: updatedDoc,
          processing_summary: result,
        },
      })
    } catch (processingError) {
      // Update status to failed
      await supabase
        .from('rag_documents')
        .update({
          status: 'failed',
          error_message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown processing error',
        })
        .eq('id', documentId)

      console.error('Document processing failed:', processingError)
      return NextResponse.json(
        {
          error: 'Document processing failed',
          details:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/process error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/pipeline/conversations/[id]/turn/route.ts` (dynamic route param + auth + service call)

**Acceptance Criteria:**
1. Only the document owner can trigger processing
2. Documents in `processing` or `completed` state return 409
3. Status transitions: `pending` -> `processing` -> `completed` or `failed`
4. Processing errors are caught, status set to `failed`, and error message stored
5. Returns the updated document with processing summary on success

**Verification Steps:**
1. Upload a document, then call `POST /api/rag/documents/{id}/process` -- expect 200 with completed document
2. Call again on same document -- expect 409
3. Call with another user's document ID -- expect 404
4. Call without auth -- expect 401

---

### FR-6.4: GET /api/rag/documents/[id]/questions -- Get Expert Questions

**Type:** API Route
**Description:** Retrieves the generated expert questions for a processed document. Questions are generated during the processing pipeline or on first access.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/questions/route.ts`

```typescript
/**
 * API Route: /api/rag/documents/[id]/questions
 *
 * GET  - Get expert questions for a document
 * POST - Submit expert answers to questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import {
  getQuestionsForDocument,
  submitExpertAnswers,
} from '@/lib/services/rag/expert-qa.service'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const SubmitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        answer_text: z.string().min(1).max(10000),
      })
    )
    .min(1),
})

// ---------------------------------------------------------------------------
// GET /api/rag/documents/[id]/questions -- Get expert questions
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Get questions
    const questions = await getQuestionsForDocument(documentId)

    return NextResponse.json({
      success: true,
      data: {
        questions,
        document_status: document.status,
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents/[id]/questions error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/pipeline/conversations/route.ts` (GET with dynamic params + auth + service call)

**Acceptance Criteria:**
1. Only the document owner can view questions
2. Returns questions array with document status
3. Returns empty array if no questions generated yet

**Verification Steps:**
1. Process a document, then call `GET /api/rag/documents/{id}/questions` -- expect 200 with questions array
2. Call with another user's document ID -- expect 404
3. Call without auth -- expect 401

---

### FR-6.5: POST /api/rag/documents/[id]/questions -- Submit Expert Answers

**Type:** API Route
**Description:** Accepts expert answers to generated questions and triggers knowledge refinement in the Q&A service.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/questions/route.ts` (same file as FR-6.4, add POST handler)

```typescript
// ---------------------------------------------------------------------------
// POST /api/rag/documents/[id]/questions -- Submit expert answers
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Validate request body
    const body = await request.json()
    const validation = SubmitAnswersSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // 4. Verify all question IDs belong to this document
    const questionIds = validation.data.answers.map((a) => a.question_id)
    const { data: validQuestions, error: qError } = await supabase
      .from('rag_expert_questions')
      .select('id')
      .eq('document_id', documentId)
      .in('id', questionIds)

    if (qError) {
      console.error('Question validation error:', qError)
      return NextResponse.json(
        { error: 'Failed to validate questions', details: qError.message },
        { status: 500 }
      )
    }

    const validIds = new Set((validQuestions || []).map((q) => q.id))
    const invalidIds = questionIds.filter((id) => !validIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid question IDs',
          details: `These question IDs do not belong to this document: ${invalidIds.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 5. Submit answers via service
    const result = await submitExpertAnswers(documentId, user.id, validation.data.answers)

    // 6. Fetch updated document
    const { data: updatedDoc } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        document: updatedDoc,
        answers_submitted: validation.data.answers.length,
        refinement_summary: result,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/questions error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/jobs/route.ts` (POST with Zod validation + ownership check + service call)

**Acceptance Criteria:**
1. Only the document owner can submit answers
2. All question IDs must belong to the specified document
3. Invalid question IDs return 400 with the specific invalid IDs listed
4. Answers trigger knowledge refinement via the expert Q&A service
5. Returns updated document and submission summary

**Verification Steps:**
1. Get questions for a document, then submit answers with valid question IDs -- expect 200
2. Submit answers with a question ID from another document -- expect 400
3. Submit with empty answers array -- expect 400 (Zod min(1))
4. Call without auth -- expect 401

---

### FR-6.6: POST /api/rag/documents/[id]/verify -- Generate Verification Samples

**Type:** API Route
**Description:** Generates verification samples (synthetic Q&A pairs) from the document's extracted knowledge. Used by the expert to spot-check knowledge quality before the document is ready for RAG queries.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/verify/route.ts`

```typescript
/**
 * API Route: /api/rag/documents/[id]/verify
 *
 * POST - Generate verification samples for expert review
 *
 * Creates synthetic question-answer pairs from extracted knowledge
 * so the expert can verify the system understood the document correctly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { generateVerificationSamples } from '@/lib/services/rag/expert-qa.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Document must be in a processed state (completed or qa_in_progress)
    const processableStatuses = ['completed', 'qa_in_progress', 'qa_complete']
    if (!processableStatuses.includes(document.status)) {
      return NextResponse.json(
        {
          error: 'Document not ready for verification',
          details: `Document must be processed first. Current status: ${document.status}`,
        },
        { status: 400 }
      )
    }

    // 4. Generate verification samples via service
    const samples = await generateVerificationSamples(documentId, user.id)

    return NextResponse.json({
      success: true,
      data: {
        samples,
        count: samples.length,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/verify error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/pipeline/conversations/[id]/turn/route.ts` (dynamic route + auth + ownership + service call)

**Acceptance Criteria:**
1. Only the document owner can generate verification samples
2. Document must be in `completed`, `qa_in_progress`, or `qa_complete` status
3. Returns an array of verification samples with count
4. Unprocessed documents return 400 with current status

**Verification Steps:**
1. Process a document, then call `POST /api/rag/documents/{id}/verify` -- expect 200 with samples
2. Call on a `pending` document -- expect 400
3. Call with another user's document ID -- expect 404
4. Call without auth -- expect 401

---

### FR-6.7: POST /api/rag/query -- Query the Knowledge Base

**Type:** API Route
**Description:** The main RAG query endpoint. Accepts a natural language question and a mode selector (rag_only / lora_only / rag_lora), runs the retrieval pipeline, and returns a response with citations and quality score.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/query/route.ts`

```typescript
/**
 * API Route: /api/rag/query
 *
 * POST - Query the knowledge base with RAG, LoRA, or RAG+LoRA mode
 *
 * This is the main query endpoint that:
 * 1. Generates a HyDE (Hypothetical Document Embedding) for the query
 * 2. Performs multi-tier retrieval (document -> section -> fact)
 * 3. Evaluates retrieval quality via Self-RAG / Corrective RAG
 * 4. Assembles context and generates a response
 * 5. Scores response quality via Claude-as-Judge
 * 6. Logs the query and quality metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { queryKnowledgeBase } from '@/lib/services/rag/retrieval.service'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  query_text: z.string().min(1).max(5000),
  mode: z.enum(['rag_only', 'lora_only', 'rag_lora']),
  knowledge_base_id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// POST /api/rag/query -- Query the knowledge base
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    // 2. Validate
    const body = await request.json()
    const validation = QuerySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { query_text, mode, knowledge_base_id } = validation.data
    const supabase = await createServerSupabaseClient()

    // 3. Verify knowledge base belongs to user
    const { data: kb, error: kbError } = await supabase
      .from('rag_knowledge_bases')
      .select('id, name')
      .eq('id', knowledge_base_id)
      .eq('user_id', user.id)
      .single()

    if (kbError || !kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Verify knowledge base has at least one completed document
    const { count: completedDocs } = await supabase
      .from('rag_documents')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_base_id', knowledge_base_id)
      .eq('user_id', user.id)
      .in('status', ['completed', 'qa_complete'])

    if (!completedDocs || completedDocs === 0) {
      return NextResponse.json(
        {
          error: 'No processed documents in this knowledge base',
          details:
            'Upload and process at least one document before querying',
        },
        { status: 400 }
      )
    }

    // 5. Execute query via retrieval service
    const startTime = Date.now()
    const result = await queryKnowledgeBase({
      query_text,
      mode,
      knowledge_base_id,
      user_id: user.id,
    })
    const generationTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        response_text: result.response_text,
        citations: result.citations,
        quality_score: result.quality_score,
        mode,
        generation_time_ms: generationTimeMs,
        query_id: result.query_id,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/query error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/jobs/route.ts` (POST with Zod + ownership verification + service call)

**Acceptance Criteria:**
1. Validates query text is non-empty and mode is one of the three options
2. Verifies knowledge base belongs to user
3. Verifies at least one completed document exists in the knowledge base
4. Returns response text, citations, quality score, mode, and generation time
5. Logs query and quality metrics (handled inside the retrieval service)

**Verification Steps:**
1. Process a document, then call `POST /api/rag/query` with `{ query_text: "What is X?", mode: "rag_only", knowledge_base_id: "..." }` -- expect 200 with response
2. Call with empty knowledge base -- expect 400
3. Call with invalid mode -- expect 400 Zod error
4. Call with another user's knowledge base -- expect 404
5. Call without auth -- expect 401

---

### FR-6.8: GET /api/rag/quality -- Get Quality Metrics

**Type:** API Route
**Description:** Returns aggregated quality metrics from the `rag_quality_scores` table. Supports filtering by knowledge base, mode, and date range. Computes averages, comparisons, and trend data.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/quality/route.ts`

```typescript
/**
 * API Route: /api/rag/quality
 *
 * GET - Get aggregated quality metrics for the authenticated user
 *
 * Returns:
 * - Average composite score (overall and per-mode)
 * - Per-metric averages (faithfulness, relevance, completeness, coherence, citation_accuracy)
 * - Per-mode comparisons (rag_only vs lora_only vs rag_lora)
 * - Query count
 * - Trend data (daily averages for charting)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // 2. Parse query params
    const knowledgeBaseId = searchParams.get('knowledge_base_id')
    const mode = searchParams.get('mode')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // 3. Build base query for quality scores joined with queries
    // We need to join rag_quality_scores with rag_queries to filter by user_id
    let scoresQuery = supabase
      .from('rag_quality_scores')
      .select(`
        *,
        query:rag_queries!inner(
          id,
          user_id,
          knowledge_base_id,
          mode,
          created_at
        )
      `)
      .eq('query.user_id', user.id)

    if (knowledgeBaseId) {
      scoresQuery = scoresQuery.eq('query.knowledge_base_id', knowledgeBaseId)
    }

    if (mode) {
      scoresQuery = scoresQuery.eq('query.mode', mode)
    }

    if (fromDate) {
      scoresQuery = scoresQuery.gte('query.created_at', fromDate)
    }

    if (toDate) {
      scoresQuery = scoresQuery.lte('query.created_at', toDate)
    }

    const { data: scores, error: scoresError } = await scoresQuery

    if (scoresError) {
      console.error('Quality scores fetch error:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch quality scores', details: scoresError.message },
        { status: 500 }
      )
    }

    const allScores = scores || []

    // 4. Compute aggregated metrics
    const queryCount = allScores.length

    if (queryCount === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            query_count: 0,
            average_composite_score: null,
            per_metric_averages: null,
            per_mode_comparisons: null,
            trend_data: [],
          },
        },
      })
    }

    // 4a. Overall averages
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const avg = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0)
    const round2 = (n: number) => Math.round(n * 100) / 100

    const compositeScores = allScores.map((s) => s.composite_score).filter(Boolean) as number[]
    const faithfulnessScores = allScores.map((s) => s.faithfulness).filter(Boolean) as number[]
    const relevanceScores = allScores.map((s) => s.relevance).filter(Boolean) as number[]
    const completenessScores = allScores.map((s) => s.completeness).filter(Boolean) as number[]
    const coherenceScores = allScores.map((s) => s.coherence).filter(Boolean) as number[]
    const citationScores = allScores.map((s) => s.citation_accuracy).filter(Boolean) as number[]

    const perMetricAverages = {
      faithfulness: round2(avg(faithfulnessScores)),
      relevance: round2(avg(relevanceScores)),
      completeness: round2(avg(completenessScores)),
      coherence: round2(avg(coherenceScores)),
      citation_accuracy: round2(avg(citationScores)),
    }

    // 4b. Per-mode comparisons
    const modes = ['rag_only', 'lora_only', 'rag_lora'] as const
    const perModeComparisons: Record<
      string,
      { average_composite_score: number; query_count: number }
    > = {}

    for (const m of modes) {
      const modeScores = allScores
        .filter((s) => (s.query as any)?.mode === m)
        .map((s) => s.composite_score)
        .filter(Boolean) as number[]

      if (modeScores.length > 0) {
        perModeComparisons[m] = {
          average_composite_score: round2(avg(modeScores)),
          query_count: modeScores.length,
        }
      }
    }

    // 4c. Trend data (daily averages)
    const dailyBuckets: Record<string, number[]> = {}
    for (const score of allScores) {
      const date = ((score.query as any)?.created_at || score.created_at || '')
        .split('T')[0]
      if (!date) continue
      if (!dailyBuckets[date]) dailyBuckets[date] = []
      if (score.composite_score != null) {
        dailyBuckets[date].push(score.composite_score)
      }
    }

    const trendData = Object.entries(dailyBuckets)
      .map(([date, vals]) => ({
        date,
        average_composite_score: round2(avg(vals)),
        query_count: vals.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          query_count: queryCount,
          average_composite_score: round2(avg(compositeScores)),
          per_metric_averages: perMetricAverages,
          per_mode_comparisons: perModeComparisons,
          trend_data: trendData,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/quality error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/jobs/route.ts` (GET with query params + auth + aggregation logic)

**Acceptance Criteria:**
1. Returns aggregated quality metrics scoped to the authenticated user
2. Supports filtering by knowledge_base_id, mode, from_date, to_date
3. Returns null values (not zeros) when no data exists
4. Per-mode comparisons only include modes that have data
5. Trend data is sorted by date ascending

**Verification Steps:**
1. Execute several queries, then call `GET /api/rag/quality` -- expect 200 with computed metrics
2. Call with `?mode=rag_only` -- expect metrics filtered to that mode
3. Call with no queries ever made -- expect 200 with query_count=0 and null averages
4. Call without auth -- expect 401

---

### FR-6.9: GET /api/rag/documents/[id] -- Get Document Details

**Type:** API Route
**Description:** Returns a single document with related data counts (sections, facts, questions, embeddings).
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/route.ts`

```typescript
/**
 * API Route: /api/rag/documents/[id]
 *
 * GET    - Get document details with related data counts
 * DELETE - Delete document and all related records
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// GET /api/rag/documents/[id] -- Get document details
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Fetch document
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Fetch related data counts in parallel
    const [sectionsResult, factsResult, questionsResult, embeddingsResult] =
      await Promise.all([
        supabase
          .from('rag_sections')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_facts')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_expert_questions')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_embeddings')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
      ])

    // 4. Count answered questions
    const { count: answeredCount } = await supabase
      .from('rag_expert_questions')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .eq('status', 'answered')

    return NextResponse.json({
      success: true,
      data: {
        document: {
          ...document,
          section_count: sectionsResult.count || 0,
          fact_count: factsResult.count || 0,
          question_count: questionsResult.count || 0,
          answered_question_count: answeredCount || 0,
          embedding_count: embeddingsResult.count || 0,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents/[id] error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/pipeline/jobs/[jobId]/route.ts` (dynamic route GET with auth + ownership + related data)

**Acceptance Criteria:**
1. Returns full document details with section, fact, question, and embedding counts
2. Only the document owner can access details
3. Includes answered vs total question count for progress tracking
4. Non-existent or unauthorized document returns 404

**Verification Steps:**
1. Create and process a document, then call `GET /api/rag/documents/{id}` -- expect 200 with document and counts
2. Call with another user's document ID -- expect 404
3. Call with non-existent UUID -- expect 404
4. Call without auth -- expect 401

---

### FR-6.10: DELETE /api/rag/documents/[id] -- Delete Document

**Type:** API Route
**Description:** Deletes a document and all related records. CASCADE on foreign keys handles child record deletion. Also deletes the file from Supabase Storage and updates the knowledge base document count.
**Implementation Strategy:** NEW build

---

**File**: `src/app/api/rag/documents/[id]/route.ts` (same file as FR-6.9, add DELETE handler)

```typescript
// ---------------------------------------------------------------------------
// DELETE /api/rag/documents/[id] -- Delete document and all related data
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Fetch document (need storage_path and knowledge_base_id before deletion)
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, storage_path, knowledge_base_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Delete from Supabase Storage (non-blocking -- log error but do not fail)
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('rag-documents')
        .remove([document.storage_path])

      if (storageError) {
        console.error('Storage deletion warning (non-fatal):', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // 4. Delete document record (CASCADE handles child records:
    //    rag_sections, rag_facts, rag_expert_questions, rag_embeddings,
    //    rag_queries (via knowledge_base), rag_quality_scores (via query))
    const { error: deleteError } = await supabase
      .from('rag_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Document deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      )
    }

    // 5. Decrement document_count on knowledge base
    // The DB trigger (Section 1) handles this, but we also do it explicitly
    // as a safety net in case the trigger is not set up.
    if (document.knowledge_base_id) {
      const { data: kb } = await supabase
        .from('rag_knowledge_bases')
        .select('document_count')
        .eq('id', document.knowledge_base_id)
        .single()

      if (kb) {
        await supabase
          .from('rag_knowledge_bases')
          .update({
            document_count: Math.max(0, (kb.document_count || 0) - 1),
          })
          .eq('id', document.knowledge_base_id)
      }
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('DELETE /api/rag/documents/[id] error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Pattern Source:** `src/app/api/pipeline/jobs/[jobId]/route.ts` (DELETE with auth + ownership + cascade)

**Acceptance Criteria:**
1. Only the document owner can delete a document
2. Deletes the file from Supabase Storage
3. CASCADE deletes all child records (sections, facts, questions, embeddings)
4. Decrements the knowledge base document_count
5. Storage deletion failure does not block database deletion
6. Returns `{ success: true }` with no data payload

**Verification Steps:**
1. Create a document, then call `DELETE /api/rag/documents/{id}` -- expect 200 with `{ success: true }`
2. Verify the document and all child records are gone from the database
3. Verify the file is removed from Supabase Storage
4. Call DELETE again on the same ID -- expect 404
5. Call with another user's document ID -- expect 404
6. Call without auth -- expect 401

---

## Complete File Listing

Below is the complete assembled code for each of the 6 route files, combining handlers that share the same file.

### File 1: `src/app/api/rag/documents/route.ts`

Contains: FR-6.1 (POST) + FR-6.2 (GET)

```typescript
/**
 * API Route: /api/rag/documents
 *
 * POST - Upload a new document (create record + signed upload URL)
 * GET  - List documents for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const UploadDocumentSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_type: z.enum(['pdf', 'docx', 'txt', 'md']),
  description: z.string().max(1000).optional(),
  fast_mode: z.boolean().optional().default(false),
  knowledge_base_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// POST /api/rag/documents
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    // 2. Validate
    const body = await request.json()
    const validation = UploadDocumentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { file_name, file_type, description, fast_mode, knowledge_base_id } =
      validation.data

    const supabase = await createServerSupabaseClient()

    // 3. Resolve or auto-create knowledge base
    let kbId = knowledge_base_id

    if (!kbId) {
      // Check if user already has a default knowledge base
      const { data: existingKb } = await supabase
        .from('rag_knowledge_bases')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (existingKb) {
        kbId = existingKb.id
      } else {
        // Auto-create a default knowledge base
        const { data: newKb, error: kbError } = await supabase
          .from('rag_knowledge_bases')
          .insert({
            user_id: user.id,
            name: 'My Knowledge Base',
            description: 'Auto-created default knowledge base',
            document_count: 0,
          })
          .select('id')
          .single()

        if (kbError || !newKb) {
          console.error('Knowledge base creation error:', kbError)
          return NextResponse.json(
            {
              error: 'Failed to create knowledge base',
              details: kbError?.message || 'Unknown error',
            },
            { status: 500 }
          )
        }
        kbId = newKb.id
      }
    } else {
      // Verify the provided knowledge base belongs to user
      const { data: kb, error: kbError } = await supabase
        .from('rag_knowledge_bases')
        .select('id')
        .eq('id', kbId)
        .eq('user_id', user.id)
        .single()

      if (kbError || !kb) {
        return NextResponse.json(
          { error: 'Knowledge base not found or access denied' },
          { status: 404 }
        )
      }
    }

    // 4. Determine MIME type for storage
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
    }

    // 5. Create document record
    const storagePath = `${user.id}/${kbId}/${crypto.randomUUID()}.${file_type}`

    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .insert({
        user_id: user.id,
        knowledge_base_id: kbId,
        file_name,
        file_type,
        storage_path: storagePath,
        description: description || null,
        fast_mode: fast_mode || false,
        status: 'pending',
      })
      .select()
      .single()

    if (docError || !document) {
      console.error('Document creation error:', docError)
      return NextResponse.json(
        {
          error: 'Failed to create document record',
          details: docError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    // 6. Generate signed upload URL (valid for 10 minutes)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('rag-documents')
      .createSignedUploadUrl(storagePath)

    if (uploadError || !uploadData) {
      // Rollback: delete the document record
      await supabase.from('rag_documents').delete().eq('id', document.id)
      console.error('Signed URL generation error:', uploadError)
      return NextResponse.json(
        {
          error: 'Failed to generate upload URL',
          details: uploadError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    // 7. Increment document_count on knowledge base
    // Note: This is also handled by DB trigger (Section 1) as a safety net.
    const { data: currentKb } = await supabase
      .from('rag_knowledge_bases')
      .select('document_count')
      .eq('id', kbId)
      .single()

    if (currentKb) {
      await supabase
        .from('rag_knowledge_bases')
        .update({ document_count: (currentKb.document_count || 0) + 1 })
        .eq('id', kbId)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          document,
          uploadUrl: uploadData.signedUrl,
          token: uploadData.token,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/rag/documents error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// GET /api/rag/documents
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // 2. Parse query params
    const knowledgeBaseId = searchParams.get('knowledge_base_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = (page - 1) * limit

    // 3. Build query
    let query = supabase
      .from('rag_documents')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (knowledgeBaseId) {
      query = query.eq('knowledge_base_id', knowledgeBaseId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Documents fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: documents || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 2: `src/app/api/rag/documents/[id]/route.ts`

Contains: FR-6.9 (GET) + FR-6.10 (DELETE)

```typescript
/**
 * API Route: /api/rag/documents/[id]
 *
 * GET    - Get document details with related data counts
 * DELETE - Delete document and all related records
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// GET /api/rag/documents/[id]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Fetch document
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Fetch related data counts in parallel
    const [sectionsResult, factsResult, questionsResult, embeddingsResult] =
      await Promise.all([
        supabase
          .from('rag_sections')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_facts')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_expert_questions')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
        supabase
          .from('rag_embeddings')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', documentId),
      ])

    // 4. Count answered questions
    const { count: answeredCount } = await supabase
      .from('rag_expert_questions')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .eq('status', 'answered')

    return NextResponse.json({
      success: true,
      data: {
        document: {
          ...document,
          section_count: sectionsResult.count || 0,
          fact_count: factsResult.count || 0,
          question_count: questionsResult.count || 0,
          answered_question_count: answeredCount || 0,
          embedding_count: embeddingsResult.count || 0,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents/[id] error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/rag/documents/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Fetch document (need storage_path and knowledge_base_id before deletion)
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, storage_path, knowledge_base_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Delete from Supabase Storage (non-blocking -- log error but do not fail)
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('rag-documents')
        .remove([document.storage_path])

      if (storageError) {
        console.error('Storage deletion warning (non-fatal):', storageError)
      }
    }

    // 4. Delete document record (CASCADE handles child records:
    //    rag_sections, rag_facts, rag_expert_questions, rag_embeddings,
    //    rag_queries (via knowledge_base), rag_quality_scores (via query))
    const { error: deleteError } = await supabase
      .from('rag_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Document deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document', details: deleteError.message },
        { status: 500 }
      )
    }

    // 5. Decrement document_count on knowledge base
    if (document.knowledge_base_id) {
      const { data: kb } = await supabase
        .from('rag_knowledge_bases')
        .select('document_count')
        .eq('id', document.knowledge_base_id)
        .single()

      if (kb) {
        await supabase
          .from('rag_knowledge_bases')
          .update({
            document_count: Math.max(0, (kb.document_count || 0) - 1),
          })
          .eq('id', document.knowledge_base_id)
      }
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('DELETE /api/rag/documents/[id] error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 3: `src/app/api/rag/documents/[id]/process/route.ts`

Contains: FR-6.3 (POST)

```typescript
/**
 * API Route: /api/rag/documents/[id]/process
 *
 * POST - Trigger full document processing pipeline
 *
 * This runs the complete ingestion pipeline synchronously:
 * 1. Text extraction (PDF/DOCX/TXT/MD)
 * 2. LLM document reading and comprehension
 * 3. Section identification and knowledge extraction
 * 4. Contextual Retrieval preamble generation
 * 5. Multi-tier embedding generation
 *
 * // TODO: Phase 2 - move to background job for large documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { processDocument } from '@/lib/services/rag/ingestion.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Check document is in a processable state
    if (document.status === 'processing') {
      return NextResponse.json(
        { error: 'Document is already being processed' },
        { status: 409 }
      )
    }

    if (document.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Document has already been processed',
          details: 'Delete and re-upload to reprocess',
        },
        { status: 409 }
      )
    }

    // 4. Update status to processing
    await supabase
      .from('rag_documents')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    // 5. Run the full ingestion pipeline
    // TODO: Phase 2 - move to background job for large documents
    try {
      const result = await processDocument(documentId, user.id)

      // 6. Fetch updated document
      const { data: updatedDoc } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          document: updatedDoc,
          processing_summary: result,
        },
      })
    } catch (processingError) {
      // Update status to failed
      await supabase
        .from('rag_documents')
        .update({
          status: 'failed',
          error_message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown processing error',
        })
        .eq('id', documentId)

      console.error('Document processing failed:', processingError)
      return NextResponse.json(
        {
          error: 'Document processing failed',
          details:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/process error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 4: `src/app/api/rag/documents/[id]/questions/route.ts`

Contains: FR-6.4 (GET) + FR-6.5 (POST)

```typescript
/**
 * API Route: /api/rag/documents/[id]/questions
 *
 * GET  - Get expert questions for a document
 * POST - Submit expert answers to questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import {
  getQuestionsForDocument,
  submitExpertAnswers,
} from '@/lib/services/rag/expert-qa.service'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const SubmitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        answer_text: z.string().min(1).max(10000),
      })
    )
    .min(1),
})

// ---------------------------------------------------------------------------
// GET /api/rag/documents/[id]/questions
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Get questions
    const questions = await getQuestionsForDocument(documentId)

    return NextResponse.json({
      success: true,
      data: {
        questions,
        document_status: document.status,
      },
    })
  } catch (error) {
    console.error('GET /api/rag/documents/[id]/questions error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/rag/documents/[id]/questions
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Validate request body
    const body = await request.json()
    const validation = SubmitAnswersSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // 4. Verify all question IDs belong to this document
    const questionIds = validation.data.answers.map((a) => a.question_id)
    const { data: validQuestions, error: qError } = await supabase
      .from('rag_expert_questions')
      .select('id')
      .eq('document_id', documentId)
      .in('id', questionIds)

    if (qError) {
      console.error('Question validation error:', qError)
      return NextResponse.json(
        { error: 'Failed to validate questions', details: qError.message },
        { status: 500 }
      )
    }

    const validIds = new Set((validQuestions || []).map((q) => q.id))
    const invalidIds = questionIds.filter((id) => !validIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid question IDs',
          details: `These question IDs do not belong to this document: ${invalidIds.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 5. Submit answers via service
    const result = await submitExpertAnswers(
      documentId,
      user.id,
      validation.data.answers
    )

    // 6. Fetch updated document
    const { data: updatedDoc } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        document: updatedDoc,
        answers_submitted: validation.data.answers.length,
        refinement_summary: result,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/questions error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 5: `src/app/api/rag/documents/[id]/verify/route.ts`

Contains: FR-6.6 (POST)

```typescript
/**
 * API Route: /api/rag/documents/[id]/verify
 *
 * POST - Generate verification samples for expert review
 *
 * Creates synthetic question-answer pairs from extracted knowledge
 * so the expert can verify the system understood the document correctly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { generateVerificationSamples } from '@/lib/services/rag/expert-qa.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const documentId = params.id
    const supabase = await createServerSupabaseClient()

    // 2. Validate document belongs to user
    const { data: document, error: docError } = await supabase
      .from('rag_documents')
      .select('id, status')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // 3. Document must be in a processed state
    const processableStatuses = ['completed', 'qa_in_progress', 'qa_complete']
    if (!processableStatuses.includes(document.status)) {
      return NextResponse.json(
        {
          error: 'Document not ready for verification',
          details: `Document must be processed first. Current status: ${document.status}`,
        },
        { status: 400 }
      )
    }

    // 4. Generate verification samples via service
    const samples = await generateVerificationSamples(documentId, user.id)

    return NextResponse.json({
      success: true,
      data: {
        samples,
        count: samples.length,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/documents/[id]/verify error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 6: `src/app/api/rag/query/route.ts`

Contains: FR-6.7 (POST)

```typescript
/**
 * API Route: /api/rag/query
 *
 * POST - Query the knowledge base with RAG, LoRA, or RAG+LoRA mode
 *
 * This is the main query endpoint that:
 * 1. Generates a HyDE (Hypothetical Document Embedding) for the query
 * 2. Performs multi-tier retrieval (document -> section -> fact)
 * 3. Evaluates retrieval quality via Self-RAG / Corrective RAG
 * 4. Assembles context and generates a response
 * 5. Scores response quality via Claude-as-Judge
 * 6. Logs the query and quality metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { queryKnowledgeBase } from '@/lib/services/rag/retrieval.service'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  query_text: z.string().min(1).max(5000),
  mode: z.enum(['rag_only', 'lora_only', 'rag_lora']),
  knowledge_base_id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// POST /api/rag/query
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    // 2. Validate
    const body = await request.json()
    const validation = QuerySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { query_text, mode, knowledge_base_id } = validation.data
    const supabase = await createServerSupabaseClient()

    // 3. Verify knowledge base belongs to user
    const { data: kb, error: kbError } = await supabase
      .from('rag_knowledge_bases')
      .select('id, name')
      .eq('id', knowledge_base_id)
      .eq('user_id', user.id)
      .single()

    if (kbError || !kb) {
      return NextResponse.json(
        { error: 'Knowledge base not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Verify knowledge base has at least one completed document
    const { count: completedDocs } = await supabase
      .from('rag_documents')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_base_id', knowledge_base_id)
      .eq('user_id', user.id)
      .in('status', ['completed', 'qa_complete'])

    if (!completedDocs || completedDocs === 0) {
      return NextResponse.json(
        {
          error: 'No processed documents in this knowledge base',
          details:
            'Upload and process at least one document before querying',
        },
        { status: 400 }
      )
    }

    // 5. Execute query via retrieval service
    const startTime = Date.now()
    const result = await queryKnowledgeBase({
      query_text,
      mode,
      knowledge_base_id,
      user_id: user.id,
    })
    const generationTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        response_text: result.response_text,
        citations: result.citations,
        quality_score: result.quality_score,
        mode,
        generation_time_ms: generationTimeMs,
        query_id: result.query_id,
      },
    })
  } catch (error) {
    console.error('POST /api/rag/query error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

### File 7: `src/app/api/rag/quality/route.ts`

Contains: FR-6.8 (GET)

```typescript
/**
 * API Route: /api/rag/quality
 *
 * GET - Get aggregated quality metrics for the authenticated user
 *
 * Returns:
 * - Average composite score (overall and per-mode)
 * - Per-metric averages (faithfulness, relevance, completeness, coherence, citation_accuracy)
 * - Per-mode comparisons (rag_only vs lora_only vs rag_lora)
 * - Query count
 * - Trend data (daily averages for charting)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const { user, response } = await requireAuth(request)
    if (response) return response

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // 2. Parse query params
    const knowledgeBaseId = searchParams.get('knowledge_base_id')
    const mode = searchParams.get('mode')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')

    // 3. Build query -- join quality scores with queries to filter by user
    let scoresQuery = supabase
      .from('rag_quality_scores')
      .select(`
        *,
        query:rag_queries!inner(
          id,
          user_id,
          knowledge_base_id,
          mode,
          created_at
        )
      `)
      .eq('query.user_id', user.id)

    if (knowledgeBaseId) {
      scoresQuery = scoresQuery.eq('query.knowledge_base_id', knowledgeBaseId)
    }

    if (mode) {
      scoresQuery = scoresQuery.eq('query.mode', mode)
    }

    if (fromDate) {
      scoresQuery = scoresQuery.gte('query.created_at', fromDate)
    }

    if (toDate) {
      scoresQuery = scoresQuery.lte('query.created_at', toDate)
    }

    const { data: scores, error: scoresError } = await scoresQuery

    if (scoresError) {
      console.error('Quality scores fetch error:', scoresError)
      return NextResponse.json(
        {
          error: 'Failed to fetch quality scores',
          details: scoresError.message,
        },
        { status: 500 }
      )
    }

    const allScores = scores || []

    // 4. Compute aggregated metrics
    const queryCount = allScores.length

    if (queryCount === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            query_count: 0,
            average_composite_score: null,
            per_metric_averages: null,
            per_mode_comparisons: null,
            trend_data: [],
          },
        },
      })
    }

    // Helper functions
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const avg = (arr: number[]) =>
      arr.length > 0 ? sum(arr) / arr.length : 0
    const round2 = (n: number) => Math.round(n * 100) / 100

    // 4a. Overall averages
    const compositeScores = allScores
      .map((s) => s.composite_score)
      .filter((v): v is number => v != null)
    const faithfulnessScores = allScores
      .map((s) => s.faithfulness)
      .filter((v): v is number => v != null)
    const relevanceScores = allScores
      .map((s) => s.relevance)
      .filter((v): v is number => v != null)
    const completenessScores = allScores
      .map((s) => s.completeness)
      .filter((v): v is number => v != null)
    const coherenceScores = allScores
      .map((s) => s.coherence)
      .filter((v): v is number => v != null)
    const citationScores = allScores
      .map((s) => s.citation_accuracy)
      .filter((v): v is number => v != null)

    const perMetricAverages = {
      faithfulness: round2(avg(faithfulnessScores)),
      relevance: round2(avg(relevanceScores)),
      completeness: round2(avg(completenessScores)),
      coherence: round2(avg(coherenceScores)),
      citation_accuracy: round2(avg(citationScores)),
    }

    // 4b. Per-mode comparisons
    const modes = ['rag_only', 'lora_only', 'rag_lora'] as const
    const perModeComparisons: Record<
      string,
      { average_composite_score: number; query_count: number }
    > = {}

    for (const m of modes) {
      const modeScores = allScores
        .filter((s) => (s.query as any)?.mode === m)
        .map((s) => s.composite_score)
        .filter((v): v is number => v != null)

      if (modeScores.length > 0) {
        perModeComparisons[m] = {
          average_composite_score: round2(avg(modeScores)),
          query_count: modeScores.length,
        }
      }
    }

    // 4c. Trend data (daily averages for charting)
    const dailyBuckets: Record<string, number[]> = {}
    for (const score of allScores) {
      const date = (
        (score.query as any)?.created_at ||
        score.created_at ||
        ''
      ).split('T')[0]
      if (!date) continue
      if (!dailyBuckets[date]) dailyBuckets[date] = []
      if (score.composite_score != null) {
        dailyBuckets[date].push(score.composite_score)
      }
    }

    const trendData = Object.entries(dailyBuckets)
      .map(([date, vals]) => ({
        date,
        average_composite_score: round2(avg(vals)),
        query_count: vals.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          query_count: queryCount,
          average_composite_score: round2(avg(compositeScores)),
          per_metric_averages: perMetricAverages,
          per_mode_comparisons: perModeComparisons,
          trend_data: trendData,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/rag/quality error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

---

## Section Summary

**What Was Added (6 new files, 10 route handlers):**

| File Path | Handlers | Feature Refs |
|---|---|---|
| `src/app/api/rag/documents/route.ts` | POST, GET | FR-6.1, FR-6.2 |
| `src/app/api/rag/documents/[id]/route.ts` | GET, DELETE | FR-6.9, FR-6.10 |
| `src/app/api/rag/documents/[id]/process/route.ts` | POST | FR-6.3 |
| `src/app/api/rag/documents/[id]/questions/route.ts` | GET, POST | FR-6.4, FR-6.5 |
| `src/app/api/rag/documents/[id]/verify/route.ts` | POST | FR-6.6 |
| `src/app/api/rag/query/route.ts` | POST | FR-6.7 |
| `src/app/api/rag/quality/route.ts` | GET | FR-6.8 |

**What Was Reused:**
- `requireAuth()` from `@/lib/supabase-server` -- authentication on every route
- `createServerSupabaseClient()` from `@/lib/supabase-server` -- Supabase client
- `zod` -- request validation schemas
- `NextRequest` / `NextResponse` -- Next.js 14 App Router
- Existing response format pattern: `{ success: true, data: {...} }` or `{ error: string, details: string }`
- Existing pagination pattern from `src/app/api/jobs/route.ts`
- Existing dynamic route param pattern from `src/app/api/pipeline/conversations/[id]/turn/route.ts`

**Integration Points:**
- Routes call services from Section 3 (`ingestion.service.ts`), Section 4 (`expert-qa.service.ts`), and Section 5 (`retrieval.service.ts`)
- Routes read/write to all 8 `rag_*` database tables from Section 1
- Routes use TypeScript types from Section 2 (`src/types/rag.ts`)
- Routes are called by React hooks in Section 7
- Quality route (FR-6.8) provides data for the quality dashboard in Section 9

**Service Function Signatures Expected:**

These are the service functions imported by the routes. They must be implemented in Sections 3-5 with these exact signatures:

```typescript
// From src/lib/services/rag/ingestion.service.ts (Section 3)
export async function processDocument(
  documentId: string,
  userId: string
): Promise<{ sections_created: number; facts_extracted: number; embeddings_generated: number }>

// From src/lib/services/rag/expert-qa.service.ts (Section 4)
export async function getQuestionsForDocument(
  documentId: string
): Promise<Array<{ id: string; question_text: string; category: string; priority: string; status: string }>>

export async function submitExpertAnswers(
  documentId: string,
  userId: string,
  answers: Array<{ question_id: string; answer_text: string }>
): Promise<{ answers_processed: number; knowledge_refined: boolean }>

export async function generateVerificationSamples(
  documentId: string,
  userId: string
): Promise<Array<{ question: string; expected_answer: string; source_section: string }>>

// From src/lib/services/rag/retrieval.service.ts (Section 5)
export async function queryKnowledgeBase(params: {
  query_text: string
  mode: 'rag_only' | 'lora_only' | 'rag_lora'
  knowledge_base_id: string
  user_id: string
}): Promise<{
  response_text: string
  citations: Array<{ section_title: string; fact_text: string; relevance_score: number }>
  quality_score: number | null
  query_id: string
}>
```

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-6.md`
**Status:** COMPLETE
**Line Count:** ~1400 lines (within 1500-line section limit)
