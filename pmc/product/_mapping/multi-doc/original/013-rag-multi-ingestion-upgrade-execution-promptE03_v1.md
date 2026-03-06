# 013 — RAG Multi-Pass Ingestion Upgrade: Execution Prompt E03

**Section:** E03 — Ingestion Service Refactor + Inngest Multi-Step Pipeline + Embedding Enrichment  
**Version:** 1.0  
**Date:** February 16, 2026  
**Prerequisites:** E01 (Schema, Types, Config, Interface, Mappers) + E02 (6 Claude Methods) complete  
**Builds Upon:** E01 & E02  
**Next Section:** E04 (Multi-Document Retrieval + Retrieval Quality)

---

## Overview

This prompt implements the core ingestion refactor: new helper functions in the ingestion service, document fingerprinting, the `buildEnrichedEmbeddingText()` function, and the complete 12-step Inngest multi-pass pipeline that orchestrates all 6 passes.

**What This Section Creates / Modifies:**
1. `src/lib/rag/services/rag-ingestion-service.ts` — 8 new exported functions:
   - `storeSectionsFromStructure()` — store sections by slicing source text with Pass 1 line boundaries
   - `storeExtractedFacts()` — store facts with provenance fields
   - `linkFactRelationships()` — code-only linker (exceptions → qualifying rules)
   - `findTableRegions()` — programmatic markdown table detection
   - `policyResultToFacts()` — convert PolicyExtractionResult → FactExtraction[]
   - `tableResultToFacts()` — convert TableExtractionResult → FactExtraction[]
   - `glossaryResultToFacts()` — convert GlossaryExtractionResult → FactExtraction[]
   - Document fingerprinting via `content_hash` in `uploadDocumentFile()`
2. `src/lib/rag/services/rag-embedding-service.ts` — new `buildEnrichedEmbeddingText()` function
3. `src/inngest/functions/process-rag-document.ts` — complete rewrite: 12-step multi-pass pipeline

**What This Section Does NOT Create:**
- Retrieval service changes or multi-doc search (E04)
- UI changes, cleanup scripts, or regression tests (E05)

---

========================    


## Prompt E03: Ingestion Service Refactor + Inngest Multi-Step Pipeline + Embedding Enrichment

You are implementing the ingestion service refactor and the Inngest multi-step pipeline for a 6-pass RAG extraction system. This is E03 of a 5-part implementation.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

### Prerequisites — What E01 and E02 Built

**E01 completed:**
- Database: `rag_facts` has columns: `policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category`. `rag_documents` has: `content_hash`, `document_type`.
- Types (`src/types/rag.ts`): `RAGFactType` (14 values), `RAGDocumentType`, `RAGFact` (5 provenance fields), `FactExtraction` (5 optional provenance fields), 6 new per-pass result interfaces (`StructureAnalysisResult`, `PolicyExtractionResult`, `TableExtractionResult`, `GlossaryExtractionResult`, `NarrativeExtractionResult`, `VerificationResult`)
- Config (`src/lib/rag/config.ts`): `RAG_CONFIG.llm.maxTokens` is an object with per-pass budgets, `RAG_CONFIG.llm.ingestionModels` has per-pass model IDs
- LLM Interface: 6 new method signatures on `LLMProvider` interface
- DB Mappers: `mapRowToFact` (5 new fields), `mapRowToDocument` (2 new fields)

**E02 completed:**
- `src/lib/rag/providers/claude-llm-provider.ts` now has 14 methods (8 existing + 6 new):
  - `analyzeDocumentStructure()` — Pass 1, uses `ingestionModels.structureAnalysis`
  - `extractPoliciesForSection()` — Pass 2, uses `ingestionModels.policyExtraction`
  - `extractTableData()` — Pass 3, uses `ingestionModels.tableExtraction`
  - `extractGlossaryAndRelationships()` — Pass 4, uses `ingestionModels.glossaryExtraction`
  - `extractNarrativeFacts()` — Pass 5, uses `ingestionModels.narrativeExtraction`
  - `verifyExtractionCompleteness()` — Pass 6, uses `ingestionModels.verification`
- `readDocument()` now uses `RAG_CONFIG.llm.maxTokens.default`

### Critical Rules

1. **Read files before modifying.** Read `rag-ingestion-service.ts` (592 lines), `rag-embedding-service.ts` (196 lines), and `process-rag-document.ts` (98 lines) before making changes.
2. **Do NOT delete the existing `processDocument()` function.** It is still called by the old Inngest handler. The new pipeline replaces the Inngest file, but `processDocument()` remains for backward compatibility.
3. **ALL database operations use the admin Supabase client:** `createServerSupabaseAdminClient()`.
4. **Import paths:** `@/lib/rag/providers` for `ClaudeLLMProvider`, `@/lib/rag/services` for service functions, `@/types/rag` for types.

---

### Task 1: Add Helper Functions to Ingestion Service (`src/lib/rag/services/rag-ingestion-service.ts`)

This file is currently 592 lines. Add the following functions **after** the existing `getDocument()` function at the bottom of the file (but before the closing of the file).

#### 1.1 Add New Imports

Add `crypto` import at the very top of the file (line 1):
```typescript
import * as crypto from 'crypto';
```

Add new type imports — update the existing import from `@/types/rag':
```typescript
import type {
  RAGDocument,
  RAGSection,
  RAGFact,
  RAGExpertQuestion,
  RAGKnowledgeBase,
  DocumentUnderstanding,
  // Multi-pass types (Phase 1)
  StructureAnalysisResult,
  PolicyExtractionResult,
  TableExtractionResult,
  GlossaryExtractionResult,
  FactExtraction,
  RAGFactType,
  RAGDocumentType,
} from '@/types/rag';
```

#### 1.2 Document Fingerprinting

Add this function:

```typescript
// ============================================
// Document Fingerprinting (Phase 1)
// ============================================

/**
 * Generate SHA-256 content hash for duplicate detection.
 */
function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
```

#### 1.3 Update `uploadDocumentFile()` to Set Content Hash

Find the section in `uploadDocumentFile()` that updates the document record after text extraction (around line 237). It currently looks like:

```typescript
    // Update document record with file path and extracted text
    await supabase
      .from('rag_documents')
      .update({
        file_path: filePath,
        file_size_bytes: params.file.length,
        original_text: extraction.text,
        status: 'processing',
      })
      .eq('id', params.documentId);
```

**Replace with:**
```typescript
    // Update document record with file path, extracted text, AND content hash
    const contentHash = generateContentHash(extraction.text);
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

#### 1.4 `storeSectionsFromStructure()`

```typescript
// ============================================
// Multi-Pass Ingestion Helpers (Phase 1)
// ============================================

/**
 * Store sections by slicing the original document text using Pass 1 line boundaries.
 * This is the KEY optimization: sections are sliced from the source text,
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

#### 1.5 `policyResultToFacts()`

```typescript
/**
 * Convert PolicyExtractionResult into flat FactExtraction array for storage.
 */
export function policyResultToFacts(
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

    // Extract limits as separate facts from rule amounts
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
```

#### 1.6 `tableResultToFacts()`

```typescript
/**
 * Convert TableExtractionResult into flat FactExtraction array.
 */
export function tableResultToFacts(result: TableExtractionResult): FactExtraction[] {
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
```

#### 1.7 `glossaryResultToFacts()`

```typescript
/**
 * Convert GlossaryExtractionResult into flat FactExtraction array.
 */
export function glossaryResultToFacts(result: GlossaryExtractionResult): FactExtraction[] {
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

#### 1.8 `storeExtractedFacts()`

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

#### 1.9 `linkFactRelationships()`

```typescript
/**
 * Pass 6.5 (code-only): Link related facts by matching rule IDs.
 * - Exceptions → their qualifying rules (via qualifiesRule → ruleId match)
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

#### 1.10 `findTableRegions()`

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
        tables.push({ startLine: tableStart, endLine: i }); // i is 1-indexed end
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

### Task 2: Add `buildEnrichedEmbeddingText()` to Embedding Service

**File:** `src/lib/rag/services/rag-embedding-service.ts` (currently 196 lines)

Add this function **after** the existing `deleteDocumentEmbeddings` function at the bottom of the file:

```typescript
// ============================================
// Enriched Embedding Text Builder (Phase 1)
// ============================================

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
    const qualifies = (fact.metadata as any)?.qualifiesRule;
    if (qualifies) {
      parts.push(`[Qualifies: ${qualifies}]`);
    }
  }

  parts.push(fact.content);
  return parts.join(' ');
}
```

**IMPORTANT:** The `RAGFact` import may need to be merged with any existing imports from `@/types/rag` at the top of the file. Check the existing imports and add `RAGFact` to them if necessary.

---

### Task 3: Rewrite Inngest Pipeline (`src/inngest/functions/process-rag-document.ts`)

**File:** `src/inngest/functions/process-rag-document.ts` (currently 98 lines)

**Replace the entire file** with the following 12-step multi-pass pipeline:

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
  policyResultToFacts,
  tableResultToFacts,
  glossaryResultToFacts,
} from '@/lib/rag/services/rag-ingestion-service';
import { generateAndStoreBatchEmbeddings, deleteDocumentEmbeddings, buildEnrichedEmbeddingText } from '@/lib/rag/services/rag-embedding-service';
import { mapRowToDocument, mapRowToSection, mapRowToFact } from '@/lib/rag/services/rag-db-mappers';
import type { FactExtraction, StructureAnalysisResult } from '@/types/rag';

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
          await storeExtractedFacts(documentId, doc.userId, section.id, facts);
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

### Verification Checklist

After completing all tasks, verify:

1. **TypeScript compilation:** Run `npx tsc --noEmit` from the `src/` directory. Should have no errors.

2. **New exports from `rag-ingestion-service.ts`:**
   - `storeSectionsFromStructure`
   - `storeExtractedFacts`
   - `linkFactRelationships`
   - `findTableRegions`
   - `policyResultToFacts`
   - `tableResultToFacts`
   - `glossaryResultToFacts`

3. **New export from `rag-embedding-service.ts`:**
   - `buildEnrichedEmbeddingText`

4. **Inngest pipeline has 12 steps:** `fetch-document`, `pass-1-structure`, `store-sections`, `pass-2-policies`, `pass-3-tables`, `pass-4-glossary`, `pass-5-narrative`, `pass-6-verification`, `link-relationships`, `store-expert-questions`, `generate-preambles`, `generate-embeddings`, `finalize`

5. **Content hash:** Verify `uploadDocumentFile()` now sets `content_hash` on the document record.

6. **Backward compatibility:** The old `processDocument()` function still exists in `rag-ingestion-service.ts` — it is NOT deleted.

---

### Files Modified in This Section

| File | Action | Description |
|------|--------|-------------|
| `src/lib/rag/services/rag-ingestion-service.ts` | MODIFY | Add 8 new functions + crypto import + content hash in upload |
| `src/lib/rag/services/rag-embedding-service.ts` | MODIFY | Add `buildEnrichedEmbeddingText()` function |
| `src/inngest/functions/process-rag-document.ts` | REPLACE | 12-step multi-pass pipeline |

---

### What E04 Will Build On

E04 (Multi-Document Retrieval + Retrieval Quality) will:
- Run Migration 2 (tsvector columns, KB-wide RPC functions, `knowledge_base_id` on embeddings)
- Update `rag-embedding-service.ts` with KB-wide search and text search functions
- Update `rag-retrieval-service.ts` for KB-wide retrieval, hybrid search, reranking, dedup
- Update `src/app/api/rag/query/route.ts` to support KB-wide queries
- These changes all depend on the enriched facts and embeddings produced by the E03 pipeline


+++++++++++++++++



