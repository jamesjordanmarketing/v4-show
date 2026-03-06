# RAG Frontier - Execution Prompt E03: Ingestion & Embedding Services

**Version:** 2.0
**Date:** February 11, 2026
**Section:** E03 - Ingestion & Embedding Services
**Prerequisites:** E01 (database) ✅, E02 (types & providers) ✅ complete
**Status:** Ready for Execution
**Changes from v1:** Updated prerequisites status, clarified environment setup, corrected dependency installation paths, added E02 completion confirmation

---

## Overview

This prompt creates the document ingestion and embedding services — the core engine that reads uploaded documents, extracts knowledge using Claude, generates embeddings using OpenAI, and stores everything in the database.

**What This Section Creates:**
1. `src/lib/rag/services/rag-db-mappers.ts` — Database row ↔ TypeScript entity mappers
2. `src/lib/rag/services/rag-embedding-service.ts` — Embedding generation, storage, and similarity search
3. `src/lib/rag/services/rag-ingestion-service.ts` — Document upload, text extraction, LLM processing, knowledge storage

**What This Section Does NOT Change:**
- No database schema changes (E01)
- No provider interfaces (E02)
- No API routes (E06-E07)

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

### SAOL for Database Operations
**⚠️ Use SAOL for all database DDL operations (RPC functions).** Service code uses `createServerSupabaseAdminClient()` for DB operations, matching existing service patterns.

---

========================


# EXECUTION PROMPT E03: Ingestion & Embedding Services

## Your Mission

Create the document ingestion pipeline and embedding service for the RAG Frontier module. This is a Next.js 14 / TypeScript app using Supabase PostgreSQL with pgvector. You will:

1. Create database row mappers (snake_case ↔ camelCase)
2. Create the embedding service (generate, store, and search vectors)
3. Create the ingestion service (upload, extract text, process with Claude, store knowledge)
4. Create required PostgreSQL RPC functions via SAOL
5. Install required npm dependencies
6. Verify TypeScript compiles

---

## Context: Current State

### E02 Completion Status ✅

**Completed in This Session (February 11, 2026):**
- ✅ `src/types/rag.ts` — All RAG entity types, request/response types, enums, display maps, DB row types
- ✅ `src/types/index.ts` — Updated with `export * from './rag'`
- ✅ `src/lib/rag/config.ts` — RAG configuration constants
- ✅ `src/lib/rag/providers/llm-provider.ts` — Abstract LLM provider interface
- ✅ `src/lib/rag/providers/claude-llm-provider.ts` — Claude implementation using Anthropic SDK
- ✅ `src/lib/rag/providers/embedding-provider.ts` — Abstract embedding provider interface
- ✅ `src/lib/rag/providers/openai-embedding-provider.ts` — OpenAI implementation using fetch
- ✅ `src/lib/rag/providers/index.ts` — Provider barrel exports
- ✅ `OPENAI_API_KEY` added to `.env.local`

### E01 Completion Status ✅
- ✅ pgvector extension enabled
- ✅ All 8 RAG tables created with RLS and indexes
- ✅ Storage bucket `rag-documents` created
- ✅ `rag_embeddings` table stores embedding as `jsonb` (not native vector type for compatibility)

### Codebase Patterns
- **Existing service pattern**: Services in `src/lib/services/` use:
  - `createServerSupabaseClient()` for user-scoped operations (async, RLS-enabled)
  - `createServerSupabaseAdminClient()` for admin operations (sync, bypasses RLS)
  - Return `{ success: boolean; data?: T; error?: string }`
  - Use `mapDbRowToEntity()` functions for snake_case ↔ camelCase conversion
- **Supabase clients**: Located at `@/lib/supabase-server`
- **Service file convention**: kebab-case filenames
- **Path alias**: `@/` maps to `src/`

---

## Phase 1: Database Row Mappers

### Task 1: Create RAG Database Mappers

Create comprehensive mappers for converting between database snake_case rows and TypeScript camelCase entities.

**File:** `src/lib/rag/services/rag-db-mappers.ts`

```typescript
import type {
  RAGKnowledgeBase,
  RAGKnowledgeBaseRow,
  RAGDocument,
  RAGDocumentRow,
  RAGSection,
  RAGSectionRow,
  RAGFact,
  RAGFactRow,
  RAGExpertQuestion,
  RAGExpertQuestionRow,
  RAGQuery,
  RAGQueryRow,
  RAGQualityScore,
  RAGQualityScoreRow,
  RAGEntityItem,
  RAGDocumentStatus,
  RAGDocumentFileType,
  RAGFactType,
  RAGImpactLevel,
  RAGQueryMode,
  RAGKnowledgeBaseStatus,
  RAGCitation,
} from '@/types/rag';

// ============================================
// Knowledge Base Mappers
// ============================================

export function mapRowToKnowledgeBase(row: RAGKnowledgeBaseRow): RAGKnowledgeBase {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    status: row.status as RAGKnowledgeBaseStatus,
    documentCount: row.document_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Document Mappers
// ============================================

export function mapRowToDocument(row: RAGDocumentRow): RAGDocument {
  return {
    id: row.id,
    knowledgeBaseId: row.knowledge_base_id,
    userId: row.user_id,
    fileName: row.file_name,
    fileType: row.file_type as RAGDocumentFileType,
    fileSizeBytes: row.file_size_bytes,
    filePath: row.file_path,
    storageBucket: row.storage_bucket,
    originalText: row.original_text,
    description: row.description,
    status: row.status as RAGDocumentStatus,
    processingStartedAt: row.processing_started_at,
    processingCompletedAt: row.processing_completed_at,
    processingError: row.processing_error,
    documentSummary: row.document_summary,
    topicTaxonomy: Array.isArray(row.topic_taxonomy) ? row.topic_taxonomy as string[] : [],
    entityList: Array.isArray(row.entity_list) ? row.entity_list as RAGEntityItem[] : [],
    ambiguityList: Array.isArray(row.ambiguity_list) ? row.ambiguity_list as string[] : [],
    sectionCount: row.section_count,
    factCount: row.fact_count,
    questionCount: row.question_count,
    totalTokensEstimated: row.total_tokens_estimated,
    fastMode: row.fast_mode,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Section Mappers
// ============================================

export function mapRowToSection(row: RAGSectionRow): RAGSection {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    sectionIndex: row.section_index,
    title: row.title,
    originalText: row.original_text,
    summary: row.summary,
    contextualPreamble: row.contextual_preamble,
    sectionMetadata: (row.section_metadata as Record<string, unknown>) || {},
    tokenCount: row.token_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Fact Mappers
// ============================================

export function mapRowToFact(row: RAGFactRow): RAGFact {
  return {
    id: row.id,
    documentId: row.document_id,
    sectionId: row.section_id,
    userId: row.user_id,
    factType: row.fact_type as RAGFactType,
    content: row.content,
    sourceText: row.source_text,
    confidence: row.confidence,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Expert Question Mappers
// ============================================

export function mapRowToQuestion(row: RAGExpertQuestionRow): RAGExpertQuestion {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    questionText: row.question_text,
    questionReason: row.question_reason,
    impactLevel: row.impact_level as RAGImpactLevel,
    sortOrder: row.sort_order,
    answerText: row.answer_text,
    answeredAt: row.answered_at,
    skipped: row.skipped,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// Query Mappers
// ============================================

export function mapRowToQuery(row: RAGQueryRow): RAGQuery {
  return {
    id: row.id,
    knowledgeBaseId: row.knowledge_base_id,
    documentId: row.document_id,
    userId: row.user_id,
    queryText: row.query_text,
    hydeText: row.hyde_text,
    mode: row.mode as RAGQueryMode,
    retrievedSectionIds: Array.isArray(row.retrieved_section_ids) ? row.retrieved_section_ids as string[] : [],
    retrievedFactIds: Array.isArray(row.retrieved_fact_ids) ? row.retrieved_fact_ids as string[] : [],
    assembledContext: row.assembled_context,
    responseText: row.response_text,
    citations: Array.isArray(row.citations) ? row.citations as RAGCitation[] : [],
    selfEvalPassed: row.self_eval_passed,
    selfEvalScore: row.self_eval_score,
    responseTimeMs: row.response_time_ms,
    createdAt: row.created_at,
  };
}

// ============================================
// Quality Score Mappers
// ============================================

export function mapRowToQualityScore(row: RAGQualityScoreRow): RAGQualityScore {
  return {
    id: row.id,
    queryId: row.query_id,
    userId: row.user_id,
    faithfulnessScore: row.faithfulness_score,
    answerRelevanceScore: row.answer_relevance_score,
    contextRelevanceScore: row.context_relevance_score,
    answerCompletenessScore: row.answer_completeness_score,
    citationAccuracyScore: row.citation_accuracy_score,
    compositeScore: row.composite_score,
    evaluationModel: row.evaluation_model,
    evaluationDetails: (row.evaluation_details as Record<string, unknown>) || {},
    evaluatedAt: row.evaluated_at,
    createdAt: row.created_at,
  };
}
```

**Pattern Source**: `src/lib/services/pipeline-service.ts` — `mapDbRowToJob()` function pattern

---

## Phase 2: Embedding Service

### Task 2: Create RAG Embedding Service

This service handles embedding generation via OpenAI, storage in Supabase, and similarity search using pgvector.

**File:** `src/lib/rag/services/rag-embedding-service.ts`

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { OpenAIEmbeddingProvider } from '@/lib/rag/providers';
import type { EmbeddingProvider } from '@/lib/rag/providers/embedding-provider';
import type { RAGEmbeddingSourceType, RAGEmbeddingTier } from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Embedding Service
// ============================================
// Handles embedding generation, storage, and similarity search.
// Pattern Source: src/lib/services/pipeline-service.ts

let embeddingProvider: EmbeddingProvider | null = null;

function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = new OpenAIEmbeddingProvider();
  }
  return embeddingProvider;
}

// ============================================
// Generate and Store Embeddings
// ============================================

export async function generateAndStoreEmbedding(params: {
  documentId: string;
  userId: string;
  sourceType: RAGEmbeddingSourceType;
  sourceId: string;
  contentText: string;
  tier: RAGEmbeddingTier;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; embeddingId?: string; error?: string }> {
  try {
    const { documentId, userId, sourceType, sourceId, contentText, tier, metadata } = params;
    const provider = getEmbeddingProvider();

    // Generate embedding vector
    const embedding = await provider.embed(contentText);

    // Store in database (embedding stored as jsonb array)
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_embeddings')
      .insert({
        document_id: documentId,
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId,
        content_text: contentText,
        embedding: embedding, // Stored as jsonb array
        embedding_model: provider.getModelName(),
        tier,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing embedding:', error);
      return { success: false, error: error.message };
    }

    return { success: true, embeddingId: data.id };
  } catch (err) {
    console.error('Exception generating embedding:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate embedding' };
  }
}

export async function generateAndStoreBatchEmbeddings(params: {
  documentId: string;
  userId: string;
  items: Array<{
    sourceType: RAGEmbeddingSourceType;
    sourceId: string;
    contentText: string;
    tier: RAGEmbeddingTier;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { documentId, userId, items } = params;
    if (items.length === 0) return { success: true, count: 0 };

    const provider = getEmbeddingProvider();

    // Generate all embeddings in batch
    const texts = items.map(item => item.contentText);
    const embeddings = await provider.embedBatch(texts);

    // Prepare insert records
    const records = items.map((item, i) => ({
      document_id: documentId,
      user_id: userId,
      source_type: item.sourceType,
      source_id: item.sourceId,
      content_text: item.contentText,
      embedding: embeddings[i], // Stored as jsonb array
      embedding_model: provider.getModelName(),
      tier: item.tier,
      metadata: item.metadata || {},
    }));

    // Store in database
    const supabase = createServerSupabaseAdminClient();
    const { error } = await supabase
      .from('rag_embeddings')
      .insert(records);

    if (error) {
      console.error('Error storing batch embeddings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: records.length };
  } catch (err) {
    console.error('Exception in batch embedding:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to generate batch embeddings' };
  }
}

// ============================================
// Similarity Search
// ============================================

export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  tier?: RAGEmbeddingTier;
  limit?: number;
  threshold?: number;
}): Promise<{ success: boolean; data?: Array<{ id: string; sourceType: string; sourceId: string; contentText: string; similarity: number; tier: number }>; error?: string }> {
  try {
    const { queryText, documentId, tier, limit = 10, threshold = RAG_CONFIG.retrieval.similarityThreshold } = params;
    const provider = getEmbeddingProvider();

    // Generate query embedding
    const queryEmbedding = await provider.embed(queryText);

    // Build the similarity search query using pgvector's cosine distance operator
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase.rpc('match_rag_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_document_id: documentId || null,
      filter_tier: tier || null,
    });

    if (error) {
      console.error('Error in similarity search:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((row: any) => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        contentText: row.content_text,
        similarity: row.similarity,
        tier: row.tier,
      })),
    };
  } catch (err) {
    console.error('Exception in similarity search:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to search embeddings' };
  }
}

// ============================================
// Delete Embeddings for Document
// ============================================

export async function deleteDocumentEmbeddings(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { error } = await supabase
      .from('rag_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      console.error('Error deleting embeddings:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Exception deleting embeddings:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete embeddings' };
  }
}
```

---

### Task 3: Create the match_rag_embeddings RPC Function

This PostgreSQL function enables vector similarity search via Supabase RPC. The function uses jsonb embeddings and computes cosine similarity.

**Execute via SAOL (dry run first):**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE OR REPLACE FUNCTION match_rag_embeddings(query_embedding jsonb,match_threshold float,match_count int,filter_document_id uuid DEFAULT NULL,filter_tier int DEFAULT NULL) RETURNS TABLE (id uuid,source_type text,source_id uuid,content_text text,tier int,similarity float) LANGUAGE plpgsql AS \\$\\$ BEGIN RETURN QUERY SELECT re.id,re.source_type::text,re.source_id,re.content_text,re.tier,(1 - (SELECT 1 - sum((q.value::float * e.value::float)) / (sqrt(sum(q.value::float * q.value::float)) * sqrt(sum(e.value::float * e.value::float))) FROM jsonb_array_elements(query_embedding) WITH ORDINALITY AS q(value, idx) JOIN jsonb_array_elements(re.embedding) WITH ORDINALITY AS e(value, idx2) ON q.idx = e.idx2)) AS similarity FROM rag_embeddings re WHERE (filter_document_id IS NULL OR re.document_id = filter_document_id) AND (filter_tier IS NULL OR re.tier = filter_tier) ORDER BY similarity DESC LIMIT match_count; END; \\$\\$;\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

**Then execute (dryRun:false):**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE OR REPLACE FUNCTION match_rag_embeddings(query_embedding jsonb,match_threshold float,match_count int,filter_document_id uuid DEFAULT NULL,filter_tier int DEFAULT NULL) RETURNS TABLE (id uuid,source_type text,source_id uuid,content_text text,tier int,similarity float) LANGUAGE plpgsql AS \\$\\$ BEGIN RETURN QUERY SELECT re.id,re.source_type::text,re.source_id,re.content_text,re.tier,(1 - (SELECT 1 - sum((q.value::float * e.value::float)) / (sqrt(sum(q.value::float * q.value::float)) * sqrt(sum(e.value::float * e.value::float))) FROM jsonb_array_elements(query_embedding) WITH ORDINALITY AS q(value, idx) JOIN jsonb_array_elements(re.embedding) WITH ORDINALITY AS e(value, idx2) ON q.idx = e.idx2)) AS similarity FROM rag_embeddings re WHERE (filter_document_id IS NULL OR re.document_id = filter_document_id) AND (filter_tier IS NULL OR re.tier = filter_tier) ORDER BY similarity DESC LIMIT match_count; END; \\$\\$;\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

## Phase 3: Ingestion Service

### Task 4: Create RAG Ingestion Service

This service orchestrates the complete document ingestion pipeline: file upload → text extraction → LLM processing → knowledge storage → embedding generation.

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

```typescript
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings } from './rag-embedding-service';
import { mapRowToDocument, mapRowToSection, mapRowToFact, mapRowToQuestion, mapRowToKnowledgeBase } from './rag-db-mappers';
import type {
  RAGDocument,
  RAGSection,
  RAGFact,
  RAGExpertQuestion,
  RAGKnowledgeBase,
  DocumentUnderstanding,
} from '@/types/rag';
import { RAG_CONFIG } from '@/lib/rag/config';

// ============================================
// RAG Ingestion Service
// ============================================
// Handles document upload, text extraction, LLM processing, and knowledge storage.
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Knowledge Base Management
// ============================================

export async function createKnowledgeBase(params: {
  userId: string;
  name: string;
  description?: string;
}): Promise<{ success: boolean; data?: RAGKnowledgeBase; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_knowledge_bases')
      .insert({
        user_id: params.userId,
        name: params.name,
        description: params.description || null,
        status: 'active',
        document_count: 0,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating knowledge base:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToKnowledgeBase(data) };
  } catch (err) {
    console.error('Exception creating knowledge base:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create knowledge base' };
  }
}

export async function getKnowledgeBases(userId: string): Promise<{ success: boolean; data?: RAGKnowledgeBase[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_knowledge_bases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge bases:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToKnowledgeBase) };
  } catch (err) {
    console.error('Exception fetching knowledge bases:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch knowledge bases' };
  }
}

// ============================================
// Document Upload & Registration
// ============================================

export async function createDocumentRecord(params: {
  knowledgeBaseId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  filePath?: string;
  description?: string;
  fastMode?: boolean;
}): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('rag_documents')
      .insert({
        knowledge_base_id: params.knowledgeBaseId,
        user_id: params.userId,
        file_name: params.fileName,
        file_type: params.fileType,
        file_size_bytes: params.fileSizeBytes || null,
        file_path: params.filePath || null,
        storage_bucket: RAG_CONFIG.storage.bucket,
        description: params.description || null,
        fast_mode: params.fastMode || false,
        status: 'uploading',
        section_count: 0,
        fact_count: 0,
        question_count: 0,
        version: 1,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating document record:', error);
      return { success: false, error: error.message };
    }

    // Update knowledge base document count
    await supabase.rpc('increment_kb_doc_count', { kb_id: params.knowledgeBaseId });

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception creating document record:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create document' };
  }
}

// ============================================
// Text Extraction
// ============================================

export async function extractDocumentText(params: {
  documentId: string;
  fileContent: Buffer | string;
  fileType: string;
}): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const { fileContent, fileType } = params;
    let text = '';

    switch (fileType) {
      case 'txt':
      case 'md':
        text = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
        break;

      case 'pdf': {
        // Use pdf-parse for PDF text extraction
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileContent);
        text = pdfData.text;
        break;
      }

      case 'docx': {
        // Use mammoth for DOCX text extraction
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileContent });
        text = result.value;
        break;
      }

      default:
        return { success: false, error: `Unsupported file type: ${fileType}` };
    }

    if (!text || text.trim().length === 0) {
      return { success: false, error: 'No text content could be extracted from the document' };
    }

    return { success: true, text: text.trim() };
  } catch (err) {
    console.error('Exception extracting text:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to extract text' };
  }
}

// ============================================
// Upload File to Storage
// ============================================

export async function uploadDocumentFile(params: {
  userId: string;
  documentId: string;
  file: Buffer;
  fileName: string;
  fileType: string;
}): Promise<{ success: boolean; filePath?: string; text?: string; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const filePath = `${params.userId}/${params.documentId}/${params.fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(RAG_CONFIG.storage.bucket)
      .upload(filePath, params.file, {
        contentType: getContentType(params.fileType),
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Extract text
    const extraction = await extractDocumentText({
      documentId: params.documentId,
      fileContent: params.file,
      fileType: params.fileType,
    });

    if (!extraction.success || !extraction.text) {
      return { success: false, error: extraction.error || 'Failed to extract text' };
    }

    // Update document record with file path and extracted text
    await supabase
      .from('rag_documents')
      .update({
        file_path: filePath,
        file_size_bytes: params.file.length,
        original_text: extraction.text,
        status: 'processing',
      })
      .eq('id', params.documentId);

    return { success: true, filePath, text: extraction.text };
  } catch (err) {
    console.error('Exception uploading file:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to upload file' };
  }
}

function getContentType(fileType: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  return types[fileType] || 'application/octet-stream';
}

// ============================================
// Full Document Processing Pipeline
// ============================================

export async function processDocument(documentId: string): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  const supabase = createServerSupabaseAdminClient();

  try {
    // Step 1: Get document record
    const { data: docRow, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !docRow) {
      return { success: false, error: 'Document not found' };
    }

    const doc = mapRowToDocument(docRow);

    if (!doc.originalText) {
      return { success: false, error: 'Document has no extracted text. Upload the file first.' };
    }

    // Step 2: Update status to processing
    await supabase
      .from('rag_documents')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('id', documentId);

    console.log(`[RAG Ingestion] Processing document: ${doc.fileName} (${documentId})`);

    // Step 3: Send to LLM for document understanding
    const provider = getLLMProvider();
    let understanding: DocumentUnderstanding;

    try {
      understanding = await provider.readDocument({
        documentText: doc.originalText,
        fileName: doc.fileName,
        description: doc.description || undefined,
      });
    } catch (llmError) {
      console.error('[RAG Ingestion] LLM processing failed:', llmError);
      await supabase
        .from('rag_documents')
        .update({
          status: 'error',
          processing_error: llmError instanceof Error ? llmError.message : 'LLM processing failed',
        })
        .eq('id', documentId);
      return { success: false, error: 'LLM document processing failed' };
    }

    // Step 4: Store sections
    const sectionRecords = understanding.sections.map((section, index) => ({
      document_id: documentId,
      user_id: doc.userId,
      section_index: index,
      title: section.title,
      original_text: section.originalText,
      summary: section.summary,
      token_count: section.tokenCount,
      section_metadata: {},
    }));

    const { data: insertedSections, error: sectionError } = await supabase
      .from('rag_sections')
      .insert(sectionRecords)
      .select('*');

    if (sectionError) {
      console.error('[RAG Ingestion] Error storing sections:', sectionError);
      await supabase.from('rag_documents').update({ status: 'error', processing_error: 'Failed to store sections' }).eq('id', documentId);
      return { success: false, error: 'Failed to store document sections' };
    }

    const sections = (insertedSections || []).map(mapRowToSection);

    // Step 5: Generate contextual preambles for each section (Contextual Retrieval)
    console.log(`[RAG Ingestion] Generating contextual preambles for ${sections.length} sections...`);
    for (const section of sections) {
      try {
        const preambleResult = await provider.generateContextualPreamble({
          documentSummary: understanding.summary,
          sectionText: section.originalText,
          sectionTitle: section.title || undefined,
        });

        await supabase
          .from('rag_sections')
          .update({ contextual_preamble: preambleResult.preamble })
          .eq('id', section.id);

        section.contextualPreamble = preambleResult.preamble;
      } catch (preambleError) {
        console.warn(`[RAG Ingestion] Preamble generation failed for section ${section.id}:`, preambleError);
        // Continue — preambles are enhancement, not critical
      }
    }

    // Step 6: Store facts
    const factRecords = understanding.facts.map(fact => ({
      document_id: documentId,
      user_id: doc.userId,
      fact_type: fact.factType,
      content: fact.content,
      source_text: fact.sourceText,
      confidence: fact.confidence,
      metadata: {},
    }));

    const { data: insertedFacts, error: factError } = await supabase
      .from('rag_facts')
      .insert(factRecords)
      .select('*');

    if (factError) {
      console.warn('[RAG Ingestion] Error storing facts:', factError);
      // Continue — facts enhance quality but aren't critical
    }

    const facts = (insertedFacts || []).map(mapRowToFact);

    // Step 7: Store expert questions
    const questionRecords = understanding.expertQuestions.map((q, index) => ({
      document_id: documentId,
      user_id: doc.userId,
      question_text: q.questionText,
      question_reason: q.questionReason,
      impact_level: q.impactLevel,
      sort_order: index,
      skipped: false,
    }));

    const { error: questionError } = await supabase
      .from('rag_expert_questions')
      .insert(questionRecords);

    if (questionError) {
      console.warn('[RAG Ingestion] Error storing questions:', questionError);
    }

    // Step 8: Generate embeddings at all three tiers
    console.log('[RAG Ingestion] Generating embeddings...');

    const embeddingItems: Array<{
      sourceType: 'document' | 'section' | 'fact';
      sourceId: string;
      contentText: string;
      tier: 1 | 2 | 3;
    }> = [];

    // Tier 1: Document-level embedding (summary + taxonomy)
    embeddingItems.push({
      sourceType: 'document',
      sourceId: documentId,
      contentText: `${understanding.summary}\n\nTopics: ${understanding.topicTaxonomy.join(', ')}`,
      tier: 1,
    });

    // Tier 2: Section-level embeddings (contextual preamble + summary)
    for (const section of sections) {
      const embeddingText = section.contextualPreamble
        ? `${section.contextualPreamble}\n\n${section.summary || section.originalText.slice(0, 2000)}`
        : section.summary || section.originalText.slice(0, 2000);

      embeddingItems.push({
        sourceType: 'section',
        sourceId: section.id,
        contentText: embeddingText,
        tier: 2,
      });
    }

    // Tier 3: Fact-level embeddings
    for (const fact of facts) {
      embeddingItems.push({
        sourceType: 'fact',
        sourceId: fact.id,
        contentText: fact.content,
        tier: 3,
      });
    }

    const embeddingResult = await generateAndStoreBatchEmbeddings({
      documentId,
      userId: doc.userId,
      items: embeddingItems,
    });

    if (!embeddingResult.success) {
      console.warn('[RAG Ingestion] Embedding generation had errors:', embeddingResult.error);
    }

    // Step 9: Update document with processing results
    const finalStatus = doc.fastMode ? 'ready' : 'awaiting_questions';

    const { data: updatedDoc, error: updateError } = await supabase
      .from('rag_documents')
      .update({
        status: finalStatus,
        processing_completed_at: new Date().toISOString(),
        document_summary: understanding.summary,
        topic_taxonomy: understanding.topicTaxonomy,
        entity_list: understanding.entities,
        ambiguity_list: understanding.ambiguities,
        section_count: sections.length,
        fact_count: facts.length,
        question_count: understanding.expertQuestions.length,
        total_tokens_estimated: Math.ceil(doc.originalText.length / 4),
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[RAG Ingestion] Error updating document:', updateError);
      return { success: false, error: 'Failed to update document status' };
    }

    console.log(`[RAG Ingestion] Document processed successfully: ${doc.fileName} → ${finalStatus}`);
    return { success: true, data: mapRowToDocument(updatedDoc) };
  } catch (err) {
    console.error('[RAG Ingestion] Exception in processDocument:', err);
    await supabase
      .from('rag_documents')
      .update({ status: 'error', processing_error: err instanceof Error ? err.message : 'Unknown error' })
      .eq('id', documentId);
    return { success: false, error: err instanceof Error ? err.message : 'Document processing failed' };
  }
}

// ============================================
// Get Documents for Knowledge Base
// ============================================

export async function getDocuments(params: {
  knowledgeBaseId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGDocument[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('knowledge_base_id', params.knowledgeBaseId)
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToDocument) };
  } catch (err) {
    console.error('Exception fetching documents:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch documents' };
  }
}

// ============================================
// Get Document by ID
// ============================================

export async function getDocument(documentId: string): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception fetching document:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch document' };
  }
}
```

**Pattern Source**: `src/lib/services/pipeline-service.ts` (service function structure, error handling, Supabase client usage)

---

### Task 5: Create increment_kb_doc_count RPC Function

This function increments the document count for a knowledge base when a new document is added.

**Execute via SAOL:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE OR REPLACE FUNCTION increment_kb_doc_count(kb_id uuid) RETURNS void LANGUAGE plpgsql AS \\$\\$ BEGIN UPDATE rag_knowledge_bases SET document_count = document_count + 1, updated_at = now() WHERE id = kb_id; END; \\$\\$;\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

### Task 6: Install Required Dependencies

The ingestion service requires `pdf-parse` and `mammoth` for text extraction from PDF and DOCX files.

**Check and install dependencies:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm install pdf-parse mammoth
```

**Install TypeScript types:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm install --save-dev @types/pdf-parse
```

**Note:** `mammoth` includes its own TypeScript definitions, so no separate `@types` package is needed.

---

## Verification

### Step 1: Verify Files Exist

Confirm these files were created:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show" && ls -la src/lib/rag/services/*.ts
```

**Expected files:**
- `src/lib/rag/services/rag-db-mappers.ts`
- `src/lib/rag/services/rag-embedding-service.ts`
- `src/lib/rag/services/rag-ingestion-service.ts`

### Step 2: Verify RPC Functions Exist

**Check match_rag_embeddings:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"SELECT proname FROM pg_proc WHERE proname = 'match_rag_embeddings'\",dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

**Check increment_kb_doc_count:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"SELECT proname FROM pg_proc WHERE proname = 'increment_kb_doc_count'\",dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

### Step 3: Verify Dependencies Installed

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm list pdf-parse mammoth @types/pdf-parse 2>&1 | head -n 10
```

**Expected:** All three packages listed without errors.

### Step 4: TypeScript Build Verification

**Note:** If dependencies haven't been installed yet in the `src/` directory, run `npm install` first:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm install
```

**Then verify TypeScript compilation:**

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npx next build --help > /dev/null 2>&1 && echo "Next.js available" || echo "Run npm install first"
```

---

## Success Criteria

- [ ] `src/lib/rag/services/rag-db-mappers.ts` contains mappers for all 7 entity types (KB, document, section, fact, question, query, quality score)
- [ ] `src/lib/rag/services/rag-embedding-service.ts` can generate, store, batch-generate, search, and delete embeddings
- [ ] `src/lib/rag/services/rag-ingestion-service.ts` can create KB, create document records, extract text, process documents, and upload files
- [ ] `match_rag_embeddings` RPC function exists in the database
- [ ] `increment_kb_doc_count` RPC function exists in the database
- [ ] `pdf-parse`, `mammoth`, and `@types/pdf-parse` packages are installed in `src/`
- [ ] All files use `createServerSupabaseAdminClient()` for database operations
- [ ] TypeScript build succeeds with zero errors (after `npm install`)

---

## What's Next

**E04** will create the Expert Q&A service and the Retrieval service — enabling expert knowledge refinement and multi-tier similarity search with HyDE and Self-RAG.

---

## If Something Goes Wrong

### pdf-parse or mammoth Import Errors
- Ensure packages are installed in `src/` directory: `cd src && npm install pdf-parse mammoth`
- For TypeScript: `cd src && npm install --save-dev @types/pdf-parse`
- mammoth doesn't need separate types

### Supabase Storage Upload Fails
- Verify the `rag-documents` storage bucket exists (created in E01)
- Check that the service role key has storage permissions
- Confirm bucket is set to private access

### Embedding Generation Fails
- Verify `OPENAI_API_KEY` is set in `.env.local` (confirmed present)
- Test with a simple curl: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY_HERE"`
- Check rate limits on OpenAI account

### RPC Function Creation Fails
- Ensure SAOL is working: test with a simple SELECT query
- Verify `DATABASE_URL` in `.env.local` is correct (confirmed present)
- Check that pgvector extension is enabled (from E01)

### TypeScript Errors
- Make sure all E02 files exist (types, providers, config)
- Run `cd src && npm install` to install all dependencies
- Check import paths use `@/` alias correctly
- Verify `tsconfig.json` has paths configured: `"@/*": ["./*"]`

---

## Notes for Agent

1. **Create ALL three service files** in `src/lib/rag/services/` directory
2. **The embedding service uses jsonb storage**, not native pgvector types (for compatibility)
3. **The match_rag_embeddings RPC function** computes cosine similarity using jsonb arrays
4. **pdf-parse and mammoth** are loaded via `require()` for dynamic imports
5. **Install dependencies in the `src/` directory**, not the root directory
6. **RPC functions must be created via SAOL** — use the exact commands provided
7. **createServerSupabaseAdminClient() is synchronous** and bypasses RLS — correct for these services
8. **Do NOT create API routes or UI components** — those come in E06-E07

---

**End of E03 Prompt v2**


+++++++++++++++++
