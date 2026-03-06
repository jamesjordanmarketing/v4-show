# 013 — RAG Multi-Pass Ingestion Upgrade: Implementation Specification v1.0

**Date:** February 16, 2026
**Author:** AI Assistant (Antigravity)
**Status:** IMPLEMENTATION SPECIFICATION — READY FOR DEVELOPMENT
**Prerequisites:**
- `011-rag-ingestion-upgrade_v1.md` (Audit & 5-pass pipeline design)
- `012-rag-ingestion-upgrade-and-integration_v2.md` (Architecture + James' decisions)
**Target Codebase:** `v4-show/src/`
**Database Operations:** ALL via SAOL (Supabase Agent Ops Library)

---

# Table of Contents

1. [Decisions Summary](#1-decisions-summary)
2. [Phase 1 Implementation Plan](#2-phase-1-implementation-plan)
3. [Database Schema Migrations (SAOL)](#3-database-schema-migrations-saol)
4. [Type System Changes](#4-type-system-changes-srctypesragts)
5. [Configuration Changes](#5-configuration-changes-srclibragconfigts)
6. [LLM Provider Interface Updates](#6-llm-provider-interface-updates)
7. [Claude LLM Provider — 6 New Extraction Methods](#7-claude-llm-provider--6-new-extraction-methods)
8. [Ingestion Service Refactor](#8-ingestion-service-refactor)
9. [Inngest Multi-Step Pipeline](#9-inngest-multi-step-pipeline)
10. [DB Mapper Updates](#10-db-mapper-updates)
11. [Embedding Service Updates](#11-embedding-service-updates)
12. [Phase 2 — Multi-Document Retrieval](#12-phase-2--multi-document-retrieval)
13. [Phase 3 — Retrieval Quality](#13-phase-3--retrieval-quality)
14. [Phase 4 — Operational Polish](#14-phase-4--operational-polish)
15. [Duplicate Cleanup Script](#15-duplicate-cleanup-script)
16. [Golden-Set Regression Test](#16-golden-set-regression-test)
17. [Cost & Performance Summary](#17-cost--performance-summary)
18. [File Change Map](#18-file-change-map)

---

# 1. Decisions Summary

All decisions below were approved by James in `012-rag-ingestion-upgrade-and-integration_v2.md`.

| # | Decision | Status |
|---|----------|--------|
| D1 | Phase 1 exit criterion: **≥95% extraction** (not 85-90%) | **APPROVED** |
| D2 | 6-pass pipeline: 5 extraction + Pass 6 Opus 4.6 verification | **APPROVED** |
| D3 | Premium models: Sonnet 4.5 (Passes 1/2/3/5), Haiku (Pass 4), Opus 4.6 (Pass 6) | **APPROVED** |
| D4 | Document type detection in Pass 1 with per-pass routing | **APPROVED** |
| D5 | All passes run for all document types (some return empty results) | **APPROVED** |
| D6 | $0.72/doc ingestion cost | **APPROVED** |
| D7 | Streaming responses deferred | **APPROVED** |
| D8 | Large doc chunking (>180K tokens) deferred | **APPROVED** |
| D9 | Cross-KB search deferred (not needed for initial release) | **APPROVED** |
| D10 | Design target: 1-20 docs/month, ~100 queries/day | **APPROVED** |
| D11 | Cleanup script for 6 duplicate Sun Chip documents | **APPROVED** |
| D12 | Golden-set regression test (20-30 Q&A pairs) | **APPROVED** |
| D13 | Confidence display in UI based on self-eval score thresholds | **APPROVED** |
| D14 | ALL database operations via SAOL | **MANDATORY** |

---

# 2. Phase 1 Implementation Plan

Phase 1 is the core deliverable. It transforms the single-pass Haiku ingestion into a 6-pass premium-model pipeline targeting ≥95% extraction.

## 2.1 Session Breakdown

### Session 1: Schema + Infrastructure + Pass 1
1. Run SAOL database migration (enhanced `rag_facts` columns, `content_hash` on documents)
2. Update `RAGFactType` and `RAGFact` interface in `src/types/rag.ts`
3. Update `RAGFactRow` and `mapRowToFact` in `src/lib/rag/services/rag-db-mappers.ts`
4. Update `RAG_CONFIG` with multi-pass model configuration
5. Add new method signatures to `LLMProvider` interface
6. Implement `analyzeDocumentStructure()` (Pass 1) in `claude-llm-provider.ts`
7. Add document fingerprinting to `createDocumentRecord()`
8. Wire up the new Inngest multi-step pipeline skeleton

### Session 2: Passes 2-5 + Relationship Linking
9. Implement `extractPoliciesForSection()` (Pass 2) in `claude-llm-provider.ts`
10. Implement `extractTableData()` (Pass 3) in `claude-llm-provider.ts`
11. Implement `extractGlossaryAndRelationships()` (Pass 4) in `claude-llm-provider.ts`
12. Implement `extractNarrativeFacts()` (Pass 5) in `claude-llm-provider.ts`
13. Implement `linkFactRelationships()` code-only linker in `rag-ingestion-service.ts`
14. Update enriched embedding text builder in `rag-embedding-service.ts`
15. Complete Inngest pipeline with all passes

### Session 3: Pass 6 Verification + Model Upgrades + Testing
16. Implement `verifyExtractionCompleteness()` (Pass 6) in `claude-llm-provider.ts`
17. Upgrade Passes 1/2/3/5 to Sonnet 4.5 model ID in config
18. Add Pass 6 to Inngest pipeline
19. Run duplicate cleanup script
20. Reprocess Sun Chip document with new pipeline
21. Build golden-set regression test (20+ Q&A pairs)
22. Validate ≥95% extraction on Sun Chip document

---

# 3. Database Schema Migrations (SAOL)

**ALL migrations MUST be executed via SAOL `agentExecuteDDL()`.** Do not use raw supabase-js or paste SQL directly.

## 3.1 Migration 1: Enhanced RAG Facts (Phase 1, Session 1)

```javascript
// File: scripts/migrations/001-enhanced-rag-facts.js
// Execute from: v4-show/supa-agent-ops/

require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const MIGRATION_SQL = `
  -- Add provenance columns to rag_facts
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS policy_id TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS rule_id TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS parent_fact_id UUID REFERENCES rag_facts(id);
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS subsection TEXT;
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS fact_category TEXT;

  -- Drop old fact_type constraint if it exists
  ALTER TABLE rag_facts DROP CONSTRAINT IF EXISTS rag_facts_fact_type_check;

  -- Add updated fact_type constraint with all 14 types
  ALTER TABLE rag_facts ADD CONSTRAINT rag_facts_fact_type_check
    CHECK (fact_type IN (
      'fact', 'entity', 'definition', 'relationship',
      'table_row', 'policy_exception', 'policy_rule',
      'limit', 'threshold', 'required_document',
      'escalation_path', 'audit_field', 'cross_reference',
      'narrative_fact'
    ));

  -- Indexes for provenance-based retrieval
  CREATE INDEX IF NOT EXISTS idx_rag_facts_policy_id
    ON rag_facts(policy_id) WHERE policy_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_category
    ON rag_facts(fact_category) WHERE fact_category IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_parent
    ON rag_facts(parent_fact_id) WHERE parent_fact_id IS NOT NULL;

  -- Document fingerprint for duplicate detection
  ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
  CREATE INDEX IF NOT EXISTS idx_rag_documents_hash
    ON rag_documents(content_hash) WHERE content_hash IS NOT NULL;

  -- Document type classification (set during Pass 1)
  ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
`;

(async () => {
  // Step 1: Dry-run validation
  console.log('Running dry-run validation...');
  const dryRun = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run result:', dryRun.success ? 'PASS' : 'FAIL');
  if (!dryRun.success) {
    console.error('Validation failed:', dryRun.summary);
    process.exit(1);
  }

  // Step 2: Execute migration
  console.log('Executing migration...');
  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration result:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', result.summary);

  // Step 3: Verify columns were added
  const verify = await saol.agentIntrospectSchema({
    table: 'rag_facts',
    includeColumns: true,
    includeIndexes: true,
    transport: 'pg'
  });

  const columnNames = verify.tables[0]?.columns.map(c => c.name) || [];
  const requiredColumns = ['policy_id', 'rule_id', 'parent_fact_id', 'subsection', 'fact_category'];
  const missing = requiredColumns.filter(c => !columnNames.includes(c));

  if (missing.length > 0) {
    console.error('MISSING COLUMNS:', missing);
    process.exit(1);
  }

  console.log('All columns verified. Migration complete.');
})();
```

**One-liner execution:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node ../scripts/migrations/001-enhanced-rag-facts.js
```

## 3.2 Migration 2: Multi-Doc Search Support (Phase 2)

```javascript
// File: scripts/migrations/002-multi-doc-search.js

require('dotenv').config({ path: '../.env.local' });
const saol = require('.');

const MIGRATION_SQL = `
  -- Add knowledge_base_id to embeddings for KB-wide search without joins
  ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS knowledge_base_id UUID;

  -- Backfill knowledge_base_id from documents
  UPDATE rag_embeddings e
  SET knowledge_base_id = d.knowledge_base_id
  FROM rag_documents d
  WHERE e.document_id = d.id AND e.knowledge_base_id IS NULL;

  -- Full-text search on facts (generated tsvector column)
  ALTER TABLE rag_facts ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_facts_tsv ON rag_facts USING gin(content_tsv);

  -- Full-text search on sections
  ALTER TABLE rag_sections ADD COLUMN IF NOT EXISTS text_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || original_text)) STORED;
  CREATE INDEX IF NOT EXISTS idx_rag_sections_tsv ON rag_sections USING gin(text_tsv);

  -- KB-wide embedding search RPC (replaces single-doc match_rag_embeddings)
  CREATE OR REPLACE FUNCTION match_rag_embeddings_kb(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    filter_tier int DEFAULT NULL
  )
  RETURNS TABLE (
    id uuid,
    document_id uuid,
    source_type text,
    source_id uuid,
    content_text text,
    similarity float,
    tier int,
    metadata jsonb
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.document_id,
      e.source_type,
      e.source_id,
      e.content_text,
      1 - (e.embedding <=> query_embedding) AS similarity,
      e.tier,
      e.metadata
    FROM rag_embeddings e
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (filter_knowledge_base_id IS NULL OR e.knowledge_base_id = filter_knowledge_base_id)
      AND (filter_document_id IS NULL OR e.document_id = filter_document_id)
      AND (filter_tier IS NULL OR e.tier = filter_tier)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
  END;
  $$;

  -- Hybrid text search RPC (BM25-style keyword search)
  CREATE OR REPLACE FUNCTION search_rag_text(
    search_query text,
    filter_knowledge_base_id uuid DEFAULT NULL,
    filter_document_id uuid DEFAULT NULL,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    source_type text,
    source_id uuid,
    document_id uuid,
    content text,
    rank float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    (
      SELECT 'fact'::text, f.id, f.document_id, f.content,
             ts_rank(f.content_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_facts f
      WHERE f.content_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR f.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR f.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    UNION ALL
    (
      SELECT 'section'::text, s.id, s.document_id, s.title || ': ' || left(s.original_text, 500),
             ts_rank(s.text_tsv, plainto_tsquery('english', search_query))::float
      FROM rag_sections s
      WHERE s.text_tsv @@ plainto_tsquery('english', search_query)
        AND (filter_document_id IS NULL OR s.document_id = filter_document_id)
        AND (filter_knowledge_base_id IS NULL OR s.document_id IN (
          SELECT d.id FROM rag_documents d WHERE d.knowledge_base_id = filter_knowledge_base_id
        ))
    )
    ORDER BY rank DESC
    LIMIT match_count;
  END;
  $$;
`;

(async () => {
  const dryRun = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: true,
    transaction: true,
    transport: 'pg'
  });

  console.log('Dry-run:', dryRun.success ? 'PASS' : 'FAIL');
  if (!dryRun.success) {
    console.error(dryRun.summary);
    process.exit(1);
  }

  const result = await saol.agentExecuteDDL({
    sql: MIGRATION_SQL,
    dryRun: false,
    transaction: true,
    transport: 'pg'
  });

  console.log('Migration:', result.success ? 'SUCCESS' : 'FAILED');
  console.log('Summary:', result.summary);
})();
```

---

# 4. Type System Changes (`src/types/rag.ts`)

## 4.1 Updated `RAGFactType` (line 19)

**Current:**
```typescript
export type RAGFactType = 'fact' | 'entity' | 'definition' | 'relationship';
```

**Replace with:**
```typescript
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
```

## 4.2 New `RAGDocumentType` (add after `RAGKnowledgeBaseStatus`)

```typescript
export type RAGDocumentType = 'structured-policy' | 'tabular' | 'narrative' | 'mixed';
```

## 4.3 Updated `RAGFact` Interface (lines 121-133)

**Current:**
```typescript
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
```

**Replace with:**
```typescript
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
```

## 4.4 Updated `RAGFactRow` Interface (lines 467-479)

**Current:**
```typescript
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
```

**Replace with:**
```typescript
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
```

## 4.5 Updated `RAGDocument` Interface — Add New Fields

Add after `version: number;` (line 95):
```typescript
  contentHash: string | null;
  documentType: RAGDocumentType | null;
```

## 4.6 Updated `RAGDocumentRow` Interface — Add New Fields

Add after `version: number;` (line 448):
```typescript
  content_hash: string | null;
  document_type: string | null;
```

## 4.7 Updated `FactExtraction` Interface (lines 360-365)

**Current:**
```typescript
export interface FactExtraction {
  factType: RAGFactType;
  content: string;
  sourceText: string;
  confidence: number;
}
```

**Replace with:**
```typescript
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
```

## 4.8 New Per-Pass Response Types (add after `ExpertQuestionGeneration`)

```typescript
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
```

---

# 5. Configuration Changes (`src/lib/rag/config.ts`)

**Current file:** 81 lines. Replace the entire `RAG_CONFIG` object.

```typescript
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
      glossaryExtraction: 8192,   // Pass 4: definitions, entities, relationships
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

**Key change:** The `llm.maxTokens` is now an object with per-pass budgets instead of a single number. The `ingestionModels` object maps each pass to its model. Code that currently reads `RAG_CONFIG.llm.maxTokens` as a number (e.g., `readDocument()`) must be updated to use `RAG_CONFIG.llm.maxTokens.default`.

---

# 6. LLM Provider Interface Updates

**File:** `src/lib/rag/providers/llm-provider.ts`

Add these 6 new method signatures to the `LLMProvider` interface, after `generateVerificationQuestions`:

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
  // New types for multi-pass
  StructureAnalysisResult,
  PolicyExtractionResult,
  TableExtractionResult,
  GlossaryExtractionResult,
  NarrativeExtractionResult,
  VerificationResult,
  FactExtraction,
  RAGDocumentType,
} from '@/types/rag';

export interface LLMProvider {
  // ... existing 8 methods unchanged ...

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
```

---

# 7. Claude LLM Provider — 6 New Extraction Methods

**File:** `src/lib/rag/providers/claude-llm-provider.ts`

Add these methods to the `ClaudeLLMProvider` class. Each method includes the full prompt text.

## 7.1 Pass 1: `analyzeDocumentStructure()`

```typescript
async analyzeDocumentStructure(params: {
  documentText: string;
  fileName: string;
}): Promise<StructureAnalysisResult> {
  const { documentText, fileName } = params;

  const systemPrompt = `You are a document structure analyst. You will analyze a document and produce a structural map. Output ONLY valid JSON. No markdown code fences.`;

  const userPrompt = `Analyze the structure of the following document and produce a JSON structural map.

Document: ${fileName}

<document>
${documentText}
</document>

Produce a JSON object with exactly these fields:
{
  "summary": "300-500 word comprehensive summary of the document",
  "documentType": "structured-policy | tabular | narrative | mixed",
  "sections": [
    {
      "title": "Section title as it appears in the document",
      "startLine": 1,
      "endLine": 50,
      "summary": "2-3 sentence summary of this section",
      "policyId": "BC-ELIG-001 or null if no policy ID",
      "isNarrative": false
    }
  ],
  "tables": [
    {
      "startLine": 100,
      "endLine": 115,
      "nearestSection": "Section title this table belongs to"
    }
  ],
  "topicTaxonomy": ["Topic 1", "Topic 2"],
  "ambiguities": ["Description of ambiguity"],
  "expertQuestions": [
    {
      "questionText": "The question",
      "questionReason": "Why it matters",
      "impactLevel": "high | medium | low"
    }
  ]
}

DOCUMENT TYPE CLASSIFICATION RULES:
- "structured-policy": Document has numbered rules (R1, R2), exception blocks (E1, E2), policy IDs (BC-PROD-004), formal section hierarchy
- "tabular": >50% of content is in markdown tables or structured lists, few narrative paragraphs
- "narrative": Predominantly prose paragraphs, minimal numbered rules or tables
- "mixed": Combination of structured sections AND narrative sections AND/OR tables

SECTION IDENTIFICATION RULES:
- Extract 5-20 major sections (chapters, main headings)
- For each section, identify its startLine and endLine (1-indexed line numbers)
- Set policyId if the section header contains a policy identifier (e.g., "BC-ELIG-001")
- Set isNarrative=true for sections that are primarily prose without labeled rules

TABLE IDENTIFICATION:
- List every markdown table (lines with | delimiters) with its line range
- Associate each table with the nearest section

EXPERT QUESTIONS: Generate 3-5 high-impact questions only.

CRITICAL: Line numbers must be accurate. Use 1-indexed line numbers matching the document text.`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.structureAnalysis,
    max_tokens: RAG_CONFIG.llm.maxTokens.structureAnalysis,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<StructureAnalysisResult>(text, 'analyzeDocumentStructure');
}
```

## 7.2 Pass 2: `extractPoliciesForSection()`

```typescript
async extractPoliciesForSection(params: {
  sectionText: string;
  sectionTitle: string;
  policyId: string | null;
  documentType: RAGDocumentType;
}): Promise<PolicyExtractionResult> {
  const { sectionText, sectionTitle, policyId, documentType } = params;

  // Document-type-specific extraction guidance
  let typeGuidance = '';
  if (documentType === 'narrative') {
    typeGuidance = `This is a NARRATIVE document. Instead of looking for labeled rules (R1, E1), look for:
- Implicit requirements, obligations, and prohibitions
- Statements about what someone "must", "cannot", "shall", or "is required to" do
- Conditions and limits expressed in prose
- Treat each such statement as a policy rule with a generated ruleId.`;
  } else if (documentType === 'tabular') {
    // Tabular documents skip Pass 2 entirely — this shouldn't be called
    return {
      policyId: policyId || 'UNKNOWN',
      rules: [], exceptions: [], limits: [], requiredDocuments: [],
      escalations: [], auditFields: [], relatedPolicies: [], definitions: [],
    };
  } else {
    typeGuidance = `Extract all labeled rules (R1-R8), exceptions (E1-E2), and structured policy elements.`;
  }

  const systemPrompt = `You are a policy extraction specialist. Extract ALL policy elements from the section. Output ONLY valid JSON.`;

  const userPrompt = `Extract all policy elements from this section.

Section Title: ${sectionTitle}
Policy ID: ${policyId || 'Not specified'}

${typeGuidance}

<section>
${sectionText}
</section>

Produce a JSON object:
{
  "policyId": "${policyId || 'INFERRED_ID'}",
  "rules": [
    {
      "ruleId": "R1",
      "content": "Complete rule text including all conditions and amounts",
      "conditions": ["condition 1", "condition 2"],
      "amounts": ["$10,000", "43%"],
      "timeframes": ["24 hours", "30 days"]
    }
  ],
  "exceptions": [
    {
      "exceptionId": "E1",
      "content": "Complete exception text",
      "qualifiesRule": "R4",
      "conditions": ["condition for exception to apply"]
    }
  ],
  "limits": [
    { "name": "Max FDIC Coverage", "value": "100000000", "unit": "USD", "window": "per depositor" }
  ],
  "requiredDocuments": [
    { "scenario": "Account opening", "documents": ["Tax Returns (2 years)", "W-2s"] }
  ],
  "escalations": [
    { "trigger": "Wire > $10M", "levels": ["Relationship Manager", "Head of Treasury", "CEO"] }
  ],
  "auditFields": [
    { "fieldName": "wire_imad_omad", "description": "Fed reference number for wire tracking" }
  ],
  "relatedPolicies": [
    { "policyId": "BC-ELIG-004", "relationship": "Account Closure triggers this policy" }
  ],
  "definitions": [
    { "term": "Priority Window", "definition": "8:00 AM to 1:00 PM ET business days" }
  ]
}

EXTRACTION RULES:
1. Extract EVERY rule, exception, limit, threshold, required document, escalation path, and audit field
2. For each rule, extract ALL conditions, monetary amounts, and timeframes mentioned
3. For each exception, identify which rule it qualifies (qualifiesRule field)
4. Limits include: dollar amounts, percentages, time windows, count limits
5. Required documents: list by scenario (account opening, large wire, etc.)
6. Escalations: the approval chain (who must approve at each level)
7. Audit fields: any field names mentioned for audit/receipt/tracking purposes
8. Related policies: any cross-references to other policy IDs (BC-xxx-yyy)
9. Definitions: any terms defined within this section (not in glossary)
10. If NO items exist for a category, return an empty array — do NOT omit the key`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.policyExtraction,
    max_tokens: RAG_CONFIG.llm.maxTokens.policyExtraction,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<PolicyExtractionResult>(text, 'extractPoliciesForSection');
}
```

## 7.3 Pass 3: `extractTableData()`

```typescript
async extractTableData(params: {
  tableText: string;
  surroundingContext: string;
  documentType: RAGDocumentType;
}): Promise<TableExtractionResult> {
  const { tableText, surroundingContext, documentType } = params;

  const systemPrompt = `You are a table data extraction specialist. Extract every row from the table as structured data. Output ONLY valid JSON.`;

  const userPrompt = `Extract all data from this table.

Context around the table:
${surroundingContext}

Table content:
${tableText}

Produce a JSON object:
{
  "tableName": "Descriptive name for this table",
  "tableContext": "Which section/policy this table belongs to",
  "columns": ["Column 1", "Column 2", "Column 3"],
  "rows": [
    { "Column 1": "value", "Column 2": "value", "Column 3": "value" }
  ]
}

RULES:
1. Extract EVERY row including header-like rows
2. Preserve exact values (numbers, percentages, dollar amounts)
3. If cells span multiple lines, combine them
4. For the tableName, use the table's caption or the nearest heading
5. tableContext should reference the section title or policy ID`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.tableExtraction,
    max_tokens: RAG_CONFIG.llm.maxTokens.tableExtraction,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<TableExtractionResult>(text, 'extractTableData');
}
```

## 7.4 Pass 4: `extractGlossaryAndRelationships()`

```typescript
async extractGlossaryAndRelationships(params: {
  documentText: string;
  existingSections: Array<{ title: string; policyId: string | null }>;
}): Promise<GlossaryExtractionResult> {
  const { documentText, existingSections } = params;

  const sectionList = existingSections
    .map(s => `- ${s.title}${s.policyId ? ` (${s.policyId})` : ''}`)
    .join('\n');

  const systemPrompt = `You are a glossary and entity extraction specialist. Extract ALL defined terms, key entities, and cross-references. Output ONLY valid JSON.`;

  const userPrompt = `Extract all glossary terms, entities, and relationships from this document.

Known sections:
${sectionList}

<document>
${documentText}
</document>

Produce a JSON object:
{
  "definitions": [
    {
      "term": "Active Liquidity",
      "definition": "Cash and cash-equivalent assets immediately available for deployment",
      "policyContext": "Used in BC-ELIG-001 Minimum Balance requirements"
    }
  ],
  "entities": [
    {
      "name": "BCCC (Sun Chip Confirmation Ceremony)",
      "type": "process",
      "description": "Biometric verification ceremony required for high-value transactions"
    }
  ],
  "relationships": [
    {
      "from": "BC-ELIG-001",
      "to": "BC-ELIG-004",
      "type": "triggers",
      "description": "Falling below minimum balance triggers Account Closure policy"
    }
  ]
}

EXTRACTION RULES:
1. Definitions: Every term that is explicitly defined in the document (glossary section, inline definitions)
2. Entities: Named processes, systems, roles, organizations, standards referenced in the document
   - Types: person, organization, process, system, standard, role, concept
3. Relationships: Cross-references between policies, sections, or entities
   - Types: triggers, requires, overrides, extends, references, conflicts_with
4. Extract ALL items — do not skip any defined terms even if they seem minor
5. For definitions, include the policyContext showing where/how the term is used`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.glossaryExtraction,
    max_tokens: RAG_CONFIG.llm.maxTokens.glossaryExtraction,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<GlossaryExtractionResult>(text, 'extractGlossaryAndRelationships');
}
```

## 7.5 Pass 5: `extractNarrativeFacts()`

```typescript
async extractNarrativeFacts(params: {
  sectionText: string;
  sectionTitle: string;
  documentType: RAGDocumentType;
}): Promise<NarrativeExtractionResult> {
  const { sectionText, sectionTitle, documentType } = params;

  let typeGuidance = '';
  if (documentType === 'narrative') {
    typeGuidance = `This is the PRIMARY extraction pass for this narrative document. Extract ALL factual claims, requirements, conditions, definitions-in-context, temporal statements, and quantitative assertions.`;
  } else if (documentType === 'tabular') {
    typeGuidance = `Extract any introductory/explanatory text around tables (headers, footnotes, disclaimers). Usually very few narrative facts for tabular documents.`;
  } else {
    typeGuidance = `Extract facts from the narrative portions of this section that were NOT captured as labeled rules or table rows. Focus on: claims, conditions, qualifiers, implicit requirements.`;
  }

  const systemPrompt = `You are a narrative fact extraction specialist. Extract factual statements from unstructured text. Output ONLY valid JSON.`;

  const userPrompt = `Extract all narrative facts from this section.

Section: "${sectionTitle}"

${typeGuidance}

<section>
${sectionText}
</section>

Produce a JSON object:
{
  "facts": [
    {
      "factType": "narrative_fact",
      "content": "70% of wealth transfers fail due to lack of communication and heir preparation",
      "sourceText": "From the Great Wealth Transfer subsection",
      "confidence": 0.9,
      "factCategory": "statistic",
      "subsection": "Multi-Generational Wealth Stewardship"
    }
  ]
}

EXTRACTION RULES:
1. Each fact should be an atomic, self-contained statement
2. factType should be one of: narrative_fact, fact, entity, definition
3. factCategory: statistic, requirement, condition, process, recommendation, claim, qualification
4. subsection: the nearest sub-heading or topic within the section
5. confidence: 0.9 for explicit statements, 0.7-0.8 for inferred/implicit facts
6. Do NOT duplicate facts that would be captured by policy rule extraction (R1, E1 patterns)
7. Focus on: statistics, best practices, process descriptions, organizational structure, conditions, qualifiers, temporal statements, quantitative assertions`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.narrativeExtraction,
    max_tokens: RAG_CONFIG.llm.maxTokens.narrativeExtraction,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<NarrativeExtractionResult>(text, 'extractNarrativeFacts');
}
```

## 7.6 Pass 6: `verifyExtractionCompleteness()`

```typescript
async verifyExtractionCompleteness(params: {
  sectionText: string;
  sectionTitle: string;
  existingFacts: FactExtraction[];
  documentType: RAGDocumentType;
}): Promise<VerificationResult> {
  const { sectionText, sectionTitle, existingFacts, documentType } = params;

  const existingFactList = existingFacts
    .map((f, i) => `  ${i + 1}. [${f.factType}] ${f.content}`)
    .join('\n');

  const systemPrompt = `You are an extraction completeness verifier. Your job is to find facts that were MISSED by previous extraction passes. You must be thorough and precise. Output ONLY valid JSON.`;

  const userPrompt = `Review this section and find any facts that were MISSED by previous extraction.

Section: "${sectionTitle}"
Document Type: ${documentType}

<section_text>
${sectionText}
</section_text>

<already_extracted_facts>
${existingFactList || '(No facts extracted yet)'}
</already_extracted_facts>

Your task: Compare the section text against the already-extracted facts. Find ANY information that was missed. Focus specifically on:
1. Implicit limits, thresholds, or conditions not captured
2. Facts buried in subordinate clauses or qualifying phrases
3. Cross-references to other sections or policies
4. Qualifiers or conditions that modify existing rules
5. Numeric values (dollar amounts, percentages, time periods) not yet captured
6. Process steps or procedures described in text
7. Definitions given in context (not in a glossary)
8. Exceptions or edge cases mentioned in passing

Return ONLY the newly found facts — do NOT duplicate anything already in the extracted list.

Produce a JSON object:
{
  "missingFacts": [
    {
      "factType": "limit",
      "content": "The actual missing fact content",
      "sourceText": "Brief quote from the section showing the source",
      "confidence": 0.85,
      "factCategory": "verification_recovery",
      "subsection": "Nearest heading"
    }
  ],
  "coverageEstimate": 0.95
}

RULES:
1. Only include genuinely new facts not already in the extracted list
2. Set factCategory to "verification_recovery" for all facts found by this pass
3. coverageEstimate: your estimate of what % of the section's factual content is now captured (0.0-1.0)
4. If nothing is missing, return empty missingFacts array and coverageEstimate near 1.0
5. Be thorough — check every sentence against the extracted facts list`;

  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.ingestionModels.verification,
    max_tokens: RAG_CONFIG.llm.maxTokens.verification,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonResponse<VerificationResult>(text, 'verifyExtractionCompleteness');
}
```

---

# 8. Ingestion Service Refactor

**File:** `src/lib/rag/services/rag-ingestion-service.ts`

The existing `processDocument()` function (lines 262-537) is replaced by individual step functions called from Inngest. The function itself becomes a thin orchestrator, but the primary orchestration moves to the Inngest function.

## 8.1 New Helper Functions to Add

Add these functions after the existing `getDocument()` function at the bottom of the file:

### 8.1.1 Document Fingerprinting

```typescript
import * as crypto from 'crypto';

/**
 * Generate SHA-256 content hash for duplicate detection.
 * Added to createDocumentRecord flow.
 */
function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
```

Update `createDocumentRecord()` to accept `originalText` and compute hash:

In the existing `createDocumentRecord` function, after the insert, update with content hash when text becomes available. Alternatively, the hash is set in `uploadDocumentFile()` after text extraction:

```typescript
// In uploadDocumentFile(), after successful text extraction, add:
const contentHash = generateContentHash(extraction.text);

// Update document record with file path, extracted text, AND content hash
await supabase
  .from('rag_documents')
  .update({
    file_path: filePath,
    file_size_bytes: params.file.length,
    original_text: extraction.text,
    content_hash: contentHash,
    status: 'processing',
  })
  .eq('id', params.documentId);
```

### 8.1.2 Section Storage from Structure Analysis

```typescript
/**
 * Store sections by slicing the original document text using Pass 1 line boundaries.
 * This is the KEY optimization from 011: sections are sliced from the source text,
 * NOT echoed back by the LLM, saving ~18K output tokens.
 */
export async function storeSectionsFromStructure(
  documentId: string,
  userId: string,
  originalText: string,
  structure: StructureAnalysisResult
): Promise<RAGSection[]> {
  const supabase = createServerSupabaseAdminClient();
  const lines = originalText.split('\n');

  const sectionRecords = structure.sections.map((section, index) => {
    // Slice original text using line boundaries from Pass 1
    const sectionLines = lines.slice(
      Math.max(0, section.startLine - 1),  // 1-indexed to 0-indexed
      Math.min(lines.length, section.endLine)
    );
    const sectionText = sectionLines.join('\n');

    return {
      document_id: documentId,
      user_id: userId,
      section_index: index,
      title: section.title,
      original_text: sectionText,
      summary: section.summary,
      token_count: Math.ceil(sectionText.length / 4),
      section_metadata: {
        policyId: section.policyId,
        isNarrative: section.isNarrative,
        startLine: section.startLine,
        endLine: section.endLine,
      },
    };
  });

  const { data: insertedSections, error } = await supabase
    .from('rag_sections')
    .insert(sectionRecords)
    .select('*');

  if (error) {
    console.error('[RAG Ingestion] Error storing sections:', error);
    throw new Error(`Failed to store sections: ${error.message}`);
  }

  return (insertedSections || []).map(mapRowToSection);
}
```

### 8.1.3 Convert Pass Results to FactExtraction Arrays

```typescript
/**
 * Convert PolicyExtractionResult into flat FactExtraction array for storage.
 */
function policyResultToFacts(
  result: PolicyExtractionResult,
  sectionTitle: string
): FactExtraction[] {
  const facts: FactExtraction[] = [];

  for (const rule of result.rules) {
    facts.push({
      factType: 'policy_rule',
      content: `${rule.ruleId}: ${rule.content}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      ruleId: rule.ruleId,
      factCategory: 'rule',
      subsection: sectionTitle,
    });

    // Extract limits as separate facts from rule conditions/amounts
    for (const amount of rule.amounts) {
      facts.push({
        factType: 'limit',
        content: `${rule.ruleId} amount: ${amount}`,
        sourceText: `From ${sectionTitle} (${result.policyId}), ${rule.ruleId}`,
        confidence: 0.95,
        policyId: result.policyId,
        ruleId: rule.ruleId,
        factCategory: 'limit',
        subsection: sectionTitle,
      });
    }
  }

  for (const exc of result.exceptions) {
    facts.push({
      factType: 'policy_exception',
      content: `${exc.exceptionId}: ${exc.content}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      qualifiesRule: exc.qualifiesRule,
      factCategory: 'exception',
      subsection: sectionTitle,
    });
  }

  for (const limit of result.limits) {
    facts.push({
      factType: 'limit',
      content: `${limit.name}: ${limit.value} ${limit.unit} (${limit.window})`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'limit',
      subsection: sectionTitle,
    });
  }

  for (const doc of result.requiredDocuments) {
    facts.push({
      factType: 'required_document',
      content: `${doc.scenario}: ${doc.documents.join(', ')}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'required_document',
      subsection: sectionTitle,
    });
  }

  for (const esc of result.escalations) {
    facts.push({
      factType: 'escalation_path',
      content: `${esc.trigger}: ${esc.levels.join(' → ')}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'escalation',
      subsection: sectionTitle,
    });
  }

  for (const af of result.auditFields) {
    facts.push({
      factType: 'audit_field',
      content: `${af.fieldName}: ${af.description}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.90,
      policyId: result.policyId,
      factCategory: 'audit_field',
      subsection: sectionTitle,
    });
  }

  for (const rel of result.relatedPolicies) {
    facts.push({
      factType: 'cross_reference',
      content: `${result.policyId} → ${rel.policyId}: ${rel.relationship}`,
      sourceText: `From ${sectionTitle}`,
      confidence: 0.90,
      policyId: result.policyId,
      factCategory: 'cross_reference',
      subsection: sectionTitle,
    });
  }

  for (const def of result.definitions) {
    facts.push({
      factType: 'definition',
      content: `${def.term}: ${def.definition}`,
      sourceText: `From ${sectionTitle} (${result.policyId})`,
      confidence: 0.95,
      policyId: result.policyId,
      factCategory: 'definition',
      subsection: sectionTitle,
    });
  }

  return facts;
}

/**
 * Convert TableExtractionResult into flat FactExtraction array.
 */
function tableResultToFacts(result: TableExtractionResult): FactExtraction[] {
  return result.rows.map(row => {
    const content = result.columns
      .map(col => `${col}: ${row[col] || ''}`)
      .join(', ');

    return {
      factType: 'table_row' as RAGFactType,
      content,
      sourceText: `From table "${result.tableName}" (${result.tableContext})`,
      confidence: 0.95,
      factCategory: 'table_entry',
      subsection: result.tableContext,
    };
  });
}

/**
 * Convert GlossaryExtractionResult into flat FactExtraction array.
 */
function glossaryResultToFacts(result: GlossaryExtractionResult): FactExtraction[] {
  const facts: FactExtraction[] = [];

  for (const def of result.definitions) {
    facts.push({
      factType: 'definition',
      content: `${def.term}: ${def.definition}`,
      sourceText: `Glossary — ${def.policyContext}`,
      confidence: 0.95,
      factCategory: 'definition',
    });
  }

  for (const entity of result.entities) {
    facts.push({
      factType: 'entity',
      content: `${entity.name} (${entity.type}): ${entity.description}`,
      sourceText: 'Entity extraction',
      confidence: 0.90,
      factCategory: 'entity',
    });
  }

  for (const rel of result.relationships) {
    facts.push({
      factType: 'relationship',
      content: `${rel.from} → ${rel.to} (${rel.type}): ${rel.description}`,
      sourceText: 'Relationship extraction',
      confidence: 0.85,
      factCategory: 'cross_reference',
    });
  }

  return facts;
}
```

### 8.1.4 Store Facts with Provenance

```typescript
/**
 * Store extracted facts with provenance fields.
 * Replaces the simple fact insertion in the current processDocument().
 */
export async function storeExtractedFacts(
  documentId: string,
  userId: string,
  sectionId: string | null,
  facts: FactExtraction[]
): Promise<RAGFact[]> {
  if (facts.length === 0) return [];

  const supabase = createServerSupabaseAdminClient();

  const records = facts.map(fact => ({
    document_id: documentId,
    user_id: userId,
    section_id: sectionId,
    fact_type: fact.factType,
    content: fact.content,
    source_text: fact.sourceText,
    confidence: fact.confidence,
    metadata: {},
    policy_id: fact.policyId || null,
    rule_id: fact.ruleId || null,
    subsection: fact.subsection || null,
    fact_category: fact.factCategory || null,
  }));

  const { data: insertedFacts, error } = await supabase
    .from('rag_facts')
    .insert(records)
    .select('*');

  if (error) {
    console.warn('[RAG Ingestion] Error storing facts:', error);
    return [];
  }

  return (insertedFacts || []).map(mapRowToFact);
}
```

### 8.1.5 Relationship Linking (Code-Only, No LLM)

```typescript
/**
 * Pass 6.5 (code-only): Link related facts by matching rule IDs.
 * - Exceptions → their qualifying rules (via qualifiesRule → ruleId match)
 * - Limits → their policies (via policyId match)
 * No LLM calls — pure database operations.
 */
export async function linkFactRelationships(documentId: string): Promise<void> {
  const supabase = createServerSupabaseAdminClient();

  // Fetch all facts for this document
  const { data: factRows, error } = await supabase
    .from('rag_facts')
    .select('*')
    .eq('document_id', documentId);

  if (error || !factRows) {
    console.warn('[RAG Ingestion] Could not fetch facts for linking:', error);
    return;
  }

  const facts = factRows.map(mapRowToFact);

  // Build lookup: policyId + ruleId → factId
  const ruleMap = new Map<string, string>();
  for (const fact of facts) {
    if (fact.factType === 'policy_rule' && fact.policyId && fact.ruleId) {
      ruleMap.set(`${fact.policyId}::${fact.ruleId}`, fact.id);
    }
  }

  // Link exceptions to their qualifying rules
  for (const fact of facts) {
    if (fact.factType === 'policy_exception' && fact.policyId) {
      // Extract qualifiesRule from metadata or content
      const qualifiesRule = (fact.metadata as any)?.qualifiesRule || extractQualifiesRule(fact.content);
      if (qualifiesRule) {
        const parentId = ruleMap.get(`${fact.policyId}::${qualifiesRule}`);
        if (parentId) {
          await supabase
            .from('rag_facts')
            .update({ parent_fact_id: parentId })
            .eq('id', fact.id);
        }
      }
    }
  }

  console.log(`[RAG Ingestion] Linked relationships for ${facts.length} facts`);
}

/**
 * Extract the rule ID that an exception qualifies from the exception content.
 * E.g., "E1: High Liquidity Offset (qualifies R4)" → "R4"
 */
function extractQualifiesRule(content: string): string | null {
  const match = content.match(/qualifies\s+(R\d+)/i)
    || content.match(/modifies\s+(R\d+)/i)
    || content.match(/exception\s+to\s+(R\d+)/i);
  return match ? match[1] : null;
}
```

### 8.1.6 Programmatic Table Detection

```typescript
/**
 * Find markdown table regions in text by detecting | delimiters.
 * Returns line ranges for each detected table.
 */
export function findTableRegions(text: string): Array<{ startLine: number; endLine: number }> {
  const lines = text.split('\n');
  const tables: Array<{ startLine: number; endLine: number }> = [];
  let tableStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableLine = line.startsWith('|') && line.endsWith('|');

    if (isTableLine && tableStart === -1) {
      tableStart = i + 1; // 1-indexed
    } else if (!isTableLine && tableStart !== -1) {
      if ((i + 1) - tableStart >= 3) {
        // At least header + separator + 1 row
        tables.push({ startLine: tableStart, endLine: i }); // i is already 1-indexed end
      }
      tableStart = -1;
    }
  }

  // Handle table at end of text
  if (tableStart !== -1 && (lines.length + 1) - tableStart >= 3) {
    tables.push({ startLine: tableStart, endLine: lines.length });
  }

  return tables;
}
```

---

# 9. Inngest Multi-Step Pipeline

**File:** `src/inngest/functions/process-rag-document.ts`

Replace the entire file:

```typescript
/**
 * Inngest Function: Process RAG Document (Multi-Pass Pipeline)
 *
 * 6-Pass extraction pipeline:
 *   Pass 1: Structure Analysis (Sonnet 4.5) — document type + section map
 *   Pass 2: Policy Extraction (Sonnet 4.5) — rules, exceptions, limits per section
 *   Pass 3: Table Extraction (Sonnet 4.5) — structured table data
 *   Pass 4: Glossary & Entities (Haiku) — definitions, entities, relationships
 *   Pass 5: Narrative Facts (Sonnet 4.5) — implicit facts from prose sections
 *   Pass 6: Verification (Opus 4.6) — find missed facts per section
 *
 * After extraction:
 *   - Relationship linking (code-only)
 *   - Contextual preamble generation (Haiku)
 *   - Enriched 3-tier embedding generation (OpenAI)
 *   - Status update
 */

import { inngest } from '../client';
import { createServerSupabaseAdminClient } from '@/lib/supabase-server';
import { ClaudeLLMProvider } from '@/lib/rag/providers';
import {
  storeSectionsFromStructure,
  storeExtractedFacts,
  linkFactRelationships,
  findTableRegions,
} from '@/lib/rag/services/rag-ingestion-service';
import {
  policyResultToFacts,
  tableResultToFacts,
  glossaryResultToFacts,
} from '@/lib/rag/services/rag-ingestion-service';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings } from '@/lib/rag/services/rag-embedding-service';
import { mapRowToDocument, mapRowToSection, mapRowToFact } from '@/lib/rag/services/rag-db-mappers';
import { buildEnrichedEmbeddingText } from '@/lib/rag/services/rag-embedding-service';
import type { FactExtraction, StructureAnalysisResult, RAGSection, RAGFact } from '@/types/rag';

export const processRAGDocument = inngest.createFunction(
  {
    id: 'process-rag-document',
    name: 'Process RAG Document (Multi-Pass)',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'rag/document.uploaded' },
  async ({ event, step }) => {
    const { documentId, userId } = event.data;
    const supabase = createServerSupabaseAdminClient();
    const provider = new ClaudeLLMProvider();

    console.log(`[Inngest] Starting multi-pass pipeline for ${documentId}`);

    // ========================================
    // Step 0: Fetch document and validate
    // ========================================
    const doc = await step.run('fetch-document', async () => {
      const { data: docRow, error } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !docRow) throw new Error('Document not found');
      const doc = mapRowToDocument(docRow);
      if (!doc.originalText) throw new Error('Document has no extracted text');

      // Update status
      await supabase
        .from('rag_documents')
        .update({ status: 'processing', processing_started_at: new Date().toISOString() })
        .eq('id', documentId);

      return {
        id: doc.id,
        userId: doc.userId,
        fileName: doc.fileName,
        originalText: doc.originalText,
        knowledgeBaseId: doc.knowledgeBaseId,
        fastMode: doc.fastMode,
      };
    });

    // ========================================
    // Step 1: Pass 1 — Structure Analysis (Sonnet 4.5)
    // ========================================
    const structure = await step.run('pass-1-structure', async () => {
      console.log(`[Inngest] Pass 1: Analyzing document structure...`);
      const result = await provider.analyzeDocumentStructure({
        documentText: doc.originalText,
        fileName: doc.fileName,
      });

      // Store document type
      await supabase
        .from('rag_documents')
        .update({ document_type: result.documentType })
        .eq('id', documentId);

      console.log(`[Inngest] Pass 1 complete: ${result.sections.length} sections, type=${result.documentType}`);
      return result;
    });

    // ========================================
    // Step 2: Store sections from structure
    // ========================================
    const sections = await step.run('store-sections', async () => {
      console.log(`[Inngest] Storing ${structure.sections.length} sections...`);
      const stored = await storeSectionsFromStructure(
        documentId, doc.userId, doc.originalText, structure
      );
      console.log(`[Inngest] Stored ${stored.length} sections`);
      return stored.map(s => ({ id: s.id, title: s.title, originalText: s.originalText, sectionMetadata: s.sectionMetadata }));
    });

    // ========================================
    // Step 3: Pass 2 — Policy Extraction (Sonnet 4.5)
    // ========================================
    const policyFacts = await step.run('pass-2-policies', async () => {
      if (structure.documentType === 'tabular') {
        console.log(`[Inngest] Pass 2: Skipped (tabular document)`);
        return [];
      }

      console.log(`[Inngest] Pass 2: Extracting policies from ${sections.length} sections...`);
      const allFacts: FactExtraction[] = [];

      for (const section of sections) {
        const policyId = (section.sectionMetadata as any)?.policyId || null;
        try {
          const result = await provider.extractPoliciesForSection({
            sectionText: section.originalText,
            sectionTitle: section.title || 'Untitled',
            policyId,
            documentType: structure.documentType,
          });
          const facts = policyResultToFacts(result, section.title || 'Untitled');
          const stored = await storeExtractedFacts(documentId, doc.userId, section.id, facts);
          allFacts.push(...facts);
          console.log(`[Inngest] Pass 2: ${section.title}: ${facts.length} facts`);
        } catch (err) {
          console.warn(`[Inngest] Pass 2 error for "${section.title}":`, err);
        }
      }

      console.log(`[Inngest] Pass 2 complete: ${allFacts.length} total policy facts`);
      return allFacts;
    });

    // ========================================
    // Step 4: Pass 3 — Table Extraction (Sonnet 4.5)
    // ========================================
    const tableFacts = await step.run('pass-3-tables', async () => {
      if (structure.documentType === 'narrative') {
        console.log(`[Inngest] Pass 3: Skipped (narrative document)`);
        return [];
      }

      // Use both Pass 1 table identification AND programmatic detection
      const detectedTables = findTableRegions(doc.originalText);
      const allTableRegions = [
        ...structure.tables,
        ...detectedTables.filter(dt =>
          !structure.tables.some(st =>
            Math.abs(st.startLine - dt.startLine) < 3
          )
        ),
      ];

      console.log(`[Inngest] Pass 3: Extracting ${allTableRegions.length} tables...`);
      const allFacts: FactExtraction[] = [];
      const lines = doc.originalText.split('\n');

      for (const table of allTableRegions) {
        const tableLines = lines.slice(
          Math.max(0, table.startLine - 1),
          Math.min(lines.length, table.endLine)
        );
        const tableText = tableLines.join('\n');

        // Get surrounding context (5 lines before and after)
        const contextBefore = lines.slice(
          Math.max(0, table.startLine - 6),
          Math.max(0, table.startLine - 1)
        ).join('\n');
        const contextAfter = lines.slice(
          Math.min(lines.length, table.endLine),
          Math.min(lines.length, table.endLine + 5)
        ).join('\n');

        try {
          const result = await provider.extractTableData({
            tableText,
            surroundingContext: `${contextBefore}\n[TABLE]\n${contextAfter}`,
            documentType: structure.documentType,
          });
          const facts = tableResultToFacts(result);

          // Find the section this table belongs to
          const sectionId = findSectionForLine(sections, structure, table.startLine);
          await storeExtractedFacts(documentId, doc.userId, sectionId, facts);
          allFacts.push(...facts);
          console.log(`[Inngest] Pass 3: Table "${result.tableName}": ${facts.length} rows`);
        } catch (err) {
          console.warn(`[Inngest] Pass 3 error for table at line ${table.startLine}:`, err);
        }
      }

      console.log(`[Inngest] Pass 3 complete: ${allFacts.length} total table facts`);
      return allFacts;
    });

    // ========================================
    // Step 5: Pass 4 — Glossary & Entities (Haiku)
    // ========================================
    const glossaryFacts = await step.run('pass-4-glossary', async () => {
      console.log(`[Inngest] Pass 4: Extracting glossary, entities, relationships...`);

      const result = await provider.extractGlossaryAndRelationships({
        documentText: doc.originalText,
        existingSections: structure.sections.map(s => ({
          title: s.title,
          policyId: s.policyId,
        })),
      });

      const facts = glossaryResultToFacts(result);
      await storeExtractedFacts(documentId, doc.userId, null, facts);

      console.log(`[Inngest] Pass 4 complete: ${result.definitions.length} definitions, ${result.entities.length} entities, ${result.relationships.length} relationships`);
      return facts;
    });

    // ========================================
    // Step 6: Pass 5 — Narrative Facts (Sonnet 4.5)
    // ========================================
    const narrativeFacts = await step.run('pass-5-narrative', async () => {
      // Determine which sections get narrative extraction
      const narrativeSections = sections.filter(s => {
        const meta = s.sectionMetadata as any;
        if (structure.documentType === 'narrative') return true;
        if (structure.documentType === 'structured-policy') return meta?.isNarrative === true;
        if (structure.documentType === 'mixed') return meta?.isNarrative === true;
        if (structure.documentType === 'tabular') return false;
        return false;
      });

      if (narrativeSections.length === 0) {
        console.log(`[Inngest] Pass 5: No narrative sections to process`);
        return [];
      }

      console.log(`[Inngest] Pass 5: Extracting narrative facts from ${narrativeSections.length} sections...`);
      const allFacts: FactExtraction[] = [];

      for (const section of narrativeSections) {
        try {
          const result = await provider.extractNarrativeFacts({
            sectionText: section.originalText,
            sectionTitle: section.title || 'Untitled',
            documentType: structure.documentType,
          });

          await storeExtractedFacts(documentId, doc.userId, section.id, result.facts);
          allFacts.push(...result.facts);
          console.log(`[Inngest] Pass 5: "${section.title}": ${result.facts.length} narrative facts`);
        } catch (err) {
          console.warn(`[Inngest] Pass 5 error for "${section.title}":`, err);
        }
      }

      console.log(`[Inngest] Pass 5 complete: ${allFacts.length} total narrative facts`);
      return allFacts;
    });

    // ========================================
    // Step 7: Pass 6 — Verification (Opus 4.6)
    // ========================================
    const verificationFacts = await step.run('pass-6-verification', async () => {
      console.log(`[Inngest] Pass 6: Running Opus 4.6 verification on ${sections.length} sections...`);
      const allFacts: FactExtraction[] = [];

      for (const section of sections) {
        // Gather all facts already extracted for this section
        const { data: existingFactRows } = await supabase
          .from('rag_facts')
          .select('*')
          .eq('document_id', documentId)
          .eq('section_id', section.id);

        const existingFacts: FactExtraction[] = (existingFactRows || []).map(row => ({
          factType: row.fact_type as any,
          content: row.content,
          sourceText: row.source_text || '',
          confidence: row.confidence,
          factCategory: row.fact_category || undefined,
          subsection: row.subsection || undefined,
        }));

        try {
          const result = await provider.verifyExtractionCompleteness({
            sectionText: section.originalText,
            sectionTitle: section.title || 'Untitled',
            existingFacts,
            documentType: structure.documentType,
          });

          if (result.missingFacts.length > 0) {
            await storeExtractedFacts(documentId, doc.userId, section.id, result.missingFacts);
            allFacts.push(...result.missingFacts);
            console.log(`[Inngest] Pass 6: "${section.title}": found ${result.missingFacts.length} missed facts (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
          } else {
            console.log(`[Inngest] Pass 6: "${section.title}": complete (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
          }
        } catch (err) {
          console.warn(`[Inngest] Pass 6 error for "${section.title}":`, err);
        }
      }

      console.log(`[Inngest] Pass 6 complete: ${allFacts.length} recovery facts`);
      return allFacts;
    });

    // ========================================
    // Step 8: Relationship Linking (code-only)
    // ========================================
    await step.run('link-relationships', async () => {
      console.log(`[Inngest] Linking fact relationships...`);
      await linkFactRelationships(documentId);
    });

    // ========================================
    // Step 9: Expert Questions Storage
    // ========================================
    await step.run('store-expert-questions', async () => {
      if (structure.expertQuestions.length === 0) return;
      console.log(`[Inngest] Storing ${structure.expertQuestions.length} expert questions...`);

      const records = structure.expertQuestions.map((q, index) => ({
        document_id: documentId,
        user_id: doc.userId,
        question_text: q.questionText,
        question_reason: q.questionReason,
        impact_level: q.impactLevel,
        sort_order: index,
        skipped: false,
      }));

      await supabase.from('rag_expert_questions').insert(records);
    });

    // ========================================
    // Step 10: Contextual Preambles (Haiku)
    // ========================================
    await step.run('generate-preambles', async () => {
      console.log(`[Inngest] Generating contextual preambles for ${sections.length} sections...`);

      for (const section of sections) {
        try {
          const preambleResult = await provider.generateContextualPreamble({
            documentSummary: structure.summary,
            sectionText: section.originalText.slice(0, 2000),
            sectionTitle: section.title || undefined,
          });

          await supabase
            .from('rag_sections')
            .update({ contextual_preamble: preambleResult.preamble })
            .eq('id', section.id);
        } catch (err) {
          console.warn(`[Inngest] Preamble error for "${section.title}":`, err);
        }
      }
    });

    // ========================================
    // Step 11: Generate Enriched Embeddings
    // ========================================
    const embeddingCount = await step.run('generate-embeddings', async () => {
      console.log(`[Inngest] Generating enriched 3-tier embeddings...`);

      // Delete any existing embeddings (in case of retry)
      await deleteDocumentEmbeddings(documentId);

      // Fetch all current sections and facts
      const { data: sectionRows } = await supabase
        .from('rag_sections')
        .select('*')
        .eq('document_id', documentId);
      const currentSections = (sectionRows || []).map(mapRowToSection);

      const { data: factRows } = await supabase
        .from('rag_facts')
        .select('*')
        .eq('document_id', documentId);
      const currentFacts = (factRows || []).map(mapRowToFact);

      const embeddingItems: Array<{
        sourceType: 'document' | 'section' | 'fact';
        sourceId: string;
        contentText: string;
        tier: 1 | 2 | 3;
      }> = [];

      // Tier 1: Document-level
      embeddingItems.push({
        sourceType: 'document',
        sourceId: documentId,
        contentText: `${structure.summary}\n\nTopics: ${structure.topicTaxonomy.join(', ')}`,
        tier: 1,
      });

      // Tier 2: Section-level (contextual preamble + summary)
      for (const section of currentSections) {
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

      // Tier 3: Fact-level (enriched with provenance context)
      for (const fact of currentFacts) {
        embeddingItems.push({
          sourceType: 'fact',
          sourceId: fact.id,
          contentText: buildEnrichedEmbeddingText(fact),
          tier: 3,
        });
      }

      const result = await generateAndStoreBatchEmbeddings({
        documentId,
        userId: doc.userId,
        items: embeddingItems,
      });

      console.log(`[Inngest] Generated ${embeddingItems.length} embeddings`);
      return embeddingItems.length;
    });

    // ========================================
    // Step 12: Finalize
    // ========================================
    await step.run('finalize', async () => {
      // Count facts
      const { count: factCount } = await supabase
        .from('rag_facts')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const { count: sectionCount } = await supabase
        .from('rag_sections')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      const finalStatus = doc.fastMode ? 'ready' : 'awaiting_questions';

      await supabase
        .from('rag_documents')
        .update({
          status: finalStatus,
          processing_completed_at: new Date().toISOString(),
          document_summary: structure.summary,
          topic_taxonomy: structure.topicTaxonomy,
          ambiguity_list: structure.ambiguities,
          section_count: sectionCount || 0,
          fact_count: factCount || 0,
          question_count: structure.expertQuestions.length,
          total_tokens_estimated: Math.ceil(doc.originalText.length / 4),
        })
        .eq('id', documentId);

      console.log(`[Inngest] ========================================`);
      console.log(`[Inngest] PIPELINE COMPLETE: ${doc.fileName}`);
      console.log(`[Inngest]   Status: ${finalStatus}`);
      console.log(`[Inngest]   Sections: ${sectionCount}`);
      console.log(`[Inngest]   Facts: ${factCount}`);
      console.log(`[Inngest]   Embeddings: ${embeddingCount}`);
      console.log(`[Inngest] ========================================`);
    });

    return { success: true, documentId };
  }
);

/**
 * Find the section ID that contains a given line number.
 */
function findSectionForLine(
  sections: Array<{ id: string; sectionMetadata: Record<string, unknown> }>,
  structure: StructureAnalysisResult,
  lineNumber: number
): string | null {
  for (let i = 0; i < structure.sections.length; i++) {
    const s = structure.sections[i];
    if (lineNumber >= s.startLine && lineNumber <= s.endLine) {
      return sections[i]?.id || null;
    }
  }
  return null;
}
```

---

# 10. DB Mapper Updates

**File:** `src/lib/rag/services/rag-db-mappers.ts`

## 10.1 Updated `mapRowToFact` (lines 103-117)

**Replace with:**
```typescript
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
```

## 10.2 Updated `mapRowToDocument` — Add New Fields

Add these two lines to the return object in `mapRowToDocument`:

```typescript
contentHash: row.content_hash,
documentType: row.document_type as RAGDocumentType | null,
```

---

# 11. Embedding Service Updates

**File:** `src/lib/rag/services/rag-embedding-service.ts`

## 11.1 New Export: `buildEnrichedEmbeddingText`

Add this function after the existing `deleteDocumentEmbeddings`:

```typescript
import type { RAGFact } from '@/types/rag';

/**
 * Build enriched embedding text for a fact by prepending provenance context.
 * This improves vector search precision by encoding policy/section/category context
 * into the embedding itself.
 *
 * Examples:
 *   "[Policy: BC-PROD-004] [Section: Jumbo Mortgage] [Category: rule] R4: DTI capped at 43%"
 *   "[Policy: BC-PROD-004] [Qualifies: R4] E1: High Liquidity Offset: DTI expanded to 45%"
 *   "[Category: limit] Max FDIC Coverage: $100,000,000 via sweep network"
 */
export function buildEnrichedEmbeddingText(fact: RAGFact): string {
  const parts: string[] = [];

  if (fact.policyId) {
    parts.push(`[Policy: ${fact.policyId}]`);
  }
  if (fact.subsection) {
    parts.push(`[Section: ${fact.subsection}]`);
  }
  if (fact.factCategory) {
    parts.push(`[Category: ${fact.factCategory}]`);
  }

  // For exceptions, include the qualifying rule context
  if (fact.factType === 'policy_exception' && fact.parentFactId) {
    // parentFactId is set by linkFactRelationships — if available, use metadata
    const qualifies = (fact.metadata as any)?.qualifiesRule;
    if (qualifies) {
      parts.push(`[Qualifies: ${qualifies}]`);
    }
  }

  parts.push(fact.content);
  return parts.join(' ');
}
```

---

# 12. Phase 2 — Multi-Document Retrieval

**Timeline:** After Phase 1 is validated with ≥95% extraction on Sun Chip document.

## 12.1 Changes to `rag-embedding-service.ts`

### Update `searchSimilarEmbeddings` to support KB-wide search

Add `knowledgeBaseId` parameter:

```typescript
export async function searchSimilarEmbeddings(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;  // NEW: for KB-wide search
  tier?: RAGEmbeddingTier;
  limit?: number;
  threshold?: number;
}): Promise<...> {
  // ...existing code...
  // Change the RPC call to use the new KB-wide function:
  const { data, error } = await supabase.rpc('match_rag_embeddings_kb', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_knowledge_base_id: params.knowledgeBaseId || null,
    filter_document_id: params.documentId || null,
    filter_tier: tier || null,
  });
  // ...rest unchanged...
}
```

### Add hybrid text search function

```typescript
export async function searchTextContent(params: {
  queryText: string;
  knowledgeBaseId?: string;
  documentId?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: Array<{ sourceType: string; sourceId: string; documentId: string; content: string; rank: number }>; error?: string }> {
  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase.rpc('search_rag_text', {
    search_query: params.queryText,
    filter_knowledge_base_id: params.knowledgeBaseId || null,
    filter_document_id: params.documentId || null,
    match_count: params.limit || 10,
  });

  if (error) {
    console.error('Error in text search:', error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data || []).map((row: any) => ({
      sourceType: row.source_type,
      sourceId: row.source_id,
      documentId: row.document_id,
      content: row.content,
      rank: row.rank,
    })),
  };
}
```

## 12.2 Changes to `rag-retrieval-service.ts`

### Update `retrieveContext` for multi-doc

Change the `retrieveContext` function signature to accept `knowledgeBaseId`:

```typescript
async function retrieveContext(params: {
  queryText: string;
  documentId?: string;
  knowledgeBaseId?: string;  // NEW
  hydeText?: string;
}): Promise<...> {
  // Pass knowledgeBaseId to searchSimilarEmbeddings
  // When documentId is null but knowledgeBaseId is set, search KB-wide
}
```

### Update context assembly for multi-doc

Group retrieved sections by document in the assembled context:

```typescript
function assembleContext(params: {
  sections: Array<RAGSection & { similarity: number; documentTitle?: string }>;
  facts: Array<RAGFact & { similarity: number }>;
  documentSummary?: string;
}): string {
  // Group sections by documentId
  // Add document title headers: "## From: Sun Chip Bank Policy v2.0"
  // Add document title headers: "## From: Wire Transfer Addendum"
}
```

### Update `queryRAG` for KB-wide default

When no `documentId` is provided, default to searching the entire KB:

```typescript
// In queryRAG, Step 3:
const retrieved = await retrieveContext({
  queryText: params.queryText,
  documentId: params.documentId || undefined,
  knowledgeBaseId: params.documentId ? undefined : knowledgeBaseId,
  hydeText,
});
```

## 12.3 Populate `knowledge_base_id` on New Embeddings

In the Inngest pipeline's embedding step, add `knowledge_base_id` to each embedding record:

```typescript
// In generateAndStoreBatchEmbeddings, add knowledgeBaseId parameter
// and include it in each insert record
```

---

# 13. Phase 3 — Retrieval Quality

**Timeline:** After Phase 2 KB-wide search is working.

## 13.1 Claude Haiku Reranking

Add to `rag-retrieval-service.ts`:

```typescript
async function rerankWithClaude(params: {
  queryText: string;
  candidates: Array<{ id: string; content: string; similarity: number }>;
  topK: number;
}): Promise<Array<{ id: string; relevanceScore: number }>> {
  const provider = getLLMProvider();

  const candidateList = params.candidates
    .map((c, i) => `[${i}] ${c.content.slice(0, 200)}`)
    .join('\n');

  // Use Haiku for fast reranking (~300-500ms)
  const response = await provider.generateResponse({
    queryText: `Rank these passages by relevance to: "${params.queryText}"`,
    assembledContext: candidateList,
    systemPrompt: `You are a relevance ranker. Given a query and numbered passages, return a JSON array of passage numbers ordered by relevance. Output ONLY JSON: [0, 3, 1, 2, ...]`,
  });

  // Parse ranked order and return top-K
  // ...
}
```

## 13.2 Cross-Document Deduplication

```typescript
function deduplicateResults(
  results: Array<{ content: string; similarity: number; sourceId: string }>
): Array<{ content: string; similarity: number; sourceId: string }> {
  // Compare content similarity between results
  // Drop items with >90% text overlap, keeping the higher similarity one
  const deduped: typeof results = [];
  for (const result of results) {
    const isDuplicate = deduped.some(existing =>
      textSimilarity(existing.content, result.content) > 0.9
    );
    if (!isDuplicate) deduped.push(result);
  }
  return deduped;
}
```

## 13.3 Balanced Multi-Doc Coverage

```typescript
function balanceMultiDocCoverage(
  results: Array<{ documentId: string; similarity: number; sourceId: string }>,
  maxPerDocRatio: number = 0.6
): Array<typeof results[number]> {
  const docCounts = new Map<string, number>();
  const total = results.length;
  const maxPerDoc = Math.ceil(total * maxPerDocRatio);
  const balanced: typeof results = [];

  for (const result of results) {
    const count = docCounts.get(result.documentId) || 0;
    if (count < maxPerDoc) {
      balanced.push(result);
      docCounts.set(result.documentId, count + 1);
    }
  }

  return balanced;
}
```

## 13.4 Conversation Context

Pass last 2-3 query/response pairs in HyDE and response generation:

```typescript
// In queryRAG, before HyDE generation:
const recentQueries = await getQueryHistory({
  knowledgeBaseId: knowledgeBaseId || undefined,
  userId: params.userId,
  limit: 3,
});

// Include in HyDE prompt:
const conversationContext = recentQueries.data
  ?.map(q => `Previous Q: ${q.queryText}\nPrevious A: ${q.responseText?.slice(0, 200)}`)
  .join('\n\n') || '';
```

## 13.5 Improved Not-Found with Suggestions

```typescript
// When selfEval.score < 0.5:
const notFoundMessage = `I couldn't find a confident answer to "${params.queryText}" in the knowledge base.

Here's what I found (low confidence):
${responseText}

Suggestions to improve results:
- Try more specific terms from the document
- Ask about a specific policy or section
- Rephrase using terminology from the document`;
```

---

# 14. Phase 4 — Operational Polish

## 14.1 Confidence Display (UI Change)

The self-eval score already exists in `RAGQuery.selfEvalScore`. Surface it in the chat UI:

```typescript
// In the chat response component:
function getConfidenceDisplay(score: number | null): { label: string; color: string } {
  if (score === null) return { label: '', color: '' };
  if (score > 0.8) return { label: '', color: '' }; // No qualifier needed
  if (score >= 0.5) return { label: 'Based on available information...', color: 'amber' };
  return { label: "I couldn't find a confident answer. Here's what I found...", color: 'red' };
}
```

## 14.2 Feedback Hooks

Add thumbs up/down to query responses:

```sql
-- Migration: 003-feedback.sql (via SAOL)
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS user_feedback TEXT;
-- Values: 'positive', 'negative', null
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
```

## 14.3 Query Logging Dashboard API

New API route at `src/app/api/rag/dashboard/route.ts`:
- Average self-eval scores over time
- Mode breakdown (rag_only vs rag_and_lora)
- Feedback summary (positive/negative ratio)
- Most common query topics

---

# 15. Duplicate Cleanup Script

**File:** `scripts/cleanup-duplicate-documents.js`

```javascript
// Cleanup the 6 duplicate Sun Chip documents
// Keep only ceff906e (the one with 109 facts)

require('dotenv').config({ path: '../.env.local' });
const saol = require('../supa-agent-ops');

const KEEP_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';

(async () => {
  // Find all Sun Chip documents
  const result = await saol.agentQuery({
    table: 'rag_documents',
    select: 'id,file_name,status,section_count,fact_count',
    where: [
      { column: 'file_name', operator: 'ilike', value: '%Sun%Chip%' }
    ],
  });

  console.log(`Found ${result.data.length} Sun Chip documents:`);
  for (const doc of result.data) {
    const isKeep = doc.id === KEEP_DOCUMENT_ID;
    console.log(`  ${isKeep ? '✓ KEEP' : '✗ ARCHIVE'} ${doc.id.slice(0, 8)} | status=${doc.status} | sections=${doc.section_count} | facts=${doc.fact_count}`);
  }

  // Archive duplicates (don't delete — set status to 'archived')
  const duplicateIds = result.data
    .filter(d => d.id !== KEEP_DOCUMENT_ID)
    .map(d => d.id);

  if (duplicateIds.length === 0) {
    console.log('No duplicates to archive.');
    return;
  }

  console.log(`\nArchiving ${duplicateIds.length} duplicate documents...`);

  for (const id of duplicateIds) {
    // Archive the document
    await saol.agentExecuteSQL({
      sql: `UPDATE rag_documents SET status = 'archived' WHERE id = '${id}'`,
      transport: 'pg',
      transaction: true,
    });

    // Delete embeddings for archived documents
    await saol.agentExecuteSQL({
      sql: `DELETE FROM rag_embeddings WHERE document_id = '${id}'`,
      transport: 'pg',
      transaction: true,
    });

    console.log(`  Archived ${id.slice(0, 8)} and deleted its embeddings`);
  }

  console.log('\nCleanup complete.');
})();
```

---

# 16. Golden-Set Regression Test

**File:** `scripts/golden-set-test.ts`

Build 20-30 Q&A pairs from the Sun Chip document. Run after every ingestion or retrieval change.

```typescript
// Golden set structure
interface GoldenSetItem {
  question: string;
  expectedAnswer: string;       // Key phrase that MUST appear
  expectedFactTypes: string[];  // Fact types that should be retrieved
  expectedPolicyId?: string;    // If specific to a policy
  difficulty: 'easy' | 'medium' | 'hard';
}

const GOLDEN_SET: GoldenSetItem[] = [
  // Easy: Direct rule lookup
  {
    question: 'What is the DTI limit for jumbo mortgages?',
    expectedAnswer: '43%',
    expectedFactTypes: ['policy_rule', 'limit'],
    expectedPolicyId: 'BC-PROD-004',
    difficulty: 'easy',
  },
  // Medium: Rule + Exception
  {
    question: 'Can the DTI limit be exceeded for jumbo mortgages?',
    expectedAnswer: '45%',
    expectedFactTypes: ['policy_rule', 'policy_exception'],
    expectedPolicyId: 'BC-PROD-004',
    difficulty: 'medium',
  },
  // Hard: Cross-section, requires multiple facts
  {
    question: 'What documents do I need to open an account?',
    expectedAnswer: 'Tax Returns',
    expectedFactTypes: ['required_document'],
    difficulty: 'hard',
  },
  // ... 20+ more items covering all fact types
];

// Test runner
async function runGoldenSetTest() {
  let passed = 0;
  let failed = 0;

  for (const item of GOLDEN_SET) {
    const result = await queryRAG({
      queryText: item.question,
      documentId: KEEP_DOCUMENT_ID,
      userId: TEST_USER_ID,
      mode: 'rag_only',
    });

    const responseText = result.data?.responseText || '';
    const containsExpected = responseText.toLowerCase().includes(item.expectedAnswer.toLowerCase());

    if (containsExpected) {
      passed++;
      console.log(`  ✓ [${item.difficulty}] ${item.question}`);
    } else {
      failed++;
      console.log(`  ✗ [${item.difficulty}] ${item.question}`);
      console.log(`    Expected: "${item.expectedAnswer}"`);
      console.log(`    Got: "${responseText.slice(0, 200)}"`);
    }
  }

  const total = passed + failed;
  const rate = ((passed / total) * 100).toFixed(1);
  console.log(`\nResults: ${passed}/${total} passed (${rate}%)`);
  console.log(rate >= '85' ? '✓ PASS' : '✗ FAIL — target is 85%+');
}
```

---

# 17. Cost & Performance Summary

## 17.1 Per-Document Ingestion Cost (Phase 1, Premium Models)

| Pass | Model | Input Tokens | Output Tokens | Cost |
|------|-------|-------------|---------------|------|
| 1: Structure | Sonnet 4.5 | ~18K | ~2K | ~$0.08 |
| 2: Policies (x10 sections) | Sonnet 4.5 | ~15K total | ~10K total | ~$0.10 |
| 3: Tables (x5 tables) | Sonnet 4.5 | ~5K total | ~3K total | ~$0.03 |
| 4: Glossary | Haiku | ~18K | ~3K | ~$0.008 |
| 5: Narrative | Sonnet 4.5 | ~5K | ~3K | ~$0.03 |
| 6: Verification (x10 sections) | Opus 4.6 | ~25K total | ~5K total | ~$0.45 |
| Preambles (x10) | Haiku | ~10K total | ~1K total | ~$0.004 |
| Embeddings (x420) | OpenAI | ~200K total | — | ~$0.004 |
| **Total** | | | | **~$0.72/doc** |

## 17.2 Per-Query Cost (Phase 2+3)

| Step | Model | Tokens | Cost |
|------|-------|--------|------|
| HyDE | Haiku | ~500 out | ~$0.001 |
| Embedding | OpenAI | ~100 in | ~$0.00001 |
| Reranking | Haiku | ~3K in, 200 out | ~$0.001 |
| Response | Haiku | ~5K in, 1K out | ~$0.003 |
| Self-eval | Haiku | ~2K in, 100 out | ~$0.001 |
| **Total** | | | **~$0.006/query** |

## 17.3 Latency Impact

| Step | Current (ms) | After Phase 2+3 (ms) | Delta |
|------|-------------|----------------------|-------|
| HyDE (Haiku) | ~500 | ~500 | 0 |
| Query embedding | ~200 | ~200 | 0 |
| pgvector search | ~50 | ~80 | +30 |
| tsvector search | — | ~30 | +30 |
| Merge + dedup | — | ~5 | +5 |
| Reranking (Haiku) | — | ~400 | +400 |
| DB lookups | ~100 | ~120 | +20 |
| Response gen (Haiku) | ~2,500 | ~2,500 | 0 |
| Self-RAG eval | ~500 | ~500 | 0 |
| **Total (RAG-only)** | **~3,850** | **~4,340** | **+490ms (+13%)** |

---

# 18. File Change Map

| File | Phase | Changes |
|------|-------|---------|
| `src/types/rag.ts` | 1 | New `RAGFactType` (14 types), `RAGDocumentType`, provenance fields on `RAGFact`/`RAGFactRow`, `FactExtraction` update, 6 new per-pass result types, `RAGDocument`/`RAGDocumentRow` add `contentHash`/`documentType` |
| `src/lib/rag/config.ts` | 1 | Replace `RAG_CONFIG`: add `ingestionModels` per-pass config, `maxTokens` object instead of number |
| `src/lib/rag/providers/llm-provider.ts` | 1 | Add 6 new method signatures + import new types |
| `src/lib/rag/providers/claude-llm-provider.ts` | 1 | Add 6 new methods with full prompts (~400 lines); update existing `readDocument` to use `maxTokens.default` |
| `src/lib/rag/services/rag-ingestion-service.ts` | 1 | Add: `storeSectionsFromStructure`, `storeExtractedFacts`, `linkFactRelationships`, `findTableRegions`, `policyResultToFacts`, `tableResultToFacts`, `glossaryResultToFacts`, document fingerprinting in `uploadDocumentFile` |
| `src/lib/rag/services/rag-db-mappers.ts` | 1 | Update `mapRowToFact` (5 new fields), update `mapRowToDocument` (2 new fields) |
| `src/lib/rag/services/rag-embedding-service.ts` | 1,2 | Add `buildEnrichedEmbeddingText`; Phase 2: add `knowledgeBaseId` to search, add `searchTextContent` |
| `src/inngest/functions/process-rag-document.ts` | 1 | Complete rewrite: 12-step multi-pass pipeline |
| `src/lib/rag/services/rag-retrieval-service.ts` | 2,3 | KB-wide retrieval, hybrid search merge, reranking, dedup, balanced coverage, conversation context |
| `src/app/api/rag/query/route.ts` | 2 | Support KB-wide queries (remove required `documentId`) |
| `scripts/migrations/001-enhanced-rag-facts.js` | 1 | SAOL migration: provenance columns + indexes + content_hash |
| `scripts/migrations/002-multi-doc-search.js` | 2 | SAOL migration: tsvector columns + KB-wide RPC functions |
| `scripts/cleanup-duplicate-documents.js` | 1 | Archive 6 duplicate Sun Chip documents |
| `scripts/golden-set-test.ts` | 1 | 20-30 Q&A regression test suite |

---

# Appendix A: Existing `readDocument()` Compatibility

The existing `readDocument()` method in `claude-llm-provider.ts` is **NOT removed**. It remains available for:
- The Expert Q&A `refineKnowledge()` flow (which re-reads the document)
- Any backward-compatibility needs

However, the Inngest pipeline no longer calls `readDocument()`. It calls the 6 new pass-specific methods instead.

The only required change to `readDocument()` is updating the `max_tokens` reference:
```typescript
// Before:
max_tokens: RAG_CONFIG.llm.maxTokens,
// After:
max_tokens: RAG_CONFIG.llm.maxTokens.default,
```

# Appendix B: SAOL Verification Commands

After each migration, verify with:

```bash
# Verify rag_facts has new columns
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_facts',includeColumns:true,includeIndexes:true,transport:'pg'});console.log('Columns:',r.tables[0]?.columns.map(c=>c.name).join(', '));console.log('Indexes:',r.tables[0]?.indexes?.length);})();"

# Verify rag_documents has content_hash and document_type
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_documents',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name)||[];console.log('Has content_hash:',cols.includes('content_hash'));console.log('Has document_type:',cols.includes('document_type'));})();"

# Verify embeddings table has knowledge_base_id (Phase 2)
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_embeddings',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name)||[];console.log('Has knowledge_base_id:',cols.includes('knowledge_base_id'));})();"
```

# Appendix C: Rollback Plan

If the multi-pass pipeline produces worse results than the current single-pass:

1. **Inngest rollback:** Revert `process-rag-document.ts` to the old single-step version (git checkout)
2. **Data rollback:** The new columns are nullable — existing data is unaffected
3. **Config rollback:** Set env vars to force Haiku for all passes: `RAG_PASS1_MODEL=claude-haiku-4-5-20251001` etc.
4. **No schema rollback needed:** New columns are additive and don't break existing queries

The risk is low because:
- Phase 1 changes only the ingestion path (background processing)
- The retrieval path is unchanged until Phase 2
- All new columns are nullable with no impact on existing data
- The existing `readDocument()` method is preserved
