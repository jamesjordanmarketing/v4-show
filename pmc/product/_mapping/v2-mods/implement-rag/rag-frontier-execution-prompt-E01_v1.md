# RAG Frontier - Execution Prompt E01: Database Foundation

**Version:** 1.0
**Date:** February 10, 2026
**Section:** E01 - Database Schema & Storage
**Prerequisites:** None — this is the first prompt in the sequence
**Status:** Ready for Execution

---

## Overview

This prompt creates the complete database foundation for the RAG Frontier module. It enables the pgvector extension, creates all 8 RAG tables with full schemas, applies Row-Level Security (RLS) policies, creates performance indexes, and sets up a Supabase storage bucket for document files.

**What This Section Creates:**
1. pgvector extension (if not already enabled)
2. `rag_knowledge_bases` table
3. `rag_documents` table
4. `rag_sections` table
5. `rag_facts` table
6. `rag_expert_questions` table
7. `rag_embeddings` table
8. `rag_queries` table
9. `rag_quality_scores` table
10. RLS policies for all 8 tables
11. Performance indexes
12. Supabase storage bucket `rag-documents`

**What This Section Does NOT Change:**
- No existing tables modified
- No existing RLS policies changed
- No application code created (handled by E02-E10)

---

## Critical Instructions

### SAOL for Database Operations
**⚠️ IMPORTANT: You MUST use the Supabase Agent Ops Library (SAOL) for ALL database operations.**

SAOL command template:
```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{ /* operation */ })();"
```

Key SAOL functions:
- `saol.agentExecuteDDL({sql, dryRun, transaction})` — for CREATE TABLE, ALTER, etc.
- `saol.agentQuery({table, select, where, limit})` — for querying data
- `saol.agentPreflight({table})` — to verify table accessibility

### Environment
**Codebase:** `C:\Users\james\Master\BrightHub\brun\v4-show\src`
**SAOL Path:** `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops`

---

## Reference Documents
- SAOL Quick Start: `C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\QUICK_START.md`

---

========================


# EXECUTION PROMPT E01: Database Foundation

## Your Mission

Create the complete database foundation for the RAG Frontier module. This is a Next.js 14 application using Supabase (PostgreSQL) with pgvector for vector storage. You will:

1. Enable the pgvector extension for vector similarity search
2. Create 8 new database tables for the RAG system
3. Apply Row-Level Security (RLS) policies to every table
4. Create performance indexes including vector indexes
5. Set up a Supabase storage bucket for document files
6. Verify everything works via SAOL

**All database operations MUST use SAOL.** Do not use raw supabase-js or psql.

---

## Context: Current State

- The application is a Next.js 14 app with Supabase PostgreSQL
- Existing tables include: `conversations`, `pipeline_training_jobs`, `pipeline_inference_endpoints`, `pipeline_test_results`, `multi_turn_conversations`, `conversation_turns`, `evaluation_prompts`
- All existing tables use `user_id UUID` for multi-tenancy with RLS
- No RAG tables exist yet — all 8 must be created from scratch
- pgvector extension status is unknown — must be checked and enabled if missing
- Supabase storage buckets exist for: `conversation-files`, `training-files`, `lora-datasets`, `lora-models`
- No `rag-documents` storage bucket exists yet

---

## Phase 1: Enable pgvector Extension

### Task 1: Check and Enable pgvector

#### Step 1: Check if pgvector is already enabled

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions\",dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

**Expected:** Dry run succeeds, confirming the SQL is valid.

#### Step 2: Enable pgvector

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentExecuteDDL({sql:\"CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions\",dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

**Expected:** Extension created or already exists. No errors.

> ⚠️ **HUMAN ACTION REQUIRED (if SAOL fails)**
> 
> **What:** Enable the pgvector extension manually
> **Where:** Supabase Dashboard → Database → Extensions → Search "vector" → Enable
> **Values:** Extension name: `vector`

---

## Phase 2: Create RAG Tables

### Task 2: Create rag_knowledge_bases Table

This is the top-level container for a user's knowledge base. Phase 1 supports one document per knowledge base, but the schema supports multiple.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_knowledge_bases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL,name TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),document_count INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_knowledge_bases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL,name TEXT NOT NULL,description TEXT,status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),document_count INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Verify

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentPreflight({table:'rag_knowledge_bases'});console.log('Preflight:',JSON.stringify(r,null,2));})();"
```

**Expected:** `{ "ok": true }`

---

### Task 3: Create rag_documents Table

Stores document metadata, processing status, and LLM-generated understanding artifacts.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,user_id UUID NOT NULL,file_name TEXT NOT NULL,file_type TEXT NOT NULL CHECK (file_type IN ('pdf','docx','txt','md')),file_size_bytes BIGINT,file_path TEXT,storage_bucket TEXT DEFAULT 'rag-documents',original_text TEXT,description TEXT,status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','processing','awaiting_questions','ready','error','archived')),processing_started_at TIMESTAMPTZ,processing_completed_at TIMESTAMPTZ,processing_error TEXT,document_summary TEXT,topic_taxonomy JSONB DEFAULT '[]'::jsonb,entity_list JSONB DEFAULT '[]'::jsonb,ambiguity_list JSONB DEFAULT '[]'::jsonb,section_count INTEGER DEFAULT 0,fact_count INTEGER DEFAULT 0,question_count INTEGER DEFAULT 0,total_tokens_estimated INTEGER,fast_mode BOOLEAN NOT NULL DEFAULT false,version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,user_id UUID NOT NULL,file_name TEXT NOT NULL,file_type TEXT NOT NULL CHECK (file_type IN ('pdf','docx','txt','md')),file_size_bytes BIGINT,file_path TEXT,storage_bucket TEXT DEFAULT 'rag-documents',original_text TEXT,description TEXT,status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','processing','awaiting_questions','ready','error','archived')),processing_started_at TIMESTAMPTZ,processing_completed_at TIMESTAMPTZ,processing_error TEXT,document_summary TEXT,topic_taxonomy JSONB DEFAULT '[]'::jsonb,entity_list JSONB DEFAULT '[]'::jsonb,ambiguity_list JSONB DEFAULT '[]'::jsonb,section_count INTEGER DEFAULT 0,fact_count INTEGER DEFAULT 0,question_count INTEGER DEFAULT 0,total_tokens_estimated INTEGER,fast_mode BOOLEAN NOT NULL DEFAULT false,version INTEGER NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Verify

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentPreflight({table:'rag_documents'});console.log('Preflight:',JSON.stringify(r,null,2));})();"
```

---

### Task 4: Create rag_sections Table

Stores document sections extracted by the LLM with summaries and contextual preambles.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_sections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,section_index INTEGER NOT NULL,title TEXT,original_text TEXT NOT NULL,summary TEXT,contextual_preamble TEXT,section_metadata JSONB DEFAULT '{}'::jsonb,token_count INTEGER,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_sections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,section_index INTEGER NOT NULL,title TEXT,original_text TEXT NOT NULL,summary TEXT,contextual_preamble TEXT,section_metadata JSONB DEFAULT '{}'::jsonb,token_count INTEGER,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Verify

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentPreflight({table:'rag_sections'});console.log('Preflight:',JSON.stringify(r,null,2));})();"
```

---

### Task 5: Create rag_facts Table

Stores atomic facts and entity definitions extracted by the LLM.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_facts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,section_id UUID REFERENCES rag_sections(id) ON DELETE SET NULL,user_id UUID NOT NULL,fact_type TEXT NOT NULL DEFAULT 'fact' CHECK (fact_type IN ('fact','entity','definition','relationship')),content TEXT NOT NULL,source_text TEXT,confidence REAL DEFAULT 1.0,metadata JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_facts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,section_id UUID REFERENCES rag_sections(id) ON DELETE SET NULL,user_id UUID NOT NULL,fact_type TEXT NOT NULL DEFAULT 'fact' CHECK (fact_type IN ('fact','entity','definition','relationship')),content TEXT NOT NULL,source_text TEXT,confidence REAL DEFAULT 1.0,metadata JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

### Task 6: Create rag_expert_questions Table

Stores LLM-generated questions and expert answers for the Q&A loop.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_expert_questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,question_text TEXT NOT NULL,question_reason TEXT,impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high','medium','low')),sort_order INTEGER NOT NULL DEFAULT 0,answer_text TEXT,answered_at TIMESTAMPTZ,skipped BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_expert_questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,question_text TEXT NOT NULL,question_reason TEXT,impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('high','medium','low')),sort_order INTEGER NOT NULL DEFAULT 0,answer_text TEXT,answered_at TIMESTAMPTZ,skipped BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

### Task 7: Create rag_embeddings Table

Stores vector embeddings at all three tiers (document, section, fact) using pgvector.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_embeddings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,source_type TEXT NOT NULL CHECK (source_type IN ('document','section','fact')),source_id UUID NOT NULL,content_text TEXT NOT NULL,embedding extensions.vector(1536),embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',tier INTEGER NOT NULL CHECK (tier IN (1,2,3)),metadata JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_embeddings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,user_id UUID NOT NULL,source_type TEXT NOT NULL CHECK (source_type IN ('document','section','fact')),source_id UUID NOT NULL,content_text TEXT NOT NULL,embedding extensions.vector(1536),embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',tier INTEGER NOT NULL CHECK (tier IN (1,2,3)),metadata JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

### Task 8: Create rag_queries Table

Logs every user query with retrieval results for quality tracking.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_queries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,document_id UUID REFERENCES rag_documents(id) ON DELETE SET NULL,user_id UUID NOT NULL,query_text TEXT NOT NULL,hyde_text TEXT,mode TEXT NOT NULL DEFAULT 'rag_only' CHECK (mode IN ('rag_only','lora_only','rag_and_lora')),retrieved_section_ids JSONB DEFAULT '[]'::jsonb,retrieved_fact_ids JSONB DEFAULT '[]'::jsonb,assembled_context TEXT,response_text TEXT,citations JSONB DEFAULT '[]'::jsonb,self_eval_passed BOOLEAN,self_eval_score REAL,response_time_ms INTEGER,created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_queries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),knowledge_base_id UUID NOT NULL REFERENCES rag_knowledge_bases(id) ON DELETE CASCADE,document_id UUID REFERENCES rag_documents(id) ON DELETE SET NULL,user_id UUID NOT NULL,query_text TEXT NOT NULL,hyde_text TEXT,mode TEXT NOT NULL DEFAULT 'rag_only' CHECK (mode IN ('rag_only','lora_only','rag_and_lora')),retrieved_section_ids JSONB DEFAULT '[]'::jsonb,retrieved_fact_ids JSONB DEFAULT '[]'::jsonb,assembled_context TEXT,response_text TEXT,citations JSONB DEFAULT '[]'::jsonb,self_eval_passed BOOLEAN,self_eval_score REAL,response_time_ms INTEGER,created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

### Task 9: Create rag_quality_scores Table

Stores per-response quality evaluation results from Claude-as-Judge.

#### Step 1: Dry Run

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_quality_scores (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),query_id UUID NOT NULL REFERENCES rag_queries(id) ON DELETE CASCADE,user_id UUID NOT NULL,faithfulness_score REAL,answer_relevance_score REAL,context_relevance_score REAL,answer_completeness_score REAL,citation_accuracy_score REAL,composite_score REAL,evaluation_model TEXT NOT NULL DEFAULT 'claude-haiku',evaluation_details JSONB DEFAULT '{}'::jsonb,evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TABLE IF NOT EXISTS rag_quality_scores (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),query_id UUID NOT NULL REFERENCES rag_queries(id) ON DELETE CASCADE,user_id UUID NOT NULL,faithfulness_score REAL,answer_relevance_score REAL,context_relevance_score REAL,answer_completeness_score REAL,citation_accuracy_score REAL,composite_score REAL,evaluation_model TEXT NOT NULL DEFAULT 'claude-haiku',evaluation_details JSONB DEFAULT '{}'::jsonb,evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),created_at TIMESTAMPTZ NOT NULL DEFAULT now());\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

## Phase 3: RLS Policies

### Task 10: Enable RLS and Create Policies for All Tables

Enable Row-Level Security on all 8 tables. Each table uses `user_id` for tenant isolation, matching the existing app pattern.

#### Step 1: Enable RLS on All Tables (Dry Run)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`ALTER TABLE rag_knowledge_bases ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_sections ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_facts ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_expert_questions ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_quality_scores ENABLE ROW LEVEL SECURITY;\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute RLS Enable

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`ALTER TABLE rag_knowledge_bases ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_sections ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_facts ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_expert_questions ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;ALTER TABLE rag_quality_scores ENABLE ROW LEVEL SECURITY;\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Create RLS Policies (Dry Run)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let sql='';for(const t of tables){sql+=\`CREATE POLICY \\\"\${t}_select_own\\\" ON \${t} FOR SELECT USING (auth.uid()=user_id);CREATE POLICY \\\"\${t}_insert_own\\\" ON \${t} FOR INSERT WITH CHECK (auth.uid()=user_id);CREATE POLICY \\\"\${t}_update_own\\\" ON \${t} FOR UPDATE USING (auth.uid()=user_id);CREATE POLICY \\\"\${t}_delete_own\\\" ON \${t} FOR DELETE USING (auth.uid()=user_id);\`;}const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 4: Execute RLS Policies

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let sql='';for(const t of tables){sql+=\`CREATE POLICY \\\"\${t}_select_own\\\" ON \${t} FOR SELECT USING (auth.uid()=user_id);CREATE POLICY \\\"\${t}_insert_own\\\" ON \${t} FOR INSERT WITH CHECK (auth.uid()=user_id);CREATE POLICY \\\"\${t}_update_own\\\" ON \${t} FOR UPDATE USING (auth.uid()=user_id);CREATE POLICY \\\"\${t}_delete_own\\\" ON \${t} FOR DELETE USING (auth.uid()=user_id);\`;}const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

## Phase 4: Performance Indexes

### Task 11: Create Indexes

#### Step 1: Create Standard Indexes (Dry Run)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE INDEX IF NOT EXISTS idx_rag_kb_user ON rag_knowledge_bases(user_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_kb ON rag_documents(knowledge_base_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);CREATE INDEX IF NOT EXISTS idx_rag_sections_doc ON rag_sections(document_id);CREATE INDEX IF NOT EXISTS idx_rag_sections_user ON rag_sections(user_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_doc ON rag_facts(document_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_section ON rag_facts(section_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_user ON rag_facts(user_id);CREATE INDEX IF NOT EXISTS idx_rag_questions_doc ON rag_expert_questions(document_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_doc ON rag_embeddings(document_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source ON rag_embeddings(source_type,source_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_tier ON rag_embeddings(tier);CREATE INDEX IF NOT EXISTS idx_rag_queries_kb ON rag_queries(knowledge_base_id);CREATE INDEX IF NOT EXISTS idx_rag_queries_user ON rag_queries(user_id);CREATE INDEX IF NOT EXISTS idx_rag_quality_query ON rag_quality_scores(query_id);\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute Standard Indexes

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE INDEX IF NOT EXISTS idx_rag_kb_user ON rag_knowledge_bases(user_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_kb ON rag_documents(knowledge_base_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);CREATE INDEX IF NOT EXISTS idx_rag_sections_doc ON rag_sections(document_id);CREATE INDEX IF NOT EXISTS idx_rag_sections_user ON rag_sections(user_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_doc ON rag_facts(document_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_section ON rag_facts(section_id);CREATE INDEX IF NOT EXISTS idx_rag_facts_user ON rag_facts(user_id);CREATE INDEX IF NOT EXISTS idx_rag_questions_doc ON rag_expert_questions(document_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_doc ON rag_embeddings(document_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_source ON rag_embeddings(source_type,source_id);CREATE INDEX IF NOT EXISTS idx_rag_embeddings_tier ON rag_embeddings(tier);CREATE INDEX IF NOT EXISTS idx_rag_queries_kb ON rag_queries(knowledge_base_id);CREATE INDEX IF NOT EXISTS idx_rag_queries_user ON rag_queries(user_id);CREATE INDEX IF NOT EXISTS idx_rag_quality_query ON rag_quality_scores(query_id);\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Create Vector Similarity Index (Dry Run)

This creates an IVFFlat index on the embedding column for fast cosine similarity search.

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector ON rag_embeddings USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 4: Execute Vector Index

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector ON rag_embeddings USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

**Note:** The IVFFlat index requires data in the table to build properly. If this fails on an empty table, it is safe to defer. The index will be created after the first document is processed. An alternative is to use HNSW:

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector_hnsw ON rag_embeddings USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

## Phase 5: Storage Bucket

### Task 12: Create rag-documents Storage Bucket

> ⚠️ **HUMAN ACTION REQUIRED**
> 
> **What:** Create a new Supabase storage bucket for RAG document files
> **Where:** Supabase Dashboard → Storage → New Bucket
> **Values:**
> - Bucket name: `rag-documents`
> - Public: No (private bucket)
> - File size limit: 50MB
> - Allowed MIME types: `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain, text/markdown`

---

## Phase 6: Updated Timestamp Trigger

### Task 13: Create updated_at Trigger Function and Apply to RAG Tables

#### Step 1: Create Trigger Function (Dry Run)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE OR REPLACE FUNCTION update_rag_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 2: Execute Trigger Function

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE OR REPLACE FUNCTION update_rag_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 3: Apply Triggers to All RAG Tables (Dry Run)

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TRIGGER trg_rag_kb_updated BEFORE UPDATE ON rag_knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_docs_updated BEFORE UPDATE ON rag_documents FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_sections_updated BEFORE UPDATE ON rag_sections FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_facts_updated BEFORE UPDATE ON rag_facts FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_questions_updated BEFORE UPDATE ON rag_expert_questions FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();\`;const r=await saol.agentExecuteDDL({sql,dryRun:true});console.log(JSON.stringify(r,null,2));})();"
```

#### Step 4: Execute Triggers

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const sql=\`CREATE TRIGGER trg_rag_kb_updated BEFORE UPDATE ON rag_knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_docs_updated BEFORE UPDATE ON rag_documents FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_sections_updated BEFORE UPDATE ON rag_sections FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_facts_updated BEFORE UPDATE ON rag_facts FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();CREATE TRIGGER trg_rag_questions_updated BEFORE UPDATE ON rag_expert_questions FOR EACH ROW EXECUTE FUNCTION update_rag_updated_at();\`;const r=await saol.agentExecuteDDL({sql,dryRun:false});console.log(JSON.stringify(r,null,2));})();"
```

---

## Verification

### Step 1: Verify All Tables Exist

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['rag_knowledge_bases','rag_documents','rag_sections','rag_facts','rag_expert_questions','rag_embeddings','rag_queries','rag_quality_scores'];let allOk=true;for(const t of tables){const r=await saol.agentPreflight({table:t});if(!r.ok){console.log('FAIL:',t);allOk=false;}else{console.log('OK:',t);}}console.log(allOk?'✓ ALL TABLES VERIFIED':'✗ SOME TABLES MISSING');})();"
```

**Expected:** All 8 tables show "OK" and final line shows "✓ ALL TABLES VERIFIED".

### Step 2: Verify Insert/Select Works

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'rag_knowledge_bases',select:'id,name,status',limit:5});console.log('Query result:',JSON.stringify(r,null,2));})();"
```

**Expected:** Empty result set `{ success: true, data: [] }` (no data yet, but query works).

### Step 3: Verify Existing Tables Not Affected

```bash
cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const tables=['conversations','pipeline_training_jobs','pipeline_inference_endpoints','multi_turn_conversations'];for(const t of tables){const r=await saol.agentPreflight({table:t});console.log(t+':',r.ok?'OK':'BROKEN');}})();"
```

**Expected:** All existing tables show "OK".

---

## Success Criteria

- [ ] pgvector extension is enabled
- [ ] `rag_knowledge_bases` table exists with correct columns
- [ ] `rag_documents` table exists with correct columns and FK to knowledge_bases
- [ ] `rag_sections` table exists with correct columns and FK to documents
- [ ] `rag_facts` table exists with correct columns and FKs
- [ ] `rag_expert_questions` table exists with correct columns and FK to documents
- [ ] `rag_embeddings` table exists with vector(1536) column and FKs
- [ ] `rag_queries` table exists with correct columns and FKs
- [ ] `rag_quality_scores` table exists with correct columns and FK to queries
- [ ] RLS is enabled on all 8 tables
- [ ] RLS policies (select, insert, update, delete) exist on all 8 tables
- [ ] Performance indexes created on all foreign key and frequently-queried columns
- [ ] Vector similarity index created on rag_embeddings.embedding
- [ ] updated_at triggers applied to tables with updated_at columns
- [ ] Existing tables (conversations, pipeline_*, multi_turn_*, etc.) are unaffected
- [ ] `rag-documents` storage bucket exists in Supabase

---

## What's Next

**E02** will create TypeScript type definitions for all RAG entities and provider abstraction interfaces (LLM Provider, Embedding Provider) that will be used by all subsequent services.

---

## If Something Goes Wrong

### pgvector Extension Fails
- Check Supabase Dashboard → Database → Extensions to see if vector is available
- If using Supabase Free tier, pgvector should be available by default
- Try creating the extension without `WITH SCHEMA extensions`: `CREATE EXTENSION IF NOT EXISTS vector;`

### Table Creation Fails with "permission denied"
- Ensure SAOL is using the service role key (check `.env.local` for `SUPABASE_SERVICE_ROLE_KEY`)
- SAOL should bypass RLS when using the service role key

### RLS Policy Fails with "already exists"
- Policy names include the table name to avoid conflicts
- If re-running, drop existing policies first: `DROP POLICY IF EXISTS "table_select_own" ON table;`

### Vector Index Fails on Empty Table
- IVFFlat requires data. Use HNSW instead (provided as alternative above)
- Or defer the vector index creation until after first document is processed

---

## Notes for Agent

1. **Execute every dry run before the actual execution.** If a dry run fails, do NOT proceed to execution.
2. **All SAOL commands must start with** `cd "c:/Users/james/Master/BrightHub/brun/v4-show/supa-agent-ops" &&`
3. **Do NOT modify any existing tables.** Only create new RAG tables.
4. **If a table already exists** (IF NOT EXISTS handles this), log it and proceed.
5. **The vector dimension is 1536** — this matches OpenAI's text-embedding-3-small output dimension.
6. **All tables include user_id** for multi-tenancy, matching the existing application pattern.

---

**End of E01 Prompt**


+++++++++++++++++
