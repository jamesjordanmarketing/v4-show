import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import type { LLMProvider } from '@/lib/rag/providers/llm-provider';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings } from './rag-embedding-service';
import { mapRowToQuestion, mapRowToSection, mapRowToFact, mapRowToDocument } from './rag-db-mappers';
import type {
  RAGExpertQuestion,
  RAGSection,
  RAGFact,
  RAGDocument,
  KnowledgeRefinement,
} from '@/types/rag';

// ============================================
// RAG Expert Q&A Service
// ============================================
// Manages the expert-in-the-loop workflow:
// 1. Present targeted questions to domain experts
// 2. Store expert answers
// 3. Refine knowledge based on answers
// 4. Re-embed refined sections/facts
// Pattern Source: src/lib/services/pipeline-service.ts

let llmProvider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    llmProvider = new ClaudeLLMProvider();
  }
  return llmProvider;
}

// ============================================
// Get Questions for Document
// ============================================

export async function getQuestionsForDocument(params: {
  documentId: string;
  userId: string;
  includeAnswered?: boolean;
}): Promise<{ success: boolean; data?: RAGExpertQuestion[]; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    let query = supabase
      .from('rag_expert_questions')
      .select('*')
      .eq('document_id', params.documentId)
      .eq('user_id', params.userId)
      .order('sort_order', { ascending: true });

    if (!params.includeAnswered) {
      query = query.is('answered_at', null).eq('skipped', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).map(mapRowToQuestion) };
  } catch (err) {
    console.error('Exception fetching questions:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch questions' };
  }
}

// ============================================
// Submit Expert Answer
// ============================================

export async function submitExpertAnswer(params: {
  questionId: string;
  userId: string;
  answerText: string;
}): Promise<{ success: boolean; data?: RAGExpertQuestion; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('rag_expert_questions')
      .update({
        answer_text: params.answerText,
        answered_at: new Date().toISOString(),
      })
      .eq('id', params.questionId)
      .eq('user_id', params.userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error submitting answer:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToQuestion(data) };
  } catch (err) {
    console.error('Exception submitting answer:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit answer' };
  }
}

// ============================================
// Skip Question
// ============================================

export async function skipQuestion(params: {
  questionId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { error } = await supabase
      .from('rag_expert_questions')
      .update({ skipped: true })
      .eq('id', params.questionId)
      .eq('user_id', params.userId);

    if (error) {
      console.error('Error skipping question:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception skipping question:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to skip question' };
  }
}

// ============================================
// Refine Knowledge After Expert Answers
// ============================================

export async function refineKnowledgeWithAnswers(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; refinedCount?: number; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();
    const provider = getLLMProvider();

    // Fetch the document
    const { data: docRow, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', params.documentId)
      .single();

    if (docError || !docRow) {
      return { success: false, error: 'Document not found' };
    }

    const doc = mapRowToDocument(docRow);

    // Fetch all answered questions
    const { data: answeredRows, error: qError } = await supabase
      .from('rag_expert_questions')
      .select('*')
      .eq('document_id', params.documentId)
      .not('answered_at', 'is', null);

    if (qError) {
      return { success: false, error: 'Failed to fetch answered questions' };
    }

    const answeredQuestions = (answeredRows || []).map(mapRowToQuestion);
    if (answeredQuestions.length === 0) {
      return { success: true, refinedCount: 0 };
    }

    // Fetch existing sections
    const { data: sectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', params.documentId)
      .order('section_index', { ascending: true });

    const sections = (sectionRows || []).map(mapRowToSection);

    console.log(`[RAG Expert QA] Refining knowledge for document ${params.documentId} with ${answeredQuestions.length} answers...`);

    // Use the provider's refineKnowledge method
    let refinements: KnowledgeRefinement;
    try {
      refinements = await provider.refineKnowledge({
        documentText: doc.originalText || '',
        currentSummary: doc.documentSummary || '',
        questions: answeredQuestions,
        sections,
      });
    } catch (refinementError) {
      console.warn('[RAG Expert QA] Knowledge refinement failed:', refinementError);
      return { success: true, refinedCount: 0 };
    }

    let refinedCount = 0;

    // Apply section updates
    if (refinements.updatedSections && Array.isArray(refinements.updatedSections)) {
      for (const update of refinements.updatedSections) {
        const section = sections[update.sectionIndex];
        if (!section) continue;

        const { error: updateError } = await supabase
          .from('rag_sections')
          .update({ summary: update.updatedSummary, updated_at: new Date().toISOString() })
          .eq('id', section.id);

        if (!updateError) refinedCount++;
      }
    }

    // Insert new facts from expert answers
    if (refinements.updatedFacts && Array.isArray(refinements.updatedFacts)) {
      const newFactRecords = refinements.updatedFacts.map(f => ({
        document_id: params.documentId,
        user_id: params.userId,
        fact_type: f.factType,
        content: f.content,
        source_text: f.sourceText,
        confidence: Math.min(1, Math.max(0, f.confidence)),
      }));

      if (newFactRecords.length > 0) {
        const { data: insertedFacts, error: factInsertError } = await supabase
          .from('rag_facts')
          .insert(newFactRecords)
          .select('*');

        if (!factInsertError && insertedFacts) {
          refinedCount += insertedFacts.length;

          // Fetch current fact count
          const { data: currentFacts } = await supabase
            .from('rag_facts')
            .select('id', { count: 'exact', head: true })
            .eq('document_id', params.documentId);

          // Update document fact count
          await supabase
            .from('rag_documents')
            .update({ fact_count: (currentFacts?.length || 0) + insertedFacts.length })
            .eq('id', params.documentId);
        }
      }
    }

    // Re-generate embeddings for updated sections and new facts
    console.log(`[RAG Expert QA] Re-embedding after ${refinedCount} refinements...`);

    // Delete old embeddings and regenerate
    await deleteDocumentEmbeddings(params.documentId);

    // Re-fetch updated sections and facts
    const { data: updatedSectionRows } = await supabase
      .from('rag_sections')
      .select('*')
      .eq('document_id', params.documentId)
      .order('section_index', { ascending: true });

    const { data: updatedFactRows } = await supabase
      .from('rag_facts')
      .select('*')
      .eq('document_id', params.documentId)
      .limit(10000);

    const updatedSections = (updatedSectionRows || []).map(mapRowToSection);
    const updatedFacts = (updatedFactRows || []).map(mapRowToFact);

    const embeddingItems: Array<{
      sourceType: 'document' | 'section' | 'fact';
      sourceId: string;
      contentText: string;
      tier: 1 | 2 | 3;
    }> = [];

    // Tier 1: Document-level
    embeddingItems.push({
      sourceType: 'document',
      sourceId: params.documentId,
      contentText: `${doc.documentSummary || ''}\n\nTopics: ${(doc.topicTaxonomy || []).join(', ')}`,
      tier: 1,
    });

    // Tier 2: Section-level
    for (const section of updatedSections) {
      const text = section.contextualPreamble
        ? `${section.contextualPreamble}\n\n${section.summary || section.originalText.slice(0, 2000)}`
        : section.summary || section.originalText.slice(0, 2000);
      embeddingItems.push({ sourceType: 'section', sourceId: section.id, contentText: text, tier: 2 });
    }

    // Tier 3: Fact-level
    for (const fact of updatedFacts) {
      embeddingItems.push({ sourceType: 'fact', sourceId: fact.id, contentText: fact.content, tier: 3 });
    }

    await generateAndStoreBatchEmbeddings({
      documentId: params.documentId,
      userId: params.userId,
      items: embeddingItems,
    });

    console.log(`[RAG Expert QA] Knowledge refinement complete: ${refinedCount} items refined`);
    return { success: true, refinedCount };
  } catch (err) {
    console.error('[RAG Expert QA] Exception in refineKnowledge:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Knowledge refinement failed' };
  }
}

// ============================================
// Mark Document Verified (All Questions Answered)
// ============================================

export async function markDocumentVerified(params: {
  documentId: string;
  userId: string;
}): Promise<{ success: boolean; data?: RAGDocument; error?: string }> {
  try {
    const supabase = createServerSupabaseAdminClient();

    // Refine knowledge with all expert answers first
    const refinementResult = await refineKnowledgeWithAnswers(params);
    if (!refinementResult.success) {
      console.warn('[RAG Expert QA] Refinement had issues:', refinementResult.error);
      // Continue anyway — verification shouldn't block on refinement
    }

    // Update document status to ready
    const { data, error } = await supabase
      .from('rag_documents')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.documentId)
      .eq('user_id', params.userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error marking document verified:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapRowToDocument(data) };
  } catch (err) {
    console.error('Exception marking document verified:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to verify document' };
  }
}
