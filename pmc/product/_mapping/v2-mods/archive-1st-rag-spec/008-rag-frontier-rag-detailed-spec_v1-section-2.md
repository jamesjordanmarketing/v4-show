# Section 2: TypeScript Types & Provider Abstraction

**Spec Version:** 1.0
**Date:** February 9, 2026
**Parent Document:** `008-rag-frontier-rag-detailed-spec_v1-master.md`
**Section Scope:** FR-2.1, FR-2.2, FR-2.3

---

## Overview

This section defines the complete type system for the RAG module and the two provider abstraction layers (LLM + Embedding) that enable provider switching without code changes.

**What this section accomplishes:**
- All TypeScript types and interfaces for the RAG module (database row types, API types, service types)
- LLM Provider abstraction interface with Claude implementation (document understanding, evaluation, generation)
- Embedding Provider abstraction interface with OpenAI implementation (text-embedding-3-small, 1536 dimensions)
- Provider factory pattern matching the existing `INFERENCE_MODE=pods|serverless` convention

**User value delivered:**
- Type safety across the entire RAG module
- Ability to swap LLM providers (Claude now, Gemini later) with zero code changes in consumers
- Ability to swap embedding providers (OpenAI now, BGE-M3 self-hosted later) with zero code changes
- Production-ready prompts for document understanding, evaluation, and generation

**What already exists (reused):**
- `src/types/index.ts` — central export barrel (will add RAG types)
- `src/lib/ai-config.ts` — `AI_CONFIG` object with model names, API keys, retry config
- `@anthropic-ai/sdk` — installed Anthropic SDK
- Error handling patterns from `src/lib/services/claude-api-client.ts`

**What is being added (new):**
- `src/types/rag.ts` — all RAG type definitions
- `src/lib/providers/llm-provider.ts` — LLM provider interface
- `src/lib/providers/claude-llm-provider.ts` — Claude implementation
- `src/lib/providers/embedding-provider.ts` — Embedding provider interface
- `src/lib/providers/openai-embedding-provider.ts` — OpenAI implementation
- `src/lib/providers/index.ts` — provider factory

---

## Dependencies

**Codebase Prerequisites:**
- `src/types/index.ts` must exist (it does)
- `src/lib/ai-config.ts` must exist (it does)
- `@anthropic-ai/sdk` must be installed (it is)
- `openai` npm package must be installed (HUMAN ACTION 8 in master spec)

**Previous Section Prerequisites:**
- Section 1 (Database Foundation) must be completed — types reference database column names and table structures

---

## Features & Requirements

### FR-2.1: RAG TypeScript Types

**Type**: Data Model (TypeScript Interfaces)

**Description**: Complete type definitions for all RAG module data structures: database row types matching all 8 tables from Section 1, API request/response types, service-internal types, and provider configuration types.

**Implementation Strategy**: NEW build

---

**File**: `src/types/rag.ts`

```typescript
/**
 * RAG Module Types
 *
 * Complete type definitions for the Frontier RAG Creation System.
 * Covers database row types, API request/response types, service types,
 * and provider abstraction types.
 *
 * @module rag-types
 */

// ============================================
// Database Row Types (matching 8 rag_* tables)
// ============================================

// --- rag_knowledge_bases ---

export interface RagKnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  document_count: number;
  status: RagKnowledgeBaseStatus;
  created_at: string;
  updated_at: string;
}

export type RagKnowledgeBaseStatus = 'active' | 'archived';

// --- rag_documents ---

export interface RagDocument {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  file_name: string;
  file_type: RagDocumentFileType;
  file_path: string;
  file_size_bytes: number;
  description: string | null;
  status: RagDocumentStatus;
  raw_text: string | null;
  raw_text_length: number | null;
  document_summary: string | null;
  topic_taxonomy: string[] | null;
  entities: Record<string, unknown>[] | null;
  ambiguities: string[] | null;
  processing_error: string | null;
  fast_mode: boolean;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export type RagDocumentFileType = 'pdf' | 'docx' | 'txt' | 'md';

export type RagDocumentStatus =
  | 'pending'
  | 'extracting'
  | 'reading'
  | 'embedding'
  | 'awaiting_questions'
  | 'refining'
  | 'ready'
  | 'failed';

// --- rag_sections ---

export interface RagSection {
  id: string;
  document_id: string;
  section_order: number;
  title: string | null;
  content: string;
  content_length: number;
  contextual_preamble: string | null;
  section_summary: string | null;
  created_at: string;
}

// --- rag_facts ---

export interface RagFact {
  id: string;
  document_id: string;
  section_id: string | null;
  fact_text: string;
  fact_type: RagFactType;
  confidence: number;
  source_quote: string | null;
  created_at: string;
}

export type RagFactType =
  | 'factual'
  | 'definition'
  | 'relationship'
  | 'process'
  | 'rule'
  | 'opinion';

// --- rag_expert_questions ---

export interface RagExpertQuestion {
  id: string;
  document_id: string;
  question_text: string;
  question_context: string | null;
  impact_level: RagImpactLevel;
  question_order: number;
  answer_text: string | null;
  status: RagQuestionStatus;
  created_at: string;
  answered_at: string | null;
}

export type RagImpactLevel = 'high' | 'medium' | 'low';

export type RagQuestionStatus = 'pending' | 'answered' | 'skipped';

// --- rag_embeddings ---

export interface RagEmbedding {
  id: string;
  document_id: string;
  source_id: string;
  tier: RagEmbeddingTier;
  content_text: string;
  embedding: number[];
  embedding_model: string;
  embedding_dimensions: number;
  created_at: string;
}

export type RagEmbeddingTier = 'document' | 'section' | 'fact';

// --- rag_queries ---

export interface RagQuery {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  query_text: string;
  mode: RagQueryMode;
  response_text: string | null;
  citations: RagCitation[] | null;
  context_used: string | null;
  retrieval_tier_scores: Record<string, number> | null;
  hyde_query: string | null;
  self_rag_score: number | null;
  self_rag_passed: boolean | null;
  generation_time_ms: number | null;
  created_at: string;
}

export type RagQueryMode = 'rag_only' | 'lora_only' | 'rag_plus_lora';

export interface RagCitation {
  section_id: string;
  section_title: string | null;
  excerpt: string;
  relevance_score: number;
}

// --- rag_quality_scores ---

export interface RagQualityScore {
  id: string;
  query_id: string;
  faithfulness: number;
  relevance: number;
  completeness: number;
  coherence: number;
  citation_accuracy: number;
  composite_score: number;
  evaluation_reasoning: string | null;
  evaluator_model: string;
  created_at: string;
}

// ============================================
// API Request / Response Types
// ============================================

export interface CreateDocumentRequest {
  file_name: string;
  file_type: RagDocumentFileType;
  description?: string;
  fast_mode?: boolean;
}

export interface CreateDocumentResponse {
  document: RagDocument;
  uploadUrl: string;
}

export interface ProcessDocumentResponse {
  document: RagDocument;
}

export interface ExpertQuestionResponse {
  questions: RagExpertQuestion[];
}

export interface SubmitAnswersRequest {
  answers: ExpertAnswer[];
}

export interface ExpertAnswer {
  question_id: string;
  answer_text: string;
}

export interface VerificationSample {
  question: string;
  expected_answer: string;
  actual_answer: string;
  is_correct: boolean;
}

export interface VerificationResponse {
  samples: VerificationSample[];
  overall_accuracy: number;
}

export interface RAGQueryRequest {
  query_text: string;
  mode: RagQueryMode;
  knowledge_base_id: string;
}

export interface RAGQueryResponse {
  response_text: string;
  citations: RagCitation[];
  quality_score: QualityEvaluation | null;
  mode: RagQueryMode;
  generation_time_ms: number;
}

export interface QualityMetrics {
  total_queries: number;
  average_composite_score: number;
  average_faithfulness: number;
  average_relevance: number;
  average_completeness: number;
  average_coherence: number;
  average_citation_accuracy: number;
  score_trend: Array<{ date: string; composite_score: number }>;
  mode_comparison: {
    rag_only: { average_composite: number; query_count: number } | null;
    lora_only: { average_composite: number; query_count: number } | null;
    rag_plus_lora: { average_composite: number; query_count: number } | null;
  };
}

// ============================================
// Service Types (Internal)
// ============================================

/**
 * The structured output from an LLM reading an entire document.
 * This is the core knowledge representation that drives the rest of the pipeline.
 */
export interface DocumentUnderstanding {
  summary: string;
  sections: ExtractedSection[];
  facts: ExtractedFact[];
  entities: ExtractedEntity[];
  questions: ExtractedQuestion[];
  ambiguities: string[];
  topic_taxonomy: string[];
}

export interface ExtractedSection {
  title: string | null;
  content: string;
  summary: string;
  order: number;
}

export interface ExtractedFact {
  fact_text: string;
  fact_type: RagFactType;
  confidence: number;
  source_quote: string | null;
  section_order: number | null;
}

export interface ExtractedEntity {
  name: string;
  entity_type: string;
  description: string;
  related_entities: string[];
}

export interface ExtractedQuestion {
  question_text: string;
  question_context: string;
  impact_level: RagImpactLevel;
}

/**
 * A section with its contextual preamble prepended (Contextual Retrieval).
 * Used for embedding to preserve document-level context within section vectors.
 */
export interface SectionWithPreamble {
  section_id: string;
  section_title: string | null;
  section_content: string;
  contextual_preamble: string;
  combined_text: string;
}

/**
 * The result of a multi-tier retrieval operation.
 */
export interface RetrievalResult {
  sections: RetrievedSection[];
  facts: RetrievedFact[];
  combined_context: string;
  tier_scores: {
    document_score: number;
    section_scores: number[];
    fact_scores: number[];
  };
}

export interface RetrievedSection {
  section: RagSection;
  similarity_score: number;
}

export interface RetrievedFact {
  fact: RagFact;
  similarity_score: number;
}

/**
 * Self-RAG evaluation result: did the retrieval produce relevant context?
 */
export interface SelfRAGEvaluation {
  score: number;
  passed: boolean;
  reasoning: string;
}

/**
 * Quality evaluation across all 5 metrics (Claude-as-Judge output).
 */
export interface QualityEvaluation {
  faithfulness: number;
  relevance: number;
  completeness: number;
  coherence: number;
  citation_accuracy: number;
  composite_score: number;
  reasoning: string;
}

// ============================================
// Provider Types
// ============================================

/**
 * LLM Provider interface.
 * Abstracts the LLM used for document understanding, evaluation, and generation.
 * Implementations: ClaudeLLMProvider (Phase 1), GeminiLLMProvider (Phase 2+)
 */
export interface LLMProvider {
  readDocument(text: string, description?: string): Promise<DocumentUnderstanding>;
  generateExpertQuestions(text: string, understanding: DocumentUnderstanding): Promise<ExtractedQuestion[]>;
  refineKnowledge(text: string, understanding: DocumentUnderstanding, answers: ExpertAnswer[]): Promise<DocumentUnderstanding>;
  generateContextualPreamble(documentSummary: string, sectionText: string): Promise<string>;
  generateHypotheticalAnswer(query: string): Promise<string>;
  evaluateRetrieval(query: string, context: string): Promise<SelfRAGEvaluation>;
  evaluateQuality(query: string, context: string, response: string): Promise<QualityEvaluation>;
  generateResponse(query: string, context: string, systemPrompt?: string): Promise<string>;
  generateVerificationSamples(understanding: DocumentUnderstanding): Promise<VerificationSample[]>;
}

/**
 * Embedding Provider interface.
 * Abstracts the embedding model used for vector generation.
 * Implementations: OpenAIEmbeddingProvider (Phase 1), BGEEmbeddingProvider (Phase 2+)
 */
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModelName(): string;
}

/**
 * Configuration for LLM provider instantiation.
 */
export interface LLMProviderConfig {
  provider: 'claude';  // TODO: Phase 2 — add 'gemini'
  apiKey: string;
  primaryModel: string;
  fastModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

/**
 * Configuration for Embedding provider instantiation.
 */
export interface EmbeddingProviderConfig {
  provider: 'openai';  // TODO: Phase 2 — add 'bge'
  apiKey: string;
  model: string;
  dimensions: number;
  maxTokensPerText: number;
  batchSize: number;
}

// ============================================
// Quality Constants
// ============================================

export const RAG_QUALITY_WEIGHTS = {
  faithfulness: 0.25,
  relevance: 0.25,
  completeness: 0.20,
  coherence: 0.15,
  citation_accuracy: 0.15,
} as const;

export function computeCompositeScore(evaluation: Omit<QualityEvaluation, 'composite_score' | 'reasoning'>): number {
  const score =
    RAG_QUALITY_WEIGHTS.faithfulness * evaluation.faithfulness +
    RAG_QUALITY_WEIGHTS.relevance * evaluation.relevance +
    RAG_QUALITY_WEIGHTS.completeness * evaluation.completeness +
    RAG_QUALITY_WEIGHTS.coherence * evaluation.coherence +
    RAG_QUALITY_WEIGHTS.citation_accuracy * evaluation.citation_accuracy;
  return Math.round(score * 100) / 100;
}

// ============================================
// Document Status Display Labels
// ============================================

export const DOCUMENT_STATUS_DISPLAY: Record<RagDocumentStatus, string> = {
  pending: 'Pending',
  extracting: 'Extracting Text',
  reading: 'Reading Document',
  embedding: 'Generating Embeddings',
  awaiting_questions: 'Ready for Expert Q&A',
  refining: 'Refining Knowledge',
  ready: 'Ready',
  failed: 'Failed',
};

export const QUERY_MODE_DISPLAY: Record<RagQueryMode, string> = {
  rag_only: 'RAG Only',
  lora_only: 'LoRA Only',
  rag_plus_lora: 'RAG + LoRA',
};
```

**Pattern Source**: Type organization follows `src/types/pipeline.ts` (status unions, display label records, PascalCase interfaces). Database row types follow column naming from Section 1 migration SQL. Composite score function follows `computeRQS()` pattern in `src/types/conversation.ts`.

---

**Update the central type export barrel to include RAG types.**

**File**: `src/types/index.ts`

Add the following line at the end of the existing exports:

```typescript
// RAG module types
export * from './rag';
```

**Pattern Source**: Follows existing re-export pattern in `src/types/index.ts`.

---

**Acceptance Criteria (FR-2.1):**

1. `src/types/rag.ts` exports all 8 database row types matching the column names and types from Section 1 tables
2. All status fields use string union types (not enums)
3. All API request/response types are exported
4. All service-internal types (DocumentUnderstanding, RetrievalResult, etc.) are exported
5. Provider interfaces (LLMProvider, EmbeddingProvider) and config types are exported
6. Quality weight constants and composite score function are exported
7. `src/types/index.ts` re-exports all RAG types
8. No TypeScript compilation errors

**Verification Steps (FR-2.1):**

1. Run `npx tsc --noEmit` from `src/` directory — no errors related to `types/rag.ts`
2. Import `RagDocument` from `@/types` in a test file — resolves correctly
3. Import `LLMProvider` from `@/types` in a test file — resolves correctly
4. Verify `computeCompositeScore({ faithfulness: 1, relevance: 1, completeness: 1, coherence: 1, citation_accuracy: 1 })` returns `1.0`

---

### FR-2.2: LLM Provider Abstraction

**Type**: Service (Provider Interface + Implementation)

**Description**: Abstraction layer for LLM operations used throughout the RAG pipeline. The interface defines 9 methods covering the complete LLM usage surface: document reading, question generation, knowledge refinement, contextual preamble generation, HyDE, Self-RAG evaluation, quality evaluation, response generation, and verification sample generation. The Claude implementation uses `claude-sonnet-4-5-20250929` for document understanding tasks and `claude-3-haiku-20240307` for fast evaluation/utility tasks. Each method contains carefully crafted prompts that are critical to RAG quality.

**Implementation Strategy**: NEW build

---

**File**: `src/lib/providers/llm-provider.ts`

```typescript
/**
 * LLM Provider Interface
 *
 * Abstraction layer for all LLM operations in the RAG pipeline.
 * Implementations handle the specific API calls and prompt formatting.
 *
 * Currently implemented:
 * - ClaudeLLMProvider (claude-sonnet-4-5-20250929 + claude-3-haiku-20240307)
 *
 * TODO: Phase 2 — GeminiLLMProvider for 1M+ context documents
 *
 * @module llm-provider
 */

import type {
  LLMProvider,
  LLMProviderConfig,
} from '@/types/rag';

export type { LLMProvider, LLMProviderConfig };
```

**Pattern Source**: Interface re-export follows the separation of interface definition (in types) from implementation (in providers), consistent with how `InferenceEndpoint` is defined in `src/types/pipeline-adapter.ts` and used in `src/lib/services/inference-service.ts`.

---

**File**: `src/lib/providers/claude-llm-provider.ts`

```typescript
/**
 * Claude LLM Provider
 *
 * Implementation of LLMProvider using the Anthropic Claude API.
 * Uses claude-sonnet-4-5-20250929 for document understanding (complex reasoning, large context)
 * and claude-3-haiku-20240307 for evaluation and utility tasks (fast, cheap).
 *
 * All prompts in this file are production-ready and critical to RAG quality.
 * Changes to prompts should be tested against the quality evaluation pipeline.
 *
 * @module claude-llm-provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import type {
  LLMProvider,
  LLMProviderConfig,
  DocumentUnderstanding,
  ExtractedQuestion,
  ExpertAnswer,
  SelfRAGEvaluation,
  QualityEvaluation,
  VerificationSample,
} from '@/types/rag';

// ============================================
// Model Constants
// ============================================

const SONNET_MODEL = 'claude-sonnet-4-5-20250929';
const HAIKU_MODEL = 'claude-3-haiku-20240307';

// ============================================
// Claude LLM Provider Implementation
// ============================================

export class ClaudeLLMProvider implements LLMProvider {
  private client: Anthropic;
  private config: LLMProviderConfig;

  constructor(config?: Partial<LLMProviderConfig>) {
    this.config = {
      provider: 'claude',
      apiKey: config?.apiKey || AI_CONFIG.apiKey,
      primaryModel: config?.primaryModel || SONNET_MODEL,
      fastModel: config?.fastModel || HAIKU_MODEL,
      maxTokens: config?.maxTokens || 16384,
      temperature: config?.temperature ?? 0.2,
      timeout: config?.timeout || AI_CONFIG.timeout,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  // ============================================
  // 1. readDocument — Full document understanding
  // ============================================

  async readDocument(text: string, description?: string): Promise<DocumentUnderstanding> {
    const systemPrompt = `You are a senior knowledge engineer specializing in document analysis and knowledge extraction. Your task is to deeply understand a document and produce a structured knowledge representation that will be used to build a high-quality retrieval-augmented generation (RAG) system.

You must be thorough, precise, and systematic. The quality of your analysis directly determines how well the RAG system can answer questions about this document. Every piece of information you extract will be stored, embedded, and used for retrieval.

CRITICAL RULES:
- Extract ALL significant information — do not summarize away important details
- Preserve technical terminology exactly as written in the document
- When the document is ambiguous, note the ambiguity rather than guessing
- Section boundaries should follow the document's natural structure (chapters, headings, topic shifts)
- Facts must be atomic (one fact per entry) and self-contained (understandable without additional context)
- Entity descriptions should be sufficient for someone unfamiliar with the domain
- Questions should target information that would significantly improve the system's ability to answer user queries
- The topic taxonomy should range from broad categories to specific subtopics

OUTPUT FORMAT: You MUST respond with a single valid JSON object matching the schema below. Do not include any text before or after the JSON.

{
  "summary": "A comprehensive 500-1000 word summary of the document. Cover the document's purpose, key themes, main arguments or instructions, target audience, and scope. This summary will be embedded as the document-level vector for routing queries to the right document.",

  "sections": [
    {
      "title": "Section title (null if untitled)",
      "content": "The full text content of this section. Preserve all detail. Do not truncate.",
      "summary": "A 100-200 word summary of this section that captures its key points. This summary will be embedded for section-level retrieval.",
      "order": 1
    }
  ],

  "facts": [
    {
      "fact_text": "A single atomic factual statement extracted from the document. Must be self-contained and understandable without surrounding context.",
      "fact_type": "factual | definition | relationship | process | rule | opinion",
      "confidence": 0.95,
      "source_quote": "The exact quote from the document that supports this fact, or null if the fact is synthesized from multiple passages.",
      "section_order": 1
    }
  ],

  "entities": [
    {
      "name": "Entity name exactly as it appears in the document",
      "entity_type": "person | organization | product | concept | process | location | acronym | technical_term",
      "description": "A clear, concise description of this entity and its role in the document. Include enough context that someone unfamiliar with the domain can understand it.",
      "related_entities": ["Names of other entities this one is connected to"]
    }
  ],

  "questions": [
    {
      "question_text": "A targeted question that, if answered by a domain expert, would significantly improve the system's understanding of the document. Frame the question so a non-technical domain expert can answer it naturally.",
      "question_context": "Explain WHY this question matters — what ambiguity or gap does it address? What would the system get wrong without this answer? This context will be shown to the expert alongside the question.",
      "impact_level": "high | medium | low"
    }
  ],

  "ambiguities": [
    "A description of something in the document that is unclear, contradictory, or depends on context not provided in the document. Each entry should describe the ambiguity and where it occurs."
  ],

  "topic_taxonomy": [
    "Broad topic category",
    "Broad topic > Subtopic",
    "Broad topic > Subtopic > Specific topic"
  ]
}`;

    const descriptionContext = description
      ? `\n\nThe user described this document as: "${description}"`
      : '';

    const userPrompt = `Analyze the following document and produce the structured knowledge representation as specified.${descriptionContext}

<document>
${text}
</document>

Remember: respond with ONLY the JSON object. No other text.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.primaryModel,
      this.config.maxTokens,
      0.2
    );

    return this.parseJSON<DocumentUnderstanding>(response, 'readDocument');
  }

  // ============================================
  // 2. generateExpertQuestions — Targeted Q&A
  // ============================================

  async generateExpertQuestions(
    text: string,
    understanding: DocumentUnderstanding
  ): Promise<ExtractedQuestion[]> {
    const systemPrompt = `You are an expert knowledge engineer preparing targeted questions for a domain expert. You have already analyzed a document and produced an initial understanding. Now you must generate questions that will fill the most critical gaps in that understanding.

YOUR GOAL: Generate 3-8 questions that, when answered by the person who uploaded this document, will most significantly improve the RAG system's ability to accurately answer user queries about this document.

QUESTION DESIGN PRINCIPLES:
1. TARGET IMPLICIT KNOWLEDGE: Ask about things the document assumes the reader already knows. Domain experts often don't realize what they haven't written down.
2. RESOLVE AMBIGUITY: When a term, process, or reference could mean multiple things, ask for clarification.
3. FILL GAPS: When the document references something without explaining it, ask for the explanation.
4. VALIDATE ASSUMPTIONS: When the document makes statements that might be outdated or context-dependent, ask whether they still hold.
5. CONNECT DOTS: When relationships between concepts are implied but not stated, ask the expert to make them explicit.

QUESTION QUALITY RULES:
- Questions must be answerable by a non-technical domain expert in 1-3 sentences
- Each question must include context explaining WHY you're asking (shown to the expert)
- Rank questions from highest to lowest impact on system accuracy
- Maximum 8 questions total — respect the expert's time
- Do NOT ask questions that can be answered by re-reading the document more carefully
- Do NOT ask yes/no questions — ask for explanations, definitions, or clarifications

OUTPUT FORMAT: Respond with a JSON array of question objects. No other text.

[
  {
    "question_text": "The question to ask the expert. Phrased naturally and clearly.",
    "question_context": "Why this question matters. What gap does it fill? What could go wrong without the answer? This is shown to the expert to motivate their response.",
    "impact_level": "high | medium | low"
  }
]`;

    const userPrompt = `Based on the following document and your initial understanding of it, generate targeted questions for the domain expert.

<document_summary>
${understanding.summary}
</document_summary>

<identified_ambiguities>
${understanding.ambiguities.map((a, i) => `${i + 1}. ${a}`).join('\n')}
</identified_ambiguities>

<identified_entities>
${understanding.entities.map(e => `- ${e.name} (${e.entity_type}): ${e.description}`).join('\n')}
</identified_entities>

<initial_questions_from_reading>
${understanding.questions.map((q, i) => `${i + 1}. [${q.impact_level}] ${q.question_text}`).join('\n')}
</initial_questions_from_reading>

<full_document>
${text}
</full_document>

Generate 3-8 targeted questions. Respond with ONLY the JSON array.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.primaryModel,
      4096,
      0.3
    );

    return this.parseJSON<ExtractedQuestion[]>(response, 'generateExpertQuestions');
  }

  // ============================================
  // 3. refineKnowledge — Integrate expert answers
  // ============================================

  async refineKnowledge(
    text: string,
    understanding: DocumentUnderstanding,
    answers: ExpertAnswer[]
  ): Promise<DocumentUnderstanding> {
    const systemPrompt = `You are a senior knowledge engineer refining a document's knowledge representation based on expert answers. You previously analyzed a document and generated questions. A domain expert has now answered some of those questions. Your task is to integrate their answers into the knowledge representation.

REFINEMENT RULES:
1. INTEGRATE ANSWERS NATURALLY: Update the summary, section summaries, entity descriptions, and facts to incorporate the expert's clarifications. The answer content should feel like it was always part of the document's knowledge.
2. RESOLVE AMBIGUITIES: If an expert's answer resolves an ambiguity, remove that ambiguity from the list and update all affected sections and facts.
3. ADD NEW FACTS: If an expert's answer reveals new factual information not in the original document, add it as new facts with fact_type "factual" and confidence 0.9.
4. UPDATE ENTITIES: If an expert's answer provides better descriptions of entities or reveals new relationships, update the entity entries.
5. REGENERATE QUESTIONS: After integrating answers, identify any NEW questions that arise. These should be fewer and more specific than the original questions.
6. PRESERVE EXISTING QUALITY: Do not remove or weaken existing knowledge. Only add, clarify, or correct.

OUTPUT FORMAT: Respond with the complete updated DocumentUnderstanding JSON object (same schema as the original). Include ALL sections, facts, and entities — not just the ones that changed. The output replaces the previous understanding entirely.`;

    const answersFormatted = answers
      .map(a => `Question ID: ${a.question_id}\nAnswer: ${a.answer_text}`)
      .join('\n\n');

    const userPrompt = `Here is the current knowledge representation, the original document, and the expert's answers. Produce the refined knowledge representation.

<current_understanding>
${JSON.stringify(understanding, null, 2)}
</current_understanding>

<expert_answers>
${answersFormatted}
</expert_answers>

<original_document>
${text}
</original_document>

Respond with ONLY the complete updated JSON object.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.primaryModel,
      this.config.maxTokens,
      0.2
    );

    return this.parseJSON<DocumentUnderstanding>(response, 'refineKnowledge');
  }

  // ============================================
  // 4. generateContextualPreamble — Contextual Retrieval
  // ============================================

  async generateContextualPreamble(
    documentSummary: string,
    sectionText: string
  ): Promise<string> {
    const systemPrompt = `You are producing a short contextual preamble for a document section. This preamble will be prepended to the section's text before it is embedded as a vector. The purpose is to give the embedding model document-level context so it can produce a more accurate vector representation.

RULES:
- The preamble must be 1-3 sentences (50-100 words maximum)
- It must situate the section within the broader document: what document is this from, what is this section about, and how does it relate to the document's overall purpose
- It must NOT repeat the section content — only provide context
- It must be factual and grounded in the document summary provided
- Write in third person, past tense or present tense as appropriate
- Do NOT use phrases like "This section" or "The following text" — instead describe the content directly

EXAMPLE:
Document: Company employee handbook
Section: Discusses parental leave policies
Preamble: "From Acme Corp's 2024 employee handbook, covering the company's parental leave benefits including eligibility requirements, duration, and pay continuation policies for both birthing and non-birthing parents."`;

    const userPrompt = `Generate a contextual preamble for this section.

<document_summary>
${documentSummary}
</document_summary>

<section_text>
${sectionText.substring(0, 2000)}
</section_text>

Respond with ONLY the preamble text. No quotes, no labels, no JSON.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.fastModel,
      256,
      0.1
    );

    return response.trim();
  }

  // ============================================
  // 5. generateHypotheticalAnswer — HyDE
  // ============================================

  async generateHypotheticalAnswer(query: string): Promise<string> {
    const systemPrompt = `You are generating a hypothetical answer to a user's question. This hypothetical answer will be used to search for real document sections that contain the actual answer (a technique called HyDE — Hypothetical Document Embeddings).

RULES:
- Write a plausible, detailed answer as if you were a knowledgeable document answering the question
- Use formal, document-like language (not conversational)
- Include specific details, terminology, and structure that a real document answer would contain
- The answer should be 100-200 words
- Do NOT hedge or say "I don't know" — write confidently even though this is hypothetical
- Do NOT include citations or source references
- The purpose is to generate text whose embedding will be close to the embedding of the real answer in vector space

EXAMPLE:
Query: "What is the company's vacation policy?"
Hypothetical answer: "Employees are entitled to paid vacation leave based on their length of service. During the first year of employment, employees accrue 10 days of paid vacation. After completing one year, the accrual rate increases to 15 days per year. Senior employees with five or more years of service receive 20 days annually. Vacation requests must be submitted at least two weeks in advance through the HR portal and are subject to manager approval. Unused vacation days may be carried over to the following year, up to a maximum of 5 days. Vacation pay is calculated at the employee's regular hourly or salaried rate."`;

    const userPrompt = `Generate a hypothetical document-style answer to this question:

"${query}"

Respond with ONLY the hypothetical answer text. No labels, no quotes, no JSON.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.fastModel,
      512,
      0.4
    );

    return response.trim();
  }

  // ============================================
  // 6. evaluateRetrieval — Self-RAG
  // ============================================

  async evaluateRetrieval(query: string, context: string): Promise<SelfRAGEvaluation> {
    const systemPrompt = `You are a retrieval quality evaluator for a RAG system. Your job is to determine whether the retrieved context is relevant and sufficient to answer the user's query.

EVALUATION CRITERIA:
1. RELEVANCE: Does the retrieved context contain information related to the query? (0-1 scale)
2. SUFFICIENCY: Does the retrieved context contain ENOUGH information to fully answer the query? (0-1 scale)
3. DIRECTNESS: Does the context directly address the query, or only tangentially? (0-1 scale)

SCORING:
- Combine the three criteria into a single score from 0.0 to 1.0
- Score >= 0.6 means the retrieval PASSED (sufficient to generate a response)
- Score < 0.6 means the retrieval FAILED (need to re-query or acknowledge the gap)

IMPORTANT: Be strict. A retrieval that is only tangentially related should score below 0.6. The user is better served by a "I don't have enough information" response than by a hallucinated answer based on irrelevant context.

OUTPUT FORMAT: Respond with a JSON object. No other text.

{
  "score": 0.85,
  "passed": true,
  "reasoning": "Brief explanation of why the retrieval scored as it did. Reference specific parts of the context that are relevant or missing."
}`;

    const userPrompt = `Evaluate whether this retrieved context is sufficient to answer the query.

<query>
${query}
</query>

<retrieved_context>
${context}
</retrieved_context>

Respond with ONLY the JSON object.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.fastModel,
      512,
      0.1
    );

    return this.parseJSON<SelfRAGEvaluation>(response, 'evaluateRetrieval');
  }

  // ============================================
  // 7. evaluateQuality — Claude-as-Judge (5 metrics)
  // ============================================

  async evaluateQuality(
    query: string,
    context: string,
    response: string
  ): Promise<QualityEvaluation> {
    const systemPrompt = `You are a quality evaluator for a RAG (Retrieval-Augmented Generation) system. You will evaluate a generated response across 5 quality dimensions. You have access to the original query, the retrieved context used to generate the response, and the response itself.

EVALUATION DIMENSIONS (each scored 0.0 to 1.0):

1. FAITHFULNESS (weight: 25%)
   Does the response only contain information that is supported by the retrieved context?
   - 1.0: Every claim in the response is directly supported by the context
   - 0.7: Most claims are supported, minor inferences that are reasonable
   - 0.4: Some claims lack support, but no direct contradictions
   - 0.1: Contains fabricated information or contradicts the context
   - 0.0: Entirely hallucinated, no basis in the context

2. RELEVANCE (weight: 25%)
   Does the response actually answer the question that was asked?
   - 1.0: Directly and completely answers the question
   - 0.7: Answers the main question but misses nuances
   - 0.4: Partially addresses the question, significant gaps
   - 0.1: Tangentially related but does not answer the question
   - 0.0: Completely irrelevant to the question

3. COMPLETENESS (weight: 20%)
   Does the response include all the important information from the context that is relevant to the query?
   - 1.0: Includes all relevant information from the context
   - 0.7: Includes most relevant information, minor omissions
   - 0.4: Misses significant relevant information
   - 0.1: Only captures a small fraction of relevant information
   - 0.0: Empty or trivially incomplete

4. COHERENCE (weight: 15%)
   Is the response well-organized, logically structured, and easy to understand?
   - 1.0: Excellent structure, clear logical flow, easy to follow
   - 0.7: Good structure, minor organizational issues
   - 0.4: Understandable but poorly organized
   - 0.1: Confusing, contradictory, or difficult to follow
   - 0.0: Incoherent

5. CITATION ACCURACY (weight: 15%)
   If the response references or cites source material, are those references accurate?
   - 1.0: All citations are accurate and properly attributed
   - 0.7: Most citations are accurate, minor misattributions
   - 0.4: Some citations are incorrect or misleading
   - 0.1: Citations are mostly wrong
   - 0.0: No citations when they were needed, or entirely fabricated citations
   - Note: If no citations are present and none were needed, score 0.8

SCORING RULES:
- Be objective and consistent
- Use the full range of the scale, not just the anchors
- Provide specific evidence for each score
- The composite score is the weighted average: (faithfulness * 0.25) + (relevance * 0.25) + (completeness * 0.20) + (coherence * 0.15) + (citation_accuracy * 0.15)

OUTPUT FORMAT: Respond with a JSON object. No other text.

{
  "faithfulness": 0.85,
  "relevance": 0.90,
  "completeness": 0.75,
  "coherence": 0.80,
  "citation_accuracy": 0.70,
  "composite_score": 0.81,
  "reasoning": "Detailed reasoning covering each dimension. Reference specific parts of the response and context. Explain why each score was given. 2-4 sentences per dimension."
}`;

    const userPrompt = `Evaluate the quality of this RAG response.

<query>
${query}
</query>

<retrieved_context>
${context}
</retrieved_context>

<generated_response>
${response}
</generated_response>

Respond with ONLY the JSON object.`;

    const result = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.fastModel,
      1024,
      0.1
    );

    return this.parseJSON<QualityEvaluation>(result, 'evaluateQuality');
  }

  // ============================================
  // 8. generateResponse — RAG response generation
  // ============================================

  async generateResponse(
    query: string,
    context: string,
    systemPrompt?: string
  ): Promise<string> {
    const defaultSystemPrompt = `You are a knowledgeable assistant that answers questions based strictly on the provided context. Your role is to help users understand the information in their documents.

RESPONSE RULES:
1. GROUND EVERY CLAIM: Only make statements that are directly supported by the provided context. If the context does not contain enough information to fully answer the question, say so explicitly rather than guessing.
2. CITE SOURCES: When referencing specific information from the context, indicate which section it comes from using [Section: title] markers.
3. BE COMPLETE: Include all relevant information from the context that addresses the query. Do not omit important details to be brief.
4. BE CLEAR: Structure your response logically. Use bullet points or numbered lists when listing multiple items. Lead with the most important information.
5. ACKNOWLEDGE LIMITS: If the provided context only partially addresses the question, answer what you can and clearly state what information is missing.
6. DO NOT HALLUCINATE: Never invent information, statistics, dates, or facts that are not in the context. If you are uncertain, say "Based on the available information..." rather than stating uncertain information as fact.
7. TONE: Professional, clear, and helpful. Match the formality level of the source documents.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    const userPrompt = `Answer the following question using ONLY the provided context.

<context>
${context}
</context>

<question>
${query}
</question>`;

    const response = await this.callClaude(
      finalSystemPrompt,
      userPrompt,
      this.config.primaryModel,
      4096,
      0.3
    );

    return response.trim();
  }

  // ============================================
  // 9. generateVerificationSamples
  // ============================================

  async generateVerificationSamples(
    understanding: DocumentUnderstanding
  ): Promise<VerificationSample[]> {
    const systemPrompt = `You are generating verification samples for a RAG system. These samples will be shown to a domain expert to verify that the system has correctly understood their document. Each sample consists of a question, the expected answer (based on the document understanding), and a flag for whether the expert confirmed correctness.

SAMPLE DESIGN RULES:
1. Generate exactly 3 verification samples
2. Each sample should test a DIFFERENT aspect of the document:
   - Sample 1: A factual question about specific details (tests fact extraction accuracy)
   - Sample 2: A question about a process, procedure, or relationship (tests structural understanding)
   - Sample 3: A question that requires synthesizing information from multiple sections (tests holistic understanding)
3. Questions should be the kind a real user would ask about this document
4. Expected answers should be 2-4 sentences, grounded in the document understanding
5. The "actual_answer" field should contain the answer the RAG system would generate — for verification purposes, set it equal to the expected_answer (it will be replaced by the actual system response during verification)
6. Set is_correct to true by default (the expert will change it if wrong)

OUTPUT FORMAT: Respond with a JSON array of exactly 3 verification sample objects. No other text.

[
  {
    "question": "A natural question a user would ask about this document",
    "expected_answer": "The correct answer based on the document understanding, 2-4 sentences",
    "actual_answer": "Same as expected_answer (placeholder until real system generates it)",
    "is_correct": true
  }
]`;

    const userPrompt = `Generate 3 verification samples based on this document understanding.

<document_summary>
${understanding.summary}
</document_summary>

<key_facts>
${understanding.facts.slice(0, 20).map((f, i) => `${i + 1}. [${f.fact_type}] ${f.fact_text}`).join('\n')}
</key_facts>

<topic_taxonomy>
${understanding.topic_taxonomy.join('\n')}
</topic_taxonomy>

<sections>
${understanding.sections.map(s => `- ${s.title || 'Untitled'}: ${s.summary}`).join('\n')}
</sections>

Respond with ONLY the JSON array.`;

    const response = await this.callClaude(
      systemPrompt,
      userPrompt,
      this.config.fastModel,
      2048,
      0.3
    );

    return this.parseJSON<VerificationSample[]>(response, 'generateVerificationSamples');
  }

  // ============================================
  // Internal Utilities
  // ============================================

  /**
   * Call Claude API with the given prompts and parameters.
   * Handles error classification and logging.
   */
  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const requestId = `rag_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log(`[ClaudeLLMProvider:${requestId}] Calling ${model} (max_tokens: ${maxTokens})`);

    try {
      const message = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract text content
      const content = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      console.log(
        `[ClaudeLLMProvider:${requestId}] Response received. ` +
        `stop_reason: ${message.stop_reason}, ` +
        `input_tokens: ${message.usage.input_tokens}, ` +
        `output_tokens: ${message.usage.output_tokens}`
      );

      if (message.stop_reason === 'max_tokens') {
        console.warn(
          `[ClaudeLLMProvider:${requestId}] Response truncated due to max_tokens. ` +
          `output_tokens: ${message.usage.output_tokens}, max_tokens: ${maxTokens}. ` +
          `Consider increasing maxTokens for this operation.`
        );
      }

      return content;
    } catch (error) {
      const err = error as Error & { status?: number; error?: { type?: string } };

      console.error(
        `[ClaudeLLMProvider:${requestId}] API error: ${err.message}`,
        {
          status: err.status,
          type: err.error?.type,
          model,
        }
      );

      // Classify error for upstream handling
      if (err.status === 429) {
        throw new Error(`Rate limited by Claude API. Please retry after a brief delay. (${requestId})`);
      }
      if (err.status === 529 || err.status === 503) {
        throw new Error(`Claude API is temporarily overloaded. Please retry. (${requestId})`);
      }
      if (err.status === 400) {
        throw new Error(`Invalid request to Claude API: ${err.message} (${requestId})`);
      }

      throw new Error(`Claude API call failed: ${err.message} (${requestId})`);
    }
  }

  /**
   * Parse a JSON response from Claude, handling common issues:
   * - Markdown code fences (```json ... ```)
   * - Leading/trailing whitespace
   * - Common JSON formatting errors
   */
  private parseJSON<T>(response: string, methodName: string): T {
    let cleaned = response.trim();

    // Remove markdown code fences if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch (parseError) {
      console.error(
        `[ClaudeLLMProvider:${methodName}] Failed to parse JSON response. ` +
        `First 500 chars: ${cleaned.substring(0, 500)}`
      );

      // Attempt to find JSON within the response (Claude sometimes adds commentary)
      const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          // Fall through to error
        }
      }

      throw new Error(
        `Failed to parse ${methodName} response as JSON. ` +
        `The LLM did not return valid JSON. First 200 chars: ${cleaned.substring(0, 200)}`
      );
    }
  }
}
```

**Pattern Source**: The class-based provider pattern follows `ClaudeAPIClient` in `src/lib/services/claude-api-client.ts`. Error classification (429, 503, 400) mirrors the existing `handleAPIError` method. Logging format (`[ClassName:requestId]`) follows the `[INFERENCE-SERVICE]` logging convention. The `AI_CONFIG` import and usage matches all existing service files.

---

**Acceptance Criteria (FR-2.2):**

1. `ClaudeLLMProvider` implements all 9 methods of the `LLMProvider` interface
2. `readDocument` uses `claude-sonnet-4-5-20250929` (Sonnet) for complex document understanding
3. `evaluateRetrieval`, `evaluateQuality`, `generateContextualPreamble`, `generateHypotheticalAnswer`, and `generateVerificationSamples` use `claude-3-haiku-20240307` (Haiku) for fast/cheap tasks
4. `generateResponse` uses Sonnet for quality generation
5. All methods include complete, production-ready system prompts (not placeholders)
6. All methods that expect JSON output include proper JSON parsing with markdown fence handling
7. Error handling classifies 429 (rate limit), 503/529 (overload), and 400 (bad request) errors
8. All API calls include logging with request IDs
9. Truncation warnings are logged when `stop_reason === 'max_tokens'`

**Verification Steps (FR-2.2):**

1. Instantiate `new ClaudeLLMProvider()` with no args — uses default config from `AI_CONFIG`
2. Call `readDocument("Test content about vacation policies.")` — returns a valid `DocumentUnderstanding` with non-empty summary, sections, and facts
3. Call `generateHypotheticalAnswer("What is the vacation policy?")` — returns a plausible document-style answer
4. Call `evaluateRetrieval("What is X?", "X is defined as...")` — returns `{ score: number, passed: boolean, reasoning: string }`
5. Call `evaluateQuality("Q", "context", "response")` — returns all 5 metric scores and a composite score
6. Verify that API errors are logged with request IDs and classified correctly

---

### FR-2.3: Embedding Provider Abstraction

**Type**: Service (Provider Interface + Implementation)

**Description**: Abstraction layer for vector embedding generation. The interface defines methods for single and batch embedding generation. The OpenAI implementation uses `text-embedding-3-small` (1536 dimensions) with batching support (up to 100 texts per API call, max 8191 tokens per text).

**Implementation Strategy**: NEW build

---

**File**: `src/lib/providers/embedding-provider.ts`

```typescript
/**
 * Embedding Provider Interface
 *
 * Abstraction layer for vector embedding generation in the RAG pipeline.
 * Implementations handle the specific API calls and batching logic.
 *
 * Currently implemented:
 * - OpenAIEmbeddingProvider (text-embedding-3-small, 1536 dimensions)
 *
 * TODO: Phase 2 — BGEEmbeddingProvider for self-hosted embedding (BGE-M3)
 *
 * @module embedding-provider
 */

import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
} from '@/types/rag';

export type { EmbeddingProvider, EmbeddingProviderConfig };
```

---

**File**: `src/lib/providers/openai-embedding-provider.ts`

```typescript
/**
 * OpenAI Embedding Provider
 *
 * Implementation of EmbeddingProvider using OpenAI's text-embedding-3-small model.
 * Produces 1536-dimensional vectors suitable for pgvector cosine similarity search.
 *
 * Features:
 * - Single text embedding
 * - Batch embedding (up to 100 texts per API call)
 * - Automatic text truncation for texts exceeding token limits
 * - Request logging and error handling
 *
 * @module openai-embedding-provider
 */

import OpenAI from 'openai';
import type { EmbeddingProvider, EmbeddingProviderConfig } from '@/types/rag';

// ============================================
// Constants
// ============================================

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;
const MAX_TOKENS_PER_TEXT = 8191;  // OpenAI text-embedding-3-small limit
const MAX_BATCH_SIZE = 100;        // OpenAI batch limit per API call
const APPROX_CHARS_PER_TOKEN = 4;  // Conservative estimate

// ============================================
// OpenAI Embedding Provider Implementation
// ============================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private config: EmbeddingProviderConfig;

  constructor(config?: Partial<EmbeddingProviderConfig>) {
    this.config = {
      provider: 'openai',
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
      model: config?.model || DEFAULT_MODEL,
      dimensions: config?.dimensions || DEFAULT_DIMENSIONS,
      maxTokensPerText: config?.maxTokensPerText || MAX_TOKENS_PER_TEXT,
      batchSize: config?.batchSize || MAX_BATCH_SIZE,
    };

    if (!this.config.apiKey) {
      throw new Error(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable ' +
        'or pass apiKey in config.'
      );
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate a single embedding vector for the given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const truncated = this.truncateToTokenLimit(text);

    console.log(
      `[OpenAIEmbeddingProvider] Generating single embedding. ` +
      `Text length: ${text.length} chars, truncated: ${truncated.length !== text.length}`
    );

    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: truncated,
        dimensions: this.config.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error(
        `[OpenAIEmbeddingProvider] Embedding generation failed: ${err.message}`,
        { status: err.status }
      );

      if (err.status === 429) {
        throw new Error('Rate limited by OpenAI embedding API. Please retry after a brief delay.');
      }

      throw new Error(`OpenAI embedding generation failed: ${err.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts.
   * Automatically batches requests to respect the API's 100-text-per-call limit.
   * Returns embeddings in the same order as the input texts.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Truncate all texts to token limit
    const truncatedTexts = texts.map(t => this.truncateToTokenLimit(t));

    console.log(
      `[OpenAIEmbeddingProvider] Generating batch embeddings. ` +
      `Count: ${texts.length}, batches: ${Math.ceil(texts.length / this.config.batchSize)}`
    );

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < truncatedTexts.length; i += this.config.batchSize) {
      const batch = truncatedTexts.slice(i, i + this.config.batchSize);
      const batchIndex = Math.floor(i / this.config.batchSize) + 1;
      const totalBatches = Math.ceil(truncatedTexts.length / this.config.batchSize);

      console.log(
        `[OpenAIEmbeddingProvider] Processing batch ${batchIndex}/${totalBatches} ` +
        `(${batch.length} texts)`
      );

      try {
        const response = await this.client.embeddings.create({
          model: this.config.model,
          input: batch,
          dimensions: this.config.dimensions,
        });

        // Sort by index to maintain order (OpenAI returns sorted, but be safe)
        const sorted = response.data.sort((a, b) => a.index - b.index);
        allEmbeddings.push(...sorted.map(d => d.embedding));
      } catch (error) {
        const err = error as Error & { status?: number };
        console.error(
          `[OpenAIEmbeddingProvider] Batch ${batchIndex} failed: ${err.message}`,
          { status: err.status, batchSize: batch.length }
        );

        if (err.status === 429) {
          throw new Error(
            `Rate limited by OpenAI embedding API on batch ${batchIndex}/${totalBatches}. ` +
            `Please retry after a brief delay.`
          );
        }

        throw new Error(
          `OpenAI batch embedding failed on batch ${batchIndex}/${totalBatches}: ${err.message}`
        );
      }
    }

    console.log(
      `[OpenAIEmbeddingProvider] All embeddings generated successfully. ` +
      `Total: ${allEmbeddings.length}`
    );

    return allEmbeddings;
  }

  /**
   * Get the dimensionality of the embedding vectors.
   */
  getDimensions(): number {
    return this.config.dimensions;
  }

  /**
   * Get the model name used for embedding.
   */
  getModelName(): string {
    return this.config.model;
  }

  // ============================================
  // Internal Utilities
  // ============================================

  /**
   * Truncate text to stay within the model's token limit.
   * Uses a conservative character-to-token ratio to avoid exceeding the limit.
   */
  private truncateToTokenLimit(text: string): string {
    const maxChars = this.config.maxTokensPerText * APPROX_CHARS_PER_TOKEN;

    if (text.length <= maxChars) {
      return text;
    }

    console.warn(
      `[OpenAIEmbeddingProvider] Truncating text from ${text.length} to ${maxChars} chars ` +
      `(estimated ${this.config.maxTokensPerText} token limit)`
    );

    return text.substring(0, maxChars);
  }
}
```

**Pattern Source**: The class-based service pattern follows `ClaudeAPIClient` in `src/lib/services/claude-api-client.ts`. Logging format (`[OpenAIEmbeddingProvider]`) follows the `[INFERENCE-SERVICE]` convention. Error handling mirrors the rate-limit detection pattern.

---

> **HUMAN ACTION REQUIRED**
>
> **What:** Add `OPENAI_API_KEY` to `.env.local`
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
> **Values:** `OPENAI_API_KEY=sk-...` (obtain from platform.openai.com → API Keys)
> **Why:** Required for text-embedding-3-small embedding generation. Server-side only — never exposed to client.

---

**File**: `src/lib/providers/index.ts`

```typescript
/**
 * Provider Factory
 *
 * Factory functions for obtaining LLM and Embedding provider instances.
 * Uses environment variables for provider selection, following the existing
 * INFERENCE_MODE=pods|serverless pattern.
 *
 * Environment variables:
 * - LLM_PROVIDER: 'claude' (default)
 * - EMBEDDING_PROVIDER: 'openai' (default)
 *
 * @module providers
 */

import type { LLMProvider } from '@/types/rag';
import type { EmbeddingProvider } from '@/types/rag';
import { ClaudeLLMProvider } from './claude-llm-provider';
import { OpenAIEmbeddingProvider } from './openai-embedding-provider';

// ============================================
// Provider Selection (Environment Variables)
// ============================================

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'claude';
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';

// Log provider selection on module load (matches inference-service.ts pattern)
console.log(`[PROVIDERS] LLM provider selected: ${LLM_PROVIDER}`);
console.log(`[PROVIDERS] Embedding provider selected: ${EMBEDDING_PROVIDER}`);

// ============================================
// Singleton Instances
// ============================================

let llmProviderInstance: LLMProvider | null = null;
let embeddingProviderInstance: EmbeddingProvider | null = null;

// ============================================
// Factory Functions
// ============================================

/**
 * Get the configured LLM provider instance.
 * Returns a singleton — the same instance is reused across calls.
 *
 * Currently supports:
 * - 'claude': ClaudeLLMProvider (claude-sonnet-4-5-20250929 + claude-3-haiku-20240307)
 *
 * TODO: Phase 2 — add 'gemini' provider for 1M+ context documents
 *
 * @throws Error if the configured provider is not supported
 */
export function getLLMProvider(): LLMProvider {
  if (llmProviderInstance) {
    return llmProviderInstance;
  }

  switch (LLM_PROVIDER) {
    case 'claude':
      llmProviderInstance = new ClaudeLLMProvider();
      break;

    // TODO: Phase 2 — add Gemini provider
    // case 'gemini':
    //   llmProviderInstance = new GeminiLLMProvider();
    //   break;

    default:
      throw new Error(
        `Unsupported LLM_PROVIDER: "${LLM_PROVIDER}". ` +
        `Supported values: "claude". ` +
        `Set LLM_PROVIDER environment variable to a supported value.`
      );
  }

  return llmProviderInstance;
}

/**
 * Get the configured Embedding provider instance.
 * Returns a singleton — the same instance is reused across calls.
 *
 * Currently supports:
 * - 'openai': OpenAIEmbeddingProvider (text-embedding-3-small, 1536 dimensions)
 *
 * TODO: Phase 2 — add 'bge' provider for self-hosted BGE-M3
 *
 * @throws Error if the configured provider is not supported
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingProviderInstance) {
    return embeddingProviderInstance;
  }

  switch (EMBEDDING_PROVIDER) {
    case 'openai':
      embeddingProviderInstance = new OpenAIEmbeddingProvider();
      break;

    // TODO: Phase 2 — add BGE-M3 provider for self-hosted embedding
    // case 'bge':
    //   embeddingProviderInstance = new BGEEmbeddingProvider();
    //   break;

    default:
      throw new Error(
        `Unsupported EMBEDDING_PROVIDER: "${EMBEDDING_PROVIDER}". ` +
        `Supported values: "openai". ` +
        `Set EMBEDDING_PROVIDER environment variable to a supported value.`
      );
  }

  return embeddingProviderInstance;
}

/**
 * Reset provider singletons. Useful for testing or configuration changes.
 */
export function resetProviders(): void {
  llmProviderInstance = null;
  embeddingProviderInstance = null;
  console.log('[PROVIDERS] All provider instances reset');
}

// Re-export provider types for convenience
export type { LLMProvider, EmbeddingProvider };
export { ClaudeLLMProvider } from './claude-llm-provider';
export { OpenAIEmbeddingProvider } from './openai-embedding-provider';
```

**Pattern Source**: The factory pattern with environment variable switching directly mirrors `src/lib/services/inference-service.ts` which uses `INFERENCE_MODE=pods|serverless` to route between `callInferenceEndpoint_Pods` and `callInferenceEndpoint_Serverless`. The singleton pattern with reset function follows `getClaudeAPIClient()` / `resetClaudeAPIClient()` in `src/lib/services/claude-api-client.ts`. Module-load logging follows the `console.log('[INFERENCE-SERVICE] Mode selected: ...')` pattern.

---

**Acceptance Criteria (FR-2.3):**

1. `OpenAIEmbeddingProvider` implements all 4 methods of the `EmbeddingProvider` interface
2. `generateEmbedding` returns a 1536-dimensional vector for a single text
3. `generateEmbeddings` batches texts into groups of 100 and processes sequentially
4. Texts exceeding the 8191 token limit are automatically truncated with a warning
5. `getDimensions()` returns `1536`
6. `getModelName()` returns `'text-embedding-3-small'`
7. `getLLMProvider()` returns a singleton `ClaudeLLMProvider` by default
8. `getEmbeddingProvider()` returns a singleton `OpenAIEmbeddingProvider` by default
9. Setting `LLM_PROVIDER=unsupported` throws a descriptive error
10. Setting `EMBEDDING_PROVIDER=unsupported` throws a descriptive error
11. `resetProviders()` clears both singletons

**Verification Steps (FR-2.3):**

1. Call `getEmbeddingProvider().getDimensions()` — returns `1536`
2. Call `getEmbeddingProvider().getModelName()` — returns `'text-embedding-3-small'`
3. Call `getEmbeddingProvider().generateEmbedding("Hello world")` — returns an array of 1536 numbers
4. Call `getEmbeddingProvider().generateEmbeddings(["Hello", "World"])` — returns array of 2 arrays, each 1536 numbers
5. Call `getLLMProvider()` twice — both calls return the same instance (reference equality)
6. Call `resetProviders()` then `getLLMProvider()` — returns a new instance

---

## Section Summary

**What Was Added:**
| File | Description |
|------|-------------|
| `src/types/rag.ts` | All RAG type definitions: 8 database row types, API types, service types, provider interfaces, quality constants |
| `src/lib/providers/llm-provider.ts` | LLM provider interface re-export |
| `src/lib/providers/claude-llm-provider.ts` | Claude implementation of LLMProvider with 9 methods and production-ready prompts |
| `src/lib/providers/embedding-provider.ts` | Embedding provider interface re-export |
| `src/lib/providers/openai-embedding-provider.ts` | OpenAI implementation of EmbeddingProvider with batching |
| `src/lib/providers/index.ts` | Provider factory with environment variable switching |

**What Was Reused:**
| Existing Asset | How It Was Used |
|----------------|-----------------|
| `src/types/index.ts` | Extended with RAG type re-exports |
| `src/lib/ai-config.ts` | `AI_CONFIG` used for Claude API key and timeout defaults |
| `@anthropic-ai/sdk` | Used by ClaudeLLMProvider for Claude API calls |
| `INFERENCE_MODE` pattern | Replicated as `LLM_PROVIDER` and `EMBEDDING_PROVIDER` for same switching pattern |
| Singleton pattern from `claude-api-client.ts` | Replicated for provider instances |

**Integration Points:**
- Section 3 (Ingestion Pipeline) imports `getLLMProvider()` and `getEmbeddingProvider()` for document processing
- Section 4 (Expert Q&A) imports `getLLMProvider()` for question generation and knowledge refinement
- Section 5 (Retrieval Pipeline) imports both providers for HyDE, retrieval, Self-RAG evaluation, and response generation
- Section 6 (API Routes) imports types for request/response validation
- Section 7 (Hooks) imports types for hook return types
- Section 9 (Quality System) imports `getLLMProvider()` for Claude-as-Judge evaluation

---

**Document Owner:** Project Management & Control (PMC)
**File Location:** `pmc/product/_mapping/v2-mods/008-rag-frontier-rag-detailed-spec_v1-section-2.md`
**Status:** COMPLETE
**Total Lines:** ~1050
