# RAG Frontier - Execution Prompt E02: TypeScript Types & Provider Interfaces

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E02 - Types & Providers
**Prerequisites:** E01 complete (all 8 RAG tables created)
**Status:** Ready for Execution

---

## Overview

This prompt creates all TypeScript type definitions for the RAG Frontier module and builds the provider abstraction interfaces for LLM and Embedding services. This enables Phase 1 to use Claude + OpenAI while being trivially upgradeable to self-hosted models later.

**What This Section Creates:**
1. `src/types/rag.ts` — All RAG entity types, request/response types, enums
2. `src/lib/rag/providers/llm-provider.ts` — Abstract LLM provider interface
3. `src/lib/rag/providers/claude-llm-provider.ts` — Claude API implementation
4. `src/lib/rag/providers/embedding-provider.ts` — Abstract embedding provider interface
5. `src/lib/rag/providers/openai-embedding-provider.ts` — OpenAI embedding implementation
6. `src/lib/rag/providers/index.ts` — Provider barrel exports
7. `src/lib/rag/config.ts` — RAG configuration constants
8. Updated `src/types/index.ts` — barrel export for rag types

**What This Section Does NOT Change:**
- No database changes (handled by E01)
- No services created (handled by E03-E05)
- No API routes created (handled by E06-E07)

---

## Critical Instructions

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents
- Read existing types at: `src/types/pipeline.ts` and `src/types/conversation.ts` for pattern reference
- Read existing services barrel: `src/lib/services/index.ts`

---

========================


# EXECUTION PROMPT E02: TypeScript Types & Provider Interfaces

## Your Mission

Create all TypeScript type definitions and provider abstraction interfaces for the RAG Frontier module. This is a Next.js 14 / TypeScript application using Supabase, Claude API, and OpenAI embeddings. You will:

1. Create a comprehensive types file covering all 8 RAG database tables
2. Create an abstract LLM provider interface with a Claude implementation
3. Create an abstract embedding provider interface with an OpenAI implementation
4. Create RAG configuration constants
5. Verify the TypeScript build succeeds

---

## Context: Current State

- **E01 is complete**: 8 RAG tables exist in the database (`rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_expert_questions`, `rag_embeddings`, `rag_queries`, `rag_quality_scores`)
- **Existing type patterns**: Types are in `src/types/` as individual files, re-exported via `src/types/index.ts`. Types use `interface` for entities, `type` for unions. Section markers use `// ====` comment blocks.
- **Existing service patterns**: Services are in `src/lib/services/` with kebab-case filenames
- **Path alias**: `@/` maps to `src/`
- **No RAG code exists yet** — all files are new

---

## Phase 1: RAG Type Definitions

### Task 1: Create RAG Types File

Create the complete type definitions file for all RAG entities.

**File:** `src/types/rag.ts`

```typescript
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

export type RAGFactType = 'fact' | 'entity' | 'definition' | 'relationship';

export type RAGImpactLevel = 'high' | 'medium' | 'low';

export type RAGEmbeddingSourceType = 'document' | 'section' | 'fact';

export type RAGEmbeddingTier = 1 | 2 | 3;

export type RAGQueryMode = 'rag_only' | 'lora_only' | 'rag_and_lora';

export type RAGKnowledgeBaseStatus = 'active' | 'archived';

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

export interface RAGKnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: RAGKnowledgeBaseStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RAGDocument {
  id: string;
  knowledgeBaseId: string;
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
  knowledgeBaseId: string;
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
  createdAt: string;
}

export interface RAGCitation {
  sectionId: string;
  sectionTitle: string | null;
  excerpt: string;
  relevanceScore: number;
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

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

export interface UploadDocumentRequest {
  knowledgeBaseId: string;
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
  knowledgeBaseId: string;
  queryText: string;
  mode: RAGQueryMode;
  documentId?: string;
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

export interface RAGKnowledgeBaseResponse {
  success: boolean;
  data?: RAGKnowledgeBase;
  error?: string;
}

export interface RAGKnowledgeBaseListResponse {
  success: boolean;
  data?: RAGKnowledgeBase[];
  error?: string;
  count?: number;
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
}

export interface ExpertQuestionGeneration {
  questionText: string;
  questionReason: string;
  impactLevel: RAGImpactLevel;
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

export interface RAGKnowledgeBaseRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface RAGDocumentRow {
  id: string;
  knowledge_base_id: string;
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
  knowledge_base_id: string;
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
  created_at: string;
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
```

**Pattern Source**: `src/types/pipeline.ts` — same interface + type union + display map + row type patterns

---

### Task 2: Update Types Barrel Export

**File:** `src/types/index.ts`

**FIND THIS:**
```typescript
export * from './chunks';
```

**REPLACE WITH:**
```typescript
export * from './chunks';
export * from './rag';
```

**Note:** If `export * from './chunks'` is not found, add `export * from './rag';` at the end of the file instead.

---

## Phase 2: Provider Abstractions

### Task 3: Create RAG Configuration

**File:** `src/lib/rag/config.ts`

```typescript
// ============================================
// RAG Frontier Module - Configuration
// ============================================

export const RAG_CONFIG = {
  // LLM Provider
  llm: {
    provider: 'claude' as const,
    model: 'claude-sonnet-4-5-20250929',
    evaluationModel: 'claude-haiku',
    maxTokens: 4096,
    temperature: 0,
  },

  // Embedding Provider
  embedding: {
    provider: 'openai' as const,
    model: 'text-embedding-3-small',
    dimensions: 1536,
    maxInputTokens: 8191,
  },

  // Document Processing
  processing: {
    maxFileSizeMB: 50,
    maxDocumentPages: 500,
    singlePassMaxTokens: 180000, // ~135 pages, safely within Claude's 200K
    overlapWindowTokens: 10000,
    supportedFileTypes: ['pdf', 'docx', 'txt', 'md'] as const,
  },

  // Retrieval
  retrieval: {
    maxSectionsToRetrieve: 10,
    maxFactsToRetrieve: 20,
    similarityThreshold: 0.5,
    selfEvalThreshold: 0.6,
    maxContextTokens: 100000,
  },

  // Quality
  quality: {
    weights: {
      faithfulness: 0.30,
      answerRelevance: 0.25,
      contextRelevance: 0.20,
      answerCompleteness: 0.15,
      citationAccuracy: 0.10,
    },
    lowQualityThreshold: 0.5,
  },

  // Expert Q&A
  expertQA: {
    minQuestions: 3,
    maxQuestions: 8,
    defaultSampleCount: 3,
  },

  // Storage
  storage: {
    bucket: 'rag-documents',
  },
} as const;

export type LLMProviderType = 'claude' | 'gemini' | 'self-hosted';
export type EmbeddingProviderType = 'openai' | 'self-hosted';
```

---

### Task 4: Create LLM Provider Interface

**File:** `src/lib/rag/providers/llm-provider.ts`

```typescript
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
   * Self-evaluate whether retrieved context is relevant and sufficient.
   * Used for Corrective RAG / Self-RAG.
   */
  selfEvaluate(params: {
    queryText: string;
    retrievedContext: string;
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
}
```

---

### Task 5: Create Claude LLM Provider

**File:** `src/lib/rag/providers/claude-llm-provider.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
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
} from '@/types/rag';
import type { LLMProvider } from './llm-provider';
import { RAG_CONFIG } from '../config';

// ============================================
// Claude LLM Provider Implementation
// ============================================
// Pattern Source: src/lib/services/claude-api-client.ts

export class ClaudeLLMProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  async readDocument(params: {
    documentText: string;
    fileName: string;
    description?: string;
  }): Promise<DocumentUnderstanding> {
    const { documentText, fileName, description } = params;

    const systemPrompt = `You are a document analysis expert. You will read an entire document and produce a structured understanding of its contents. Your output must be valid JSON matching the specified schema exactly. Do not include any text outside the JSON.`;

    const userPrompt = `Read the following document and produce a comprehensive structured understanding.

Document Name: ${fileName}
${description ? `Description: ${description}` : ''}

<document>
${documentText}
</document>

Produce a JSON object with exactly these fields:
{
  "summary": "A comprehensive 500-1000 word summary of the document",
  "sections": [
    {
      "title": "Section title",
      "originalText": "The full original text of this section",
      "summary": "A 2-4 sentence summary of this section",
      "tokenCount": 0
    }
  ],
  "entities": [
    {
      "name": "Entity name",
      "type": "person|organization|concept|process|product|location|other",
      "description": "Brief description of this entity in context"
    }
  ],
  "facts": [
    {
      "factType": "fact|entity|definition|relationship",
      "content": "The atomic factual statement",
      "sourceText": "The original text this fact was extracted from",
      "confidence": 0.95
    }
  ],
  "topicTaxonomy": ["Topic 1", "Topic 2", "Subtopic 2a"],
  "ambiguities": ["Description of ambiguity 1"],
  "expertQuestions": [
    {
      "questionText": "The question to ask the domain expert",
      "questionReason": "Why this question matters for understanding",
      "impactLevel": "high|medium|low"
    }
  ]
}

Rules:
- Generate 3-8 expert questions, ranked by impact (high first)
- Extract ALL meaningful sections (chapters, headings, logical divisions)
- Extract key entities mentioned (people, orgs, concepts, processes)
- Extract atomic facts as standalone true statements
- Identify ambiguities: terms used without definition, implicit assumptions, unclear references
- Topic taxonomy should have 3-10 topics at varying specificity levels
- Estimate token counts per section (roughly 1 token per 4 characters)
- Expert questions should target things that, if answered, would significantly improve the system's ability to answer questions about this document`;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: RAG_CONFIG.llm.maxTokens,
      temperature: RAG_CONFIG.llm.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);
    return parsed as DocumentUnderstanding;
  }

  async generateContextualPreamble(params: {
    documentSummary: string;
    sectionText: string;
    sectionTitle?: string;
  }): Promise<ContextualPreambleResult> {
    const { documentSummary, sectionText, sectionTitle } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 300,
      temperature: 0,
      system: 'You generate contextual preambles for document sections. Output ONLY the preamble text (1-2 sentences). No JSON, no explanation.',
      messages: [{
        role: 'user',
        content: `Document summary: ${documentSummary}\n\nSection${sectionTitle ? ` "${sectionTitle}"` : ''}:\n${sectionText.slice(0, 2000)}\n\nWrite a 1-2 sentence contextual preamble that explains what this section is about within the larger document. The preamble should help a search system understand the context of this section.`,
      }],
    });

    const preamble = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return { sectionId: '', preamble };
  }

  async refineKnowledge(params: {
    documentText: string;
    currentSummary: string;
    questions: RAGExpertQuestion[];
    sections: RAGSection[];
  }): Promise<KnowledgeRefinement> {
    const { documentText, currentSummary, questions, sections } = params;

    const answeredQuestions = questions
      .filter(q => q.answerText && !q.skipped)
      .map(q => `Q: ${q.questionText}\nA: ${q.answerText}`)
      .join('\n\n');

    const sectionList = sections.map((s, i) =>
      `Section ${i}: ${s.title || 'Untitled'}\nSummary: ${s.summary || 'No summary'}`
    ).join('\n\n');

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: RAG_CONFIG.llm.maxTokens,
      temperature: 0,
      system: 'You refine document knowledge based on expert answers. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Original document summary: ${currentSummary}

Current sections:
${sectionList}

Expert Q&A:
${answeredQuestions}

Based on the expert answers, produce a JSON object:
{
  "updatedSections": [{"sectionIndex": 0, "updatedSummary": "..."}],
  "updatedEntities": [{"name": "...", "type": "...", "description": "..."}],
  "updatedFacts": [{"factType": "fact", "content": "...", "sourceText": "Expert answer", "confidence": 1.0}],
  "refinementNotes": "Summary of what was refined"
}

Only include sections whose summaries need updating based on the expert answers. Add new entities and facts revealed by the expert answers.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text) as KnowledgeRefinement;
  }

  async generateHyDE(params: {
    queryText: string;
    documentSummary: string;
  }): Promise<HyDEResult> {
    const { queryText, documentSummary } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0,
      system: 'Generate a hypothetical answer paragraph. Output ONLY the answer text. No preamble.',
      messages: [{
        role: 'user',
        content: `Document context: ${documentSummary}\n\nQuestion: ${queryText}\n\nWrite a detailed paragraph that would answer this question based on a document like the one described. Use formal language matching how the document likely discusses this topic.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return { hypotheticalAnswer: text };
  }

  async selfEvaluate(params: {
    queryText: string;
    retrievedContext: string;
  }): Promise<SelfEvalResult> {
    const { queryText, retrievedContext } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 300,
      temperature: 0,
      system: 'Evaluate retrieval quality. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Query: ${queryText}\n\nRetrieved context:\n${retrievedContext.slice(0, 5000)}\n\nEvaluate: Is this context relevant and sufficient to answer the query?\n\n{"passed": true/false, "score": 0.0-1.0, "reasoning": "..."}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text) as SelfEvalResult;
  }

  async generateResponse(params: {
    queryText: string;
    assembledContext: string;
    systemPrompt: string;
  }): Promise<{ responseText: string; citations: RAGCitation[] }> {
    const { queryText, assembledContext, systemPrompt } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: RAG_CONFIG.llm.maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Context from knowledge base:\n${assembledContext}\n\n---\n\nUser question: ${queryText}\n\nProvide a comprehensive answer based on the context above. Include specific citations by referencing section titles. Output JSON:\n{"responseText": "...", "citations": [{"sectionId": "", "sectionTitle": "...", "excerpt": "...", "relevanceScore": 0.9}]}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text);
  }

  async evaluateQuality(params: {
    queryText: string;
    retrievedContext: string;
    responseText: string;
    citations: RAGCitation[];
  }): Promise<QualityEvaluation> {
    const { queryText, retrievedContext, responseText, citations } = params;

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0,
      system: 'You are a RAG quality evaluator. Score each dimension 0.0-1.0. Output valid JSON only.',
      messages: [{
        role: 'user',
        content: `Query: ${queryText}\n\nRetrieved Context:\n${retrievedContext.slice(0, 3000)}\n\nGenerated Response:\n${responseText}\n\nCitations: ${JSON.stringify(citations)}\n\nEvaluate:\n{"faithfulness": 0.0-1.0, "answerRelevance": 0.0-1.0, "contextRelevance": 0.0-1.0, "answerCompleteness": 0.0-1.0, "citationAccuracy": 0.0-1.0, "composite": 0.0-1.0, "details": {"reasoning": "..."}}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text) as QualityEvaluation;
  }

  async generateVerificationQuestions(params: {
    documentSummary: string;
    sections: RAGSection[];
    count: number;
  }): Promise<string[]> {
    const { documentSummary, sections, count } = params;

    const sectionTitles = sections.map(s => s.title || 'Untitled').join(', ');

    const response = await this.client.messages.create({
      model: RAG_CONFIG.llm.model,
      max_tokens: 500,
      temperature: 0.3,
      system: 'Generate verification questions. Output a JSON array of strings only.',
      messages: [{
        role: 'user',
        content: `Document summary: ${documentSummary}\nSections: ${sectionTitles}\n\nGenerate ${count} diverse questions that test whether the system understands this document well. Mix factual, contextual, and multi-section questions. Output: ["question1", "question2", ...]`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return JSON.parse(text) as string[];
  }
}
```

**Pattern Source**: `src/lib/services/claude-api-client.ts` (Anthropic SDK usage pattern)

---

### Task 6: Create Embedding Provider Interface

**File:** `src/lib/rag/providers/embedding-provider.ts`

```typescript
// ============================================
// Embedding Provider Interface
// ============================================
// Abstract interface for embedding generation.
// Phase 1: OpenAI text-embedding-3-small.
// Phase 2+: Self-hosted BGE-M3 or other models.

export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for a single text input.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in a batch.
   * More efficient than calling embed() in a loop.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get the model name for tracking purposes.
   */
  getModelName(): string;

  /**
   * Get the embedding dimensions.
   */
  getDimensions(): number;
}
```

---

### Task 7: Create OpenAI Embedding Provider

**File:** `src/lib/rag/providers/openai-embedding-provider.ts`

```typescript
import type { EmbeddingProvider } from './embedding-provider';
import { RAG_CONFIG } from '../config';

// ============================================
// OpenAI Embedding Provider Implementation
// ============================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = RAG_CONFIG.embedding.model;
    this.dimensions = RAG_CONFIG.embedding.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error (${response.status}): ${error}`);
    }

    const data = await response.json();
    // OpenAI returns embeddings sorted by index
    const sorted = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
    return sorted.map((item: { embedding: number[] }) => item.embedding);
  }

  getModelName(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
```

---

### Task 8: Create Provider Barrel Export

**File:** `src/lib/rag/providers/index.ts`

```typescript
export type { LLMProvider } from './llm-provider';
export type { EmbeddingProvider } from './embedding-provider';
export { ClaudeLLMProvider } from './claude-llm-provider';
export { OpenAIEmbeddingProvider } from './openai-embedding-provider';
```

---

## Verification

### Step 1: Verify All Files Created

Confirm these files exist:
- `src/types/rag.ts`
- `src/lib/rag/config.ts`
- `src/lib/rag/providers/llm-provider.ts`
- `src/lib/rag/providers/claude-llm-provider.ts`
- `src/lib/rag/providers/embedding-provider.ts`
- `src/lib/rag/providers/openai-embedding-provider.ts`
- `src/lib/rag/providers/index.ts`

### Step 2: TypeScript Build

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npm run build
```

**Expected:** Exit code 0, no TypeScript errors.

### Step 3: Import Verification

Verify imports work by checking:
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/src" && npx tsc --noEmit
```

**Expected:** No type errors.

---

## Success Criteria

- [ ] `src/types/rag.ts` contains all entity interfaces, request/response types, enums, display maps, and DB row types
- [ ] `src/types/index.ts` re-exports `rag` types
- [ ] `src/lib/rag/config.ts` has all RAG configuration constants
- [ ] `src/lib/rag/providers/llm-provider.ts` defines the abstract LLM interface
- [ ] `src/lib/rag/providers/claude-llm-provider.ts` implements all LLM methods using Anthropic SDK
- [ ] `src/lib/rag/providers/embedding-provider.ts` defines the abstract embedding interface
- [ ] `src/lib/rag/providers/openai-embedding-provider.ts` implements embedding via OpenAI API
- [ ] `src/lib/rag/providers/index.ts` barrel exports all providers
- [ ] TypeScript build succeeds with zero errors

---

## What's Next

**E03** will create the core RAG services: `rag-embedding-service.ts` and `rag-ingestion-service.ts`. These services use the provider interfaces created here to process uploaded documents.

---

## If Something Goes Wrong

### TypeScript Build Errors
- Check that `@anthropic-ai/sdk` is installed: `npm ls @anthropic-ai/sdk`
- If not installed: `npm install @anthropic-ai/sdk`
- Check that the `@/` path alias works (defined in `tsconfig.json` → `paths`)

### Import Resolution Errors
- Ensure `src/lib/rag/` directory structure is correct
- Ensure barrel exports match actual file names
- Check for circular imports

### Type Mismatch with Database
- The DB row types use snake_case matching the database columns exactly
- The entity interfaces use camelCase matching TypeScript conventions
- Mapper functions (created in E03) will convert between them

---

## Notes for Agent

1. **Create ALL files listed above.** Do not skip any file.
2. **Use exact file paths as specified.** The `src/lib/rag/` directory is new and must be created.
3. **Follow existing patterns.** Types use `interface` for objects, `type` for unions. Display maps are `Record<EnumType, string>` constants.
4. **The `@anthropic-ai/sdk` package should already be installed** (used by existing `claude-api-client.ts`). If not, install it.
5. **Do NOT create services, API routes, or components** — those are handled by subsequent prompts.
6. **The OpenAI embedding provider uses raw `fetch`** — no separate OpenAI SDK needed.

---

**End of E02 Prompt**


+++++++++++++++++
