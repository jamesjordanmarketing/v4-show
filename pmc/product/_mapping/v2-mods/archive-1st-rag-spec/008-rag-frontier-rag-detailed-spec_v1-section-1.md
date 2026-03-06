## SECTION 1: Database Foundation

**Extension Status**: NEW -- all tables, indexes, RLS policies, triggers, and storage configuration are new additions

---

### Overview

This section establishes the complete data layer for the Frontier RAG module. It creates 8 new database tables (all prefixed with `rag_`), enables the pgvector extension for vector similarity search, defines Row Level Security policies for multi-tenant isolation, sets up performance indexes, configures automatic `updated_at` timestamp triggers, and creates a Supabase Storage bucket for uploaded document files.

**What already exists (reused):**
- Supabase PostgreSQL database (same instance as existing `pipeline_*`, `datasets`, `training_jobs` tables)
- Supabase Auth (`auth.users` table, `auth.uid()` function for RLS)
- `update_updated_at_column()` trigger function (created in `20241223_create_lora_training_tables.sql`)
- Supabase Storage infrastructure (existing buckets: `lora-datasets`, `conversation-files`)
- `gen_random_uuid()` function (built-in PostgreSQL, used by newer tables)

**What is being added (new):**
- 1 database extension: `pgvector` (vector similarity operations)
- 8 database tables: `rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_expert_questions`, `rag_embeddings`, `rag_queries`, `rag_quality_scores`
- 32 RLS policies (SELECT/INSERT/UPDATE/DELETE on each table)
- 22 indexes (including 1 HNSW vector index)
- 7 `updated_at` triggers (one per table that has an `updated_at` column)
- 1 Supabase Storage bucket: `rag-documents`
- Storage RLS policies for the `rag-documents` bucket

### Dependencies

- **Codebase Prerequisites**: Supabase project with PostgreSQL access, Supabase Dashboard access (for enabling pgvector extension and creating storage bucket)
- **Previous Section Prerequisites**: None -- this is the first section and has no dependencies on other sections

---

### Features & Requirements

#### FR-1.1: Database Migration

**Type**: Data Model

**Description**: Creates all 8 RAG tables with complete column definitions, foreign key relationships, indexes for query performance, RLS policies for multi-tenant security, and automatic `updated_at` triggers. Enables the pgvector extension for vector storage and similarity search. This single migration file contains the entire RAG data layer.

**Implementation Strategy**: NEW build

---

> **HUMAN ACTION REQUIRED**
>
> **What:** Enable pgvector extension in Supabase
> **Where:** Supabase Dashboard -> Database -> Extensions -> Search "vector" -> Enable
> **Values:** Extension name: `vector`
> **Why:** Required before running the migration. The `vector(1536)` column type in `rag_embeddings` depends on this extension.

> **HUMAN ACTION REQUIRED**
>
> **What:** Run the migration SQL via Supabase SQL Editor
> **Where:** Supabase Dashboard -> SQL Editor -> New Query
> **Values:** Copy the complete SQL from the migration file below and execute it
> **Why:** Creates all 8 RAG tables with RLS, indexes, and triggers

> **HUMAN ACTION REQUIRED**
>
> **What:** Add `DATABASE_URL` to `.env.local` for SAOL pg transport
> **Where:** `C:\Users\james\Master\BrightHub\brun\v4-show\.env.local`
> **Values:** `DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
> **Why:** Required for SAOL schema operations (`agentIntrospectSchema`, `agentExecuteDDL`) used by future sections

---

**File**: `supabase/migrations/20260209_create_rag_tables.sql`

```sql
-- =====================================================
-- Migration: Frontier RAG Module - Complete Schema
-- Date: 2026-02-09
-- Tables: rag_knowledge_bases, rag_documents, rag_sections,
--         rag_facts, rag_expert_questions, rag_embeddings,
--         rag_queries, rag_quality_scores
-- Extension: pgvector (must be enabled via Dashboard first)
-- =====================================================

BEGIN;

-- =====================================================
-- Prerequisite: Verify pgvector extension
-- NOTE: pgvector must be enabled via Supabase Dashboard
-- BEFORE running this migration.
-- Dashboard -> Database -> Extensions -> "vector" -> Enable
-- =====================================================
-- This will fail if pgvector is not enabled, which is
-- intentional -- we want an early failure rather than a
-- partial migration.
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- Shared trigger function: update_updated_at_column
-- Reuses the existing function if it exists (created in
-- 20241223_create_lora_training_tables.sql). CREATE OR
-- REPLACE is idempotent and safe to run multiple times.
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- Table 1: rag_knowledge_bases
-- Purpose: Knowledge base metadata. One per user initially
--          (Phase 1). Architecture supports multiple per
--          user for Phase 2+.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Counts (denormalized for dashboard display)
  document_count INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_kb_user_id
  ON rag_knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_kb_status
  ON rag_knowledge_bases(status);

-- RLS
ALTER TABLE rag_knowledge_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own knowledge bases" ON rag_knowledge_bases;
CREATE POLICY "Users can select own knowledge bases"
  ON rag_knowledge_bases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own knowledge bases" ON rag_knowledge_bases;
CREATE POLICY "Users can insert own knowledge bases"
  ON rag_knowledge_bases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own knowledge bases" ON rag_knowledge_bases;
CREATE POLICY "Users can update own knowledge bases"
  ON rag_knowledge_bases FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own knowledge bases" ON rag_knowledge_bases;
CREATE POLICY "Users can delete own knowledge bases"
  ON rag_knowledge_bases FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_rag_knowledge_bases_updated_at ON rag_knowledge_bases;
CREATE TRIGGER update_rag_knowledge_bases_updated_at
  BEFORE UPDATE ON rag_knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rag_knowledge_bases IS 'Knowledge base containers for the Frontier RAG module. One per user in Phase 1.';


-- =====================================================
-- Table 2: rag_documents
-- Purpose: Document metadata, processing status, and
--          extracted artifacts from LLM document reading.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File identity
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                    -- Supabase Storage path (e.g., "user_id/doc_id/filename.pdf")
  storage_bucket TEXT NOT NULL DEFAULT 'rag-documents',
  file_size BIGINT,                           -- File size in bytes
  file_type TEXT NOT NULL
    CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),

  -- User-provided context
  description TEXT,                           -- Optional one-liner from user (e.g., "Our therapy center guidelines")

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'needs_questions', 'error')),
  processing_step TEXT,                       -- Current step description (e.g., "Extracting text...", "Generating embeddings...")

  -- LLM-generated artifacts (populated during processing)
  document_summary TEXT,                      -- 500-1000 word LLM-generated summary
  section_count INTEGER NOT NULL DEFAULT 0,
  fact_count INTEGER NOT NULL DEFAULT 0,
  entity_count INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  answered_question_count INTEGER NOT NULL DEFAULT 0,

  -- Structured metadata (populated during processing)
  topic_taxonomy JSONB,                       -- Hierarchical topic classification from LLM
  ambiguity_list JSONB,                       -- Array of identified ambiguities from LLM

  -- Full extracted text
  raw_text TEXT,                              -- Complete extracted document text
  raw_text_token_count INTEGER,               -- Token count of raw_text (for context window planning)

  -- Processing options
  fast_mode BOOLEAN NOT NULL DEFAULT FALSE,   -- Skip expert Q&A for rapid prototyping
  version INTEGER NOT NULL DEFAULT 1,         -- Document version (for re-processing)

  -- Processing timestamps
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_docs_knowledge_base_id
  ON rag_documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_user_id
  ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status
  ON rag_documents(status);
CREATE INDEX IF NOT EXISTS idx_rag_docs_created_at
  ON rag_documents(created_at DESC);

-- RLS
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own documents" ON rag_documents;
CREATE POLICY "Users can select own documents"
  ON rag_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON rag_documents;
CREATE POLICY "Users can insert own documents"
  ON rag_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON rag_documents;
CREATE POLICY "Users can update own documents"
  ON rag_documents FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON rag_documents;
CREATE POLICY "Users can delete own documents"
  ON rag_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_rag_documents_updated_at ON rag_documents;
CREATE TRIGGER update_rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rag_documents IS 'Document metadata and LLM-extracted artifacts for the Frontier RAG module.';


-- =====================================================
-- Table 3: rag_sections
-- Purpose: Extracted sections with summaries and
--          Contextual Retrieval preambles. Replaces
--          the concept of "chunks" with LLM-aware
--          document sections.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Section identity
  section_number INTEGER NOT NULL,            -- Order within document (1-based)
  title TEXT,                                 -- Section heading (if detected by LLM)

  -- Content
  content TEXT NOT NULL,                      -- Original section text
  summary TEXT,                               -- LLM-generated section summary
  contextual_preamble TEXT,                   -- Contextual Retrieval preamble (Anthropic technique)

  -- Token/char tracking
  token_count INTEGER,
  char_start INTEGER,                         -- Character offset start in raw_text
  char_end INTEGER,                           -- Character offset end in raw_text

  -- Hierarchy (for nested sections)
  parent_section_id UUID REFERENCES rag_sections(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,           -- 0 = top-level, 1 = subsection, etc.

  -- Extensible metadata
  metadata JSONB,                             -- Additional extracted metadata (e.g., detected entities, keywords)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_sections_document_id
  ON rag_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_sections_user_id
  ON rag_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_sections_section_number
  ON rag_sections(document_id, section_number);
CREATE INDEX IF NOT EXISTS idx_rag_sections_parent_id
  ON rag_sections(parent_section_id)
  WHERE parent_section_id IS NOT NULL;

-- RLS
ALTER TABLE rag_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own sections" ON rag_sections;
CREATE POLICY "Users can select own sections"
  ON rag_sections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sections" ON rag_sections;
CREATE POLICY "Users can insert own sections"
  ON rag_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sections" ON rag_sections;
CREATE POLICY "Users can update own sections"
  ON rag_sections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sections" ON rag_sections;
CREATE POLICY "Users can delete own sections"
  ON rag_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_rag_sections_updated_at ON rag_sections;
CREATE TRIGGER update_rag_sections_updated_at
  BEFORE UPDATE ON rag_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rag_sections IS 'LLM-extracted document sections with Contextual Retrieval preambles. Replaces the old chunks concept.';


-- =====================================================
-- Table 4: rag_facts
-- Purpose: Extracted atomic facts, entity definitions,
--          and relationships. Tier 3 of the multi-tier
--          knowledge representation.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES rag_sections(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Fact classification
  fact_type TEXT NOT NULL
    CHECK (fact_type IN ('fact', 'entity', 'definition', 'relationship')),

  -- Content
  content TEXT NOT NULL,                      -- The atomic fact statement
  context TEXT,                               -- Surrounding context for disambiguation

  -- Quality
  confidence NUMERIC(3,2)                     -- LLM confidence score 0.00-1.00
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  -- Source reference
  source_section_number INTEGER,              -- Which section this fact came from

  -- Extensible metadata
  metadata JSONB,                             -- Structured data: entity type, related entities, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_facts_document_id
  ON rag_facts(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_facts_section_id
  ON rag_facts(section_id)
  WHERE section_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rag_facts_user_id
  ON rag_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_facts_fact_type
  ON rag_facts(fact_type);

-- RLS
ALTER TABLE rag_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own facts" ON rag_facts;
CREATE POLICY "Users can select own facts"
  ON rag_facts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own facts" ON rag_facts;
CREATE POLICY "Users can insert own facts"
  ON rag_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own facts" ON rag_facts;
CREATE POLICY "Users can update own facts"
  ON rag_facts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own facts" ON rag_facts;
CREATE POLICY "Users can delete own facts"
  ON rag_facts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_rag_facts_updated_at ON rag_facts;
CREATE TRIGGER update_rag_facts_updated_at
  BEFORE UPDATE ON rag_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rag_facts IS 'Atomic facts, entity definitions, and relationships extracted by LLM. Tier 3 knowledge.';


-- =====================================================
-- Table 5: rag_expert_questions
-- Purpose: LLM-generated questions for the expert Q&A
--          loop. Tracks question status, answers, and
--          impact level.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_expert_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Question identity
  question_number INTEGER NOT NULL,           -- Order within document (1-based)
  question_text TEXT NOT NULL,
  question_context TEXT,                      -- Why this question matters (shown to expert)

  -- Classification
  impact_level TEXT NOT NULL
    CHECK (impact_level IN ('high', 'medium', 'low')),
  category TEXT
    CHECK (category IS NULL OR category IN (
      'ambiguity', 'implicit_knowledge', 'domain_jargon', 'context_dependent'
    )),

  -- Expert response
  answer_text TEXT,                           -- Expert's answer (null until answered)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'skipped')),
  answered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_questions_document_id
  ON rag_expert_questions(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_questions_user_id
  ON rag_expert_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_questions_status
  ON rag_expert_questions(status);

-- RLS
ALTER TABLE rag_expert_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own questions" ON rag_expert_questions;
CREATE POLICY "Users can select own questions"
  ON rag_expert_questions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own questions" ON rag_expert_questions;
CREATE POLICY "Users can insert own questions"
  ON rag_expert_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own questions" ON rag_expert_questions;
CREATE POLICY "Users can update own questions"
  ON rag_expert_questions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own questions" ON rag_expert_questions;
CREATE POLICY "Users can delete own questions"
  ON rag_expert_questions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_rag_expert_questions_updated_at ON rag_expert_questions;
CREATE TRIGGER update_rag_expert_questions_updated_at
  BEFORE UPDATE ON rag_expert_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE rag_expert_questions IS 'LLM-generated expert questions for the Q&A loop. 3-8 targeted questions per document.';


-- =====================================================
-- Table 6: rag_embeddings
-- Purpose: Unified embeddings table for all three tiers
--          (document, section, fact). Uses vector(1536)
--          for OpenAI text-embedding-3-small.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tier classification
  tier TEXT NOT NULL
    CHECK (tier IN ('document', 'section', 'fact')),

  -- Source reference (polymorphic)
  source_id UUID NOT NULL,                    -- References id of rag_documents, rag_sections, or rag_facts
  source_type TEXT NOT NULL
    CHECK (source_type IN ('rag_documents', 'rag_sections', 'rag_facts')),

  -- Embedded content
  content_text TEXT NOT NULL,                 -- The text that was embedded (for debugging and re-embedding)

  -- Vector
  embedding vector(1536) NOT NULL,            -- OpenAI text-embedding-3-small output dimension

  -- Model tracking
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',

  -- Timestamps (no updated_at -- embeddings are immutable; re-embed = delete + insert)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_document_id
  ON rag_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_user_id
  ON rag_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_tier
  ON rag_embeddings(tier);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source
  ON rag_embeddings(source_id, source_type);

-- Vector similarity index (HNSW)
-- HNSW provides better recall than IVFFlat and does not require
-- a training step. Suitable for Phase 1 scale (< 100K vectors).
-- m=16 and ef_construction=64 are good defaults for balanced
-- speed/recall. Use cosine distance (vector_cosine_ops) to match
-- OpenAI's recommended similarity metric.
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector_hnsw
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RLS
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own embeddings" ON rag_embeddings;
CREATE POLICY "Users can select own embeddings"
  ON rag_embeddings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own embeddings" ON rag_embeddings;
CREATE POLICY "Users can insert own embeddings"
  ON rag_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own embeddings" ON rag_embeddings;
CREATE POLICY "Users can update own embeddings"
  ON rag_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own embeddings" ON rag_embeddings;
CREATE POLICY "Users can delete own embeddings"
  ON rag_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- No updated_at trigger -- embeddings are immutable (delete + re-insert on re-embed)

COMMENT ON TABLE rag_embeddings IS 'Unified embedding storage for all three knowledge tiers. Uses vector(1536) for text-embedding-3-small.';


-- =====================================================
-- Table 7: rag_queries
-- Purpose: Query log with retrieval results, response
--          text, Self-RAG scores, and citation tracking.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Query input
  query_text TEXT NOT NULL,
  mode TEXT NOT NULL
    CHECK (mode IN ('rag_only', 'lora_only', 'rag_lora')),

  -- HyDE (Hypothetical Document Embeddings)
  hyde_text TEXT,                             -- Generated hypothetical answer for improved retrieval

  -- Retrieval results
  retrieved_section_ids UUID[],              -- Array of section IDs retrieved
  retrieved_fact_ids UUID[],                 -- Array of fact IDs retrieved
  assembled_context TEXT,                     -- Full context sent to LLM

  -- Response
  response_text TEXT,                         -- Generated response
  response_model TEXT,                        -- Which model generated the response (e.g., "mistral-7b-lora", "claude-sonnet-4-5-20250929")
  response_generation_time_ms INTEGER,

  -- Self-RAG evaluation
  self_rag_score NUMERIC(3,2)                -- Self-RAG relevance score 0.00-1.00
    CHECK (self_rag_score IS NULL OR (self_rag_score >= 0 AND self_rag_score <= 1)),
  self_rag_passed BOOLEAN,                   -- Whether retrieval passed quality threshold

  -- Citations
  citations JSONB,                            -- Array of {section_id, fact_id, text_snippet}

  -- Timestamps (no updated_at -- queries are immutable log entries)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_queries_knowledge_base_id
  ON rag_queries(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_user_id
  ON rag_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created_at
  ON rag_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_queries_mode
  ON rag_queries(mode);

-- RLS
ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own queries" ON rag_queries;
CREATE POLICY "Users can select own queries"
  ON rag_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own queries" ON rag_queries;
CREATE POLICY "Users can insert own queries"
  ON rag_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own queries" ON rag_queries;
CREATE POLICY "Users can update own queries"
  ON rag_queries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own queries" ON rag_queries;
CREATE POLICY "Users can delete own queries"
  ON rag_queries FOR DELETE
  USING (auth.uid() = user_id);

-- No updated_at trigger -- queries are immutable log entries

COMMENT ON TABLE rag_queries IS 'Query log with retrieval results, Self-RAG scores, and citations. Immutable audit trail.';


-- =====================================================
-- Table 8: rag_quality_scores
-- Purpose: Per-response quality evaluation from
--          Claude-as-Judge. 5 metrics + composite score.
-- =====================================================
CREATE TABLE IF NOT EXISTS rag_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES rag_queries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 5 quality metrics (all 0.00-1.00)
  faithfulness NUMERIC(3,2) NOT NULL
    CHECK (faithfulness >= 0 AND faithfulness <= 1),
  answer_relevance NUMERIC(3,2) NOT NULL
    CHECK (answer_relevance >= 0 AND answer_relevance <= 1),
  context_relevance NUMERIC(3,2) NOT NULL
    CHECK (context_relevance >= 0 AND context_relevance <= 1),
  answer_completeness NUMERIC(3,2) NOT NULL
    CHECK (answer_completeness >= 0 AND answer_completeness <= 1),
  citation_accuracy NUMERIC(3,2) NOT NULL
    CHECK (citation_accuracy >= 0 AND citation_accuracy <= 1),

  -- Composite score (weighted average, computed by evaluation service)
  composite_score NUMERIC(3,2) NOT NULL
    CHECK (composite_score >= 0 AND composite_score <= 1),

  -- Evaluation metadata
  evaluation_model TEXT NOT NULL,             -- e.g., "claude-haiku-4-5-20250929"
  evaluation_tokens_used INTEGER,
  evaluation_time_ms INTEGER,
  raw_evaluation JSONB,                       -- Full LLM evaluation response for debugging

  -- Timestamps (no updated_at -- evaluations are immutable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rag_quality_query_id
  ON rag_quality_scores(query_id);
CREATE INDEX IF NOT EXISTS idx_rag_quality_user_id
  ON rag_quality_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_quality_created_at
  ON rag_quality_scores(created_at DESC);

-- RLS
ALTER TABLE rag_quality_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own quality scores" ON rag_quality_scores;
CREATE POLICY "Users can select own quality scores"
  ON rag_quality_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quality scores" ON rag_quality_scores;
CREATE POLICY "Users can insert own quality scores"
  ON rag_quality_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quality scores" ON rag_quality_scores;
CREATE POLICY "Users can update own quality scores"
  ON rag_quality_scores FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quality scores" ON rag_quality_scores;
CREATE POLICY "Users can delete own quality scores"
  ON rag_quality_scores FOR DELETE
  USING (auth.uid() = user_id);

-- No updated_at trigger -- quality evaluations are immutable

COMMENT ON TABLE rag_quality_scores IS 'Claude-as-Judge quality evaluations. 5 metrics + composite per query response.';


-- =====================================================
-- Table comments for documentation
-- =====================================================
COMMENT ON COLUMN rag_documents.file_path IS 'Supabase Storage path: {user_id}/{doc_id}/{filename}';
COMMENT ON COLUMN rag_documents.status IS 'Processing pipeline state: pending -> processing -> ready/needs_questions/error';
COMMENT ON COLUMN rag_documents.fast_mode IS 'When true, skip expert Q&A loop for rapid prototyping';
COMMENT ON COLUMN rag_sections.contextual_preamble IS 'Anthropic Contextual Retrieval: LLM-generated preamble explaining section within document context';
COMMENT ON COLUMN rag_embeddings.tier IS 'Knowledge tier: document (Tier 1), section (Tier 2), fact (Tier 3)';
COMMENT ON COLUMN rag_embeddings.source_type IS 'Polymorphic reference: which table source_id points to';
COMMENT ON COLUMN rag_queries.mode IS 'Three-way mode selector: rag_only, lora_only, rag_lora';
COMMENT ON COLUMN rag_quality_scores.composite_score IS 'Weighted average of 5 metrics. Weights defined in evaluation service.';


-- =====================================================
-- Verification queries (run after migration to confirm)
-- =====================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'rag_%'
-- ORDER BY table_name;
--
-- Expected result: 8 rows
--   rag_documents
--   rag_embeddings
--   rag_expert_questions
--   rag_facts
--   rag_knowledge_bases
--   rag_quality_scores
--   rag_queries
--   rag_sections

COMMIT;
```

---

**Pattern Source**: Migration structure follows `supabase/migrations/20260117_create_adapter_testing_tables.sql` (BEGIN/COMMIT transaction, `gen_random_uuid()` for PKs, `TIMESTAMPTZ DEFAULT NOW()` for timestamps, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CHECK` constraints for enum-like columns). Trigger function reuse follows `supabase/migrations/20241223_create_lora_training_tables.sql` (`CREATE OR REPLACE FUNCTION update_updated_at_column()`).

---

**Acceptance Criteria**:

1. All 8 `rag_*` tables exist in the `public` schema after running the migration
2. The `vector` extension is active (`SELECT * FROM pg_extension WHERE extname = 'vector'` returns one row)
3. Each table has a `gen_random_uuid()` default on its `id` column
4. All foreign keys reference the correct parent tables with `ON DELETE CASCADE`
5. `rag_sections.parent_section_id` uses `ON DELETE SET NULL` (not CASCADE) to preserve child sections when a parent is deleted
6. `rag_facts.section_id` uses `ON DELETE SET NULL` (not CASCADE) to preserve facts when a section is re-extracted
7. All 8 tables have RLS enabled (`SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'rag_%'` -- all `relrowsecurity` = true)
8. Each table has SELECT, INSERT, UPDATE, and DELETE policies using `auth.uid() = user_id`
9. Tables with `updated_at` columns (`rag_knowledge_bases`, `rag_documents`, `rag_sections`, `rag_facts`, `rag_expert_questions`) have BEFORE UPDATE triggers calling `update_updated_at_column()`
10. Tables without `updated_at` columns (`rag_embeddings`, `rag_queries`, `rag_quality_scores`) are immutable log tables with no update trigger
11. The HNSW vector index exists on `rag_embeddings.embedding` using `vector_cosine_ops`
12. All `CHECK` constraints enforce valid enum values (e.g., `rag_documents.status` only accepts `pending`, `processing`, `ready`, `needs_questions`, `error`)
13. All `NUMERIC(3,2)` score columns enforce range 0.00-1.00 via `CHECK` constraints
14. The migration runs idempotently (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`)

**Verification Steps**:

1. Enable pgvector via Supabase Dashboard (Database -> Extensions -> "vector" -> Enable)
2. Open Supabase SQL Editor and paste the full migration SQL
3. Click "Run" -- confirm no errors
4. Verify tables exist:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name LIKE 'rag_%'
   ORDER BY table_name;
   ```
   Expected: 8 rows (`rag_documents`, `rag_embeddings`, `rag_expert_questions`, `rag_facts`, `rag_knowledge_bases`, `rag_quality_scores`, `rag_queries`, `rag_sections`)

5. Verify RLS is enabled:
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname LIKE 'rag_%' AND relkind = 'r'
   ORDER BY relname;
   ```
   Expected: All 8 rows show `relrowsecurity = true`

6. Verify vector extension:
   ```sql
   SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
   ```
   Expected: 1 row

7. Verify HNSW index:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'rag_embeddings' AND indexname LIKE '%hnsw%';
   ```
   Expected: 1 row showing `idx_rag_embeddings_vector_hnsw`

8. Verify triggers:
   ```sql
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name LIKE 'update_rag_%'
   ORDER BY event_object_table;
   ```
   Expected: 5 rows (knowledge_bases, documents, sections, facts, expert_questions)

9. Verify foreign key cascades by inserting a test knowledge base, then a test document, then deleting the knowledge base:
   ```sql
   -- Insert test data (use your actual user_id from auth.users)
   INSERT INTO rag_knowledge_bases (id, user_id, name)
   VALUES ('00000000-0000-0000-0000-000000000001', '<your-user-id>', 'Test KB');

   INSERT INTO rag_documents (id, knowledge_base_id, user_id, file_name, file_path, file_type)
   VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '<your-user-id>', 'test.pdf', 'test/path', 'pdf');

   -- Delete parent -- child should cascade
   DELETE FROM rag_knowledge_bases WHERE id = '00000000-0000-0000-0000-000000000001';

   -- Verify child is gone
   SELECT count(*) FROM rag_documents WHERE id = '00000000-0000-0000-0000-000000000002';
   -- Expected: 0
   ```

---

#### FR-1.2: Storage Bucket Configuration

**Type**: Infrastructure Configuration

**Description**: Creates a private Supabase Storage bucket named `rag-documents` for storing uploaded document files (PDF, DOCX, TXT, MD). The bucket is configured with a 100MB file size limit and restricted MIME types. Storage RLS policies allow users to manage only their own files, organized under `{user_id}/` path prefixes.

**Implementation Strategy**: NEW build

---

> **HUMAN ACTION REQUIRED**
>
> **What:** Create the `rag-documents` storage bucket in Supabase
> **Where:** Supabase Dashboard -> Storage -> New Bucket
> **Values:**
> - Bucket name: `rag-documents`
> - Public bucket: No (unchecked)
> - File size limit: `104857600` (100MB in bytes)
> - Allowed MIME types: `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown`
> **Why:** Stores uploaded document files. Private bucket ensures files are only accessible via signed URLs or authenticated requests.

> **HUMAN ACTION REQUIRED**
>
> **What:** Create storage RLS policies for the `rag-documents` bucket
> **Where:** Supabase Dashboard -> Storage -> Policies -> `rag-documents` bucket
> **Values:** Run the following SQL in Supabase SQL Editor:
>
> ```sql
> -- Allow users to upload files to their own folder
> CREATE POLICY "Users can upload to own folder"
>   ON storage.objects FOR INSERT
>   WITH CHECK (
>     bucket_id = 'rag-documents'
>     AND (storage.foldername(name))[1] = auth.uid()::text
>   );
>
> -- Allow users to read their own files
> CREATE POLICY "Users can read own files"
>   ON storage.objects FOR SELECT
>   USING (
>     bucket_id = 'rag-documents'
>     AND (storage.foldername(name))[1] = auth.uid()::text
>   );
>
> -- Allow users to update their own files
> CREATE POLICY "Users can update own files"
>   ON storage.objects FOR UPDATE
>   USING (
>     bucket_id = 'rag-documents'
>     AND (storage.foldername(name))[1] = auth.uid()::text
>   );
>
> -- Allow users to delete their own files
> CREATE POLICY "Users can delete own files"
>   ON storage.objects FOR DELETE
>   USING (
>     bucket_id = 'rag-documents'
>     AND (storage.foldername(name))[1] = auth.uid()::text
>   );
> ```
>
> **Why:** Enforces multi-tenant file isolation. Each user can only access files under their own `{user_id}/` path prefix.

---

**Storage Path Convention:**

Files are stored following the pattern used by existing buckets (`lora-datasets`, `conversation-files`):

```
rag-documents/{user_id}/{document_id}/{original_filename}
```

Example: `rag-documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/f9e8d7c6-b5a4-3210-fedc-ba0987654321/clinical-practice-guide.pdf`

**Pattern Source**: Storage bucket structure follows `supabase/migrations/20241223_create_lora_training_tables.sql` (`storage_bucket VARCHAR(100) DEFAULT 'lora-datasets'`), `supabase/functions/process-training-jobs/index.ts` (signed URL generation from bucket), and `supabase/migrations/20251117_create_conversations_table.sql` (`bucket_name VARCHAR(255) DEFAULT 'conversation-files'`).

---

**Acceptance Criteria**:

1. The `rag-documents` bucket exists in Supabase Storage
2. The bucket is private (not public)
3. File size limit is set to 100MB
4. Only PDF, DOCX, TXT, and MD files can be uploaded (MIME type restriction)
5. Storage RLS policies enforce user-level isolation via `{user_id}/` path prefix
6. Users cannot read, write, or delete files outside their own folder
7. The storage path convention (`{user_id}/{document_id}/{filename}`) is documented and matches the `file_path` column format in `rag_documents`

**Verification Steps**:

1. Navigate to Supabase Dashboard -> Storage and confirm `rag-documents` bucket exists
2. Confirm the bucket shows as "Private" (no public access icon)
3. Attempt to upload a `.exe` file -- confirm it is rejected by MIME type restriction
4. Upload a test PDF file to `{your-user-id}/test/test.pdf` -- confirm it succeeds
5. Verify the file appears in the Storage browser under the correct path
6. Run the storage policy verification query:
   ```sql
   SELECT policyname, permissive, cmd
   FROM pg_policies
   WHERE tablename = 'objects' AND schemaname = 'storage'
     AND policyname LIKE '%own f%' OR policyname LIKE '%own folder%'
   ORDER BY policyname;
   ```
   Expected: 4 rows (INSERT, SELECT, UPDATE, DELETE policies)
7. Delete the test file to clean up

---

### Section Summary

**What Was Added:**
- 1 database extension: `pgvector` (enabled via Dashboard)
- 8 new database tables (all in `public` schema):
  - `rag_knowledge_bases` -- Knowledge base containers
  - `rag_documents` -- Document metadata and LLM-extracted artifacts
  - `rag_sections` -- LLM-aware document sections with Contextual Retrieval preambles
  - `rag_facts` -- Atomic facts, entities, definitions, relationships
  - `rag_expert_questions` -- Expert Q&A loop questions and answers
  - `rag_embeddings` -- Multi-tier vector embeddings (1536 dimensions)
  - `rag_queries` -- Query log with retrieval results and Self-RAG scores
  - `rag_quality_scores` -- Claude-as-Judge evaluation results (5 metrics)
- 32 RLS policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
- 22 indexes (21 B-tree + 1 HNSW vector)
- 5 `updated_at` triggers (on mutable tables)
- 1 Supabase Storage bucket: `rag-documents` (private, 100MB limit, MIME restricted)
- 4 storage RLS policies (user-folder isolation)
- 1 migration file: `supabase/migrations/20260209_create_rag_tables.sql`

**What Was Reused:**
- Existing Supabase PostgreSQL database instance
- Existing `auth.users` table and `auth.uid()` function for RLS
- Existing `update_updated_at_column()` trigger function (from `20241223_create_lora_training_tables.sql`)
- Existing `gen_random_uuid()` built-in function
- Existing Supabase Storage infrastructure

**Integration Points:**
- All RAG services (Section 3-5) write to and read from these tables via Supabase client
- All API routes (Section 6) query these tables with RLS-enforced user isolation
- TypeScript types (Section 2) map 1:1 to these table column definitions
- The `rag_embeddings.embedding` column is queried via pgvector similarity operators (`<=>` for cosine distance) in the retrieval pipeline (Section 5)
- The `rag_documents.file_path` column maps to the `rag-documents` storage bucket path convention
- The `rag_documents.status` column drives UI state in the processing status component (Section 8)
- The `rag_quality_scores` table feeds the quality dashboard (Section 9)
- Foreign key cascades ensure that deleting a knowledge base cleanly removes all associated documents, sections, facts, questions, embeddings, queries, and quality scores

---

### Entity Relationship Diagram

```
rag_knowledge_bases
  |
  | 1:N (knowledge_base_id)
  v
rag_documents
  |
  |--- 1:N (document_id) ---> rag_sections
  |                              |
  |                              | 1:N (section_id, nullable)
  |                              v
  |--- 1:N (document_id) ---> rag_facts
  |
  |--- 1:N (document_id) ---> rag_expert_questions
  |
  |--- 1:N (document_id) ---> rag_embeddings
  |                              (also references sections/facts via source_id)
  |
  v
rag_queries (via knowledge_base_id on rag_knowledge_bases)
  |
  | 1:N (query_id)
  v
rag_quality_scores
```

**Cascade Behavior:**
- Deleting a `rag_knowledge_bases` row cascades to `rag_documents`
- Deleting a `rag_documents` row cascades to `rag_sections`, `rag_facts`, `rag_expert_questions`, `rag_embeddings`
- Deleting a `rag_sections` row sets `rag_facts.section_id` to NULL (preserves facts)
- Deleting a `rag_sections` row sets `rag_sections.parent_section_id` to NULL on children (preserves child sections)
- Deleting a `rag_knowledge_bases` row cascades through `rag_queries` to `rag_quality_scores`

---

### Human Actions Checklist (Section 1)

| # | Action | Where | Status |
|---|--------|-------|--------|
| 1 | Enable pgvector extension | Supabase Dashboard -> Database -> Extensions | Required before migration |
| 2 | Add `DATABASE_URL` to `.env.local` | `.env.local` file | Required for SAOL operations |
| 3 | Run migration SQL | Supabase Dashboard -> SQL Editor | Required |
| 4 | Create `rag-documents` storage bucket | Supabase Dashboard -> Storage -> New Bucket | Required |
| 5 | Create storage RLS policies | Supabase Dashboard -> SQL Editor | Required |
