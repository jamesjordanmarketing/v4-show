# 013 — RAG Multi-Pass Ingestion Upgrade: Execution Prompt E01

**Section:** E01 — Database Schema + Type System + Configuration + LLM Interface + DB Mappers  
**Version:** 1.0  
**Date:** February 16, 2026  
**Prerequisites:** RAG Frontier E01-E10 complete, Inngest configured  
**Builds Upon:** Existing RAG infrastructure  
**Next Section:** E02 (Claude LLM Provider — 6 New Extraction Methods)

---

## Overview

This prompt implements the foundational layer for the 6-pass multi-pass ingestion pipeline. It adds provenance columns to the database, extends the type system with 14 fact types and 6 per-pass response interfaces, replaces the RAG configuration with multi-pass model routing, adds 6 new method signatures to the LLM provider interface, and updates the DB mappers for the new fields.

**What This Section Creates / Modifies:**
1. Database migration script — adds 5 provenance columns to `rag_facts`, `content_hash` and `document_type` to `rag_documents`
2. Type system updates in `src/types/rag.ts` — expanded `RAGFactType` (14 types), new `RAGDocumentType`, updated `RAGFact`/`RAGFactRow`/`RAGDocument`/`RAGDocumentRow`/`FactExtraction`, 6 new per-pass result interfaces
3. Configuration replacement in `src/lib/rag/config.ts` — per-pass model routing, per-pass token budgets
4. LLM provider interface in `src/lib/rag/providers/llm-provider.ts` — 6 new method signatures
5. DB mapper updates in `src/lib/rag/services/rag-db-mappers.ts` — `mapRowToFact` and `mapRowToDocument` with new fields

**What This Section Does NOT Create:**
- Claude LLM Provider method implementations (E02)
- Ingestion service refactor or Inngest pipeline (E03)
- Retrieval service changes (E04)
- UI changes, cleanup scripts, or tests (E05)

---

========================    


## Prompt E01: Database Schema + Type System + Configuration + LLM Interface + DB Mappers

You are implementing the foundational layer for a 6-pass multi-pass RAG ingestion pipeline in a Next.js 14 application. This is E01 of a 5-part implementation.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

### Critical Rules

1. **ALL database operations via SAOL** (Supabase Agent Ops Library). Never use raw supabase-js or paste SQL directly.
   - Library location: `C:\Users\james\Master\BrightHub\BRun\v4-show\supa-agent-ops\`
   - Quick Start: `supa-agent-ops/QUICK_START.md`
   - Use `agentExecuteDDL()` with `transport: 'pg'`, `dryRun: true` first, then `dryRun: false`
   - Always verify with `agentIntrospectSchema()` after execution

2. **Read before modifying.** Read each target file before making changes to ensure your edits are against the current state.

3. **Preserve backward compatibility.** All new columns are nullable. All new types extend (not replace) existing ones.

---

### Task 1: Run Database Migration — Enhanced RAG Facts

Create and execute the migration script at `scripts/migrations/001-enhanced-rag-facts.js`.

**Migration SQL to execute via SAOL:**

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

  // Step 4: Verify rag_documents columns
  const verifyDocs = await saol.agentIntrospectSchema({
    table: 'rag_documents',
    includeColumns: true,
    transport: 'pg'
  });

  const docCols = verifyDocs.tables[0]?.columns.map(c => c.name) || [];
  console.log('Has content_hash:', docCols.includes('content_hash'));
  console.log('Has document_type:', docCols.includes('document_type'));
})();
```

**Run the migration:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node ../scripts/migrations/001-enhanced-rag-facts.js
```

**Verify with SAOL one-liner:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_facts',includeColumns:true,includeIndexes:true,transport:'pg'});console.log('Columns:',r.tables[0]?.columns.map(c=>c.name).join(', '));console.log('Indexes:',r.tables[0]?.indexes?.length);})();"
```

---

### Task 2: Update Type System (`src/types/rag.ts`)

This file is currently 530 lines. Read it first, then make these changes:

#### 2.1 Update `RAGFactType` (currently at line 19)

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

#### 2.2 Add new `RAGDocumentType` (after `RAGKnowledgeBaseStatus` definition, around line 30)

```typescript
export type RAGDocumentType = 'structured-policy' | 'tabular' | 'narrative' | 'mixed';
```

#### 2.3 Update `RAGFact` Interface (currently around lines 121-133)

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

#### 2.4 Update `RAGDocument` Interface — Add 2 fields after `version: number;` (around line 95)

Add these two fields:
```typescript
  contentHash: string | null;
  documentType: RAGDocumentType | null;
```

#### 2.5 Update `FactExtraction` Interface (currently around lines 360-365)

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

#### 2.6 Add 6 New Per-Pass Response Types (after `ExpertQuestionGeneration` interface, around line 375)

Add these new interfaces:

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

#### 2.7 Update `RAGFactRow` Interface (currently around lines 467-479)

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

#### 2.8 Update `RAGDocumentRow` Interface — Add 2 fields after `version: number;` (around line 448)

Add these two fields:
```typescript
  content_hash: string | null;
  document_type: string | null;
```

---

### Task 3: Replace Configuration (`src/lib/rag/config.ts`)

This file is currently 81 lines. **Replace the entire file** with:

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

**CRITICAL:** The `llm.maxTokens` is now an object (not a number). Any code that reads `RAG_CONFIG.llm.maxTokens` as a number must be updated to `RAG_CONFIG.llm.maxTokens.default`. The main place this happens is `readDocument()` in `claude-llm-provider.ts` — that will be updated in E02.

---

### Task 4: Update LLM Provider Interface (`src/lib/rag/providers/llm-provider.ts`)

This file is currently 98 lines. Read it first.

#### 4.1 Add New Type Imports

Update the import block at the top (currently lines 1-11) to include the new types:

**Current:**
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
```

**Replace with:**
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
```

#### 4.2 Add 6 New Method Signatures

Add these 6 method signatures to the `LLMProvider` interface, **after** the existing `generateVerificationQuestions` method (currently ending around line 95):

```typescript
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
```

---

### Task 5: Update DB Mappers (`src/lib/rag/services/rag-db-mappers.ts`)

This file is currently 186 lines. Read it first.

#### 5.1 Update `mapRowToFact` (currently around lines 103-117)

**Current:**
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

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

#### 5.2 Update `mapRowToDocument` (currently around lines 48-78)

Add these two lines to the return object, after `version: row.version,`:

```typescript
    contentHash: row.content_hash,
    documentType: row.document_type as RAGDocumentType | null,
```

You will also need to add `RAGDocumentType` to the import at the top of the file:

```typescript
import type {
  // ... existing imports ...
  RAGDocumentType,
} from '@/types/rag';
```

---

### Verification Checklist

After completing all tasks, verify:

1. **Database migration successful:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_facts',includeColumns:true,includeIndexes:true,transport:'pg'});console.log('Columns:',r.tables[0]?.columns.map(c=>c.name).join(', '));})();"
```
   Expected: Should include `policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category`

2. **Document columns added:**
```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentIntrospectSchema({table:'rag_documents',includeColumns:true,transport:'pg'});const cols=r.tables[0]?.columns.map(c=>c.name)||[];console.log('Has content_hash:',cols.includes('content_hash'));console.log('Has document_type:',cols.includes('document_type'));})();"
```

3. **TypeScript compilation:** Run `npx tsc --noEmit` from `src/` to check for type errors. Note: There WILL be a type error in `claude-llm-provider.ts` because `RAG_CONFIG.llm.maxTokens` is now an object, not a number. This will be fixed in E02 — it is expected and acceptable for E01.

4. **Verify all new types are exported** from `src/types/rag.ts`:
   - `RAGDocumentType`
   - `StructureAnalysisResult`
   - `PolicyExtractionResult`
   - `TableExtractionResult`
   - `GlossaryExtractionResult`
   - `NarrativeExtractionResult`
   - `VerificationResult`

5. **Verify LLM interface has 6 new methods** in `src/lib/rag/providers/llm-provider.ts`:
   - `analyzeDocumentStructure`
   - `extractPoliciesForSection`
   - `extractTableData`
   - `extractGlossaryAndRelationships`
   - `extractNarrativeFacts`
   - `verifyExtractionCompleteness`

---

### Files Modified in This Section

| File | Action | Description |
|------|--------|-------------|
| `scripts/migrations/001-enhanced-rag-facts.js` | CREATE | SAOL migration script |
| `src/types/rag.ts` | MODIFY | 14 fact types, RAGDocumentType, provenance fields, 6 per-pass result types, updated Row types |
| `src/lib/rag/config.ts` | REPLACE | Multi-pass model config, per-pass token budgets |
| `src/lib/rag/providers/llm-provider.ts` | MODIFY | 6 new method signatures + new type imports |
| `src/lib/rag/services/rag-db-mappers.ts` | MODIFY | mapRowToFact (5 new fields), mapRowToDocument (2 new fields) |

---

### What E02 Will Build On

E02 (Claude LLM Provider — 6 New Extraction Methods) will:
- Implement all 6 methods added to the `LLMProvider` interface in this prompt
- Fix the `readDocument()` `maxTokens` reference to use `RAG_CONFIG.llm.maxTokens.default`
- Use the `RAG_CONFIG.llm.ingestionModels` per-pass model routing
- Import and use the new per-pass result types from `@/types/rag`


+++++++++++++++++



