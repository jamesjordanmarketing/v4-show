import type {
  DocumentUnderstanding,
  KnowledgeRefinement,
  ContextualPreambleResult,
  HyDEResult,
  SelfEvalResult,
  QualityEvaluation,
  RAGExpertQuestion,
  RAGSection,
  RAGCitation,
  // Multi-pass extraction types (Phase 1)
  StructureAnalysisResult,
  PolicyExtractionResult,
  TableExtractionResult,
  GlossaryExtractionResult,
  NarrativeExtractionResult,
  VerificationResult,
  FactExtraction,
  RAGDocumentType,
} from '@/types/rag';

// ============================================
// LLM Provider Interface
// ============================================
// Abstract interface for LLM operations.
// Phase 1: Claude implementation.
// Phase 2+: Gemini, self-hosted (Qwen, Llama) implementations.

export interface LLMProvider {
  /**
   * Read an entire document and generate structured understanding.
   * Returns summary, sections, entities, facts, taxonomy, ambiguities, and expert questions.
   */
  readDocument(params: {
    documentText: string;
    fileName: string;
    description?: string;
  }): Promise<DocumentUnderstanding>;

  /**
   * Generate a contextual preamble for a section.
   * Used for Contextual Retrieval — prepends context before embedding.
   */
  generateContextualPreamble(params: {
    documentSummary: string;
    sectionText: string;
    sectionTitle?: string;
  }): Promise<ContextualPreambleResult>;

  /**
   * Refine knowledge representation using expert answers.
   * Takes the original document understanding and expert Q&A answers,
   * returns updated sections, entities, and facts.
   */
  refineKnowledge(params: {
    documentText: string;
    currentSummary: string;
    questions: RAGExpertQuestion[];
    sections: RAGSection[];
  }): Promise<KnowledgeRefinement>;

  /**
   * Generate a hypothetical answer for HyDE retrieval.
   */
  generateHyDE(params: {
    queryText: string;
    documentSummary: string;
  }): Promise<HyDEResult>;

  /**
   * Self-evaluate whether the generated response is factually grounded in the retrieved context.
   * Detects hallucinations and assesses answer accuracy against the retrieved evidence.
   * Used for Corrective RAG / Self-RAG.
   */
  selfEvaluate(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    mode?: string;
  }): Promise<SelfEvalResult>;

  /**
   * Generate a response to a user query using retrieved context.
   */
  generateResponse(params: {
    queryText: string;
    assembledContext: string;
    systemPrompt: string;
  }): Promise<{ responseText: string; citations: RAGCitation[] }>;

  /**
   * Lightweight completion for tasks that need a raw text response without RAG formatting.
   * Used for reranking and other operations where generateResponse() would inject
   * the RAG citation template and conflict with the expected output format.
   */
  generateLightweightCompletion(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ responseText: string }>;

  /**
   * Evaluate response quality using Claude-as-Judge pattern.
   */
  evaluateQuality(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    citations: RAGCitation[];
  }): Promise<QualityEvaluation>;

  /**
   * Generate verification sample questions from a document.
   */
  generateVerificationQuestions(params: {
    documentSummary: string;
    sections: RAGSection[];
    count: number;
  }): Promise<string[]>;

  /**
   * Pass 1: Analyze document structure and classify document type.
   * Returns section map with line boundaries, tables, and document type classification.
   * Model: Sonnet 4.5
   */
  analyzeDocumentStructure(params: {
    documentText: string;
    fileName: string;
  }): Promise<StructureAnalysisResult>;

  /**
   * Pass 2: Extract policy rules, exceptions, limits, documents, escalations from a single section.
   * Model: Sonnet 4.5
   */
  extractPoliciesForSection(params: {
    sectionText: string;
    sectionTitle: string;
    policyId: string | null;
    documentType: RAGDocumentType;
  }): Promise<PolicyExtractionResult>;

  /**
   * Pass 3: Extract structured data from a single table region.
   * Model: Sonnet 4.5
   */
  extractTableData(params: {
    tableText: string;
    surroundingContext: string;
    documentType: RAGDocumentType;
  }): Promise<TableExtractionResult>;

  /**
   * Pass 4: Extract glossary definitions, entities, and cross-document relationships.
   * Model: Haiku
   */
  extractGlossaryAndRelationships(params: {
    documentText: string;
    existingSections: Array<{ title: string; policyId: string | null }>;
  }): Promise<GlossaryExtractionResult>;

  /**
   * Pass 5: Extract narrative/implicit facts from unstructured text sections.
   * Model: Sonnet 4.5
   */
  extractNarrativeFacts(params: {
    sectionText: string;
    sectionTitle: string;
    documentType: RAGDocumentType;
  }): Promise<NarrativeExtractionResult>;

  /**
   * Pass 6: Verify extraction completeness — find missed facts in a section.
   * Model: Opus 4.6
   */
  verifyExtractionCompleteness(params: {
    sectionText: string;
    sectionTitle: string;
    existingFacts: FactExtraction[];
    documentType: RAGDocumentType;
  }): Promise<VerificationResult>;
}
