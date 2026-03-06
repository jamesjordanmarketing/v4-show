// ============================================
// RAG Frontier Module - Type Definitions
// ============================================

// ============================================
// Status & Enum Types
// ============================================

export type RAGDocumentStatus =
  | 'uploading'
  | 'processing'
  | 'awaiting_questions'
  | 'ready'
  | 'error'
  | 'archived';

export type RAGDocumentFileType = 'pdf' | 'docx' | 'txt' | 'md';

export type RAGFactType =
  | 'fact'
  | 'entity'
  | 'definition'
  | 'relationship'
  | 'table_row'
  | 'policy_exception'
  | 'policy_rule'
  | 'limit'
  | 'threshold'
  | 'required_document'
  | 'escalation_path'
  | 'audit_field'
  | 'cross_reference'
  | 'narrative_fact';

export type RAGImpactLevel = 'high' | 'medium' | 'low';

export type RAGEmbeddingSourceType = 'document' | 'section' | 'fact';

export type RAGEmbeddingTier = 1 | 2 | 3;

export type RAGQueryMode = 'rag_only' | 'lora_only' | 'rag_and_lora';

export type RAGDocumentType = 'structured-policy' | 'tabular' | 'narrative' | 'mixed';

// ============================================
// Display Maps
// ============================================

export const RAG_STATUS_DISPLAY: Record<RAGDocumentStatus, string> = {
  uploading: 'Uploading...',
  processing: 'Processing...',
  awaiting_questions: 'Needs Expert Input',
  ready: 'Ready',
  error: 'Error',
  archived: 'Archived',
};

export const RAG_MODE_DISPLAY: Record<RAGQueryMode, string> = {
  rag_only: 'RAG Only',
  lora_only: 'LoRA Only',
  rag_and_lora: 'RAG + LoRA',
};

export const RAG_IMPACT_DISPLAY: Record<RAGImpactLevel, string> = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Nice to Have',
};

// ============================================
// Entity Interfaces
// ============================================

export interface RAGDocument {
  id: string;
  workbaseId: string;
  userId: string;
  fileName: string;
  fileType: RAGDocumentFileType;
  fileSizeBytes: number | null;
  filePath: string | null;
  storageBucket: string;
  originalText: string | null;
  description: string | null;
  status: RAGDocumentStatus;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  processingError: string | null;
  documentSummary: string | null;
  topicTaxonomy: string[];
  entityList: RAGEntityItem[];
  ambiguityList: string[];
  sectionCount: number;
  factCount: number;
  questionCount: number;
  totalTokensEstimated: number | null;
  fastMode: boolean;
  version: number;
  contentHash: string | null;
  documentType: RAGDocumentType | null;
  createdAt: string;
  updatedAt: string;
}

export interface RAGEntityItem {
  name: string;
  type: string;
  description: string;
}

export interface RAGSection {
  id: string;
  documentId: string;
  userId: string;
  sectionIndex: number;
  title: string | null;
  originalText: string;
  summary: string | null;
  contextualPreamble: string | null;
  sectionMetadata: Record<string, unknown>;
  tokenCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RAGFact {
  id: string;
  documentId: string;
  sectionId: string | null;
  userId: string;
  factType: RAGFactType;
  content: string;
  sourceText: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
  // Provenance fields (Phase 1)
  policyId: string | null;
  ruleId: string | null;
  parentFactId: string | null;
  subsection: string | null;
  factCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RAGExpertQuestion {
  id: string;
  documentId: string;
  userId: string;
  questionText: string;
  questionReason: string | null;
  impactLevel: RAGImpactLevel;
  sortOrder: number;
  answerText: string | null;
  answeredAt: string | null;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RAGEmbedding {
  id: string;
  documentId: string;
  userId: string;
  sourceType: RAGEmbeddingSourceType;
  sourceId: string;
  contentText: string;
  embeddingModel: string;
  tier: RAGEmbeddingTier;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RAGQuery {
  id: string;
  workbaseId: string;
  documentId: string | null;
  userId: string;
  queryText: string;
  hydeText: string | null;
  mode: RAGQueryMode;
  retrievedSectionIds: string[];
  retrievedFactIds: string[];
  assembledContext: string | null;
  responseText: string | null;
  citations: RAGCitation[];
  selfEvalPassed: boolean | null;
  selfEvalScore: number | null;
  responseTimeMs: number | null;
  userFeedback: 'positive' | 'negative' | null;
  feedbackAt: string | null;
  createdAt: string;
  queryScope: 'document' | 'workbase';  // tracks whether query was doc-level or workbase-level
}

export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
  documentId?: string;      // Source document ID for multi-doc provenance
  documentName?: string;    // Source document name for display
}

export interface RAGQualityScore {
  id: string;
  queryId: string;
  userId: string;
  faithfulnessScore: number | null;
  answerRelevanceScore: number | null;
  contextRelevanceScore: number | null;
  answerCompletenessScore: number | null;
  citationAccuracyScore: number | null;
  compositeScore: number | null;
  evaluationModel: string;
  evaluationDetails: Record<string, unknown>;
  evaluatedAt: string;
  createdAt: string;
}

// ============================================
// Request Types
// ============================================

export interface UploadDocumentRequest {
  workbaseId: string;
  fileName: string;
  fileType: RAGDocumentFileType;
  description?: string;
  fastMode?: boolean;
}

export interface ProcessDocumentRequest {
  documentId: string;
}

export interface AnswerQuestionRequest {
  questionId: string;
  answerText: string;
}

export interface SkipQuestionRequest {
  questionId: string;
}

export interface RAGQueryRequest {
  workbaseId: string;
  queryText: string;
  mode: RAGQueryMode;
  documentId?: string;
  modelJobId?: string;  // Job ID of the deployed LoRA model (required when mode is 'lora_only' or 'rag_and_lora')
}

export interface VerifyDocumentRequest {
  documentId: string;
  sampleCount?: number;
}

// ============================================
// Response Types
// ============================================

export interface RAGDocumentListResponse {
  success: boolean;
  data?: RAGDocument[];
  error?: string;
  count?: number;
}

export interface RAGDocumentResponse {
  success: boolean;
  data?: RAGDocument;
  error?: string;
}

export interface RAGQuestionsResponse {
  success: boolean;
  data?: RAGExpertQuestion[];
  error?: string;
}

export interface RAGQueryResponse {
  success: boolean;
  data?: {
    query: RAGQuery;
    qualityScore?: RAGQualityScore;
  };
  error?: string;
}

export interface RAGQualityDashboardResponse {
  success: boolean;
  data?: {
    averageComposite: number;
    averageFaithfulness: number;
    averageRelevance: number;
    averageCompleteness: number;
    averageContextRelevance: number;
    averageCitationAccuracy: number;
    totalQueries: number;
    modeBreakdown: Record<RAGQueryMode, { count: number; avgScore: number }>;
    recentScores: RAGQualityScore[];
  };
  error?: string;
}

export interface RAGVerificationResponse {
  success: boolean;
  data?: {
    samples: RAGVerificationSample[];
  };
  error?: string;
}

export interface RAGVerificationSample {
  question: string;
  answer: string;
  citations: RAGCitation[];
  qualityScore: number;
}

// ============================================
// LoRA Model Selection Types (for RAG integration)
// ============================================

export interface RAGDeployedModel {
  jobId: string;
  endpointType: 'adapted';
  baseModel: string;
  status: string;
  adapterPath: string | null;
  jobName: string | null;
  datasetName: string | null;
  createdAt: string;
}

// ============================================
// LLM Provider Types
// ============================================

export interface DocumentUnderstanding {
  summary: string;
  sections: SectionBreakdown[];
  entities: RAGEntityItem[];
  facts: FactExtraction[];
  topicTaxonomy: string[];
  ambiguities: string[];
  expertQuestions: ExpertQuestionGeneration[];
}

export interface SectionBreakdown {
  title: string;
  originalText: string;
  summary: string;
  tokenCount: number;
}

export interface FactExtraction {
  factType: RAGFactType;
  content: string;
  sourceText: string;
  confidence: number;
  // Provenance fields for multi-pass extraction
  policyId?: string;
  ruleId?: string;
  qualifiesRule?: string;   // For exceptions: which rule this qualifies
  factCategory?: string;
  subsection?: string;
}

export interface ExpertQuestionGeneration {
  questionText: string;
  questionReason: string;
  impactLevel: RAGImpactLevel;
}

// ============================================
// Multi-Pass Extraction Types (Phase 1)
// ============================================

export interface StructureAnalysisResult {
  summary: string;
  documentType: RAGDocumentType;
  sections: Array<{
    title: string;
    startLine: number;
    endLine: number;
    summary: string;
    policyId: string | null;
    isNarrative: boolean;
  }>;
  tables: Array<{
    startLine: number;
    endLine: number;
    nearestSection: string;
  }>;
  topicTaxonomy: string[];
  ambiguities: string[];
  expertQuestions: ExpertQuestionGeneration[];
}

export interface PolicyExtractionResult {
  policyId: string;
  rules: Array<{
    ruleId: string;
    content: string;
    conditions: string[];
    amounts: string[];
    timeframes: string[];
  }>;
  exceptions: Array<{
    exceptionId: string;
    content: string;
    qualifiesRule: string;
    conditions: string[];
  }>;
  limits: Array<{ name: string; value: string; unit: string; window: string }>;
  requiredDocuments: Array<{ scenario: string; documents: string[] }>;
  escalations: Array<{ trigger: string; levels: string[] }>;
  auditFields: Array<{ fieldName: string; description: string }>;
  relatedPolicies: Array<{ policyId: string; relationship: string }>;
  definitions: Array<{ term: string; definition: string }>;
}

export interface TableExtractionResult {
  tableName: string;
  tableContext: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface GlossaryExtractionResult {
  definitions: Array<{ term: string; definition: string; policyContext: string }>;
  entities: Array<{ name: string; type: string; description: string }>;
  relationships: Array<{ from: string; to: string; type: string; description: string }>;
}

export interface NarrativeExtractionResult {
  facts: FactExtraction[];
}

export interface VerificationResult {
  missingFacts: FactExtraction[];
  coverageEstimate: number;  // 0.0-1.0 estimated % of section content captured
}

export interface KnowledgeRefinement {
  updatedSections: {
    sectionIndex: number;
    updatedSummary: string;
  }[];
  updatedEntities: RAGEntityItem[];
  updatedFacts: FactExtraction[];
  refinementNotes: string;
}

export interface ContextualPreambleResult {
  sectionId: string;
  preamble: string;
}

export interface HyDEResult {
  hypotheticalAnswer: string;
}

export interface SelfEvalResult {
  passed: boolean;
  score: number;
  reasoning: string;
}

export interface QualityEvaluation {
  faithfulness: number;
  answerRelevance: number;
  contextRelevance: number;
  answerCompleteness: number;
  citationAccuracy: number;
  composite: number;
  details: Record<string, unknown>;
}

// ============================================
// Database Row Mapping Types (snake_case)
// ============================================

export interface RAGDocumentRow {
  id: string;
  workbase_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  file_path: string | null;
  storage_bucket: string;
  original_text: string | null;
  description: string | null;
  status: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_error: string | null;
  document_summary: string | null;
  topic_taxonomy: unknown;
  entity_list: unknown;
  ambiguity_list: unknown;
  section_count: number;
  fact_count: number;
  question_count: number;
  total_tokens_estimated: number | null;
  fast_mode: boolean;
  version: number;
  content_hash: string | null;
  document_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface RAGSectionRow {
  id: string;
  document_id: string;
  user_id: string;
  section_index: number;
  title: string | null;
  original_text: string;
  summary: string | null;
  contextual_preamble: string | null;
  section_metadata: unknown;
  token_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface RAGFactRow {
  id: string;
  document_id: string;
  section_id: string | null;
  user_id: string;
  fact_type: string;
  content: string;
  source_text: string | null;
  confidence: number;
  metadata: unknown;
  policy_id: string | null;
  rule_id: string | null;
  parent_fact_id: string | null;
  subsection: string | null;
  fact_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface RAGExpertQuestionRow {
  id: string;
  document_id: string;
  user_id: string;
  question_text: string;
  question_reason: string | null;
  impact_level: string;
  sort_order: number;
  answer_text: string | null;
  answered_at: string | null;
  skipped: boolean;
  created_at: string;
  updated_at: string;
}

export interface RAGQueryRow {
  id: string;
  workbase_id: string;
  document_id: string | null;
  user_id: string;
  query_text: string;
  hyde_text: string | null;
  mode: string;
  retrieved_section_ids: unknown;
  retrieved_fact_ids: unknown;
  assembled_context: string | null;
  response_text: string | null;
  citations: unknown;
  self_eval_passed: boolean | null;
  self_eval_score: number | null;
  response_time_ms: number | null;
  user_feedback: string | null;
  feedback_at: string | null;
  created_at: string;
  query_scope: string | null;  // NEW
}

export interface RAGQualityScoreRow {
  id: string;
  query_id: string;
  user_id: string;
  faithfulness_score: number | null;
  answer_relevance_score: number | null;
  context_relevance_score: number | null;
  answer_completeness_score: number | null;
  citation_accuracy_score: number | null;
  composite_score: number | null;
  evaluation_model: string;
  evaluation_details: unknown;
  evaluated_at: string;
  created_at: string;
}
