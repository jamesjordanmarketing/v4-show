# 013 — RAG Multi-Pass Ingestion Upgrade: Execution Prompt E02

**Section:** E02 — Claude LLM Provider: 6 New Extraction Methods  
**Version:** 1.0  
**Date:** February 16, 2026  
**Prerequisites:** E01 complete (DB migration, types, config, LLM interface, DB mappers)  
**Builds Upon:** E01 foundation layer  
**Next Section:** E03 (Ingestion Service Refactor + Inngest Pipeline)

---

## Overview

This prompt implements the 6 new extraction methods in the Claude LLM Provider — one for each pass of the multi-pass ingestion pipeline. Each method includes a carefully designed prompt for its specific extraction task, uses the per-pass model routing from the updated `RAG_CONFIG`, and returns a strongly-typed result. It also fixes the `readDocument()` method to use the new `maxTokens.default` config shape.

**What This Section Creates / Modifies:**
1. `src/lib/rag/providers/claude-llm-provider.ts` — 6 new methods (~400 lines):
   - `analyzeDocumentStructure()` (Pass 1 — Sonnet 4.5)
   - `extractPoliciesForSection()` (Pass 2 — Sonnet 4.5)
   - `extractTableData()` (Pass 3 — Sonnet 4.5)
   - `extractGlossaryAndRelationships()` (Pass 4 — Haiku)
   - `extractNarrativeFacts()` (Pass 5 — Sonnet 4.5)
   - `verifyExtractionCompleteness()` (Pass 6 — Opus 4.6)
2. Fix `readDocument()` to use `RAG_CONFIG.llm.maxTokens.default`

**What This Section Does NOT Create:**
- Ingestion service helpers or Inngest pipeline (E03)
- Retrieval service changes (E04)
- UI changes or testing scripts (E05)

---

========================    


## Prompt E02: Claude LLM Provider — 6 New Extraction Methods

You are implementing 6 new extraction methods in the Claude LLM Provider class for a 6-pass multi-pass RAG ingestion pipeline. This is E02 of a 5-part implementation.

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src\`

### Prerequisites — What E01 Built

E01 has already been completed and made these changes (do NOT repeat them):

1. **Database:** `rag_facts` has 5 new nullable columns: `policy_id`, `rule_id`, `parent_fact_id`, `subsection`, `fact_category`. `rag_documents` has 2 new columns: `content_hash`, `document_type`.

2. **Types (`src/types/rag.ts`):**
   - `RAGFactType` now has 14 values (was 4)
   - New type: `RAGDocumentType = 'structured-policy' | 'tabular' | 'narrative' | 'mixed'`
   - `RAGFact` has 5 new fields: `policyId`, `ruleId`, `parentFactId`, `subsection`, `factCategory`
   - `FactExtraction` has 5 new optional fields: `policyId`, `ruleId`, `qualifiesRule`, `factCategory`, `subsection`
   - 6 new interfaces: `StructureAnalysisResult`, `PolicyExtractionResult`, `TableExtractionResult`, `GlossaryExtractionResult`, `NarrativeExtractionResult`, `VerificationResult`

3. **Config (`src/lib/rag/config.ts`):**
   - `RAG_CONFIG.llm.maxTokens` is now an **object** with per-pass budgets (was a single number `32768`)
   - `RAG_CONFIG.llm.maxTokens.default` = 32768 (for retrieval-time operations)
   - `RAG_CONFIG.llm.ingestionModels` has per-pass model IDs

4. **LLM Interface (`src/lib/rag/providers/llm-provider.ts`):** Has 6 new method signatures (analyzeDocumentStructure, extractPoliciesForSection, extractTableData, extractGlossaryAndRelationships, extractNarrativeFacts, verifyExtractionCompleteness)

5. **DB Mappers:** `mapRowToFact` and `mapRowToDocument` updated with new fields

### Critical Rules

1. **Read the file first.** Read `src/lib/rag/providers/claude-llm-provider.ts` (currently 473 lines) before making changes.
2. **The `parseJsonResponse<T>()` helper already exists** (lines 32-96). Reuse it for all new methods.
3. **The `ClaudeLLMProvider` class already exists** (line 98+). Add the new methods to this class.
4. **Use `RAG_CONFIG.llm.ingestionModels.*`** for per-pass model routing.
5. **Use `RAG_CONFIG.llm.maxTokens.*`** for per-pass token budgets.

---

### Task 1: Fix `readDocument()` maxTokens Reference

In the existing `readDocument()` method, find the line that references `RAG_CONFIG.llm.maxTokens` and change it to `RAG_CONFIG.llm.maxTokens.default`.

**Find:**
```typescript
    max_tokens: RAG_CONFIG.llm.maxTokens,
```

**Replace with:**
```typescript
    max_tokens: RAG_CONFIG.llm.maxTokens.default,
```

Also add the new type imports at the top of the file. Update the existing import block:

**Current imports (lines 1-14):**
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
```

**Replace with:**
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
import type { LLMProvider } from './llm-provider';
import { RAG_CONFIG } from '../config';
```

---

### Task 2: Add Pass 1 — `analyzeDocumentStructure()`

Add this method to the `ClaudeLLMProvider` class (before the closing `}` of the class):

```typescript
  // ============================================
  // Multi-Pass Extraction Methods (Phase 1)
  // ============================================

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

---

### Task 3: Add Pass 2 — `extractPoliciesForSection()`

Add this method after `analyzeDocumentStructure()`:

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
      // Tabular documents skip Pass 2 entirely — return empty
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

---

### Task 4: Add Pass 3 — `extractTableData()`

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

---

### Task 5: Add Pass 4 — `extractGlossaryAndRelationships()`

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

---

### Task 6: Add Pass 5 — `extractNarrativeFacts()`

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

---

### Task 7: Add Pass 6 — `verifyExtractionCompleteness()`

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

### Verification Checklist

After completing all tasks, verify:

1. **TypeScript compilation:** Run `npx tsc --noEmit` from the `src/` directory. There should be NO type errors in `claude-llm-provider.ts` now (the `maxTokens` fix resolves the E01 known issue).

2. **Method count:** The `ClaudeLLMProvider` class should now have these methods:
   - `readDocument` (existing)
   - `generateContextualPreamble` (existing)
   - `refineKnowledge` (existing)
   - `generateHyDE` (existing)
   - `selfEvaluate` (existing)
   - `generateResponse` (existing)
   - `evaluateQuality` (existing)
   - `generateVerificationQuestions` (existing)
   - `analyzeDocumentStructure` (NEW — Pass 1)
   - `extractPoliciesForSection` (NEW — Pass 2)
   - `extractTableData` (NEW — Pass 3)
   - `extractGlossaryAndRelationships` (NEW — Pass 4)
   - `extractNarrativeFacts` (NEW — Pass 5)
   - `verifyExtractionCompleteness` (NEW — Pass 6)
   Total: 14 methods

3. **Model routing:** Verify each new method uses the correct model from `RAG_CONFIG.llm.ingestionModels`:
   - Pass 1: `structureAnalysis` (Sonnet 4.5)
   - Pass 2: `policyExtraction` (Sonnet 4.5)
   - Pass 3: `tableExtraction` (Sonnet 4.5)
   - Pass 4: `glossaryExtraction` (Haiku)
   - Pass 5: `narrativeExtraction` (Sonnet 4.5)
   - Pass 6: `verification` (Opus 4.6)

4. **File size:** `claude-llm-provider.ts` should now be approximately 870-900 lines (was 473).

---

### Files Modified in This Section

| File | Action | Description |
|------|--------|-------------|
| `src/lib/rag/providers/claude-llm-provider.ts` | MODIFY | Add 6 new methods, update imports, fix maxTokens reference |

---

### What E03 Will Build On

E03 (Ingestion Service Refactor + Inngest Pipeline) will:
- Add helper functions to `rag-ingestion-service.ts`: `storeSectionsFromStructure`, `storeExtractedFacts`, `linkFactRelationships`, `findTableRegions`, `policyResultToFacts`, `tableResultToFacts`, `glossaryResultToFacts`
- Add document fingerprinting via `content_hash` in `uploadDocumentFile()`
- Add `buildEnrichedEmbeddingText()` to `rag-embedding-service.ts`
- Rewrite `src/inngest/functions/process-rag-document.ts` as a 12-step multi-pass pipeline that calls the 6 methods implemented here
- The Inngest pipeline will import from `ClaudeLLMProvider` and call each method in sequence


+++++++++++++++++



