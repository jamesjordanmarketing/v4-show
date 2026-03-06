## SECTION 4: Expert Q&A System

**Extension Status**: NEW

---

### Overview

This section implements the Expert Q&A System -- the interactive loop where domain experts answer targeted questions generated during ingestion (Section 3) to refine the system's understanding of the uploaded document. This is the primary quality differentiator of the Frontier RAG system: instead of relying purely on automated analysis, the system asks the human expert 3-8 targeted questions about ambiguities, implicit knowledge, and domain-specific context, then integrates their answers to produce higher-quality knowledge representations.

**User value delivered:**
- Expert answers improve retrieval accuracy and response quality (measurable via quality scores)
- The expert spends 10-20 minutes answering questions instead of hours reviewing chunks
- Verification samples confirm the system "understood" the expert's input before going live

**What already exists (reused):**
- `createServerSupabaseAdminClient()` from `src/lib/supabase-server.ts` for all DB operations
- `AppError`, `ErrorCode`, `GenerationError` from `src/lib/errors/error-classes.ts` for error handling
- LLM Provider abstraction (`getLLMProvider()`) from Section 2
- Embedding Provider abstraction (`getEmbeddingProvider()`) from Section 2
- Database tables `rag_expert_questions`, `rag_sections`, `rag_facts`, `rag_documents`, `rag_embeddings` from Section 1
- All TypeScript types from Section 2 (`RagExpertQuestion`, `RagDocument`, `RagSection`, `RagFact`, `VerificationSample`, etc.)

**What is being added (new):**
- 1 new service file: `src/lib/services/rag/rag-expert-qa-service.ts`

---

### Dependencies

- **Codebase Prerequisites**:
  - `src/lib/supabase-server.ts` (exists -- `createServerSupabaseAdminClient()`)
  - `src/lib/errors/error-classes.ts` (exists -- `AppError`, `ErrorCode`, `GenerationError`)
  - `src/types/rag.ts` (Section 2 -- all RAG type definitions)
  - `src/lib/providers/llm-provider.ts` (Section 2 -- `getLLMProvider()`)
  - `src/lib/providers/embedding-provider.ts` (Section 2 -- `getEmbeddingProvider()`)
- **Previous Section Prerequisites**:
  - Section 1 (database tables must exist)
  - Section 2 (types and provider abstractions must be implemented)
  - Section 3 (ingestion pipeline creates initial questions, sections, facts, and embeddings that this section refines)

---

### Features & Requirements

---

#### FR-4.1: Expert Question Presentation Service

**Type**: Service

**Description**: Fetches all expert questions generated during ingestion (Section 3) for a given document, ordered by impact level and question number, so the UI can present them to the domain expert.

**Implementation Strategy**: NEW build

---

**File**: `src/lib/services/rag/rag-expert-qa-service.ts`

```typescript
/**
 * RAG Expert Q&A Service
 *
 * Handles the expert question-and-answer loop:
 * - Presenting generated questions to domain experts
 * - Collecting and storing expert answers
 * - Triggering knowledge refinement based on answers
 * - Generating verification samples for expert confirmation
 *
 * This is Pillar 2 of the Frontier RAG system. The expert Q&A loop is the
 * primary quality differentiator: it converts implicit domain knowledge into
 * explicit, searchable, embedable context.
 *
 * @module rag-expert-qa-service
 */

import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { getLLMProvider } from '@/lib/providers/llm-provider';
import { getEmbeddingProvider } from '@/lib/providers/embedding-provider';
import type {
  RagExpertQuestion,
  RagDocument,
  RagSection,
  RagFact,
  VerificationSample,
  RagEmbedding,
  DocumentUnderstanding,
  ExpertAnswer,
} from '@/types/rag';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_TAG = '[RAG Expert QA]';

/** Ordering map so we can sort impact levels: high -> medium -> low */
const IMPACT_LEVEL_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ---------------------------------------------------------------------------
// FR-4.1  Expert Question Presentation
// ---------------------------------------------------------------------------

/**
 * Fetch all expert questions for a document, ordered by impact (high first)
 * then by question_number within each impact level.
 *
 * @param documentId - UUID of the rag_documents row
 * @returns Array of RagExpertQuestion sorted high -> medium -> low, then by question_number
 */
export async function getQuestionsForDocument(
  documentId: string
): Promise<RagExpertQuestion[]> {
  console.log(`${SERVICE_TAG} Fetching questions for document ${documentId}`);

  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase
    .from('rag_expert_questions')
    .select('*')
    .eq('document_id', documentId)
    .order('question_number', { ascending: true });

  if (error) {
    console.error(`${SERVICE_TAG} Error fetching questions:`, error);
    throw new Error(
      `Failed to fetch expert questions for document ${documentId}: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    console.log(`${SERVICE_TAG} No questions found for document ${documentId}`);
    return [];
  }

  // Sort by impact_level (high first) then by question_number within each level.
  // Supabase does not natively support custom enum ordering, so we sort in JS.
  const sorted = [...data].sort((a, b) => {
    const aLevel = IMPACT_LEVEL_ORDER[a.impact_level] ?? 99;
    const bLevel = IMPACT_LEVEL_ORDER[b.impact_level] ?? 99;
    if (aLevel !== bLevel) return aLevel - bLevel;
    return (a.question_number ?? 0) - (b.question_number ?? 0);
  });

  // Map DB rows to typed objects
  const questions: RagExpertQuestion[] = sorted.map(mapRowToExpertQuestion);

  console.log(
    `${SERVICE_TAG} Returning ${questions.length} questions (` +
      `${questions.filter((q) => q.impactLevel === 'high').length} high, ` +
      `${questions.filter((q) => q.impactLevel === 'medium').length} medium, ` +
      `${questions.filter((q) => q.impactLevel === 'low').length} low)`
  );

  return questions;
}

// ---------------------------------------------------------------------------
// FR-4.2  Answer Collection and Knowledge Refinement
// ---------------------------------------------------------------------------

/**
 * Submit expert answers for a batch of questions and trigger knowledge
 * refinement. Each answer is persisted individually; if all succeed the
 * refinement pipeline runs automatically.
 *
 * @param documentId - UUID of the rag_documents row
 * @param answers    - Array of { questionId, answerText } pairs
 */
export async function submitExpertAnswers(
  documentId: string,
  answers: { questionId: string; answerText: string }[]
): Promise<void> {
  console.log(
    `${SERVICE_TAG} Submitting ${answers.length} answers for document ${documentId}`
  );

  const supabase = createServerSupabaseAdminClient();

  // ---- 1. Persist each answer ----
  for (const { questionId, answerText } of answers) {
    const { error } = await supabase
      .from('rag_expert_questions')
      .update({
        answer_text: answerText,
        status: 'answered',
        answered_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .eq('document_id', documentId);

    if (error) {
      console.error(
        `${SERVICE_TAG} Error saving answer for question ${questionId}:`,
        error
      );
      throw new Error(
        `Failed to save answer for question ${questionId}: ${error.message}`
      );
    }

    console.log(`${SERVICE_TAG} Saved answer for question ${questionId}`);
  }

  // ---- 2. Trigger refinement ----
  console.log(`${SERVICE_TAG} All answers saved. Triggering knowledge refinement...`);
  await refineKnowledge(documentId);
}

/**
 * Skip a single expert question (expert chose not to answer).
 *
 * @param questionId - UUID of the rag_expert_questions row
 */
export async function skipQuestion(questionId: string): Promise<void> {
  console.log(`${SERVICE_TAG} Skipping question ${questionId}`);

  const supabase = createServerSupabaseAdminClient();

  const { error } = await supabase
    .from('rag_expert_questions')
    .update({ status: 'skipped' })
    .eq('id', questionId);

  if (error) {
    console.error(`${SERVICE_TAG} Error skipping question ${questionId}:`, error);
    throw new Error(`Failed to skip question ${questionId}: ${error.message}`);
  }

  console.log(`${SERVICE_TAG} Question ${questionId} marked as skipped`);
}

/**
 * Refine the document's knowledge representation using expert answers.
 *
 * High-level flow:
 * 1. Fetch document with raw_text and current understanding (summary, sections, facts)
 * 2. Fetch all answered questions
 * 3. If no answers exist (fast mode or all skipped), just set status to 'ready'
 * 4. Call LLM provider to re-read document in light of expert answers
 * 5. Update sections with refined summaries
 * 6. Create new facts from expert-provided knowledge
 * 7. Regenerate contextual preambles for affected sections
 * 8. Regenerate embeddings for updated sections and new facts
 * 9. Update document metadata (summary, counts, status)
 *
 * @param documentId - UUID of the rag_documents row
 */
export async function refineKnowledge(documentId: string): Promise<void> {
  console.log(`${SERVICE_TAG} Starting knowledge refinement for document ${documentId}`);

  const supabase = createServerSupabaseAdminClient();

  try {
    // ---- Step 1: Fetch the document ----
    console.log(`${SERVICE_TAG} [Step 1/9] Fetching document...`);

    const { data: docRow, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !docRow) {
      throw new Error(
        `Document ${documentId} not found: ${docError?.message ?? 'no data'}`
      );
    }

    const document: RagDocument = mapRowToDocument(docRow);

    // ---- Step 2: Fetch current sections and facts ----
    console.log(`${SERVICE_TAG} [Step 2/9] Fetching sections and facts...`);

    const { data: sectionRows, error: secError } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('section_order', { ascending: true });

    if (secError) {
      throw new Error(`Failed to fetch sections: ${secError.message}`);
    }

    const sections: RagSection[] = (sectionRows ?? []).map(mapRowToSection);

    const { data: factRows, error: factError } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', documentId);

    if (factError) {
      throw new Error(`Failed to fetch facts: ${factError.message}`);
    }

    const facts: RagFact[] = (factRows ?? []).map(mapRowToFact);

    // ---- Step 3: Fetch answered questions ----
    console.log(`${SERVICE_TAG} [Step 3/9] Fetching answered questions...`);

    const { data: answeredRows, error: aqError } = await supabase
      .from('rag_expert_questions')
      .select('*')
      .eq('document_id', documentId)
      .eq('status', 'answered');

    if (aqError) {
      throw new Error(`Failed to fetch answered questions: ${aqError.message}`);
    }

    const answeredQuestions: RagExpertQuestion[] = (answeredRows ?? []).map(
      mapRowToExpertQuestion
    );

    // If no questions were answered (fast mode or all skipped), just mark ready
    if (answeredQuestions.length === 0) {
      console.log(
        `${SERVICE_TAG} No answered questions found. Setting document status to ready.`
      );
      await updateDocumentStatus(supabase, documentId, 'ready', {
        answered_question_count: 0,
      });
      return;
    }

    console.log(
      `${SERVICE_TAG} Found ${answeredQuestions.length} answered questions. Proceeding with refinement.`
    );

    // ---- Step 4: Call LLM provider to refine knowledge ----
    console.log(`${SERVICE_TAG} [Step 4/9] Calling LLM for knowledge refinement...`);

    const llmProvider = getLLMProvider();

    const currentUnderstanding: DocumentUnderstanding = {
      summary: document.summary ?? '',
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        content: s.content,
        sectionOrder: s.sectionOrder,
      })),
      facts: facts.map((f) => ({
        id: f.id,
        content: f.content,
        factType: f.factType,
        confidence: f.confidence,
      })),
      ambiguityList: document.ambiguityList ?? [],
    };

    const expertAnswers: ExpertAnswer[] = answeredQuestions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      answerText: q.answerText!,
      impactLevel: q.impactLevel,
      category: q.category,
    }));

    const refinedKnowledge = await llmProvider.refineKnowledge(
      document.rawText ?? '',
      currentUnderstanding,
      expertAnswers
    );

    console.log(
      `${SERVICE_TAG} LLM refinement complete. ` +
        `Updated ${refinedKnowledge.updatedSections.length} sections, ` +
        `${refinedKnowledge.newFacts.length} new facts, ` +
        `${refinedKnowledge.resolvedAmbiguities.length} resolved ambiguities.`
    );

    // ---- Step 5: Update sections with refined summaries ----
    console.log(`${SERVICE_TAG} [Step 5/9] Updating sections with refined summaries...`);

    const affectedSectionIds: string[] = [];

    for (const updatedSection of refinedKnowledge.updatedSections) {
      // Match by section ID from the LLM response
      const existingSection = sections.find((s) => s.id === updatedSection.id);
      if (!existingSection) {
        console.warn(
          `${SERVICE_TAG} LLM returned update for unknown section ID: ${updatedSection.id}. Skipping.`
        );
        continue;
      }

      const { error: updateError } = await supabase
        .from('rag_sections')
        .update({
          summary: updatedSection.summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedSection.id);

      if (updateError) {
        console.error(
          `${SERVICE_TAG} Error updating section ${updatedSection.id}:`,
          updateError
        );
        // Continue with other sections; don't abort the whole refinement
        continue;
      }

      affectedSectionIds.push(updatedSection.id);
      console.log(`${SERVICE_TAG} Updated section: ${updatedSection.id}`);
    }

    // ---- Step 6: Create new facts from expert-provided knowledge ----
    console.log(`${SERVICE_TAG} [Step 6/9] Creating new facts...`);

    const newFactIds: string[] = [];

    for (const newFact of refinedKnowledge.newFacts) {
      const { data: factData, error: factInsertError } = await supabase
        .from('rag_facts')
        .insert({
          document_id: documentId,
          content: newFact.content,
          fact_type: newFact.factType ?? 'expert_provided',
          confidence: newFact.confidence ?? 1.0,
          source_section_id: newFact.sourceSectionId ?? null,
          metadata: newFact.metadata ?? {},
        })
        .select('id')
        .single();

      if (factInsertError) {
        console.error(
          `${SERVICE_TAG} Error inserting new fact:`,
          factInsertError
        );
        continue;
      }

      if (factData) {
        newFactIds.push(factData.id);
        console.log(`${SERVICE_TAG} Created new fact: ${factData.id}`);
      }
    }

    // ---- Step 7: Regenerate contextual preambles for affected sections ----
    console.log(
      `${SERVICE_TAG} [Step 7/9] Regenerating contextual preambles for ${affectedSectionIds.length} affected sections...`
    );

    const updatedSummary = refinedKnowledge.updatedSummary ?? document.summary ?? '';

    for (const sectionId of affectedSectionIds) {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) continue;

      // Fetch the latest summary from DB (we just updated it)
      const { data: refreshedRow, error: refreshError } = await supabase
        .from('rag_sections')
        .select('summary, content, title')
        .eq('id', sectionId)
        .single();

      if (refreshError || !refreshedRow) {
        console.warn(
          `${SERVICE_TAG} Could not refresh section ${sectionId} for preamble regen. Skipping.`
        );
        continue;
      }

      try {
        const preamble = await llmProvider.generateContextualPreamble(
          updatedSummary,
          refreshedRow.title ?? '',
          refreshedRow.content ?? refreshedRow.summary ?? ''
        );

        const { error: preambleError } = await supabase
          .from('rag_sections')
          .update({
            contextual_preamble: preamble,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sectionId);

        if (preambleError) {
          console.warn(
            `${SERVICE_TAG} Error updating preamble for section ${sectionId}:`,
            preambleError
          );
        } else {
          console.log(
            `${SERVICE_TAG} Regenerated preamble for section ${sectionId}`
          );
        }
      } catch (preambleGenError) {
        console.warn(
          `${SERVICE_TAG} LLM preamble generation failed for section ${sectionId}:`,
          preambleGenError
        );
        // Non-fatal: continue with old preamble
      }
    }

    // ---- Step 8: Regenerate embeddings for updated sections and new facts ----
    console.log(
      `${SERVICE_TAG} [Step 8/9] Regenerating embeddings for ` +
        `${affectedSectionIds.length} sections and ${newFactIds.length} new facts...`
    );

    const embeddingProvider = getEmbeddingProvider();

    // 8a. Re-embed affected sections
    for (const sectionId of affectedSectionIds) {
      const { data: sectionData, error: sFetchError } = await supabase
        .from('rag_sections')
        .select('contextual_preamble, content, summary, title')
        .eq('id', sectionId)
        .single();

      if (sFetchError || !sectionData) {
        console.warn(
          `${SERVICE_TAG} Could not fetch section ${sectionId} for re-embedding. Skipping.`
        );
        continue;
      }

      // Build embedding text: contextual preamble + content (or summary if content absent)
      const embeddingText = buildSectionEmbeddingText(
        sectionData.contextual_preamble,
        sectionData.title,
        sectionData.content ?? sectionData.summary ?? ''
      );

      try {
        const embedding = await embeddingProvider.generateEmbedding(embeddingText);

        // Delete existing section-tier embedding for this section, then insert new one
        await supabase
          .from('rag_embeddings')
          .delete()
          .eq('source_id', sectionId)
          .eq('tier', 'section');

        const { error: embedInsertError } = await supabase
          .from('rag_embeddings')
          .insert({
            document_id: documentId,
            source_id: sectionId,
            tier: 'section',
            embedding_text: embeddingText,
            embedding: embedding,
            model: embeddingProvider.getModelName(),
            dimensions: embedding.length,
          });

        if (embedInsertError) {
          console.warn(
            `${SERVICE_TAG} Error inserting section embedding for ${sectionId}:`,
            embedInsertError
          );
        } else {
          console.log(`${SERVICE_TAG} Re-embedded section ${sectionId}`);
        }
      } catch (embedError) {
        console.warn(
          `${SERVICE_TAG} Embedding generation failed for section ${sectionId}:`,
          embedError
        );
      }
    }

    // 8b. Generate embeddings for new facts
    for (const factId of newFactIds) {
      const { data: factData, error: fFetchError } = await supabase
        .from('rag_facts')
        .select('content')
        .eq('id', factId)
        .single();

      if (fFetchError || !factData) {
        console.warn(
          `${SERVICE_TAG} Could not fetch fact ${factId} for embedding. Skipping.`
        );
        continue;
      }

      try {
        const embedding = await embeddingProvider.generateEmbedding(factData.content);

        const { error: embedInsertError } = await supabase
          .from('rag_embeddings')
          .insert({
            document_id: documentId,
            source_id: factId,
            tier: 'fact',
            embedding_text: factData.content,
            embedding: embedding,
            model: embeddingProvider.getModelName(),
            dimensions: embedding.length,
          });

        if (embedInsertError) {
          console.warn(
            `${SERVICE_TAG} Error inserting fact embedding for ${factId}:`,
            embedInsertError
          );
        } else {
          console.log(`${SERVICE_TAG} Embedded new fact ${factId}`);
        }
      } catch (embedError) {
        console.warn(
          `${SERVICE_TAG} Embedding generation failed for fact ${factId}:`,
          embedError
        );
      }
    }

    // ---- Step 9: Update document metadata ----
    console.log(`${SERVICE_TAG} [Step 9/9] Updating document metadata...`);

    // Count total facts and sections after refinement
    const { count: totalFactCount } = await supabase
      .from('rag_facts')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId);

    const { count: totalSectionCount } = await supabase
      .from('rag_sections')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId);

    // Build updated ambiguity list (remove resolved ambiguities)
    const resolvedSet = new Set(
      refinedKnowledge.resolvedAmbiguities.map((a) => a.toLowerCase().trim())
    );
    const remainingAmbiguities = (document.ambiguityList ?? []).filter(
      (a) => !resolvedSet.has(a.toLowerCase().trim())
    );

    await updateDocumentStatus(supabase, documentId, 'ready', {
      summary: updatedSummary,
      ambiguity_list: remainingAmbiguities,
      answered_question_count: answeredQuestions.length,
      fact_count: totalFactCount ?? facts.length + newFactIds.length,
      section_count: totalSectionCount ?? sections.length,
      updated_at: new Date().toISOString(),
    });

    console.log(
      `${SERVICE_TAG} Knowledge refinement complete for document ${documentId}. ` +
        `Document status set to 'ready'.`
    );
  } catch (error) {
    // Refinement failed -- update document error_message but do NOT crash the caller
    console.error(
      `${SERVICE_TAG} Knowledge refinement failed for document ${documentId}:`,
      error
    );

    try {
      await updateDocumentStatus(
        createServerSupabaseAdminClient(),
        documentId,
        'error',
        {
          error_message:
            error instanceof Error
              ? `Refinement failed: ${error.message}`
              : 'Refinement failed: unknown error',
          updated_at: new Date().toISOString(),
        }
      );
    } catch (statusUpdateError) {
      console.error(
        `${SERVICE_TAG} Could not update document error status:`,
        statusUpdateError
      );
    }

    // Re-throw so the calling API route knows the operation failed
    throw error;
  }
}

// ---------------------------------------------------------------------------
// FR-4.3  Verification Sample Generation
// ---------------------------------------------------------------------------

/**
 * Generate 2-3 verification sample questions with expected answers so the
 * expert can confirm the system "understood" their input.
 *
 * This does NOT store results in the database -- it returns them for
 * display in the UI only.
 *
 * @param documentId - UUID of the rag_documents row
 * @returns Array of VerificationSample objects (2-3 items)
 */
export async function generateVerificationSamples(
  documentId: string
): Promise<VerificationSample[]> {
  console.log(
    `${SERVICE_TAG} Generating verification samples for document ${documentId}`
  );

  const supabase = createServerSupabaseAdminClient();

  // Fetch document summary
  const { data: docRow, error: docError } = await supabase
    .from('rag_documents')
    .select('summary, title, ambiguity_list')
    .eq('id', documentId)
    .single();

  if (docError || !docRow) {
    throw new Error(
      `Document ${documentId} not found: ${docError?.message ?? 'no data'}`
    );
  }

  // Fetch current sections
  const { data: sectionRows, error: secError } = await supabase
    .from('rag_sections')
    .select('id, title, summary, section_order')
    .eq('document_id', documentId)
    .order('section_order', { ascending: true });

  if (secError) {
    throw new Error(`Failed to fetch sections: ${secError.message}`);
  }

  // Fetch answered questions for extra context
  const { data: answeredRows } = await supabase
    .from('rag_expert_questions')
    .select('question_text, answer_text')
    .eq('document_id', documentId)
    .eq('status', 'answered');

  // Build understanding for the LLM
  const understanding: DocumentUnderstanding = {
    summary: docRow.summary ?? '',
    sections: (sectionRows ?? []).map((s: any) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      content: '',
      sectionOrder: s.section_order,
    })),
    facts: [],
    ambiguityList: docRow.ambiguity_list ?? [],
    expertAnswers: (answeredRows ?? []).map((a: any) => ({
      question: a.question_text,
      answer: a.answer_text,
    })),
  };

  const llmProvider = getLLMProvider();

  const samples = await llmProvider.generateVerificationSamples(understanding);

  console.log(
    `${SERVICE_TAG} Generated ${samples.length} verification samples for document ${documentId}`
  );

  // Map LLM output to typed VerificationSample objects with section references
  const verificationSamples: VerificationSample[] = samples.map((sample) => {
    // Resolve section references: match titles from LLM output to actual section IDs
    const sectionReferences: { sectionId: string; sectionTitle: string }[] = [];

    if (sample.sectionReferences && Array.isArray(sample.sectionReferences)) {
      for (const ref of sample.sectionReferences) {
        // ref might be a section title or ID
        const matchedSection = (sectionRows ?? []).find(
          (s: any) =>
            s.id === ref ||
            s.title?.toLowerCase().trim() === ref.toLowerCase().trim()
        );
        if (matchedSection) {
          sectionReferences.push({
            sectionId: matchedSection.id,
            sectionTitle: matchedSection.title ?? 'Untitled Section',
          });
        }
      }
    }

    return {
      question: sample.question,
      expectedAnswer: sample.expectedAnswer,
      sectionReferences,
    };
  });

  return verificationSamples;
}

/**
 * Confirm that the expert has verified the document's understanding.
 * Simply marks the document as verified. No additional processing is
 * performed -- the document should already be in 'ready' status after
 * refinement.
 *
 * @param documentId - UUID of the rag_documents row
 */
export async function confirmVerification(documentId: string): Promise<void> {
  console.log(`${SERVICE_TAG} Expert confirmed verification for document ${documentId}`);

  const supabase = createServerSupabaseAdminClient();

  const { error } = await supabase
    .from('rag_documents')
    .update({
      status: 'ready',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) {
    console.error(
      `${SERVICE_TAG} Error confirming verification for document ${documentId}:`,
      error
    );
    throw new Error(
      `Failed to confirm verification for document ${documentId}: ${error.message}`
    );
  }

  console.log(
    `${SERVICE_TAG} Document ${documentId} verified and ready for queries.`
  );
}

// ---------------------------------------------------------------------------
// Helper Functions (internal)
// ---------------------------------------------------------------------------

/**
 * Update document status and optional additional fields.
 */
async function updateDocumentStatus(
  supabase: any,
  documentId: string,
  status: string,
  additionalFields: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabase
    .from('rag_documents')
    .update({
      status,
      ...additionalFields,
    })
    .eq('id', documentId);

  if (error) {
    console.error(
      `${SERVICE_TAG} Error updating document ${documentId} status to '${status}':`,
      error
    );
    throw new Error(
      `Failed to update document status: ${error.message}`
    );
  }
}

/**
 * Build the text that will be embedded for a section.
 * Format: "[Contextual Preamble] Title: <title>\n<content>"
 */
function buildSectionEmbeddingText(
  contextualPreamble: string | null,
  title: string | null,
  content: string
): string {
  const parts: string[] = [];

  if (contextualPreamble) {
    parts.push(contextualPreamble);
  }

  if (title) {
    parts.push(`Title: ${title}`);
  }

  parts.push(content);

  return parts.join('\n');
}

/**
 * Map a database row from rag_expert_questions to a typed RagExpertQuestion.
 */
function mapRowToExpertQuestion(row: any): RagExpertQuestion {
  return {
    id: row.id,
    documentId: row.document_id,
    questionNumber: row.question_number,
    questionText: row.question_text,
    impactLevel: row.impact_level,
    category: row.category ?? null,
    reason: row.reason ?? null,
    answerText: row.answer_text ?? null,
    status: row.status,
    answeredAt: row.answered_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * Map a database row from rag_documents to a typed RagDocument.
 */
function mapRowToDocument(row: any): RagDocument {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? null,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    rawText: row.raw_text ?? null,
    summary: row.summary ?? null,
    topicTaxonomy: row.topic_taxonomy ?? [],
    ambiguityList: row.ambiguity_list ?? [],
    sectionCount: row.section_count ?? 0,
    factCount: row.fact_count ?? 0,
    questionCount: row.question_count ?? 0,
    answeredQuestionCount: row.answered_question_count ?? 0,
    status: row.status,
    processingStartedAt: row.processing_started_at ?? null,
    processingCompletedAt: row.processing_completed_at ?? null,
    errorMessage: row.error_message ?? null,
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * Map a database row from rag_sections to a typed RagSection.
 */
function mapRowToSection(row: any): RagSection {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title ?? null,
    content: row.content ?? '',
    summary: row.summary ?? '',
    sectionOrder: row.section_order,
    contextualPreamble: row.contextual_preamble ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * Map a database row from rag_facts to a typed RagFact.
 */
function mapRowToFact(row: any): RagFact {
  return {
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    factType: row.fact_type ?? 'extracted',
    confidence: row.confidence ?? 1.0,
    sourceSectionId: row.source_section_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}
```

---

**Acceptance Criteria**:

1. `getQuestionsForDocument()` returns all questions for a document sorted by impact level (high, medium, low) then by question_number within each level
2. `getQuestionsForDocument()` returns an empty array (not an error) when no questions exist
3. `submitExpertAnswers()` persists each answer with status='answered' and answered_at timestamp
4. `submitExpertAnswers()` triggers `refineKnowledge()` after all answers are saved
5. `skipQuestion()` sets the question status to 'skipped' without triggering refinement
6. `refineKnowledge()` handles the "no answered questions" case by setting document status to 'ready' without calling the LLM
7. `refineKnowledge()` calls the LLM provider with the document's raw text, current understanding, and expert answers
8. `refineKnowledge()` updates section summaries in the database for sections returned by the LLM
9. `refineKnowledge()` creates new `rag_facts` records for expert-provided knowledge
10. `refineKnowledge()` regenerates contextual preambles for affected sections
11. `refineKnowledge()` regenerates embeddings (delete old, insert new) for all updated sections and new facts
12. `refineKnowledge()` updates the document's ambiguity_list by removing resolved ambiguities
13. `refineKnowledge()` updates document metadata: summary, counts, status='ready', answered_question_count
14. `refineKnowledge()` sets document status to 'error' with error_message if refinement fails, but does not crash silently
15. `generateVerificationSamples()` returns 2-3 sample questions with expected answers and section references
16. `generateVerificationSamples()` does NOT store results in the database
17. `confirmVerification()` sets the verified_at timestamp on the document
18. All functions log each major step for debugging
19. All database operations use `createServerSupabaseAdminClient()` (not the client-side Supabase client)

**Verification Steps**:

1. **Unit test - question ordering**: Insert 5 questions with mixed impact levels (2 high, 2 medium, 1 low) and varying question_numbers. Call `getQuestionsForDocument()`. Verify the returned array is sorted: high questions first (by question_number), then medium (by question_number), then low.

2. **Unit test - answer submission**: Insert 3 questions with status='pending'. Call `submitExpertAnswers()` with answers for 2 of them. Verify:
   - 2 questions have status='answered', non-null answer_text and answered_at
   - 1 question still has status='pending'
   - Document status is 'ready' after refinement completes

3. **Unit test - skip question**: Insert a question with status='pending'. Call `skipQuestion()`. Verify status is 'skipped' and no refinement was triggered (document status unchanged).

4. **Integration test - refinement with no answers**: Create a document with questions but none answered. Call `refineKnowledge()`. Verify:
   - No LLM calls were made
   - Document status is 'ready'
   - answered_question_count is 0

5. **Integration test - full refinement flow**: Create a document with sections, facts, and 3 answered questions. Call `refineKnowledge()`. Verify:
   - LLM `refineKnowledge()` was called with correct arguments
   - Section summaries updated in DB
   - New facts created in DB
   - Contextual preambles regenerated for affected sections
   - Old embeddings deleted and new embeddings created for affected sections
   - New embeddings created for new facts
   - Document summary updated
   - Ambiguity list has resolved items removed
   - Document status is 'ready'

6. **Integration test - refinement error handling**: Mock the LLM provider to throw an error. Call `refineKnowledge()`. Verify:
   - Document status is 'error'
   - error_message is set on the document
   - The error is re-thrown to the caller

7. **Unit test - verification samples**: Call `generateVerificationSamples()` for a document with sections. Verify:
   - Returns 2-3 VerificationSample objects
   - Each has question, expectedAnswer, and sectionReferences
   - sectionReferences contain valid section IDs that exist in the database
   - No data was written to the database

8. **Unit test - confirm verification**: Call `confirmVerification()`. Verify:
   - Document verified_at is set to a recent timestamp
   - Document status is 'ready'

---

### Section Summary

**What Was Added**:
- `src/lib/services/rag/rag-expert-qa-service.ts` -- Complete Expert Q&A service with 6 exported functions:
  - `getQuestionsForDocument()` -- FR-4.1
  - `submitExpertAnswers()` -- FR-4.2
  - `skipQuestion()` -- FR-4.2
  - `refineKnowledge()` -- FR-4.2
  - `generateVerificationSamples()` -- FR-4.3
  - `confirmVerification()` -- FR-4.3
- 5 internal helper functions: `updateDocumentStatus()`, `buildSectionEmbeddingText()`, `mapRowToExpertQuestion()`, `mapRowToDocument()`, `mapRowToSection()`, `mapRowToFact()`

**What Was Reused**:
- `createServerSupabaseAdminClient()` from `src/lib/supabase-server.ts` -- all DB operations
- `getLLMProvider()` from `src/lib/providers/llm-provider.ts` -- knowledge refinement, preamble generation, verification sample generation
- `getEmbeddingProvider()` from `src/lib/providers/embedding-provider.ts` -- regenerating embeddings after refinement
- Error handling patterns from `src/lib/errors/error-classes.ts`
- Console logging pattern consistent with existing services (tagged prefix for grep-ability)

**Integration Points**:
- **Upstream (Section 3)**: Ingestion pipeline creates the initial questions, sections, facts, and embeddings that this service refines
- **Downstream (Section 5)**: Retrieval pipeline searches the refined sections, facts, and embeddings produced by this service
- **Downstream (Section 6)**: API routes in `src/app/api/rag/documents/[id]/questions/` and `src/app/api/rag/documents/[id]/verify/` call the functions exported from this service
- **Downstream (Section 7)**: The `useExpertQA` hook calls the API routes that wrap this service
- **Downstream (Section 8)**: The Expert Q&A page and Verification panel render the data returned by this service

**Pattern Source**: Service function signatures, error handling, and logging follow the pattern established in `src/lib/services/conversation-service.ts` and `src/lib/services/claude-api-client.ts`. Database operations use `createServerSupabaseAdminClient()` as specified in `src/lib/supabase-server.ts`.

**LLM Provider Interface Methods Used** (must be defined in Section 2):
- `llmProvider.refineKnowledge(rawText, currentUnderstanding, expertAnswers)` -- returns `{ updatedSections, newFacts, resolvedAmbiguities, updatedSummary }`
- `llmProvider.generateContextualPreamble(documentSummary, sectionTitle, sectionContent)` -- returns a string preamble
- `llmProvider.generateVerificationSamples(understanding)` -- returns array of `{ question, expectedAnswer, sectionReferences }`

**Embedding Provider Interface Methods Used** (must be defined in Section 2):
- `embeddingProvider.generateEmbedding(text)` -- returns number array (vector)
- `embeddingProvider.getModelName()` -- returns string (e.g., 'text-embedding-3-small')
