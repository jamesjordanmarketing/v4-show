# 015: RAG Multi-Pass Ingestion — Implementation Specification
**Version:** 2.0  
**Date:** February 17, 2026  
**Builds Upon:** 015_v1.md (analysis and diagnosis)  
**Target File:** `src/inngest/functions/process-rag-document.ts`  
**Scope:** 2 bug fixes, 1 file, ~230 lines changed  

---

## Overview

This document provides the complete, exact code changes to implement the two fixes identified in `015_v1.md`:

1. **Fix 1 — Per-Section Inngest Steps**: Refactor all 5 monolithic `for`-loop steps into individual `step.run()` calls per section/table, so each LLM call is independently checkpointed. This eliminates the Vercel timeout failure.

2. **Fix 2 — Embedding Run Lifecycle**: Add `rag_embedding_runs` record creation and `runId` tagging to Step 11 of the multi-pass pipeline, so multi-pass embeddings are selectable in the Golden-Set test tool.

**What this prompt does NOT change:**
- No new npm dependencies
- No changes to any other files
- No database schema changes (tables and columns already exist from E010 migration)
- No changes to API routes, services, or UI

---

## Prerequisites

### Step 0A: Set Vercel Max Duration to 800

Before deploying, go to the Vercel project settings and set **Function Max Duration to 800**.  
This is required to unblock any currently stuck documents while the code fix is deployed.

A new deployment is required for the setting to take effect.

### Step 0B: Reset the Stuck Document (SAOL)

The document `9dee7d41-4f38-4429-9da7-4d781363713b` is stuck in `processing` with partial data from 4 failed Pass 2 attempts. Its `rag_facts` table may contain duplicate partial records from the repeated retries.

Run this SAOL command to mark it as `error` so it can be cleanly re-submitted:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    // 1. Check current state
    const r = await saol.agentQuery({
        table: 'rag_documents',
        select: 'id,status,file_name,processing_started_at,fact_count,section_count',
        where: [{ column: 'id', operator: 'eq', value: '9dee7d41-4f38-4429-9da7-4d781363713b' }],
    });
    console.log('Current state:', JSON.stringify(r.data, null, 2));

    // 2. Mark as error
    const update = await saol.agentUpdate({
        table: 'rag_documents',
        data: { status: 'error' },
        where: [{ column: 'id', operator: 'eq', value: '9dee7d41-4f38-4429-9da7-4d781363713b' }],
    });
    console.log('Updated to error:', update.success);
})();
"
```

After marking as `error`, you can delete the document from the UI and re-submit.

### Step 0C: Verify Schema Is Ready (SAOL)

Confirm the `rag_embedding_runs` table (from E010 migration) exists and has the required columns:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    const r = await saol.agentIntrospectSchema({
        table: 'rag_embedding_runs',
        includeColumns: true,
        transport: 'pg',
    });
    const cols = r.tables[0]?.columns?.map(c => c.name) || [];
    console.log('Table exists:', r.tables[0]?.exists);
    console.log('Columns:', cols.join(', '));
    const required = ['id', 'document_id', 'user_id', 'embedding_count', 'embedding_model', 'status', 'pipeline_version', 'started_at', 'completed_at', 'metadata'];
    required.forEach(c => console.log(c + ':', cols.includes(c) ? 'YES' : 'MISSING'));
})();
"
```

All columns must be present before proceeding. If any are missing, the E010 migration has not been run.

---

## Target File

**Path:** `src/inngest/functions/process-rag-document.ts`  
**Current line count:** 505 lines  
**New line count after changes:** ~520 lines (net +15, but individual steps get more verbose)

**Key constant to verify (line 505):** The file ends with `findSectionForLine` helper function. Do not modify it.

---

## Change 1: Add `RAG_CONFIG` Import

### [MODIFY] Line 20–34 — Imports block

The file currently imports from `@/lib/rag/services/rag-ingestion-service`, `@/lib/rag/services/rag-embedding-service`, `@/lib/rag/services/rag-db-mappers`, and `@/types/rag`. It does **not** import `RAG_CONFIG`.

**Current import block (lines 20–34):**
```typescript
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
```

**Change to:**
```typescript
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
import { RAG_CONFIG } from '@/lib/rag/config';
import type { FactExtraction, StructureAnalysisResult } from '@/types/rag';
```

**Why:** `RAG_CONFIG.embedding.model` (`'text-embedding-3-small'`) is needed when creating the `rag_embedding_runs` record in Fix 2, matching the pattern in `rag-ingestion-service.ts`.

---

## Change 2: Fix Step 3 — `pass-2-policies`

### [MODIFY] Lines 113–145 — Step 3: Pass 2 Policy Extraction

This is the step that caused all 4 timeout failures. All 29 sections are inside a single `step.run()`.

**Current (lines 116–145):**
```typescript
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
```

**Change to:**
```typescript
    // ========================================
    // Step 3: Pass 2 — Policy Extraction (Sonnet 4.5)
    // One step.run() per section — each is independently checkpointed.
    // ========================================
    const policyFacts: FactExtraction[] = [];
    if (structure.documentType !== 'tabular') {
      console.log(`[Inngest] Pass 2: Extracting policies from ${sections.length} sections...`);
      for (const section of sections) {
        const sectionFacts = await step.run(`pass-2-policy-${section.id}`, async () => {
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
            console.log(`[Inngest] Pass 2: ${section.title}: ${facts.length} facts`);
            return facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 2 error for "${section.title}":`, err);
            return [] as FactExtraction[];
          }
        });
        policyFacts.push(...sectionFacts);
      }
      console.log(`[Inngest] Pass 2 complete: ${policyFacts.length} total policy facts`);
    } else {
      console.log(`[Inngest] Pass 2: Skipped (tabular document)`);
    }
```

**Key changes:**
- The outer `step.run('pass-2-policies', ...)` wrapper is removed
- Each `section` gets its own `step.run(`pass-2-policy-${section.id}`, ...)` call
- The step key uses `section.id` (UUID) — guaranteed unique per document run
- `policyFacts` is now a `let`-style accumulated array, not a const from a single step
- The tabular skip guard moves to an outer `if` block
- Each section step catches its own errors and returns `[]` on failure — one bad section doesn't abort the others

---

## Change 3: Fix Step 4 — `pass-3-tables`

### [MODIFY] Lines 148–208 — Step 4: Pass 3 Table Extraction

**Current (lines 150–208):**
```typescript
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
          const sectionId = findSectionForLine(sections as any, structure as any, table.startLine);
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
```

**Change to:**
```typescript
    // ========================================
    // Step 4: Pass 3 — Table Extraction (Sonnet 4.5)
    // One step.run() per table — each is independently checkpointed.
    // allTableRegions is computed outside steps (pure function, no LLM).
    // ========================================
    const tableFacts: FactExtraction[] = [];
    if (structure.documentType !== 'narrative') {
      // Compute table regions outside any step — pure deterministic function
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
      const lines = doc.originalText.split('\n');

      for (let tableIdx = 0; tableIdx < allTableRegions.length; tableIdx++) {
        const table = allTableRegions[tableIdx];
        const tableLines = lines.slice(
          Math.max(0, table.startLine - 1),
          Math.min(lines.length, table.endLine)
        );
        const tableText = tableLines.join('\n');
        const contextBefore = lines.slice(
          Math.max(0, table.startLine - 6),
          Math.max(0, table.startLine - 1)
        ).join('\n');
        const contextAfter = lines.slice(
          Math.min(lines.length, table.endLine),
          Math.min(lines.length, table.endLine + 5)
        ).join('\n');

        const tblFacts = await step.run(`pass-3-table-${tableIdx}`, async () => {
          try {
            const result = await provider.extractTableData({
              tableText,
              surroundingContext: `${contextBefore}\n[TABLE]\n${contextAfter}`,
              documentType: structure.documentType,
            });
            const facts = tableResultToFacts(result);
            const sectionId = findSectionForLine(sections as any, structure as any, table.startLine);
            await storeExtractedFacts(documentId, doc.userId, sectionId, facts);
            console.log(`[Inngest] Pass 3: Table "${result.tableName}": ${facts.length} rows`);
            return facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 3 error for table at line ${table.startLine}:`, err);
            return [] as FactExtraction[];
          }
        });
        tableFacts.push(...tblFacts);
      }
      console.log(`[Inngest] Pass 3 complete: ${tableFacts.length} total table facts`);
    } else {
      console.log(`[Inngest] Pass 3: Skipped (narrative document)`);
    }
```

**Key changes:**
- Outer `step.run('pass-3-tables', ...)` wrapper removed
- `allTableRegions` computed outside any step (pure string processing — deterministic, safe)
- Loop uses numeric index `tableIdx` as the step key — tables don't have IDs
- Pre-computed `tableText` / `contextBefore` / `contextAfter` moved outside the step body to avoid repetition on replay (string slicing is cheap, but cleaner this way)
- Each table step catches its own errors

---

## Change 4: Fix Step 6 — `pass-5-narrative`

### [MODIFY] Lines 232–271 — Step 6: Pass 5 Narrative Facts

**Current (lines 234–271):**
```typescript
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
```

**Change to:**
```typescript
    // ========================================
    // Step 6: Pass 5 — Narrative Facts (Sonnet 4.5)
    // One step.run() per narrative section — each is independently checkpointed.
    // narrativeSections filter is computed outside steps (pure logic).
    // ========================================

    // Determine which sections get narrative extraction (pure logic, no LLM)
    const narrativeSections = sections.filter(s => {
      const meta = s.sectionMetadata as any;
      if (structure.documentType === 'narrative') return true;
      if (structure.documentType === 'structured-policy') return meta?.isNarrative === true;
      if (structure.documentType === 'mixed') return meta?.isNarrative === true;
      if (structure.documentType === 'tabular') return false;
      return false;
    });

    const narrativeFacts: FactExtraction[] = [];
    if (narrativeSections.length > 0) {
      console.log(`[Inngest] Pass 5: Extracting narrative facts from ${narrativeSections.length} sections...`);
      for (const section of narrativeSections) {
        const sectionFacts = await step.run(`pass-5-narrative-${section.id}`, async () => {
          try {
            const result = await provider.extractNarrativeFacts({
              sectionText: section.originalText,
              sectionTitle: section.title || 'Untitled',
              documentType: structure.documentType,
            });
            await storeExtractedFacts(documentId, doc.userId, section.id, result.facts);
            console.log(`[Inngest] Pass 5: "${section.title}": ${result.facts.length} narrative facts`);
            return result.facts;
          } catch (err) {
            console.warn(`[Inngest] Pass 5 error for "${section.title}":`, err);
            return [] as FactExtraction[];
          }
        });
        narrativeFacts.push(...sectionFacts);
      }
      console.log(`[Inngest] Pass 5 complete: ${narrativeFacts.length} total narrative facts`);
    } else {
      console.log(`[Inngest] Pass 5: No narrative sections to process`);
    }
```

---

## Change 5: Fix Step 7 — `pass-6-verification`

### [MODIFY] Lines 274–319 — Step 7: Pass 6 Verification

Pass 6 uses Opus 4.6 — the heaviest model. With 29 sections this step is the most likely to have exceeded even 800 seconds eventually. Per-section steps eliminate this risk entirely.

Note: Pass 6 queries the DB inside each section's step body to fetch existing facts. This is valid — `supabase` is available in the closure (it's declared at the top of the Inngest function, line 46).

**Current (lines 276–319):**
```typescript
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
```

**Change to:**
```typescript
    // ========================================
    // Step 7: Pass 6 — Verification (Opus 4.6)
    // One step.run() per section — each is independently checkpointed.
    // Each step queries DB for existing facts and runs Opus 4.6 verification.
    // ========================================
    console.log(`[Inngest] Pass 6: Running Opus 4.6 verification on ${sections.length} sections...`);
    const verificationFacts: FactExtraction[] = [];

    for (const section of sections) {
      const sectionFacts = await step.run(`pass-6-verify-${section.id}`, async () => {
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
            console.log(`[Inngest] Pass 6: "${section.title}": found ${result.missingFacts.length} missed facts (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
            return result.missingFacts;
          } else {
            console.log(`[Inngest] Pass 6: "${section.title}": complete (coverage: ${(result.coverageEstimate * 100).toFixed(0)}%)`);
            return [] as FactExtraction[];
          }
        } catch (err) {
          console.warn(`[Inngest] Pass 6 error for "${section.title}":`, err);
          return [] as FactExtraction[];
        }
      });
      verificationFacts.push(...sectionFacts);
    }

    console.log(`[Inngest] Pass 6 complete: ${verificationFacts.length} recovery facts`);
```

---

## Change 6: Fix Step 10 — `generate-preambles`

### [MODIFY] Lines 350–371 — Step 10: Contextual Preamble Generation

**Current (lines 352–371):**
```typescript
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
```

**Change to:**
```typescript
    // ========================================
    // Step 10: Contextual Preambles (Haiku)
    // One step.run() per section — each is independently checkpointed.
    // ========================================
    console.log(`[Inngest] Generating contextual preambles for ${sections.length} sections...`);

    for (const section of sections) {
      await step.run(`generate-preamble-${section.id}`, async () => {
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
      });
    }
```

---

## Change 7: Fix Step 11 — `generate-embeddings` (Embedding Run Lifecycle)

### [MODIFY] Lines 374–442 — Step 11: Generate Enriched Embeddings

This is Fix 2 from the analysis. The step currently calls `generateAndStoreBatchEmbeddings` without a `runId`, so multi-pass embeddings appear as "untagged (legacy)" in the Golden-Set tool.

**Current (lines 376–442):**
```typescript
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
        knowledgeBaseId: doc.knowledgeBaseId || undefined,
        items: embeddingItems,
      });

      console.log(`[Inngest] Generated ${embeddingItems.length} embeddings`);
      return embeddingItems.length;
    });
```

**Change to:**
```typescript
    // ========================================
    // Step 11: Generate Enriched Embeddings
    // ========================================
    const embeddingCount = await step.run('generate-embeddings', async () => {
      console.log(`[Inngest] Generating enriched 3-tier embeddings...`);

      // Delete any existing embeddings (handles retry — clear previous attempt's embeddings)
      await deleteDocumentEmbeddings(documentId);

      // Mark any previous in-progress embedding run records as failed (handles retry)
      await supabase
        .from('rag_embedding_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('document_id', documentId)
        .eq('status', 'running');

      // Create new embedding run record
      const embeddingRunId = crypto.randomUUID();
      const { error: runCreateError } = await supabase
        .from('rag_embedding_runs')
        .insert({
          id: embeddingRunId,
          document_id: documentId,
          user_id: doc.userId,
          embedding_count: 0,
          embedding_model: RAG_CONFIG.embedding.model,
          status: 'running',
          pipeline_version: 'multi-pass',
          started_at: new Date().toISOString(),
          metadata: {
            section_count: sections.length,
            document_file_name: doc.fileName,
          },
        });

      if (runCreateError) {
        console.warn('[Inngest] Failed to create embedding run record:', runCreateError);
        // Non-fatal — continue without run tracking (matches pattern in rag-ingestion-service.ts)
      }

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
        knowledgeBaseId: doc.knowledgeBaseId || undefined,
        runId: embeddingRunId,
        items: embeddingItems,
      });

      // Update embedding run record with final status
      if (!runCreateError) {
        await supabase
          .from('rag_embedding_runs')
          .update({
            embedding_count: embeddingItems.length,
            status: result.success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', embeddingRunId);
      }

      console.log(`[Inngest] Generated ${embeddingItems.length} embeddings (run: ${embeddingRunId.slice(0, 8)})`);
      return embeddingItems.length;
    });
```

**Key changes:**
1. Before creating the new run record, update any existing `running` records for this document to `failed` — handles the retry case where a previous Step 11 attempt started but didn't complete
2. Create `rag_embedding_runs` record with `pipeline_version: 'multi-pass'` — matches the shape created by `rag-ingestion-service.ts` (single-pass path)
3. Pass `runId: embeddingRunId` to `generateAndStoreBatchEmbeddings` — embeddings are now tagged
4. Update run record with final count and status after completion
5. Log includes run ID prefix for traceability

---

## Complete File: Summary of All Changes

| Change | Lines (current) | Description |
|--------|----------------|-------------|
| 1 | ~34 | Add `RAG_CONFIG` import |
| 2 | 116–145 | `pass-2-policies`: 1 step per section |
| 3 | 150–208 | `pass-3-tables`: 1 step per table |
| 4 | 234–271 | `pass-5-narrative`: 1 step per narrative section |
| 5 | 276–319 | `pass-6-verification`: 1 step per section |
| 6 | 352–371 | `generate-preambles`: 1 step per section |
| 7 | 376–442 | `generate-embeddings`: add embedding run lifecycle + `runId` |

**No other files require changes.**

---

## TypeScript Compilation Verification

After all changes are applied:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```

Expected: `exit code 0` — no errors.

**TypeScript notes for implementer:**
- `policyFacts`, `tableFacts`, `narrativeFacts`, `verificationFacts` change from `const X = await step.run(...)` to `const X: FactExtraction[] = []` accumulated arrays — this is valid TypeScript
- `step.run()` return type is inferred from the async function body — returning `FactExtraction[]` or `[] as FactExtraction[]` is correct
- `crypto.randomUUID()` is available in the Next.js/Node.js environment (same as used in `rag-ingestion-service.ts` line 453)
- `RAG_CONFIG.embedding.model` is type `string` (satisfies the `embedding_model` column)

---

## Deployment

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && git add -A && git commit -m "E014: Fix multi-pass Inngest pipeline — per-section steps + embedding run lifecycle

- Refactor pass-2-policies, pass-3-tables, pass-5-narrative, pass-6-verification,
  and generate-preambles to use one step.run() per section/table
- Each LLM call is now independently checkpointed by Inngest
- A timeout on section N no longer causes sections 0..N-1 to re-process
- Add rag_embedding_runs lifecycle to generate-embeddings step (Fix 2)
- Multi-pass embeddings now tagged with run_id and appear in golden-set selector" && git push
```

Verify Vercel deployment succeeds before re-submitting the stuck document.

---

## Post-Deployment Verification

### 1. Verify Inngest Step Graph (Vercel Logs)

After re-submitting the document, the Vercel log should show individual step entries like:

```
[Inngest] Pass 2: Extracting policies from 29 sections...
[Inngest] Pass 2: Header: 4 facts
[Inngest] Pass 2: 1. Bank Overview and Philosophy: 47 facts
[Inngest] Pass 2: 2. Eligibility and Account Standards: 8 facts
... (continues through all 29 sections without a 504)
[Inngest] Pass 2 complete: N total policy facts
```

Each section should complete within 10–45 seconds. No 504 errors should appear.

### 2. Verify Embedding Run Record (SAOL)

After the pipeline completes, verify the embedding run record was created:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    const r = await saol.agentQuery({
        table: 'rag_embedding_runs',
        select: 'id,document_id,pipeline_version,status,embedding_count,embedding_model,started_at,completed_at',
        where: [{ column: 'pipeline_version', operator: 'eq', value: 'multi-pass' }],
        orderBy: [{ column: 'created_at', asc: false }],
        limit: 5,
    });
    console.log('Multi-pass embedding runs:', r.data.length);
    r.data.forEach(run => {
        console.log('-', run.id.slice(0, 8), '|', run.status, '|', run.embedding_count, 'embeddings |', run.pipeline_version);
    });
})();
"
```

Expected: A new record with `status: 'completed'`, `pipeline_version: 'multi-pass'`, and `embedding_count > 0`.

### 3. Verify Embeddings Are Tagged (SAOL)

Confirm that embeddings from the new run carry the `run_id`:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    // Get the most recent multi-pass run
    const runs = await saol.agentQuery({
        table: 'rag_embedding_runs',
        select: 'id,document_id,embedding_count',
        where: [{ column: 'pipeline_version', operator: 'eq', value: 'multi-pass' }, { column: 'status', operator: 'eq', value: 'completed' }],
        orderBy: [{ column: 'created_at', asc: false }],
        limit: 1,
    });
    if (!runs.data.length) { console.log('No completed multi-pass runs found'); return; }
    const run = runs.data[0];
    console.log('Run:', run.id, '| Expected embeddings:', run.embedding_count);

    // Count embeddings tagged with this run_id
    const tagged = await saol.agentQuery({
        table: 'rag_embeddings',
        select: 'id',
        where: [{ column: 'run_id', operator: 'eq', value: run.id }],
    });
    console.log('Embeddings tagged with run_id:', tagged.data.length);
    console.log('Match:', tagged.data.length === run.embedding_count ? 'YES' : 'NO');
})();
"
```

### 4. Verify Golden-Set Selector Shows the New Run

Navigate to `/rag/test` in the browser. The embedding run selector dropdown should now show the new multi-pass run with its date, time, embedding count, and `(multi-pass)` label.

If the document is the canonical test document (`CANONICAL_DOCUMENT_ID`), the run will appear immediately in the dropdown. If it's a different document, the selector only shows runs for the canonical document — see Section 5 below.

### 5. Canonical Document Note

The Golden-Set test tool only queries `rag_embedding_runs` for `CANONICAL_DOCUMENT_ID` (defined in `src/lib/rag/testing/golden-set-definitions.ts`). To see the new multi-pass run in the selector, you must either:

- **Use the same canonical document** — if the re-submitted test document is `ceff906e-968a-416f-90a6-df2422519d2b`, the run will appear immediately
- **OR update the canonical document ID** — if testing with a new document, update `CANONICAL_DOCUMENT_ID` to the new document's ID

---

## Step Count Impact

After this refactor, a 29-section document will generate approximately:

| Pass | Steps (before) | Steps (after) |
|------|----------------|---------------|
| Pass 2 (policies) | 1 | 29 |
| Pass 3 (tables) | 1 | N (varies) |
| Pass 5 (narrative) | 1 | N (narrative sections only) |
| Pass 6 (verification) | 1 | 29 |
| Preambles | 1 | 29 |
| **Total** | **~17 steps** | **~130+ steps** |

Inngest handles hundreds of steps per function without issue. The Inngest dashboard will show each step individually, which gives excellent observability into pipeline progress.

---

## Rollback Plan

If the deployment causes an issue, revert the single commit:

```bash
git revert HEAD && git push
```

This restores the monolithic steps. The Vercel 800s timeout setting remains in place as a safety net.

---

## Success Criteria

- [ ] TypeScript compiles without errors
- [ ] Vercel deployment succeeds
- [ ] Re-submitted document processes through all 6 passes without a 504 timeout
- [ ] Vercel logs show per-section step entries for Pass 2 (and others)
- [ ] `rag_embedding_runs` record created with `pipeline_version: 'multi-pass'` and `status: 'completed'`
- [ ] Embedding count on the run record matches the actual tagged embeddings in `rag_embeddings`
- [ ] Golden-Set test tool's embedding run selector shows the new multi-pass run in the dropdown
- [ ] Existing RAG chat functionality unaffected (no `runId` filter by default)
