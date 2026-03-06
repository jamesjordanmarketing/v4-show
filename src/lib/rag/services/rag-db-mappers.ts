import type {
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
  RAGCitation,
  RAGDocumentType,
} from '@/types/rag';

// ============================================
// Document Mappers
// ============================================

export function mapRowToDocument(row: RAGDocumentRow): RAGDocument {
  return {
    id: row.id,
    workbaseId: row.workbase_id,
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
    contentHash: row.content_hash,
    documentType: row.document_type as RAGDocumentType | null,
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
    policyId: row.policy_id,
    ruleId: row.rule_id,
    parentFactId: row.parent_fact_id,
    subsection: row.subsection,
    factCategory: row.fact_category,
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
    workbaseId: row.workbase_id,
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
    userFeedback: (row.user_feedback as 'positive' | 'negative' | null) || null,
    feedbackAt: row.feedback_at,
    createdAt: row.created_at,
    queryScope: (row.query_scope === 'knowledge_base' ? 'workbase' : row.query_scope as 'document' | 'workbase') || 'document',
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
