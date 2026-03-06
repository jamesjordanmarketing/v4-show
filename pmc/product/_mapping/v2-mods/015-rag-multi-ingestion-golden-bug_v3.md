# 015 — RAG Multi-Pass Ingestion: Bug Analysis & Fix Specification (v1)

**Date:** February 18, 2026  
**Log Sources:**
- `pmc/product/_mapping/v2-mods/test-data/vercel-log-28.csv`
- `pmc/product/_mapping/v2-mods/test-data/inngest-log-002.txt`

**Document:** `c2a50638-299f-4a62-ae7c-5a7f87880f3b` — Sun Chip Private Bank Institutional Sovereign Manual  
**Pipeline Version:** Multi-pass (post-015_v2 refactoring)
Cursor Sonnet 4.6

---

## Section 1: Timeline Reconstruction

The following sequence was reconstructed from the Vercel and Inngest logs:

| Time (UTC) | Event |
|------------|-------|
| 08:24:52 | New knowledge base created |
| 08:25:24 | Document upload submitted → Inngest job triggered |
| 08:25:27 | **Pass 1 starts** (Structure Analysis, Sonnet 4.5) |
| 08:27:58 | **Pass 1 complete**: 29 sections, type=`mixed` (duration: **150,376 ms — 2.5 minutes**) |
| 08:28:02 | 29 sections stored to database |
| 08:28:03 → 08:29:44 | **Pass 2 (per-section)**: Individual Inngest steps running per section. Visible progress: section-by-section logging confirmed. |
| ~08:41:41 | **Pass 2 complete**: 513 total policy facts |
| ~08:41:41 | **Pass 3 starts**: 19 tables |
| ~08:41:41 | **Pass 3 complete**: 99 total table facts |
| 08:41:41 | **Pass 4 starts** (`extractGlossaryAndRelationships`) |
| 08:42:51 | **Pass 4 FAILS** — JSON parse error (response truncated at position 27,713 of 27,829 chars) |
| 08:42:52 | Inngest retries Pass 4 (replaying prior checkpointed steps) |
| 08:42:52 | **Pass 4 FAILS again** — 400 status (final failure after retries exhausted) |
| — | Pipeline terminates in failed state. Document remains `processing` in UI. |

**Inngest retry count (from inngest-log-002.txt):** Pass 4 failed **6 times** at nearly identical response lengths (27,425 to 28,130 chars), confirming this is a deterministic failure, not transient.

---

## Section 2: Root Cause Analysis

### Bug 1 (CRITICAL) — Pass 4 `max_tokens` Too Small → Response Truncation → JSON Parse Failure

**Location:** `src/lib/rag/config.ts`, line 35  
**Current value:** `glossaryExtraction: 8192`

#### The Evidence

From the logs:

```
Error: Expected ',' or ']' after array element in JSON at position 27713. Response length: 27829 chars.
```

The "Last 500 chars of original" log entry shows the response ending mid-sentence:

```json
{
  "term": "High Liquidity Offset Exception",
  "definition": "DTI expansion to 45% if client
```

The `definition` field is cut off mid-value. The JSON object has no closing `"`, no closing `}`, no closing `]` for the outer `definitions` array, and no closing `}` for the root object. This is the signature of a Claude API response hitting its `max_tokens` limit and stopping generation precisely at the token boundary.

#### Why 8,192 Is Too Small for This Document

A document with 29 sections and a full glossary, entity, and relationship structure produces approximately:
- **~50–80 definitions** (each with `term`, `definition`, `policyContext`)
- **~40–80 entities** (each with `name`, `type`, `description`)
- **~30–60 relationships** (each with `from`, `to`, `type`, `description`)

The observed response for this document is consistently 27,500–28,200 characters. At the typical JSON token density (JSON has high punctuation density, producing approximately **3.3–3.8 characters per token**):

```
27,829 chars ÷ 3.5 chars/token ≈ 7,951 tokens
28,130 chars ÷ 3.5 chars/token ≈ 8,037 tokens
```

These are at or just over the 8,192 token limit. Claude generates output up to the limit, then stops abruptly, leaving the JSON array mid-element. Because the response is **non-deterministic** (Claude varies exact wording slightly each run), the exact character count varies per retry, but all retries hit the same fundamental ceiling.

#### Why Retries Cannot Fix This

Each of the 6 retry invocations asks Claude the same question with the same document. The document always generates approximately the same volume of glossary content. All 6 retries fail at essentially the same response length. No amount of retrying resolves a structural `max_tokens` configuration problem.

**This is a configuration bug, not a transient error.**

---

### Bug 2 (IMPORTANT) — No Error Containment in Pass 4 Step

**Location:** `src/inngest/functions/process-rag-document.ts`, lines 211–227

#### Current Code

```typescript
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

    console.log(`[Inngest] Pass 4 complete: ${result.definitions.length} definitions, ...`);
    return facts;
});
```

Pass 4 has no `try/catch`. When `extractGlossaryAndRelationships` throws (due to JSON parse failure), the exception propagates out of the `step.run()` callback. Inngest treats this as a **step failure** and retries the entire step (and often replays preceding steps). After exhausting retries, the whole function is marked as failed.

**The consequence:** 6 Claude API calls are wasted on retries that cannot succeed, and the pipeline fails entirely — blocking the document from ever reaching Passes 5–11 and embeddings.

**The correct behavior:** Pass 4 (Glossary) is a **best-effort enrichment pass**. If it fails (e.g., document is so large the response overflows), the pipeline should log a warning, store zero glossary facts, and continue to Pass 5. Glossary facts enhance retrieval quality but their absence does not make the document un-queryable.

---

### Bug 3 (MINOR) — `parseJsonResponse` Does Not Attempt JSON Truncation Recovery

**Location:** `src/lib/rag/providers/claude-llm-provider.ts`, lines 37–103

The current `parseJsonResponse` function attempts two parse strategies:
1. Direct `JSON.parse()` on the raw text
2. Extract the largest brace/bracket-bounded region and parse that

It does **not** attempt to recover from a **truncated** JSON array, which is a predictable failure mode when `max_tokens` is hit. A truncated JSON array (where the response ends mid-element) can often be partially salvaged: all complete elements before the truncation point are valid and useful.

For a response like:
```json
{
  "definitions": [
    { "term": "A", "definition": "..." },
    { "term": "B", "definition": "..."   <-- truncated here
  ],
  "entities": [...]
}
```
The partial JSON cannot be `JSON.parse()`d as-is. However, a recovery function could attempt to truncate back to the last complete element (i.e., find the last `},` or `}` followed by a `]` or `}`) and reconstruct valid JSON from what's available.

This is a nice-to-have improvement that makes the pipeline resilient to edge cases even after Bug 1 is fixed, since future larger documents may hit even higher token limits.

---

## Section 3: What IS Working (Post-015_v2 Refactoring)

The previous refactoring successfully fixed the Pass 2 timeout. Confirmed in this run:

- ✅ **Pass 2** — Per-section policy extraction working correctly. Each section has its own `step.run()`, with section-by-section logging visible: `[Inngest] Pass 2: BC-ELIG-001: Minimum Balance and Maintenance Rules: 36 facts`, etc. Total: 513 policy facts extracted.
- ✅ **Pass 3** — Per-table extraction working correctly. 19 tables → 99 table facts.
- ✅ **Inngest checkpointing** — The pipeline successfully resumes from Pass 2 checkpoints on restart, not re-running completed sections.
- ✅ **Pass 1** — Structure analysis produced 29 sections, document type = `mixed`. (Note: Pass 1 took 150,376 ms = 2.5 minutes. This is within acceptable bounds but is worth monitoring for larger documents.)

---

## Section 4: Implementation Specification

### Fix 1 — Increase `glossaryExtraction` max_tokens

**File:** `src/lib/rag/config.ts`  
**Line:** 35

**Current:**
```typescript
glossaryExtraction: 8192,   // Pass 4: definitions, entities, relationships
```

**Change to:**
```typescript
glossaryExtraction: 32768,  // Pass 4: definitions, entities, relationships (full-doc scan, needs large budget)
```

**Rationale:** The glossary pass sends the **entire document** to Claude and receives a potentially large JSON payload containing all defined terms, entities, and cross-references. Unlike per-section passes (Pass 2, 3, 5, 6), Pass 4 is a single monolithic call against the full document. For a 29-section policy document, the response alone requires ~8,000+ tokens. Setting it to 32,768 provides a factor of 4x headroom, matching the `default` value used for retrieval-time operations. This safely handles documents up to ~4x the current test document's glossary size.

---

### Fix 2 — Add Error Containment to Pass 4 Step

**File:** `src/inngest/functions/process-rag-document.ts`  
**Lines:** 211–227

**Current:**
```typescript
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
```

**Change to:**
```typescript
const glossaryFacts = await step.run('pass-4-glossary', async () => {
    console.log(`[Inngest] Pass 4: Extracting glossary, entities, relationships...`);

    try {
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
    } catch (err) {
        console.error(`[Inngest] Pass 4 FAILED (glossary extraction) — skipping and continuing:`, err instanceof Error ? err.message : String(err));
        console.warn(`[Inngest] Pass 4: Continuing pipeline without glossary facts. This may reduce retrieval quality.`);
        return [] as FactExtraction[];
    }
});
```

**Rationale:** Pass 4 is best-effort enrichment. A failure here should NOT terminate the pipeline. The document's core facts (from Passes 2, 3, 5, 6) remain valid and queryable without glossary enrichment. By catching the error, logging it clearly, and returning an empty array, the pipeline continues to Passes 5–11, generates embeddings, and marks the document as complete. The operator can see in Vercel logs that glossary extraction was skipped.

**Important:** Fix 2 is a **safety net**. Fix 1 (increasing max_tokens) is the primary correction. With Fix 1, Pass 4 should not fail for any reasonably-sized document. Fix 2 ensures that if it does fail (e.g., for an exceptionally large document in the future), the pipeline degrades gracefully rather than failing entirely.

---

### Fix 3 (Optional Enhancement) — JSON Truncation Recovery in `parseJsonResponse`

**File:** `src/lib/rag/providers/claude-llm-provider.ts`  
**After line 75** (after the current brace-extraction logic, before the final parse attempt)

This enhancement adds a recovery attempt for truncated JSON arrays. It tries to find the last complete object in each top-level array within the response, rebuilds valid JSON, and returns a partial result. This is particularly useful for Pass 4's response structure which is a root object with three arrays (`definitions`, `entities`, `relationships`).

**Insert the following helper function before `parseJsonResponse`:**

```typescript
/**
 * Attempt to recover a partial/truncated JSON object by walking back from the end
 * to find the last syntactically valid closing position.
 * 
 * Strategy: Find the last occurrence of `},` or `}` that is a valid array element
 * terminator, close the open array with `]`, close any open outer object with `}`.
 * 
 * This handles the specific case where Claude hits max_tokens mid-element.
 */
function attemptTruncatedJsonRecovery(text: string): string | null {
    try {
        // Find all top-level object array entries by looking for the pattern of
        // a complete element ending (the last `},` or `}` before a structural break)
        // Try progressively shorter substrings until we find something parseable
        
        // Work backwards from end, looking for last `}` that could close an array element
        let candidate = text.trimEnd();
        
        // If it ends with a partial string (mid-quote), remove the partial element
        // Find the last `}` that appears to be a complete object
        const lastCompleteObj = candidate.lastIndexOf('},');
        const lastCompleteObjNoComma = candidate.lastIndexOf('}');
        
        if (lastCompleteObj < 0 && lastCompleteObjNoComma < 0) return null;
        
        // Try to reconstruct by cutting to the last complete element
        const cutPoint = lastCompleteObj >= 0 ? lastCompleteObj + 1 : lastCompleteObjNoComma + 1;
        const truncated = candidate.substring(0, cutPoint);
        
        // Count unclosed brackets/braces to reconstruct closing tokens
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escapeNext = false;
        
        for (const char of truncated) {
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\' && inString) { escapeNext = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (char === '{') openBraces++;
            else if (char === '}') openBraces--;
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets--;
        }
        
        // Close all unclosed arrays then objects
        let recovered = truncated;
        for (let i = 0; i < openBrackets; i++) recovered += ']';
        for (let i = 0; i < openBraces; i++) recovered += '}';
        
        // Validate the recovered JSON
        JSON.parse(recovered);
        return recovered;
    } catch {
        return null;
    }
}
```

**Then, in `parseJsonResponse`, add a recovery attempt between the existing boundary extraction and the final parse/error:**

```typescript
// NEW: Attempt truncation recovery before giving up
if (start >= 0 && end > start) {
    // ... (existing boundary extraction runs first) ...
}

// Attempt truncation recovery if the cleaned string fails to parse
// (handles the case where Claude hit max_tokens mid-element)
const recovered = attemptTruncatedJsonRecovery(cleaned);
if (recovered) {
    try {
        const result = JSON.parse(recovered) as T;
        console.warn(`[parseJsonResponse] Used truncation recovery for ${context || 'unknown context'}. Partial result returned.`);
        return result;
    } catch {
        // Recovery also failed — fall through to error logging
    }
}
```

**Placement (precise):** Insert the recovery call at line 77, after the `cleaned = cleaned.substring(start, end + 1)` block and before the `try { return JSON.parse(cleaned) }` block.

---

## Section 5: Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/lib/rag/config.ts` | Fix 1: `glossaryExtraction: 8192` → `32768` | **CRITICAL** |
| `src/inngest/functions/process-rag-document.ts` | Fix 2: Add try/catch to Pass 4 step | **IMPORTANT** |
| `src/lib/rag/providers/claude-llm-provider.ts` | Fix 3: Add `attemptTruncatedJsonRecovery` + call | Optional |

---

## Section 6: Pre-Fix Actions Required

Before re-running the pipeline, the stuck document must be reset. The document `c2a50638-299f-4a62-ae7c-5a7f87880f3b` is currently in `processing` status and must be reset to `pending` (or deleted and re-uploaded) to allow a new pipeline run.

### Option A: Reset Document Status (SAOL)

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    // Reset the stuck document to 'pending' so it can be re-processed
    const result = await saol.agentUpdateRows({
        table: 'rag_documents',
        filter: { id: 'c2a50638-299f-4a62-ae7c-5a7f87880f3b' },
        updates: { status: 'pending', processed_at: null, error_message: null },
        transport: 'pg'
    });
    console.log('Reset result:', JSON.stringify(result, null, 2));
})();
"
```

### Option B: Delete and Re-upload

Delete the document from the UI and re-upload it. This is simpler but loses the document record ID.

---

## Section 7: Verification Steps

After deploying the fixes:

### 1. TypeScript Compilation

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/src" && npx tsc -p tsconfig.json --noEmit
```

Expected: Exit code 0, no errors.

### 2. Config Verification

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
// Verify the config is being picked up correctly (no runtime import, just check file)
const config = require('../src/lib/rag/config');
console.log('glossaryExtraction max_tokens:', config.RAG_CONFIG.llm.maxTokens.glossaryExtraction);
// Should print: 32768
"
```

### 3. End-to-End Pipeline Test

1. Reset or delete the stuck document (Section 6)
2. Deploy to Vercel
3. Re-upload the Sun Chip document to a clean knowledge base
4. Monitor Vercel logs for:
   - `[Inngest] Pass 4: Extracting glossary, entities, relationships...` — should appear
   - `[Inngest] Pass 4 complete: X definitions, Y entities, Z relationships` — should appear (no error)
   - **No** `[parseJsonResponse] FAILED TO PARSE JSON (extractGlossaryAndRelationships)` errors
5. Monitor pipeline continuing to Pass 5, 6, and embedding generation
6. Verify document status changes to `completed` in the UI

### 4. Post-Run SAOL Verification

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "
require('dotenv').config({path:'../.env.local'});
const saol = require('.');
(async () => {
    // Check document status
    const doc = await saol.agentReadRows({
        table: 'rag_documents',
        filter: { id: 'c2a50638-299f-4a62-ae7c-5a7f87880f3b' },
        transport: 'pg'
    });
    console.log('Document status:', doc.data?.[0]?.status);

    // Check facts were stored (glossary facts have section_id = null)
    const facts = await saol.agentReadRows({
        table: 'rag_facts',
        filter: { document_id: 'c2a50638-299f-4a62-ae7c-5a7f87880f3b', section_id: null },
        transport: 'pg'
    });
    console.log('Glossary facts stored (section_id=null):', facts.data?.length);

    // Check embeddings were created
    const embeddings = await saol.agentReadRows({
        table: 'rag_embeddings',
        filter: { document_id: 'c2a50638-299f-4a62-ae7c-5a7f87880f3b' },
        transport: 'pg'
    });
    console.log('Embeddings stored:', embeddings.data?.length);
    
    // Check embedding run was created
    const runs = await saol.agentReadRows({
        table: 'rag_embedding_runs',
        filter: { document_id: 'c2a50638-299f-4a62-ae7c-5a7f87880f3b' },
        transport: 'pg'
    });
    console.log('Embedding runs:', runs.data?.length, runs.data?.[0]?.status);
})();
"
```

---

## Section 8: Risk Assessment

### Applying Fix 1 Only (Minimum Required Change)

- **Risk:** Very low. Changing a `max_tokens` config value from 8,192 to 32,768 has no side effects other than allowing Claude to produce a longer response. The API call costs marginally more (longer output = more output tokens billed), but this is negligible.
- **Does it fix the bug?** Yes. The document's glossary content is ~8,000 tokens. With 32,768 tokens headroom, even a document 4x as large would not hit the limit.

### Applying Fix 2 (Error Containment)

- **Risk:** Very low. The `try/catch` only activates if `extractGlossaryAndRelationships` throws. When Pass 4 succeeds (which it will after Fix 1), this code path is never taken.
- **Why apply it anyway:** Future-proofing. If a much larger document is ever processed, and the glossary still overflows (even 32,768 tokens), the pipeline continues rather than failing permanently.

### NOT Applying Fix 3 (JSON Recovery)

- **Recommended to skip for now.** Fix 3 is a complex enhancement that may introduce subtle issues if the recovery logic misidentifies truncation points. Since Fix 1 eliminates the truncation and Fix 2 provides graceful degradation, Fix 3 adds complexity without immediate benefit. It can be implemented in a future hardening pass.

---

## Section 9: Outstanding Considerations

### Pass 1 Duration

Pass 1 (Structure Analysis) took **150,376 ms (2.5 minutes)** for the 29-section document. This is a long single Claude call. It uses Sonnet 4.5 with `max_tokens: 8192` and sends the full document text. While it completed successfully in this run, there may be a risk on:
- Very large documents (500+ pages) where the document text itself approaches 100k tokens
- Sonnet 4.5 congestion periods where latency is higher

**Recommendation:** Monitor Pass 1 latency. If it starts failing, consider increasing `structureAnalysis: 8192` → `16384`. This is not urgent as Pass 1 completed successfully in this run.

### Pass 4 Will Now Be the Longest Single LLM Step

After Fix 1, Pass 4 can generate up to 32,768 output tokens. For the current test document (~8,000 tokens of output), this is fine. But if the glossary for a much larger document approaches 32,768 tokens, Pass 4 could become the new bottleneck. This is not an immediate concern but should be tracked.

### Inngest Retry Budget

Pass 4 consumed all of Inngest's retry budget (6 retries) before being fixed. By default Inngest retries failed steps up to `retryTimes` (typically 4 in configuration). After Fix 2 (error containment), Pass 4 will never consume retry budget — it catches its own errors and returns gracefully. This preserves retry budget for other steps that may have transient failures.
