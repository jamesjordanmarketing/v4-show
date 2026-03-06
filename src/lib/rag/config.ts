// ============================================
// RAG Frontier Module - Configuration
// ============================================

export const RAG_CONFIG = {
  // LLM Provider — Multi-Pass Model Configuration
  llm: {
    provider: 'claude' as const,

    // Default model for retrieval-time operations (HyDE, response gen, self-eval, quality eval)
    model: process.env.RAG_LLM_MODEL || 'claude-haiku-4-5-20251001',
    evaluationModel: process.env.RAG_EVAL_MODEL || 'claude-haiku-4-5-20251001',

    // Multi-pass ingestion models (Phase 1)
    // Pass 1: Structure Analysis — Sonnet 4.5 (needs strong reasoning for document classification)
    // Pass 2: Policy Extraction — Sonnet 4.5 (critical pass: rules, exceptions, limits)
    // Pass 3: Table Extraction — Sonnet 4.5 (complex table parsing with nested headers)
    // Pass 4: Glossary & Entities — Haiku (glossaries are explicitly labeled, Haiku handles fine)
    // Pass 5: Narrative Facts — Sonnet 4.5 (implicit/inferential facts in unstructured text)
    // Pass 6: Verification — Opus 4.6 (strongest model reviews extraction completeness)
    ingestionModels: {
      structureAnalysis: process.env.RAG_PASS1_MODEL || 'claude-sonnet-4-5-20250929',
      policyExtraction: process.env.RAG_PASS2_MODEL || 'claude-sonnet-4-5-20250929',
      tableExtraction: process.env.RAG_PASS3_MODEL || 'claude-sonnet-4-5-20250929',
      glossaryExtraction: process.env.RAG_PASS4_MODEL || 'claude-haiku-4-5-20251001',
      narrativeExtraction: process.env.RAG_PASS5_MODEL || 'claude-sonnet-4-5-20250929',
      verification: process.env.RAG_PASS6_MODEL || 'claude-opus-4-6',
    },

    // Token budgets per pass
    maxTokens: {
      structureAnalysis: 8192,    // Pass 1: returns section map + document type
      policyExtraction: 16384,    // Pass 2: per-section, rules/exceptions/limits
      tableExtraction: 8192,      // Pass 3: per-table, row extraction
      glossaryExtraction: 32768,  // Pass 4: definitions, entities, relationships (full-doc scan — needs large budget)
      narrativeExtraction: 16384, // Pass 5: per-section narrative facts
      verification: 8192,         // Pass 6: per-section missing facts
      preamble: 300,              // Contextual preamble generation
      default: 32768,             // Retrieval-time operations
    },

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
    singlePassMaxTokens: 180000, // ~135 pages, safely within Claude's 200K context
    overlapWindowTokens: 10000,
    supportedFileTypes: ['pdf', 'docx', 'txt', 'md'] as const,
  },

  // Retrieval
  retrieval: {
    maxSectionsToRetrieve: 10,
    maxFactsToRetrieve: 20,
    similarityThreshold: 0.4,
    kbWideSimilarityThreshold: 0.3,  // Lower threshold for KB-wide queries (more recall needed)
    maxSingleDocRatio: 0.6,          // Max proportion of results from a single document
    selfEvalThreshold: 0.6,
    maxContextTokens: 100000,
    // LoRA endpoint token budget — base model context window is 32,768 tokens (Mistral-7B native max).
    // vLLM --max-model-len set to 32768 on A40 48GB GPU.
    // Reserve ~2,048 for model response + ~500 for system prompt + ~1,220 overhead = ~29,000 for context.
    loraMaxContextTokens: 29000,
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
