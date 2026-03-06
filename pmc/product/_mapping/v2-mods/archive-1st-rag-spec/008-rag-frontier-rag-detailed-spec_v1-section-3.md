# Section 3: Ingestion Pipeline Services

**Version:** 1.0
**Date:** February 9, 2026
**Parent Document:** `008-rag-frontier-rag-detailed-spec_v1-master.md`
**Phase:** Phase 1 Only

---

## Overview

This section implements the **Ingestion Pipeline** -- the core engine that transforms a raw uploaded document into a fully indexed, searchable knowledge representation. This is the most critical service in the entire RAG module: everything downstream (Expert Q&A, Retrieval, Quality Measurement) depends on the quality of ingestion.

**What this section accomplishes:**
- Upload documents to Supabase Storage and create tracking records
- Extract raw text from PDF, DOCX, TXT, and Markdown files
- Send full document text to a frontier LLM (Claude) for deep understanding
- Store the LLM's knowledge extraction (summary, sections, facts, entities, questions, taxonomy)
- Apply Contextual Retrieval (prepend contextual preambles to each section before embedding)
- Generate and store multi-tier embeddings (document, section, fact)
- Orchestrate the full pipeline from upload to "ready" status

**User value delivered:** The user uploads a file and clicks "Process." Within 2-5 minutes, the system has deeply understood their document, organized it into searchable tiers, and is ready for Expert Q&A (or immediate chat in fast mode).

**What already exists (reused):**
- `createServerSupabaseAdminClient()` from `@/lib/supabase-server` for all DB operations
- `AppError` and `ErrorCode` from `@/lib/errors/error-classes` for typed error handling
- `pdf-parse` and `mammoth` npm packages for document extraction (already in `package.json`)
- Supabase Storage infrastructure

**What is being added (new):**
- `src/lib/services/rag/rag-ingestion-service.ts` -- 5 exported functions covering the full ingestion pipeline

---

## Dependencies

### Codebase Prerequisites
- `src/lib/supabase-server.ts` -- `createServerSupabaseAdminClient()` (EXISTS)
- `src/lib/errors/error-classes.ts` -- `AppError`, `ErrorCode` (EXISTS)
- `pdf-parse` npm package (EXISTS in `package.json`)
- `mammoth` npm package (EXISTS in `package.json`)

### Previous Section Prerequisites
- **Section 1 (Database Foundation)** -- All 8 `rag_*` tables must exist with RLS policies, indexes, and triggers
- **Section 2 (TypeScript Types & Provider Abstraction)** -- The following must exist:
  - `src/types/rag.ts` -- All RAG type definitions (`RAGDocument`, `RAGSection`, `RAGFact`, `RAGExpertQuestion`, `RAGEmbedding`, `DocumentStatus`, etc.)
  - `src/lib/providers/llm-provider.ts` -- `LLMProvider` interface and `getLLMProvider()` factory
  - `src/lib/providers/embedding-provider.ts` -- `EmbeddingProvider` interface and `getEmbeddingProvider()` factory

---

## Features & Requirements

### FR-3.1: Document Upload and Text Extraction Service

**Type**: Service

**Description**: Handles uploading document files to Supabase Storage, creating tracking records in `rag_documents`, and extracting raw text from supported file formats (PDF, DOCX, TXT, MD).

**Implementation Strategy**: NEW build

---

### FR-3.2: LLM Document Reading and Knowledge Extraction

**Type**: Service

**Description**: Orchestrates the complete document processing pipeline -- from text extraction through LLM reading, knowledge storage, contextual retrieval, embedding generation, and final status update.

**Implementation Strategy**: NEW build

---

### FR-3.3: Contextual Retrieval Preamble Generation

**Type**: Service

**Description**: For each section extracted from a document, generates a 1-2 sentence contextual preamble using the LLM provider. This preamble explains what the section is about within the larger document, implementing Anthropic's Contextual Retrieval technique (67% improvement in retrieval accuracy).

**Implementation Strategy**: NEW build

---

### FR-3.4: Multi-Tier Embedding Generation

**Type**: Service

**Description**: Generates embeddings at three tiers (document, section, fact) using the embedding provider and stores them in `rag_embeddings`. This enables hierarchical retrieval -- broad queries match at document level, targeted queries match at section level, and specific factual queries match at fact level.

**Implementation Strategy**: NEW build

---

### Complete Implementation

**File**: `src/lib/services/rag/rag-ingestion-service.ts`

```typescript
/**
 * RAG Ingestion Pipeline Service
 *
 * Handles the complete document ingestion pipeline:
 * 1. Upload document to Supabase Storage + create DB record
 * 2. Extract raw text from PDF, DOCX, TXT, MD
 * 3. Send to LLM for deep document understanding
 * 4. Store knowledge artifacts (sections, facts, questions, taxonomy)
 * 5. Apply Contextual Retrieval (preamble generation per section)
 * 6. Generate and store multi-tier embeddings
 * 7. Update document status to 'ready' or 'needs_questions'
 *
 * Pattern Source: src/lib/services/batch-generation-service.ts (async functions, try/catch, console.error)
 * Pattern Source: src/lib/services/inference-service.ts (createServerSupabaseAdminClient usage)
 *
 * @module rag-ingestion-service
 */

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { AppError, ErrorCode } from '@/lib/errors/error-classes';
import { getLLMProvider } from '@/lib/providers/llm-provider';
import { getEmbeddingProvider } from '@/lib/providers/embedding-provider';
import type {
  RAGDocument,
  RAGSection,
  RAGFact,
  RAGExpertQuestion,
  RAGEmbedding,
  DocumentStatus,
  EmbeddingTier,
  LLMDocumentReadingResult,
} from '@/types/rag';

// ============================================================================
// Constants
// ============================================================================

/** Supported file MIME types for upload */
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

/** Maximum file size in bytes (100MB) */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** Approximate token count: 1 token ~ 4 characters */
const CHARS_PER_TOKEN = 4;

/** Batch size for embedding generation (OpenAI allows up to 2048 inputs per request) */
const EMBEDDING_BATCH_SIZE = 50;

// ============================================================================
// FR-3.1: Document Upload and Text Extraction
// ============================================================================

/**
 * Upload a document to Supabase Storage and create a tracking record.
 *
 * Stores the file in the `rag-documents` bucket under `{userId}/{documentId}/{fileName}`,
 * creates a `rag_documents` row with status='pending', and returns the document record.
 *
 * @param params - Upload parameters
 * @returns The created document record
 *
 * @example
 * ```typescript
 * const doc = await uploadDocument({
 *   userId: 'user-uuid',
 *   knowledgeBaseId: 'kb-uuid',
 *   file: fileBuffer,
 *   fileName: 'clinical-guide.pdf',
 *   fileType: 'application/pdf',
 *   description: 'Our clinical practice guide, 2024 edition',
 *   fastMode: false,
 * });
 * ```
 *
 * Pattern Source: src/lib/services/inference-service.ts (getAdapterSignedUrl — Supabase Storage usage)
 */
export async function uploadDocument(params: {
  userId: string;
  knowledgeBaseId: string;
  file: Buffer;
  fileName: string;
  fileType: string;
  description?: string;
  fastMode?: boolean;
}): Promise<RAGDocument> {
  const { userId, knowledgeBaseId, file, fileName, fileType, description, fastMode } = params;

  try {
    console.log(`[RAG-INGESTION] Starting upload for "${fileName}" (${fileType}, ${file.length} bytes)`);

    // Validate file type
    const fileExtension = SUPPORTED_MIME_TYPES[fileType];
    if (!fileExtension) {
      throw new AppError(
        `Unsupported file type: ${fileType}. Supported types: PDF, DOCX, TXT, MD`,
        ErrorCode.ERR_VAL_FORMAT,
        { context: { component: 'rag-ingestion-service', metadata: { fileType, fileName } } }
      );
    }

    // Validate file size
    if (file.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError(
        `File size (${Math.round(file.length / 1024 / 1024)}MB) exceeds maximum of 100MB`,
        ErrorCode.ERR_VAL_RANGE,
        { context: { component: 'rag-ingestion-service', metadata: { fileSize: file.length } } }
      );
    }

    const supabase = createServerSupabaseAdminClient();

    // Step 1: Create the document record with status='pending'
    const { data: documentRecord, error: insertError } = await supabase
      .from('rag_documents')
      .insert({
        knowledge_base_id: knowledgeBaseId,
        user_id: userId,
        file_name: fileName,
        file_type: fileExtension,
        file_size_bytes: file.length,
        mime_type: fileType,
        description: description || null,
        status: 'pending' as DocumentStatus,
        fast_mode: fastMode ?? false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[RAG-INGESTION] Failed to create document record:', insertError);
      throw new AppError(
        `Failed to create document record: ${insertError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: insertError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    const documentId = documentRecord.id;
    console.log(`[RAG-INGESTION] Created document record: ${documentId}`);

    // Step 2: Upload file to Supabase Storage
    const storagePath = `${userId}/${documentId}/${fileName}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('rag-documents')
      .upload(storagePath, file, {
        contentType: fileType,
        upsert: false,
      });

    if (storageError) {
      console.error('[RAG-INGESTION] Failed to upload file to storage:', storageError);

      // Rollback: delete the document record
      await supabase.from('rag_documents').delete().eq('id', documentId);
      console.log(`[RAG-INGESTION] Rolled back document record: ${documentId}`);

      throw new AppError(
        `Failed to upload file to storage: ${storageError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: storageError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    console.log(`[RAG-INGESTION] File uploaded to storage: ${storageData.path}`);

    // Step 3: Update the document record with the storage path
    const { data: updatedDoc, error: updateError } = await supabase
      .from('rag_documents')
      .update({
        storage_path: storagePath,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) {
      console.error('[RAG-INGESTION] Failed to update document with storage path:', updateError);
      throw new AppError(
        `Failed to update document record: ${updateError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: updateError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    console.log(`[RAG-INGESTION] Upload complete for document: ${documentId}`);

    // Map DB row to typed object
    return mapDocumentRow(updatedDoc);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[RAG-INGESTION] Unexpected error during upload:', error);
    throw new AppError(
      `Unexpected error during document upload: ${(error as Error).message}`,
      ErrorCode.ERR_API_SERVER,
      { cause: error as Error, context: { component: 'rag-ingestion-service' } }
    );
  }
}

/**
 * Extract raw text from a document file stored in Supabase Storage.
 *
 * Reads the file from storage, extracts text based on file type:
 * - PDF: uses `pdf-parse`
 * - DOCX: uses `mammoth.extractRawText()`
 * - TXT/MD: direct UTF-8 string conversion
 *
 * Updates `rag_documents.raw_text`, `raw_text_token_count`, and status to 'processing'.
 *
 * @param documentId - The UUID of the document to extract text from
 * @returns The extracted raw text string
 *
 * Pattern Source: src/lib/services/inference-service.ts (Supabase Storage download pattern)
 */
export async function extractText(documentId: string): Promise<string> {
  try {
    console.log(`[RAG-INGESTION] Starting text extraction for document: ${documentId}`);

    const supabase = createServerSupabaseAdminClient();

    // Step 1: Get the document record to find storage path and file type
    const { data: doc, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      console.error('[RAG-INGESTION] Failed to fetch document record:', fetchError);
      throw new AppError(
        `Document not found: ${documentId}`,
        ErrorCode.ERR_API_NOT_FOUND,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    if (!doc.storage_path) {
      throw new AppError(
        `Document ${documentId} has no storage path -- file may not have been uploaded`,
        ErrorCode.ERR_VAL_REQUIRED,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    // Step 2: Download file from Supabase Storage
    console.log(`[RAG-INGESTION] Downloading file from storage: ${doc.storage_path}`);
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('rag-documents')
      .download(doc.storage_path);

    if (downloadError || !fileBlob) {
      console.error('[RAG-INGESTION] Failed to download file from storage:', downloadError);
      await updateDocumentError(supabase, documentId, `Failed to download file: ${downloadError?.message || 'No data returned'}`);
      throw new AppError(
        `Failed to download file from storage: ${downloadError?.message || 'No data returned'}`,
        ErrorCode.ERR_DB_QUERY,
        { context: { component: 'rag-ingestion-service', metadata: { documentId, storagePath: doc.storage_path } } }
      );
    }

    // Step 3: Extract text based on file type
    let rawText = '';
    const fileType = doc.file_type as string;

    console.log(`[RAG-INGESTION] Extracting text from ${fileType} file`);

    switch (fileType) {
      case 'pdf': {
        const pdfParse = require('pdf-parse');
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
        break;
      }

      case 'docx': {
        const mammoth = require('mammoth');
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
        break;
      }

      case 'txt':
      case 'md': {
        rawText = await fileBlob.text();
        break;
      }

      default: {
        await updateDocumentError(supabase, documentId, `Unsupported file type for text extraction: ${fileType}`);
        throw new AppError(
          `Unsupported file type for text extraction: ${fileType}`,
          ErrorCode.ERR_VAL_FORMAT,
          { context: { component: 'rag-ingestion-service', metadata: { documentId, fileType } } }
        );
      }
    }

    // Validate extracted text
    if (!rawText || rawText.trim().length === 0) {
      await updateDocumentError(supabase, documentId, 'No text could be extracted from the document');
      throw new AppError(
        'No text could be extracted from the document. The file may be empty, image-only, or corrupted.',
        ErrorCode.ERR_VAL_REQUIRED,
        { context: { component: 'rag-ingestion-service', metadata: { documentId, fileType } } }
      );
    }

    // Step 4: Calculate approximate token count
    const rawTextTokenCount = Math.ceil(rawText.length / CHARS_PER_TOKEN);
    console.log(`[RAG-INGESTION] Extracted ${rawText.length} characters (~${rawTextTokenCount} tokens)`);

    // Step 5: Update the document record
    const { error: updateError } = await supabase
      .from('rag_documents')
      .update({
        raw_text: rawText,
        raw_text_token_count: rawTextTokenCount,
        status: 'processing' as DocumentStatus,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[RAG-INGESTION] Failed to update document with extracted text:', updateError);
      throw new AppError(
        `Failed to update document with extracted text: ${updateError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: updateError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    console.log(`[RAG-INGESTION] Text extraction complete for document: ${documentId}`);
    return rawText;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[RAG-INGESTION] Unexpected error during text extraction:', error);
    throw new AppError(
      `Unexpected error during text extraction: ${(error as Error).message}`,
      ErrorCode.ERR_API_SERVER,
      { cause: error as Error, context: { component: 'rag-ingestion-service' } }
    );
  }
}

// ============================================================================
// FR-3.2: LLM Document Reading and Knowledge Extraction (Orchestrator)
// ============================================================================

/**
 * Process a document through the full ingestion pipeline.
 *
 * This is the main orchestrator function that runs the entire pipeline:
 * a. Extract text from the uploaded file
 * b. Send to LLM for document reading and knowledge extraction
 * c. Store sections, facts, and expert questions in the database
 * d. Apply Contextual Retrieval (generate preambles for each section)
 * e. Generate and store multi-tier embeddings
 * f. Update document status to 'ready' (fast_mode) or 'needs_questions' (normal mode)
 *
 * Called from the API route `POST /api/rag/documents/[id]/process` (Section 6).
 *
 * @param documentId - The UUID of the document to process
 * @returns The updated document record with final status
 *
 * @example
 * ```typescript
 * const processedDoc = await processDocument('doc-uuid');
 * console.log(processedDoc.status); // 'ready' or 'needs_questions'
 * ```
 *
 * Pattern Source: src/lib/services/batch-generation-service.ts (orchestrator pattern with step-by-step processing)
 */
export async function processDocument(documentId: string): Promise<RAGDocument> {
  const supabase = createServerSupabaseAdminClient();

  try {
    console.log(`[RAG-INGESTION] === Starting document processing pipeline for: ${documentId} ===`);

    // Validate document exists and is in a processable state
    const { data: doc, error: fetchError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      throw new AppError(
        `Document not found: ${documentId}`,
        ErrorCode.ERR_API_NOT_FOUND,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    if (doc.status !== 'pending' && doc.status !== 'error') {
      throw new AppError(
        `Document ${documentId} is in status '${doc.status}' and cannot be reprocessed. Only 'pending' or 'error' documents can be processed.`,
        ErrorCode.ERR_VAL_FORMAT,
        { context: { component: 'rag-ingestion-service', metadata: { documentId, currentStatus: doc.status } } }
      );
    }

    const fastMode = doc.fast_mode as boolean;
    console.log(`[RAG-INGESTION] Fast mode: ${fastMode}`);

    // ---------------------------------------------------------------
    // Step A: Extract text
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Step A: Extracting text...`);
    const rawText = await extractText(documentId);
    console.log(`[RAG-INGESTION] Step A complete: ${rawText.length} characters extracted`);

    // ---------------------------------------------------------------
    // Step B: LLM document reading
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Step B: Sending to LLM for document reading...`);
    const llmProvider = getLLMProvider();
    const llmResult: LLMDocumentReadingResult = await llmProvider.readDocument({
      documentText: rawText,
      fileName: doc.file_name,
      description: doc.description || undefined,
    });
    console.log(`[RAG-INGESTION] Step B complete: ${llmResult.sections.length} sections, ${llmResult.facts.length} facts, ${llmResult.expertQuestions.length} questions`);

    // ---------------------------------------------------------------
    // Step C: Store LLM results in database
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Step C: Storing knowledge artifacts...`);

    // C.1: Update document with LLM reading results
    const { error: docUpdateError } = await supabase
      .from('rag_documents')
      .update({
        document_summary: llmResult.summary,
        topic_taxonomy: llmResult.topicTaxonomy,
        ambiguity_list: llmResult.ambiguityList,
      })
      .eq('id', documentId);

    if (docUpdateError) {
      console.error('[RAG-INGESTION] Failed to update document with LLM results:', docUpdateError);
      await updateDocumentError(supabase, documentId, `Failed to store LLM results: ${docUpdateError.message}`);
      throw new AppError(
        `Failed to update document with LLM results: ${docUpdateError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: docUpdateError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    // C.2: Create rag_sections records
    const sectionRecords = llmResult.sections.map((section, index) => ({
      document_id: documentId,
      user_id: doc.user_id,
      section_number: index + 1,
      title: section.title,
      content: section.content,
      summary: section.summary,
      token_count: Math.ceil(section.content.length / CHARS_PER_TOKEN),
    }));

    let createdSections: Array<{ id: string; section_number: number; content: string; summary: string; title: string }> = [];

    if (sectionRecords.length > 0) {
      const { data: sections, error: sectionsError } = await supabase
        .from('rag_sections')
        .insert(sectionRecords)
        .select('id, section_number, content, summary, title');

      if (sectionsError) {
        console.error('[RAG-INGESTION] Failed to create section records:', sectionsError);
        await updateDocumentError(supabase, documentId, `Failed to store sections: ${sectionsError.message}`);
        throw new AppError(
          `Failed to create section records: ${sectionsError.message}`,
          ErrorCode.ERR_DB_QUERY,
          { cause: sectionsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
        );
      }

      createdSections = sections || [];
      console.log(`[RAG-INGESTION] Created ${createdSections.length} section records`);
    }

    // C.3: Create rag_facts records
    const factRecords = llmResult.facts.map((fact, index) => ({
      document_id: documentId,
      user_id: doc.user_id,
      content: fact.content,
      context: fact.context,
      fact_type: fact.factType,
      confidence: fact.confidence,
      source_section_number: fact.sourceSectionNumber || null,
    }));

    let createdFacts: Array<{ id: string; content: string; context: string }> = [];

    if (factRecords.length > 0) {
      const { data: facts, error: factsError } = await supabase
        .from('rag_facts')
        .insert(factRecords)
        .select('id, content, context');

      if (factsError) {
        console.error('[RAG-INGESTION] Failed to create fact records:', factsError);
        await updateDocumentError(supabase, documentId, `Failed to store facts: ${factsError.message}`);
        throw new AppError(
          `Failed to create fact records: ${factsError.message}`,
          ErrorCode.ERR_DB_QUERY,
          { cause: factsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
        );
      }

      createdFacts = facts || [];
      console.log(`[RAG-INGESTION] Created ${createdFacts.length} fact records`);
    }

    // C.4: Create rag_expert_questions records
    const questionRecords = llmResult.expertQuestions.map((question, index) => ({
      document_id: documentId,
      user_id: doc.user_id,
      question_text: question.questionText,
      question_reason: question.questionReason,
      impact_level: question.impactLevel,
      priority_order: index + 1,
      related_section_numbers: question.relatedSectionNumbers || [],
    }));

    if (questionRecords.length > 0) {
      const { error: questionsError } = await supabase
        .from('rag_expert_questions')
        .insert(questionRecords);

      if (questionsError) {
        console.error('[RAG-INGESTION] Failed to create expert question records:', questionsError);
        await updateDocumentError(supabase, documentId, `Failed to store expert questions: ${questionsError.message}`);
        throw new AppError(
          `Failed to create expert question records: ${questionsError.message}`,
          ErrorCode.ERR_DB_QUERY,
          { cause: questionsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
        );
      }

      console.log(`[RAG-INGESTION] Created ${questionRecords.length} expert question records`);
    }

    console.log(`[RAG-INGESTION] Step C complete: all knowledge artifacts stored`);

    // ---------------------------------------------------------------
    // Step D: Apply Contextual Retrieval
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Step D: Applying Contextual Retrieval...`);
    await applyContextualRetrieval(documentId);
    console.log(`[RAG-INGESTION] Step D complete: contextual preambles generated`);

    // ---------------------------------------------------------------
    // Step E: Generate and store embeddings
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Step E: Generating multi-tier embeddings...`);
    await generateAndStoreEmbeddings(documentId);
    console.log(`[RAG-INGESTION] Step E complete: embeddings stored`);

    // ---------------------------------------------------------------
    // Step F: Update document status and counts
    // ---------------------------------------------------------------
    const finalStatus: DocumentStatus = fastMode ? 'ready' : 'needs_questions';

    const { data: finalDoc, error: finalUpdateError } = await supabase
      .from('rag_documents')
      .update({
        status: finalStatus,
        section_count: createdSections.length,
        fact_count: createdFacts.length,
        entity_count: llmResult.facts.filter(f => f.factType === 'entity').length,
        question_count: questionRecords.length,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (finalUpdateError) {
      console.error('[RAG-INGESTION] Failed to update document final status:', finalUpdateError);
      throw new AppError(
        `Failed to update document final status: ${finalUpdateError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: finalUpdateError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    console.log(`[RAG-INGESTION] === Document processing pipeline complete: ${documentId} → ${finalStatus} ===`);

    return mapDocumentRow(finalDoc);
  } catch (error) {
    // Update document status to 'error' if not already handled
    if (error instanceof AppError) {
      // Only update error status if not already done by updateDocumentError
      try {
        const { data: currentDoc } = await supabase
          .from('rag_documents')
          .select('status')
          .eq('id', documentId)
          .single();

        if (currentDoc && currentDoc.status !== 'error') {
          await updateDocumentError(supabase, documentId, error.message);
        }
      } catch {
        // Best effort error status update
      }
      throw error;
    }

    console.error('[RAG-INGESTION] Unexpected error during document processing:', error);
    await updateDocumentError(supabase, documentId, `Unexpected error: ${(error as Error).message}`);
    throw new AppError(
      `Unexpected error during document processing: ${(error as Error).message}`,
      ErrorCode.ERR_API_SERVER,
      { cause: error as Error, context: { component: 'rag-ingestion-service' } }
    );
  }
}

// ============================================================================
// FR-3.3: Contextual Retrieval Preamble Generation
// ============================================================================

/**
 * Apply Contextual Retrieval to all sections of a document.
 *
 * For each section, calls the LLM provider to generate a 1-2 sentence
 * contextual preamble that explains what the section is about within
 * the larger document. This preamble is prepended to section content
 * before embedding, improving retrieval accuracy by 67% (Anthropic, 2024).
 *
 * @param documentId - The UUID of the document whose sections need preambles
 *
 * @example
 * ```typescript
 * await applyContextualRetrieval('doc-uuid');
 * // Each section now has a contextual_preamble field populated
 * ```
 *
 * Pattern Source: Anthropic Contextual Retrieval technique (2024)
 */
export async function applyContextualRetrieval(documentId: string): Promise<void> {
  try {
    console.log(`[RAG-INGESTION] Applying Contextual Retrieval for document: ${documentId}`);

    const supabase = createServerSupabaseAdminClient();

    // Get the document summary for context
    const { data: doc, error: docError } = await supabase
      .from('rag_documents')
      .select('document_summary, file_name')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      throw new AppError(
        `Document not found for Contextual Retrieval: ${documentId}`,
        ErrorCode.ERR_API_NOT_FOUND,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    if (!doc.document_summary) {
      throw new AppError(
        `Document ${documentId} has no summary -- LLM reading must run before Contextual Retrieval`,
        ErrorCode.ERR_VAL_REQUIRED,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    // Get all sections for this document
    const { data: sections, error: sectionsError } = await supabase
      .from('rag_sections')
      .select('id, content, title, section_number')
      .eq('document_id', documentId)
      .order('section_number', { ascending: true });

    if (sectionsError) {
      throw new AppError(
        `Failed to fetch sections for Contextual Retrieval: ${sectionsError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: sectionsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    if (!sections || sections.length === 0) {
      console.log(`[RAG-INGESTION] No sections found for document ${documentId} -- skipping Contextual Retrieval`);
      return;
    }

    console.log(`[RAG-INGESTION] Generating contextual preambles for ${sections.length} sections`);

    const llmProvider = getLLMProvider();

    // Process each section sequentially to respect LLM rate limits
    for (const section of sections) {
      try {
        console.log(`[RAG-INGESTION] Generating preamble for section ${section.section_number}: "${section.title}"`);

        const preamble = await llmProvider.generateContextualPreamble({
          documentSummary: doc.document_summary,
          documentName: doc.file_name,
          sectionTitle: section.title,
          sectionContent: section.content,
        });

        // Update the section with the generated preamble
        const { error: updateError } = await supabase
          .from('rag_sections')
          .update({ contextual_preamble: preamble })
          .eq('id', section.id);

        if (updateError) {
          console.error(`[RAG-INGESTION] Failed to update preamble for section ${section.id}:`, updateError);
          // Continue processing other sections -- don't fail the whole pipeline for one section
          continue;
        }

        console.log(`[RAG-INGESTION] Preamble generated for section ${section.section_number} (${preamble.length} chars)`);
      } catch (sectionError) {
        console.error(`[RAG-INGESTION] Error generating preamble for section ${section.section_number}:`, sectionError);
        // Continue processing other sections -- partial preambles are better than none
        continue;
      }
    }

    console.log(`[RAG-INGESTION] Contextual Retrieval complete for document: ${documentId}`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[RAG-INGESTION] Unexpected error during Contextual Retrieval:', error);
    throw new AppError(
      `Unexpected error during Contextual Retrieval: ${(error as Error).message}`,
      ErrorCode.ERR_API_SERVER,
      { cause: error as Error, context: { component: 'rag-ingestion-service' } }
    );
  }
}

// ============================================================================
// FR-3.4: Multi-Tier Embedding Generation
// ============================================================================

/**
 * Generate and store embeddings at all three tiers for a document.
 *
 * Tier 1 (Document): Embeds `document_summary + topic_taxonomy_text`
 *   - Stored in `rag_embeddings` with tier='document', source_type='rag_documents'
 *   - Used for document-level routing ("which document answers this?")
 *
 * Tier 2 (Section): For each section, embeds `contextual_preamble + content`
 *   - Stored with tier='section', source_type='rag_sections'
 *   - Used for targeted retrieval ("which part of this document is relevant?")
 *
 * Tier 3 (Fact): For each fact, embeds `fact.content + fact.context`
 *   - Stored with tier='fact', source_type='rag_facts'
 *   - Used for specific factual queries ("what specific fact answers this?")
 *
 * Uses batching for efficiency (EMBEDDING_BATCH_SIZE items per API call).
 *
 * @param documentId - The UUID of the document to generate embeddings for
 *
 * @example
 * ```typescript
 * await generateAndStoreEmbeddings('doc-uuid');
 * // All tiers of embeddings are now stored in rag_embeddings
 * ```
 *
 * Pattern Source: 006-rag-frontier-questions_v1.md (multi-tier retrieval design)
 */
export async function generateAndStoreEmbeddings(documentId: string): Promise<void> {
  try {
    console.log(`[RAG-INGESTION] Starting multi-tier embedding generation for document: ${documentId}`);

    const supabase = createServerSupabaseAdminClient();
    const embeddingProvider = getEmbeddingProvider();

    // ---------------------------------------------------------------
    // Tier 1: Document-level embedding
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Tier 1: Generating document-level embedding`);

    const { data: doc, error: docError } = await supabase
      .from('rag_documents')
      .select('id, user_id, document_summary, topic_taxonomy')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      throw new AppError(
        `Document not found for embedding generation: ${documentId}`,
        ErrorCode.ERR_API_NOT_FOUND,
        { context: { component: 'rag-ingestion-service', metadata: { documentId } } }
      );
    }

    if (doc.document_summary) {
      // Build document-level text: summary + flattened taxonomy
      const taxonomyText = doc.topic_taxonomy
        ? formatTaxonomyForEmbedding(doc.topic_taxonomy)
        : '';
      const documentEmbeddingText = `${doc.document_summary}\n\n${taxonomyText}`.trim();

      const [documentEmbedding] = await embeddingProvider.generateEmbeddings([documentEmbeddingText]);

      // Delete any existing document-level embedding for this document (for re-processing)
      await supabase
        .from('rag_embeddings')
        .delete()
        .eq('source_id', documentId)
        .eq('source_type', 'rag_documents')
        .eq('tier', 'document');

      const { error: docEmbError } = await supabase
        .from('rag_embeddings')
        .insert({
          document_id: documentId,
          user_id: doc.user_id,
          source_id: documentId,
          source_type: 'rag_documents',
          tier: 'document' as EmbeddingTier,
          embedding: documentEmbedding,
          content_text: documentEmbeddingText.substring(0, 10000), // Store truncated text for debugging
          token_count: Math.ceil(documentEmbeddingText.length / CHARS_PER_TOKEN),
        });

      if (docEmbError) {
        console.error('[RAG-INGESTION] Failed to store document-level embedding:', docEmbError);
        throw new AppError(
          `Failed to store document-level embedding: ${docEmbError.message}`,
          ErrorCode.ERR_DB_QUERY,
          { cause: docEmbError as unknown as Error, context: { component: 'rag-ingestion-service' } }
        );
      }

      console.log(`[RAG-INGESTION] Tier 1 complete: document-level embedding stored`);
    } else {
      console.log(`[RAG-INGESTION] Tier 1 skipped: no document summary available`);
    }

    // ---------------------------------------------------------------
    // Tier 2: Section-level embeddings
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Tier 2: Generating section-level embeddings`);

    const { data: sections, error: sectionsError } = await supabase
      .from('rag_sections')
      .select('id, content, contextual_preamble, section_number, title')
      .eq('document_id', documentId)
      .order('section_number', { ascending: true });

    if (sectionsError) {
      throw new AppError(
        `Failed to fetch sections for embedding: ${sectionsError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: sectionsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    if (sections && sections.length > 0) {
      // Delete any existing section-level embeddings for this document (for re-processing)
      await supabase
        .from('rag_embeddings')
        .delete()
        .eq('document_id', documentId)
        .eq('tier', 'section');

      // Prepare text for each section: contextual_preamble + content
      const sectionTexts = sections.map((section) => {
        const preamble = section.contextual_preamble || '';
        return preamble ? `${preamble}\n\n${section.content}` : section.content;
      });

      // Generate embeddings in batches
      const sectionEmbeddings = await generateEmbeddingsInBatches(embeddingProvider, sectionTexts);

      // Store all section embeddings
      const sectionEmbeddingRecords = sections.map((section, index) => ({
        document_id: documentId,
        user_id: doc.user_id,
        source_id: section.id,
        source_type: 'rag_sections' as const,
        tier: 'section' as EmbeddingTier,
        embedding: sectionEmbeddings[index],
        content_text: sectionTexts[index].substring(0, 10000),
        token_count: Math.ceil(sectionTexts[index].length / CHARS_PER_TOKEN),
      }));

      // Insert in batches to avoid payload size limits
      for (let i = 0; i < sectionEmbeddingRecords.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = sectionEmbeddingRecords.slice(i, i + EMBEDDING_BATCH_SIZE);
        const { error: batchError } = await supabase
          .from('rag_embeddings')
          .insert(batch);

        if (batchError) {
          console.error(`[RAG-INGESTION] Failed to store section embeddings batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}:`, batchError);
          throw new AppError(
            `Failed to store section embeddings: ${batchError.message}`,
            ErrorCode.ERR_DB_QUERY,
            { cause: batchError as unknown as Error, context: { component: 'rag-ingestion-service' } }
          );
        }
      }

      console.log(`[RAG-INGESTION] Tier 2 complete: ${sections.length} section-level embeddings stored`);
    } else {
      console.log(`[RAG-INGESTION] Tier 2 skipped: no sections available`);
    }

    // ---------------------------------------------------------------
    // Tier 3: Fact-level embeddings
    // ---------------------------------------------------------------
    console.log(`[RAG-INGESTION] Tier 3: Generating fact-level embeddings`);

    const { data: facts, error: factsError } = await supabase
      .from('rag_facts')
      .select('id, content, context')
      .eq('document_id', documentId);

    if (factsError) {
      throw new AppError(
        `Failed to fetch facts for embedding: ${factsError.message}`,
        ErrorCode.ERR_DB_QUERY,
        { cause: factsError as unknown as Error, context: { component: 'rag-ingestion-service' } }
      );
    }

    if (facts && facts.length > 0) {
      // Delete any existing fact-level embeddings for this document (for re-processing)
      await supabase
        .from('rag_embeddings')
        .delete()
        .eq('document_id', documentId)
        .eq('tier', 'fact');

      // Prepare text for each fact: content + context
      const factTexts = facts.map((fact) => {
        return fact.context ? `${fact.content}\n\nContext: ${fact.context}` : fact.content;
      });

      // Generate embeddings in batches
      const factEmbeddings = await generateEmbeddingsInBatches(embeddingProvider, factTexts);

      // Store all fact embeddings
      const factEmbeddingRecords = facts.map((fact, index) => ({
        document_id: documentId,
        user_id: doc.user_id,
        source_id: fact.id,
        source_type: 'rag_facts' as const,
        tier: 'fact' as EmbeddingTier,
        embedding: factEmbeddings[index],
        content_text: factTexts[index].substring(0, 10000),
        token_count: Math.ceil(factTexts[index].length / CHARS_PER_TOKEN),
      }));

      // Insert in batches to avoid payload size limits
      for (let i = 0; i < factEmbeddingRecords.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = factEmbeddingRecords.slice(i, i + EMBEDDING_BATCH_SIZE);
        const { error: batchError } = await supabase
          .from('rag_embeddings')
          .insert(batch);

        if (batchError) {
          console.error(`[RAG-INGESTION] Failed to store fact embeddings batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}:`, batchError);
          throw new AppError(
            `Failed to store fact embeddings: ${batchError.message}`,
            ErrorCode.ERR_DB_QUERY,
            { cause: batchError as unknown as Error, context: { component: 'rag-ingestion-service' } }
          );
        }
      }

      console.log(`[RAG-INGESTION] Tier 3 complete: ${facts.length} fact-level embeddings stored`);
    } else {
      console.log(`[RAG-INGESTION] Tier 3 skipped: no facts available`);
    }

    console.log(`[RAG-INGESTION] Multi-tier embedding generation complete for document: ${documentId}`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[RAG-INGESTION] Unexpected error during embedding generation:', error);
    throw new AppError(
      `Unexpected error during embedding generation: ${(error as Error).message}`,
      ErrorCode.ERR_API_SERVER,
      { cause: error as Error, context: { component: 'rag-ingestion-service' } }
    );
  }
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Generate embeddings in batches for an array of texts.
 *
 * Splits the input texts into batches of EMBEDDING_BATCH_SIZE and
 * calls the embedding provider for each batch. Returns a flat array
 * of embedding vectors matching the input order.
 *
 * @param embeddingProvider - The embedding provider instance
 * @param texts - Array of text strings to embed
 * @returns Array of embedding vectors (number[][])
 */
async function generateEmbeddingsInBatches(
  embeddingProvider: ReturnType<typeof getEmbeddingProvider>,
  texts: string[]
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNumber = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(texts.length / EMBEDDING_BATCH_SIZE);

    console.log(`[RAG-INGESTION] Embedding batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

    try {
      const embeddings = await embeddingProvider.generateEmbeddings(batch);
      allEmbeddings.push(...embeddings);
    } catch (error) {
      console.error(`[RAG-INGESTION] Embedding batch ${batchNumber} failed:`, error);
      throw new AppError(
        `Embedding generation failed for batch ${batchNumber}: ${(error as Error).message}`,
        ErrorCode.ERR_GEN_INVALID_RESPONSE,
        { cause: error as Error, context: { component: 'rag-ingestion-service', metadata: { batchNumber, totalBatches } } }
      );
    }
  }

  return allEmbeddings;
}

/**
 * Format topic taxonomy (JSON) as a flat text string for embedding.
 *
 * Converts the hierarchical topic taxonomy into a newline-separated
 * list suitable for embedding alongside the document summary.
 *
 * @param taxonomy - The topic taxonomy object (JSON from LLM)
 * @returns Flattened text representation
 */
function formatTaxonomyForEmbedding(taxonomy: unknown): string {
  if (!taxonomy) return '';

  // Handle array of strings
  if (Array.isArray(taxonomy)) {
    return taxonomy
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          // Handle objects with topic/subtopics structure
          const obj = item as Record<string, unknown>;
          const parts: string[] = [];
          if (obj.topic) parts.push(String(obj.topic));
          if (obj.subtopics && Array.isArray(obj.subtopics)) {
            parts.push(...(obj.subtopics as string[]).map(String));
          }
          return parts.join(', ');
        }
        return String(item);
      })
      .join('\n');
  }

  // Handle object with top-level keys
  if (typeof taxonomy === 'object' && taxonomy !== null) {
    return Object.entries(taxonomy as Record<string, unknown>)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.map(String).join(', ')}`;
        }
        return `${key}: ${String(value)}`;
      })
      .join('\n');
  }

  // Fallback: convert to string
  return String(taxonomy);
}

/**
 * Update a document's status to 'error' with an error message.
 *
 * Used internally when any pipeline step fails, to ensure the document
 * status reflects the failure and the error is recorded for debugging.
 *
 * @param supabase - Supabase admin client instance
 * @param documentId - The UUID of the document
 * @param errorMessage - Human-readable error description
 */
async function updateDocumentError(
  supabase: ReturnType<typeof createServerSupabaseAdminClient>,
  documentId: string,
  errorMessage: string
): Promise<void> {
  try {
    await supabase
      .from('rag_documents')
      .update({
        status: 'error' as DocumentStatus,
        error_message: errorMessage,
      })
      .eq('id', documentId);

    console.log(`[RAG-INGESTION] Document ${documentId} status updated to 'error': ${errorMessage}`);
  } catch (updateErr) {
    console.error(`[RAG-INGESTION] Failed to update document error status for ${documentId}:`, updateErr);
    // Swallow error -- this is a best-effort status update
  }
}

/**
 * Map a database row from `rag_documents` to the typed RAGDocument interface.
 *
 * @param row - Raw database row
 * @returns Typed RAGDocument object
 *
 * Pattern Source: src/lib/services/conversation-service.ts (DB row to typed object mapping)
 */
function mapDocumentRow(row: Record<string, unknown>): RAGDocument {
  return {
    id: row.id as string,
    knowledgeBaseId: row.knowledge_base_id as string,
    userId: row.user_id as string,
    fileName: row.file_name as string,
    fileType: row.file_type as string,
    fileSizeBytes: row.file_size_bytes as number,
    mimeType: row.mime_type as string,
    description: (row.description as string) || null,
    storagePath: (row.storage_path as string) || null,
    status: row.status as DocumentStatus,
    fastMode: row.fast_mode as boolean,
    rawText: (row.raw_text as string) || null,
    rawTextTokenCount: (row.raw_text_token_count as number) || null,
    documentSummary: (row.document_summary as string) || null,
    topicTaxonomy: row.topic_taxonomy || null,
    ambiguityList: row.ambiguity_list || null,
    sectionCount: (row.section_count as number) || 0,
    factCount: (row.fact_count as number) || 0,
    entityCount: (row.entity_count as number) || 0,
    questionCount: (row.question_count as number) || 0,
    errorMessage: (row.error_message as string) || null,
    processedAt: (row.processed_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

**Pattern Source**: `src/lib/services/batch-generation-service.ts` (async functions, try/catch, console.error, `createServerSupabaseAdminClient` import pattern), `src/lib/services/inference-service.ts` (Supabase Storage operations), `src/lib/services/conversation-service.ts` (DB row mapping pattern)

---

## Type Dependencies from Section 2

The following types referenced by this service **must** be defined in `src/types/rag.ts` (Section 2). They are listed here for clarity and cross-reference:

```typescript
/** Document status lifecycle */
export type DocumentStatus =
  | 'pending'       // Just uploaded, not yet processed
  | 'processing'    // Text extracted, LLM reading in progress
  | 'needs_questions' // LLM reading complete, waiting for expert Q&A
  | 'ready'         // Fully processed and ready for retrieval
  | 'error';        // Processing failed

/** Embedding tier for multi-tier retrieval */
export type EmbeddingTier = 'document' | 'section' | 'fact';

/** Result from LLM document reading (returned by LLMProvider.readDocument()) */
export interface LLMDocumentReadingResult {
  summary: string;
  topicTaxonomy: unknown; // JSON structure
  ambiguityList: unknown; // JSON structure
  sections: Array<{
    title: string;
    content: string;
    summary: string;
  }>;
  facts: Array<{
    content: string;
    context: string;
    factType: 'fact' | 'entity' | 'relationship' | 'definition';
    confidence: number;
    sourceSectionNumber?: number;
  }>;
  expertQuestions: Array<{
    questionText: string;
    questionReason: string;
    impactLevel: 'high' | 'medium' | 'low';
    relatedSectionNumbers?: number[];
  }>;
}

/** Full RAG document type (maps to rag_documents table) */
export interface RAGDocument {
  id: string;
  knowledgeBaseId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  mimeType: string;
  description: string | null;
  storagePath: string | null;
  status: DocumentStatus;
  fastMode: boolean;
  rawText: string | null;
  rawTextTokenCount: number | null;
  documentSummary: string | null;
  topicTaxonomy: unknown;
  ambiguityList: unknown;
  sectionCount: number;
  factCount: number;
  entityCount: number;
  questionCount: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Provider Dependencies from Section 2

The following provider methods are called by this service. They **must** be implemented by the providers defined in Section 2:

### LLM Provider (`getLLMProvider()`)

```typescript
interface LLMProvider {
  /** Read an entire document and extract structured knowledge */
  readDocument(params: {
    documentText: string;
    fileName: string;
    description?: string;
  }): Promise<LLMDocumentReadingResult>;

  /** Generate a contextual preamble for a section within a document */
  generateContextualPreamble(params: {
    documentSummary: string;
    documentName: string;
    sectionTitle: string;
    sectionContent: string;
  }): Promise<string>;
}
```

### Embedding Provider (`getEmbeddingProvider()`)

```typescript
interface EmbeddingProvider {
  /** Generate embeddings for an array of text strings */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
```

---

## Acceptance Criteria

### FR-3.1: Document Upload and Text Extraction

1. `uploadDocument()` stores a file in Supabase Storage bucket `rag-documents` at path `{userId}/{documentId}/{fileName}`
2. `uploadDocument()` creates a `rag_documents` record with status='pending' and all metadata fields populated
3. `uploadDocument()` rejects files with unsupported MIME types (returns AppError with ERR_VAL_FORMAT)
4. `uploadDocument()` rejects files larger than 100MB (returns AppError with ERR_VAL_RANGE)
5. `uploadDocument()` rolls back the document record if storage upload fails
6. `extractText()` successfully extracts text from PDF files using `pdf-parse`
7. `extractText()` successfully extracts text from DOCX files using `mammoth.extractRawText()`
8. `extractText()` successfully reads TXT and MD files as UTF-8 strings
9. `extractText()` updates `rag_documents.raw_text`, `raw_text_token_count`, and sets status to 'processing'
10. `extractText()` returns an AppError if the document has no storage path
11. `extractText()` returns an AppError if no text can be extracted (empty/image-only file)

### FR-3.2: LLM Document Reading and Knowledge Extraction

12. `processDocument()` runs the complete pipeline from text extraction to final status update
13. `processDocument()` creates `rag_sections` records with correct section_number, title, content, and summary
14. `processDocument()` creates `rag_facts` records with content, context, fact_type, and confidence
15. `processDocument()` creates `rag_expert_questions` records with question text, reason, impact level, and priority order
16. `processDocument()` updates `rag_documents` with document_summary, topic_taxonomy, and ambiguity_list
17. `processDocument()` sets final status to 'ready' when `fast_mode=true`
18. `processDocument()` sets final status to 'needs_questions' when `fast_mode=false`
19. `processDocument()` updates document counts (section_count, fact_count, entity_count, question_count)
20. `processDocument()` updates document status to 'error' with error_message if any step fails
21. `processDocument()` only processes documents in 'pending' or 'error' status

### FR-3.3: Contextual Retrieval

22. `applyContextualRetrieval()` generates a preamble for every section in the document
23. `applyContextualRetrieval()` stores each preamble in `rag_sections.contextual_preamble`
24. `applyContextualRetrieval()` continues processing remaining sections if one section fails
25. `applyContextualRetrieval()` throws if the document has no summary (LLM reading must complete first)

### FR-3.4: Multi-Tier Embedding Generation

26. `generateAndStoreEmbeddings()` creates a Tier 1 (document) embedding from summary + taxonomy
27. `generateAndStoreEmbeddings()` creates Tier 2 (section) embeddings from contextual_preamble + content for each section
28. `generateAndStoreEmbeddings()` creates Tier 3 (fact) embeddings from content + context for each fact
29. `generateAndStoreEmbeddings()` uses batching (EMBEDDING_BATCH_SIZE) for efficient API usage
30. `generateAndStoreEmbeddings()` deletes existing embeddings before re-generating (supports reprocessing)
31. `generateAndStoreEmbeddings()` stores content_text (truncated to 10000 chars) and token_count alongside each embedding

---

## Verification Steps

### Setup Verification

1. Confirm `src/lib/services/rag/` directory exists
2. Confirm `src/lib/services/rag/rag-ingestion-service.ts` file is created and compiles without TypeScript errors
3. Confirm all imports resolve (`@/lib/supabase-server`, `@/lib/errors/error-classes`, `@/lib/providers/*`, `@/types/rag`)

### Upload Verification

4. Call `uploadDocument()` with a valid PDF file -- confirm file appears in Supabase Storage under `rag-documents/{userId}/{docId}/{fileName}`
5. Confirm a `rag_documents` row is created with status='pending', correct file metadata, and the storage_path populated
6. Call `uploadDocument()` with an unsupported file type (e.g., `image/png`) -- confirm AppError with ERR_VAL_FORMAT is thrown
7. Call `uploadDocument()` with a file > 100MB -- confirm AppError with ERR_VAL_RANGE is thrown

### Text Extraction Verification

8. Call `extractText()` on a PDF document -- confirm raw text is extracted and `rag_documents.raw_text` is populated
9. Call `extractText()` on a DOCX document -- confirm raw text is extracted correctly
10. Call `extractText()` on a TXT file -- confirm raw text matches the file contents
11. Confirm `raw_text_token_count` is approximately `text.length / 4`
12. Confirm document status is updated to 'processing' after extraction

### Full Pipeline Verification

13. Call `processDocument()` on a 'pending' document -- confirm the full pipeline runs (check console logs for Step A through Step F)
14. Verify `rag_sections` records exist with populated titles, content, and summaries
15. Verify `rag_facts` records exist with content, context, and fact types
16. Verify `rag_expert_questions` records exist with question text, reason, and impact levels
17. Verify `rag_embeddings` records exist at all three tiers:
    - 1 record with `tier='document'` and `source_type='rag_documents'`
    - N records with `tier='section'` and `source_type='rag_sections'` (matching section count)
    - M records with `tier='fact'` and `source_type='rag_facts'` (matching fact count)
18. Verify document status is 'ready' (fast mode) or 'needs_questions' (normal mode)
19. Verify document counts are updated (section_count, fact_count, entity_count, question_count)

### Error Handling Verification

20. Call `processDocument()` on a document in 'ready' status -- confirm it throws with a descriptive error
21. Simulate an LLM provider failure -- confirm document status is updated to 'error' with the error message
22. Simulate a storage download failure -- confirm appropriate error is thrown and document status is 'error'

### Reprocessing Verification

23. Call `processDocument()` on a document in 'error' status -- confirm it reprocesses successfully
24. Confirm that re-running embeddings deletes old embeddings before creating new ones (no duplicates)

---

## Section Summary

**What Was Added:**
- `src/lib/services/rag/rag-ingestion-service.ts` -- 5 exported functions:
  - `uploadDocument()` -- File upload + DB record creation
  - `extractText()` -- Text extraction from PDF/DOCX/TXT/MD
  - `processDocument()` -- Full pipeline orchestrator
  - `applyContextualRetrieval()` -- Contextual preamble generation per section
  - `generateAndStoreEmbeddings()` -- Multi-tier embedding generation and storage

**What Was Reused:**
- `createServerSupabaseAdminClient()` from `@/lib/supabase-server` (existing DB access pattern)
- `AppError` and `ErrorCode` from `@/lib/errors/error-classes` (existing error handling)
- `pdf-parse` and `mammoth` npm packages (already installed)
- Supabase Storage bucket API (existing pattern from `inference-service.ts`)
- Console.log/console.error logging pattern (existing across all services)
- Try/catch with typed AppError re-throw pattern (existing across all services)

**Integration Points:**
- **Section 1 (Database)**: Writes to `rag_documents`, `rag_sections`, `rag_facts`, `rag_expert_questions`, `rag_embeddings`
- **Section 2 (Types + Providers)**: Uses `RAGDocument` type, `LLMProvider.readDocument()`, `LLMProvider.generateContextualPreamble()`, `EmbeddingProvider.generateEmbeddings()`
- **Section 4 (Expert Q&A)**: After `processDocument()` sets status to 'needs_questions', the Expert Q&A service takes over to collect answers and refine the knowledge
- **Section 6 (API Routes)**: `processDocument()` is called from `POST /api/rag/documents/[id]/process`; `uploadDocument()` is called from `POST /api/rag/documents`

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-3.md`
**Status:** COMPLETE
