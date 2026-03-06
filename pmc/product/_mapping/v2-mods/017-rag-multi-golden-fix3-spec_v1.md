# 017 — RAG Module Cleanup & Hardening Specification

---

| Field | Value |
|-------|-------|
| **Date** | 2026-02-19 |
| **Author** | GitHub Copilot (Claude Opus 4.6) |
| **Based on** | `017-rag-multi-golden-QA_v1.md` (Discovery Report + James' Answers) |
| **Scope** | System hardening, data cleanup, document ID isolation, reranking fix |
| **Constraint** | ALL database operations MUST use SAOL |
| **SAOL Reference** | `pmc/product/_mapping/multi/workfiles/supabase-agent-ops-library-use-instructions.md` |

---

## Table of Contents

1. [Objective](#1-objective)
2. [Change 1 — RAG Module Data Cleanup Script](#change-1--rag-module-data-cleanup-script)
3. [Change 2 — Remove CANONICAL_DOCUMENT_ID Fallback](#change-2--remove-canonical_document_id-fallback)
4. [Change 3 — Scope Embedding Run Dropdown to Selected Document](#change-3--scope-embedding-run-dropdown-to-selected-document)
5. [Change 4 — Fail-Fast on Undefined documentId](#change-4--fail-fast-on-undefined-documentid)
6. [Change 5 — Fix Reranking: Dedicated Lightweight LLM Call](#change-5--fix-reranking-dedicated-lightweight-llm-call)
7. [Change 6 — Wire buildEnrichedEmbeddingText into Ingestion](#change-6--wire-buildenrichedembeddingtext-into-ingestion)
8. [Change 7 — Embed All Facts After All Passes Complete](#change-7--embed-all-facts-after-all-passes-complete)
9. [Change 8 — Golden Test Timeout & Batch Hardening](#change-8--golden-test-timeout--batch-hardening)
10. [Change 9 — Self-Eval Token Limit & JSON Robustness](#change-9--self-eval-token-limit--json-robustness)
11. [Execution Order](#execution-order)
12. [Out of Scope](#out-of-scope)

---

## 1. Objective

Harden the RAG module so it produces **clean, isolated, reproducible test runs** with no cross-document contamination, no stale canonical fallbacks, and no silent degradation in the retrieval pipeline.

The approach is:
1. **Clean** — Purge all existing RAG run data (not persistent metadata) so no commingled/stale data remains.
2. **Harden** — Fix the system so document IDs cannot be confused, undefined IDs fail fast instead of falling back to stale data, and silent failures (reranking, self-eval) are eliminated.
3. **Re-test** — Run a single clean embedding + golden test against one document to get a true baseline.

---

## Change 1 — RAG Module Data Cleanup Script

### Summary
Create a SAOL-based cleanup script that purges ALL data from the RAG module — run data, containers, uploaded files — so the module is completely clean for a fresh test cycle.

### File to Create
`scripts/rag-cleanup.js`

### What Gets Deleted (in dependency order)

| Order | Table | Why |
|-------|-------|-----|
| 1 | `rag_quality_scores` | FK → `rag_queries`. Evaluation results from prior runs. |
| 2 | `rag_queries` | FK → `rag_knowledge_bases`, `rag_documents`. Query/response logs from tests and chat. |
| 3 | `rag_test_reports` | No formal FK. Golden test result snapshots. |
| 4 | `rag_embedding_runs` | No formal FK. Embedding run metadata. |
| 5 | `rag_embeddings` | FK → `rag_documents`. All vector embeddings (largest table). |
| 6 | `rag_expert_questions` | FK → `rag_documents`. LLM-generated Q&A pairs (KB-specific, no longer needed). |
| 7 | `rag_facts` | FK → `rag_documents`, `rag_sections`. Extracted facts from ingestion. |
| 8 | `rag_sections` | FK → `rag_documents`. Document sections from ingestion. |
| 9 | `rag_documents` | FK → `rag_knowledge_bases`. Upload records for all ingested documents. |
| 10 | `rag_knowledge_bases` | Root container. Empty KB shells — all clutter to be removed. |

### What Gets Preserved

**Nothing.** This is a full wipe of all RAG data. The user re-creates a KB, re-uploads the document, and starts fresh.

### What Gets Cleared from Storage

| Bucket | Why |
|--------|-----|
| `rag-documents` | Original uploaded PDF/DOCX files at `{user_id}/{doc_id}/{filename}`. We don't want 100 copies of the same test file cluttering the storage. The script lists and deletes all objects in this bucket. |

> **Note on `rag_expert_questions`:** These are deleted. Expert Q&A answers are document-specific and meaningless without the parent document. Investigation confirmed: user-provided answers are NOT directly embedded or used as system instructions. They are used once — at document verification time — to refine section summaries and generate new facts via an LLM call. Those refined artifacts then get embedded. Since we're deleting all facts, sections, and embeddings, the expert answers serve no purpose. They will be regenerated when the document is re-ingested.

### SAOL Implementation Pattern

```javascript
// scripts/rag-cleanup.js
require('dotenv').config({ path: '../.env.local' });
const saol = require('../supa-agent-ops');

(async () => {
  console.log('=== RAG Module Full Cleanup ===\n');

  // Delete all RAG run data and containers in FK-safe order (leaf → root)
  const tablesToDelete = [
    'rag_quality_scores',    // 1 — FK → rag_queries
    'rag_queries',           // 2 — FK → rag_knowledge_bases, rag_documents
    'rag_test_reports',      // 3 — no formal FK
    'rag_embedding_runs',    // 4 — no formal FK
    'rag_embeddings',        // 5 — FK → rag_documents
    'rag_expert_questions',  // 6 — FK → rag_documents
    'rag_facts',             // 7 — FK → rag_documents, rag_sections (self-ref)
    'rag_sections',          // 8 — FK → rag_documents (self-ref)
    'rag_documents',         // 9 — FK → rag_knowledge_bases
    'rag_knowledge_bases',   // 10 — root table
  ];

  for (const table of tablesToDelete) {
    const result = await saol.agentExecuteSQL({
      sql: `DELETE FROM ${table};`,
      transaction: true,
      transport: 'pg',
    });
    console.log(`  ${table}: ${result.success ? '✓ cleared' : '✗ FAILED'} ${result.summary || ''}`);
  }

  // Step 11: Clear storage bucket
  console.log('\n--- Clearing storage bucket ---');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: files, error: listError } = await supabase.storage
      .from('rag-documents')
      .list('', { limit: 1000 });
    if (listError) {
      console.log(`  rag-documents bucket: ✗ LIST FAILED — ${listError.message}`);
    } else if (files && files.length > 0) {
      // Storage may have nested folders — need recursive listing
      // For top-level folders (user_id prefixes), list each and delete contents
      for (const item of files) {
        if (item.id === null) {
          // It's a folder — list its contents
          const { data: subFiles } = await supabase.storage
            .from('rag-documents')
            .list(item.name, { limit: 1000 });
          if (subFiles && subFiles.length > 0) {
            const paths = subFiles.map(f => `${item.name}/${f.name}`);
            const { error: delError } = await supabase.storage
              .from('rag-documents')
              .remove(paths);
            console.log(`  ${item.name}/: ${delError ? '✗ FAILED' : `✓ ${paths.length} files removed`}`);
          }
        } else {
          // It's a file at root level
          const { error: delError } = await supabase.storage
            .from('rag-documents')
            .remove([item.name]);
          console.log(`  ${item.name}: ${delError ? '✗ FAILED' : '✓ removed'}`);
        }
      }
    } else {
      console.log('  rag-documents bucket: ✓ already empty');
    }
  } catch (storageErr) {
    console.log(`  rag-documents bucket: ✗ ERROR — ${storageErr.message}`);
    console.log('  (Manual cleanup via Supabase dashboard may be needed)');
  }

  // Verify all tables are empty
  console.log('\n--- Verification ---');
  for (const table of tablesToDelete) {
    const count = await saol.agentQuery({ table, select: 'id', limit: 1 });
    console.log(`  ${table}: ${count.data.length === 0 ? '✓ empty' : '✗ NOT EMPTY — CHECK MANUALLY'}`);
  }

  console.log('\n=== Cleanup Complete ===');
  console.log('Next step: Re-create a KB, upload your document, and run ingestion.');
})();
```

### Acceptance Criteria

**AC-1.1: All RAG tables are empty after cleanup**
- GIVEN the cleanup script is run via `cd supa-agent-ops && node ../scripts/rag-cleanup.js`
- WHEN each table in the deletion list is queried
- THEN all 10 tables (`rag_quality_scores`, `rag_queries`, `rag_test_reports`, `rag_embedding_runs`, `rag_embeddings`, `rag_expert_questions`, `rag_facts`, `rag_sections`, `rag_documents`, `rag_knowledge_bases`) return 0 rows

**AC-1.2: Knowledge bases fully removed**
- GIVEN the cleanup script has run
- WHEN `rag_knowledge_bases` is queried
- THEN 0 rows are returned — no ghost KB containers remain

**AC-1.3: Document records fully removed**
- GIVEN the cleanup script has run
- WHEN `rag_documents` is queried
- THEN 0 rows are returned

**AC-1.4: Storage bucket cleared**
- GIVEN the cleanup script has run
- WHEN the `rag-documents` storage bucket is listed
- THEN 0 files remain — all previously uploaded PDFs/DOCXs are removed

---

## Change 2 — Remove CANONICAL_DOCUMENT_ID Fallback

### Summary
Remove the hardcoded `CANONICAL_DOCUMENT_ID` constant and the fallback pattern `body.documentId || CANONICAL_DOCUMENT_ID`. This constant points to a stale document (`ceff906e`) from an old single-pass ingestion run. It creates silent commingling when the test UI doesn't send a document ID — instead of failing visibly, the test silently runs against the wrong document.

### Root Cause (from 017 discovery)
The golden test API route falls back to `CANONICAL_DOCUMENT_ID` when `body.documentId` is undefined. Since the user re-uploads the same PDF for each test run (creating a new document ID each time), the canonical ID points to an old/stale document, and tests can silently target it instead of the intended document.

### Files to Modify

**File 1: `src/lib/rag/testing/golden-set-definitions.ts` (line 72)**
- Remove the export: `export const CANONICAL_DOCUMENT_ID = 'ceff906e-968a-416f-90a6-df2422519d2b';`
- Or deprecate with a comment and set to empty string to break silently-wrong fallbacks.

**File 2: `src/app/api/rag/test/golden-set/route.ts` (line 43)**
- Current: `const documentId: string = body.documentId || CANONICAL_DOCUMENT_ID;`
- Change to: require `body.documentId`, return 400 if missing (see Change 4).
- Remove the import of `CANONICAL_DOCUMENT_ID`.

**File 3: `src/app/api/rag/test/golden-set/route.ts` (line 31, GET handler)**
- Current: `documentId: CANONICAL_DOCUMENT_ID` in the GET response
- Remove or replace with `null`.

**File 4: `src/app/api/rag/test/golden-set/reports/route.ts` (lines 10, 39, 103)**
- Line 10: Remove import of `CANONICAL_DOCUMENT_ID`.
- Line 39: POST handler inserts `document_id: CANONICAL_DOCUMENT_ID` — change to use `body.documentId` (required from client).
- Line 103: GET handler filters `.eq('document_id', CANONICAL_DOCUMENT_ID)` — change to accept `documentId` from query params, return 400 if missing.

### Acceptance Criteria

**AC-2.1: No CANONICAL_DOCUMENT_ID usage in production code**
- GIVEN the changes are applied
- WHEN `grep -r "CANONICAL_DOCUMENT_ID" src/` is run
- THEN zero matches (only PMC spec docs should reference it)

**AC-2.2: Golden test POST rejects missing documentId**
- GIVEN a POST to `/api/rag/test/golden-set` with no `documentId` in the body
- WHEN the request is processed
- THEN the API returns HTTP 400 with `{ success: false, error: "documentId is required" }`

**AC-2.3: Reports API rejects missing documentId**
- GIVEN a GET/POST to `/api/rag/test/golden-set/reports` with no `documentId`
- WHEN the request is processed
- THEN the API returns HTTP 400 with `{ success: false, error: "documentId is required" }`

---

## Change 3 — Fix Run Isolation: Prevent Cross-Run Querying and Run/Document Mismatch

### Summary
Fix two confirmed bugs in the golden test pipeline: (1) the API does not validate that the selected `runId` actually belongs to the selected `documentId`, allowing mismatched parameters, and (2) BM25 text search never filters by `run_id`, causing every query to silently return facts/sections from ALL ingestion runs for a document — even when the user selected a specific run.

The embedding run dropdown is NOT being filtered or scoped. All runs remain visible so the user can pick any run. The fix is making the backend correctly enforce the user's choice.

### Root Cause (from investigation)
- **Bug 1 — No server-side validation:** `route.ts` accepts `runId` and `documentId` from the POST body and passes them through without ever checking that the run belongs to the document. Stale UI state or API misuse can produce mismatched parameters.
- **Bug 2 — BM25 ignores run_id:** `searchTextContent()` in `rag-embedding-service.ts` has no `runId` parameter. The SQL `search_rag_text` RPC only filters by `document_id` and `knowledge_base_id`. When retrieval combines vector results (run-filtered) with BM25 results (unfiltered), the hybrid merge includes facts from other runs.

### Files to Modify

**File 1: `src/app/api/rag/test/golden-set/route.ts` (lines 44-45)**
- Add validation that `runId` belongs to `documentId`:
  ```typescript
  if (body.runId) {
    // Validate run belongs to the specified document
    const { data: run } = await supabase
      .from('rag_embedding_runs')
      .select('id, document_id')
      .eq('id', body.runId)
      .single();
    if (!run) {
      return NextResponse.json(
        { success: false, error: `Embedding run ${body.runId} not found` },
        { status: 400 }
      );
    }
    if (run.document_id !== body.documentId) {
      return NextResponse.json(
        { success: false, error: `Embedding run ${body.runId} belongs to document ${run.document_id}, not ${body.documentId}. Select the correct run.` },
        { status: 400 }
      );
    }
  }
  ```

**File 2: `src/lib/rag/services/rag-embedding-service.ts` — `searchTextContent` function (lines 188-216)**
- Add optional `runId` parameter to the function signature.
- If `runId` is provided, add a subquery filter to only return facts/sections whose embeddings are tagged with that run.
- The simplest approach: add `filter_run_id` parameter to the `search_rag_text` RPC.

**File 3: Supabase RPC — `search_rag_text` function**
- Add a `filter_run_id UUID DEFAULT NULL` parameter.
- When `filter_run_id` is not NULL, join `rag_facts` to `rag_embeddings` to restrict results to facts that have embeddings tagged with that run:
  ```sql
  AND (filter_run_id IS NULL OR EXISTS (
    SELECT 1 FROM rag_embeddings e
    WHERE e.source_id = f.id
      AND e.source_type = 'fact'
      AND e.run_id = filter_run_id
  ))
  ```

**File 4: `src/lib/rag/services/rag-retrieval-service.ts` — `retrieveContext` function (lines 150-157)**
- Pass `runId` through to `searchTextContent`:
  ```typescript
  const textResults = await searchTextContent({
    queryText: params.queryText,
    documentId: params.documentId,
    knowledgeBaseId: params.knowledgeBaseId,
    runId: params.runId,  // ← NEW: propagate run filter to BM25
    limit: 10,
  });
  ```

### Acceptance Criteria

**AC-3.1: API rejects mismatched runId/documentId**
- GIVEN a POST to `/api/rag/test/golden-set` with `runId` that belongs to document A but `documentId` set to document B
- WHEN the route processes the request
- THEN it returns HTTP 400 with an error message identifying the mismatch

**AC-3.2: BM25 search respects run filter**
- GIVEN a user selects embedding run "run-X" for a document that also has "run-Y"
- WHEN `searchTextContent` executes with `runId = run-X`
- THEN only facts/sections associated with run-X's embeddings are returned (no results from run-Y)

**AC-3.3: Hybrid retrieval is fully run-isolated**
- GIVEN a RAG query with `runId` specified
- WHEN both vector search and BM25 execute
- THEN ALL results (from both paths) are scoped to that single run — no cross-run contamination in the assembled context

**AC-3.4: No-run-selected still works**
- GIVEN a RAG query with `runId` undefined (user selects "All embeddings")
- WHEN BM25 and vector search execute
- THEN all facts/sections for the document are searched (no run filter applied) — existing behavior preserved

---

## Change 4 — Fail-Fast on Undefined documentId

### Summary
Make the RAG query pipeline and golden test API reject requests with undefined/missing `documentId` instead of silently falling back to stale data or searching across all documents.

### Root Cause (from 017 discovery + James' direction)
> "Wouldn't any situation where a document id is undefined be by definition a failed run and should not be assigned to a 'catch all' document that could create corrupted data?"

### Files to Modify

**File 1: `src/app/api/rag/test/golden-set/route.ts` (line 43)**
- Current: `const documentId: string = body.documentId || CANONICAL_DOCUMENT_ID;`
- Change to:
  ```typescript
  if (!body.documentId) {
    return NextResponse.json(
      { success: false, error: 'documentId is required. Select a document before running the golden test.' },
      { status: 400 }
    );
  }
  const documentId: string = body.documentId;
  ```

**File 2: `src/lib/rag/services/rag-retrieval-service.ts` — `queryRAG` function (line ~766)**
- Current: `documentId: params.documentId || undefined` (optional, falls through to KB-wide search).
- Add a guard at the top of `queryRAG`:
  ```typescript
  if (!params.documentId) {
    throw new Error('[RAG Retrieval] documentId is required — cannot query without document scope');
  }
  ```
- This ensures that even if a caller bypasses the route-level check, the pipeline won't silently search all documents.

**File 3: `src/app/(dashboard)/rag/test/page.tsx`**
- Disable the "Run Golden Test" button when no document is selected.
- Show a message: "Select a document to run the golden test."

### Acceptance Criteria

**AC-4.1: API rejects missing documentId**
- GIVEN a POST to `/api/rag/test/golden-set` with `documentId` omitted or `null`
- WHEN the route processes the request
- THEN it returns HTTP 400 with `{ success: false, error: "documentId is required..." }`

**AC-4.2: queryRAG throws on missing documentId**
- GIVEN `queryRAG` is called with `documentId: undefined`
- WHEN the function starts
- THEN it throws an error with message containing "documentId is required"

**AC-4.3: UI prevents running without document selection**
- GIVEN no document is selected in the test page
- WHEN the user looks at the "Run Golden Test" button
- THEN the button is disabled with a tooltip "Select a document first"

---

## Change 5 — Fix Reranking: Dedicated Lightweight LLM Call

### Summary
The `rerankWithClaude` function currently calls `provider.generateResponse()`, which wraps the input in a RAG citation template that conflicts with the reranking system prompt. Replace with a dedicated lightweight Claude call that sends only the system prompt and candidate list, without the RAG formatting layer.

### Root Cause (from 017 discovery + investigation)
`generateResponse()` hardcodes a user message format:
```
Context from knowledge base:
${assembledContext}
---
User question: ${queryText}
Provide a comprehensive answer... Output JSON: {"responseText": "...", "citations": [...]}
```
This directly contradicts the reranker's system prompt which asks for `[3, 0, 5, 1, 2, 4]`. Claude receives conflicting instructions and produces a RAG-formatted answer, not an index array. All three parse strategies fail silently.

### Files to Modify

**File 1: `src/lib/rag/providers/claude-llm-provider.ts`**
- Add a new method `generateLightweightCompletion` (or `generateSimpleResponse`) that:
  - Accepts `{ systemPrompt: string; userMessage: string; maxTokens?: number; temperature?: number }`
  - Sends the system prompt as `system` and user message as a single `messages[0]` with no RAG formatting
  - Returns `{ responseText: string }` (raw Claude response text, no JSON parsing)
  - Uses `temperature: 0` for deterministic ranking
  - Uses `max_tokens: 200` (an array of 20 indices is ~60 tokens)

```typescript
async generateLightweightCompletion(params: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ responseText: string }> {
  const response = await this.client.messages.create({
    model: RAG_CONFIG.llm.model,
    max_tokens: params.maxTokens || 200,
    temperature: params.temperature ?? 0,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userMessage }],
  });
  const responseText = response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('');
  return { responseText };
}
```

**File 2: `src/lib/rag/services/rag-retrieval-service.ts` — `rerankWithClaude` (lines 304-322)**
- Change from `provider.generateResponse(...)` to `provider.generateLightweightCompletion(...)`.
- Pass the candidate list as `userMessage` (not `assembledContext`).
- Keep existing 3-strategy parse logic (it should now work since Claude returns a bare array).
- Increase candidate truncation from 200 to 500 characters for better ranking signal.

Current:
```typescript
const response = await provider.generateResponse({
  queryText: `Rank these passages by relevance to the query: "${params.queryText}"`,
  assembledContext: candidateList,
  systemPrompt: `You are a relevance ranker...`,
});
```

Change to:
```typescript
const response = await provider.generateLightweightCompletion({
  systemPrompt: `You are a relevance ranker. Given a query and numbered passages, return ONLY a JSON array of passage indices ordered from most relevant to least relevant. Example: [3, 0, 5, 1, 2, 4]. No other text.`,
  userMessage: `Query: "${params.queryText}"\n\nPassages:\n${candidateList}`,
  maxTokens: 200,
  temperature: 0,
});
```

### Acceptance Criteria

**AC-5.1: Reranking produces valid index array**
- GIVEN a RAG query with 10 retrieval candidates
- WHEN `rerankWithClaude` is called
- THEN the response is successfully parsed into an integer array AND the console does NOT log "Could not parse ranking, using original order"

**AC-5.2: Reranking uses lightweight call**
- GIVEN `rerankWithClaude` calls the provider
- WHEN the Claude API request is inspected
- THEN the user message does NOT contain "Provide a comprehensive answer" or "Output JSON: {responseText"

**AC-5.3: Candidate truncation increased**
- GIVEN candidates are formatted for the reranker
- WHEN the candidate list is built
- THEN each candidate shows up to 500 characters (not 200)

---

## Change 6 — Wire buildEnrichedEmbeddingText into Ingestion

### Summary
The `buildEnrichedEmbeddingText(fact)` function in `rag-embedding-service.ts` prepends provenance metadata (`[Policy: X] [Section: Y] [Category: Z]`) to the embedding text. It is currently dead code — never called. Wire it into the tier-3 embedding generation in `rag-ingestion-service.ts`.

### Root Cause (from 017 discovery)
Tier-3 embeddings use `fact.content` (raw text with no provenance). The enrichment function was designed in spec 013 but never integrated. This reduces semantic search precision because the embedding vector doesn't encode section/policy context.

### Files to Modify

**File 1: `src/lib/rag/services/rag-ingestion-service.ts` (lines ~508-513, the `generateEmbeddings` step)**
- Current tier-3 embedding text:
  ```typescript
  embeddingText = fact.content;
  ```
- Change to:
  ```typescript
  embeddingText = buildEnrichedEmbeddingText(fact);
  ```
- Add the import at the top of the file:
  ```typescript
  import { buildEnrichedEmbeddingText } from './rag-embedding-service';
  ```

**File 2: `src/lib/rag/services/rag-embedding-service.ts`**
- Ensure `buildEnrichedEmbeddingText` is exported (it already is based on investigation).
- No code changes needed in this file — just confirm the export.

### Acceptance Criteria

**AC-6.1: Tier-3 embeddings use enriched text**
- GIVEN a document is ingested (new embedding run)
- WHEN tier-3 embeddings are generated for facts
- THEN each embedding's `content_text` field in `rag_embeddings` begins with `[Policy:` or `[Section:` or `[Category:` provenance prefix (not raw fact content)

**AC-6.2: buildEnrichedEmbeddingText is called during ingestion**
- GIVEN the `generateEmbeddings` step runs
- WHEN a fact is being embedded
- THEN `buildEnrichedEmbeddingText(fact)` is called (verified by adding a log or by checking the stored `content_text`)

**AC-6.3: Existing tier-1 and tier-2 embedding logic unchanged**
- GIVEN tier-1 and tier-2 embeddings are generated
- WHEN the embedding text is constructed
- THEN it uses the existing `summary + topics` (tier-1) and `contextualPreamble + summary` (tier-2) patterns — not `buildEnrichedEmbeddingText`

---

## Change 7 — Embed All Facts After All Passes Complete

### Summary
Ensure that embedding generation runs AFTER all 6 ingestion passes have completed, so every fact has a corresponding embedding. Currently 226 of 1,226 facts (18.4%) are missing embeddings because the embedding step runs before later passes create additional facts.

### Root Cause (from 017 discovery)
Multi-pass ingestion adds facts across passes 1–6, but embedding generation appears to run before all passes complete. Facts from later passes are never embedded.

### Files to Modify

**File 1: `src/lib/rag/services/rag-ingestion-service.ts` — embedding generation step**
- Locate the function(s) that trigger embedding generation.
- If embedding generation is part of the step sequencing (Inngest or direct pipeline), ensure it is the LAST step after all 6 passes.
- Add a verification log: after embedding generation completes, query the count of facts vs count of tier-3 embeddings and log any gap.

**File 2: If using Inngest for orchestration** — check the Inngest function definition to verify step ordering:
- Search `src/` for Inngest step definitions related to RAG ingestion.
- Verify that the embedding step is `step.run('generate-embeddings', ...)` and is sequenced AFTER the last fact-extraction pass.

### Acceptance Criteria

**AC-7.1: All facts have embeddings after ingestion**
- GIVEN a document is fully ingested through all 6 passes
- WHEN embedding generation completes
- THEN the count of tier-3 embeddings equals the count of facts for that document (zero gap)

**AC-7.2: Embedding step runs after all passes**
- GIVEN the ingestion pipeline starts
- WHEN passes 1 through 6 all complete
- THEN the embedding generation step runs AFTER pass 6, not interleaved with earlier passes

**AC-7.3: Gap detection logged**
- GIVEN embedding generation completes
- WHEN the fact count differs from the tier-3 embedding count
- THEN a warning is logged: `[RAG Embedding] WARNING: ${gap} facts have no embedding (${factCount} facts, ${embeddingCount} tier-3 embeddings)`

---

## Change 8 — Golden Test Timeout & Batch Hardening

### Summary
Reduce golden test batch size and add `res.ok` guard before JSON parsing to prevent the Vercel 120s timeout from killing batch 4 and producing the "Unexpected token 'A'" JSON parse error.

### Root Cause (from 017 discovery)
Batch size of 4 × ~25s/query = ~100s + overhead → exceeds 120s `maxDuration`. Client calls `res.json()` on the 504 HTML error page.

### Files to Modify

**File 1: `src/app/api/rag/test/golden-set/route.ts`**
- Change `BATCH_SIZE` from 4 to 2. With 2 queries per batch: 2 × 30s = 60s max, well within 120s.
- This increases batches from 5 to 10, but each completes faster and more reliably.

**File 2: `src/app/(dashboard)/rag/test/page.tsx` (lines 155-162)**
- Add `res.ok` check BEFORE `res.json()`:
  ```typescript
  if (!res.ok) {
    setError(`Batch ${batch + 1} failed: HTTP ${res.status} ${res.statusText}`);
    break;
  }
  const json = await res.json();
  ```

### Acceptance Criteria

**AC-8.1: Batches complete within timeout**
- GIVEN a golden test run with 20 questions
- WHEN all batches execute
- THEN every batch completes before the 120s Vercel timeout (no 504 errors)

**AC-8.2: JSON parse error eliminated**
- GIVEN a batch request returns a non-200 status
- WHEN the client processes the response
- THEN it does NOT attempt `res.json()` on a non-200 response, and instead shows a clean error message

**AC-8.3: All 20 questions execute**
- GIVEN a golden test run
- WHEN the test completes
- THEN the summary reports results for all 20 questions (no partial reports from timeout)

---

## Change 9 — Self-Eval Token Limit & JSON Robustness

### Summary
Increase the self-eval `max_tokens` from 300 to 600 and add a fallback parser so truncated JSON doesn't crash the evaluation.

### Root Cause (from 017 discovery)
Claude's self-eval response with `score`, `confidence`, `reasoning`, and `issues` frequently exceeds 300 tokens, causing mid-JSON truncation. `parseJsonResponse` can't find matching braces and throws.

### Files to Modify

**File 1: `src/lib/rag/services/rag-retrieval-service.ts` — `selfEvaluate` function**
- Change `max_tokens: 300` to `max_tokens: 600`.
- Add a try/catch around the `parseJsonResponse` call with a fallback that still returns a valid (low-confidence) evaluation result instead of throwing:
  ```typescript
  let evalResult;
  try {
    evalResult = parseJsonResponse<SelfEvalResult>(responseText, 'self-eval');
  } catch {
    console.warn('[RAG Self-Eval] JSON parse failed, returning default low-confidence result');
    evalResult = { score: 0.5, confidence: 0.0, reasoning: 'Self-eval parse failed', issues: ['truncated response'] };
  }
  ```

### Acceptance Criteria

**AC-9.1: Self-eval token limit is 600**
- GIVEN the `selfEvaluate` function calls Claude
- WHEN the API request is made
- THEN `max_tokens` is 600

**AC-9.2: Truncated responses don't crash**
- GIVEN Claude returns a truncated JSON response for self-eval
- WHEN `parseJsonResponse` throws
- THEN the catch block returns a default result with `confidence: 0.0` and the overall query still succeeds

---

## Execution Order

This is the recommended sequence for implementing and verifying these changes:

| Step | Change | Rationale |
|------|--------|-----------|
| **1** | Change 1 — Run cleanup script | Start clean. No stale/commingled data. |
| **2** | Change 2 — Remove CANONICAL_DOCUMENT_ID | Eliminate the root of fallback confusion. |
| **3** | Change 4 — Fail-fast on undefined documentId | Enforce document scope. Pairs with Change 2. |
| **4** | Change 3 — Scope embedding run dropdown | UI changes to support document selection. |
| **5** | Change 8 — Timeout & batch hardening | Ensure golden test runs complete before testing fixes below. |
| **6** | Change 9 — Self-eval robustness | Prevent JSON crashes that obscure results. |
| **7** | Change 5 — Fix reranking | Quality improvement — retrieval pipeline. |
| **8** | Change 6 — Wire buildEnrichedEmbeddingText | Quality improvement — embedding precision. |
| **9** | Change 7 — Embed all facts | Quality improvement — embedding coverage. |
| **10** | **Run clean ingestion** | Re-ingest the test document through the hardened pipeline. |
| **11** | **Run golden test** | Get baseline scores on clean data with all fixes applied. |

---

## Out of Scope

These items were identified in the 017 discovery but are explicitly deferred per James' direction:

| Item | Why Deferred |
|------|--------------|
| Fix golden test questions GS-002, GS-004 (bad data) | Need clean baseline first to confirm which questions are truly bad vs. data commingling artifacts |
| Fix expected substrings GS-012, GS-015 | Same — need clean run to verify |
| N+1 query batching in `retrieveContext` | Performance optimization, not correctness. Evaluate after batch size reduction (Change 8) |
| Self-eval groundedness (evaluating response text) | Quality monitoring improvement, not blocking |
| BM25 run_id filtering | Low risk; evaluate if needed after clean run |

---

*End of specification. This document is ready for implementation.*
