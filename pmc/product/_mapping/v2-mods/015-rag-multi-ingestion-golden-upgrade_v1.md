# 015: RAG Multi-Pass Ingestion Failure Analysis & Solution
**Date:** February 18, 2026  
**Document:** Multi-pass ingestion pipeline — timeout diagnosis and fix plan  
**Log:** vercel-log-27.csv  
**Document ID under test:** `9dee7d41-4f38-4429-9da7-4d781363713b`

---

## 1. Current Status of the Job

The document is **stuck in `processing`** status and will never advance on its own.

The pipeline completed Pass 1 (structure analysis) and section storage successfully, but has now made **4 consecutive failed attempts** at Pass 2 (policy extraction), with each attempt killed after exactly 300 seconds. Inngest will keep retrying automatically (configured for 3 retries), but every retry hits the same wall. The job is effectively dead unless intervention occurs.

---

## 2. What the Log Shows — Timeline

| Time (UTC) | Event | Duration |
|---|---|---|
| 05:02:26 | Upload triggered, Inngest job fired | — |
| 05:02:30 | **Pass 1 begins**: `analyzeDocumentStructure` | — |
| 05:04:41 | **Pass 1 complete**: 29 sections, type=mixed | 131s |
| 05:04:44 | 29 sections stored to DB | ~1s |
| 05:04:44 | **Pass 2 attempt 1 begins**: Extracting policies from 29 sections | — |
| 05:09:44 | **Pass 2 attempt 1 killed** — 504 Timeout | 300s |
| 05:10:07 | **Pass 2 attempt 2 begins** (Inngest retry) | — |
| 05:15:07 | **Pass 2 attempt 2 killed** — 504 Timeout | 300s |
| 05:16:05 | **Pass 2 attempt 3 begins** (Inngest retry) | — |
| 05:21:05 | **Pass 2 attempt 3 killed** — 504 Timeout | 300s |
| 05:22:13 | **Pass 2 attempt 4 begins** (Inngest retry) | — |
| 05:27:13 | **Pass 2 attempt 4 killed** — 504 Timeout | 300s |

The error message is explicit:
```
Vercel Runtime Timeout Error: Task timed out after 300 seconds
```

Each attempt managed to process approximately 19 of 29 sections before being killed — sections through `BC-PROD-004: Jumbo Mortgage Program`. The remaining ~10 sections were never reached.

---

## 3. Root Cause: A Monolithic Step

The Inngest function (`src/inngest/functions/process-rag-document.ts`) wraps the entire Pass 2 loop inside **a single `step.run()` call**:

```typescript
// Step 3: Pass 2 — Policy Extraction (line 116)
const policyFacts = await step.run('pass-2-policies', async () => {
    // ⚠️ ALL 29 sections are processed inside one step
    for (const section of sections) {
        const result = await provider.extractPoliciesForSection({ ... });
        // ~10–45 seconds per section via Claude Sonnet 4.5
        ...
    }
});
```

**Why this is fatal:**

Inngest's durability model works at the `step.run()` boundary. When a step completes, Inngest checkpoints its result and will not re-run it on retry. But when a step *times out mid-execution*, Inngest has no partial checkpoint — it must re-run the entire step from the beginning.

With 29 sections × ~15 seconds average per section = **~435 seconds total**, this step will always timeout at the 300-second default limit. Every retry starts again from section 0, processes ~19 sections, times out at second 300, and is killed — infinitely.

**Observed per-section timing from the log (representative attempt):**

| Section | Facts | Cumulative time |
|---|---|---|
| Header | 4 | ~6s |
| 1. Bank Overview and Philosophy | 45–55 | ~35–42s |
| 2. Eligibility and Account Standards | 8 | ~7s |
| BC-ELIG-001: Minimum Balance | 33–44 | ~18s |
| BC-ELIG-002: U.S.-Only Residency | 27–28 | ~18s |
| 3. Identity, Access, and Security | 6 | ~7s |
| BC-SEC-001: Hardware Key | 26 | ~17s |
| BC-SEC-002: BCCC | 25–26 | ~17s |
| 4. Money Movement | 5–6 | ~7s |
| BC-WIRE-001: Outbound Wires | 24–27 | ~16s |
| BC-ACH-001: ACH Management | 18 | ~11s |
| 5. Compliance and Risk | 3–4 | ~5s |
| BC-COMP-001: Prohibited Industries | 29 | ~18s |
| BC-COMP-002: Source of Funds | 31 | ~19s |
| 6. Product Facts | 1 | ~3s |
| BC-PROD-001: Flagship Cash Account | 25–26 | ~16s |
| BC-PROD-002: Treasury Ladder | 19 | ~14s |
| BC-PROD-003: SBLOC | 30–31 | ~20s |
| BC-PROD-004: Jumbo Mortgage | 31–34 | ~20s |
| **→ KILLED HERE** | — | ~300s |
| 10+ remaining sections | — | never reached |

The same 19 sections are processed on every retry. No progress is ever made beyond section 19.

---

## 4. Why the Vercel Timeout Increase Would Help (But Is Not the Right Fix Alone)

Setting Vercel max duration to 800 seconds would likely allow Pass 2 to complete in a single step execution. Based on the observed timing, all 29 sections would take approximately **430–480 seconds**. 800 seconds provides enough headroom.

**However, this is a fragile workaround:**

1. **It only solves Pass 2.** The pipeline has 6 extraction passes plus preamble generation and embedding. Passes 3, 5, 6, and the preamble step (`generate-preambles`) also iterate over sections in a single `step.run()`. Pass 6 (Verification with Opus 4.6) runs ALL 29 sections through a heavier model — it may well exceed even 800 seconds.

2. **It hits the Vercel ceiling.** 800 seconds is the documented Vercel maximum. If a future document has more sections (e.g. 50 sections), or Claude response times are slower, you hit the wall again.

3. **It does not fix the re-processing problem.** Even with 800 seconds, if any step fails for any reason, the entire step restarts from section 0, wasting all the LLM cost and time of completed sections.

4. **A second issue is unaffected by this fix** — see Section 6 below.

---

## 5. The Correct Fix: Per-Section Steps (Inngest-Native Solution)

Move the per-section LLM call out of the loop and into its own `step.run()`. This is exactly what Inngest is designed for: granular, checkpointed steps that resume from the point of failure.

**Current (broken) pattern:**
```typescript
const policyFacts = await step.run('pass-2-policies', async () => {
    for (const section of sections) {
        const result = await provider.extractPoliciesForSection({ ... }); // 10-45s
        ...
    }
});
```

**Correct pattern:**
```typescript
const allPolicyFacts: FactExtraction[] = [];
for (const section of sections) {
    const sectionFacts = await step.run(`pass-2-policy-${section.id}`, async () => {
        const result = await provider.extractPoliciesForSection({ ... }); // 10-45s max per step
        const facts = policyResultToFacts(result, section.title || 'Untitled');
        await storeExtractedFacts(documentId, doc.userId, section.id, facts);
        console.log(`[Inngest] Pass 2: ${section.title}: ${facts.length} facts`);
        return facts;
    });
    allPolicyFacts.push(...sectionFacts);
}
```

With this pattern:
- Each section is its own Inngest step (29 steps for Pass 2)
- If section 20 fails, Inngest resumes from section 20 — sections 1-19 are never re-processed
- Each individual step completes in 10–45 seconds — well within any reasonable Vercel timeout
- The same fix applies to Passes 3, 5, 6, and preamble generation

**Steps that need this treatment:**

| Step Name | Current | Fix |
|---|---|---|
| `pass-2-policies` | `for` loop inside 1 step | 1 step per section |
| `pass-3-tables` | `for` loop inside 1 step | 1 step per table region |
| `pass-5-narrative` | `for` loop inside 1 step | 1 step per narrative section |
| `pass-6-verification` | `for` loop inside 1 step | 1 step per section |
| `generate-preambles` | `for` loop inside 1 step | 1 step per section |

Pass 1 (structure analysis) and Pass 4 (glossary) make a single LLM call over the whole document — they are fine as single steps.

---

## 6. Second Issue: Multi-Pass Pipeline Does Not Create an Embedding Run Record

This is a separate bug discovered during this analysis, relevant to the E09 golden-set selector.

The `processDocument()` function in `rag-ingestion-service.ts` (the simple single-pass path) creates a `rag_embedding_runs` record and passes `runId` to `generateAndStoreBatchEmbeddings`. This means its embeddings appear in the golden-set test's embedding run selector dropdown.

The multi-pass Inngest pipeline (`process-rag-document.ts` Step 11) does **not** create a `rag_embedding_runs` record and does **not** pass `runId`:

```typescript
// Step 11 (line 433) — missing runId
const result = await generateAndStoreBatchEmbeddings({
    documentId,
    userId: doc.userId,
    knowledgeBaseId: doc.knowledgeBaseId || undefined,
    items: embeddingItems,
    // ❌ No runId passed
});
```

**Consequence:** Any document ingested via the multi-pass pipeline will have its embeddings appear as "untagged (legacy)" in the golden-set selector dropdown. The selector will show them as a disabled option and they cannot be filtered. This defeats the purpose of the embedding run selector for any document processed by the multi-pass pipeline.

**Fix needed in Step 11 of `process-rag-document.ts`:**
```typescript
const embeddingRunId = crypto.randomUUID();

// Insert run record before embedding generation
await supabase.from('rag_embedding_runs').insert({
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

// Pass runId to embedding generation
const result = await generateAndStoreBatchEmbeddings({
    documentId,
    userId: doc.userId,
    knowledgeBaseId: doc.knowledgeBaseId || undefined,
    runId: embeddingRunId,    // ✅ Now embeddings are tagged
    items: embeddingItems,
});

// Update run record on completion
await supabase.from('rag_embedding_runs').update({
    embedding_count: embeddingItems.length,
    status: result.success ? 'completed' : 'failed',
    completed_at: new Date().toISOString(),
}).eq('id', embeddingRunId);
```

---

## 7. Recommended Action Plan

### Immediate (to unblock this run)

1. **Set Vercel max duration to 800** in the Vercel project settings, then trigger a new deployment. This gives Pass 2 enough headroom to complete in one shot on the next Inngest retry.

2. **Mark the stuck document as `error`** in Supabase (or delete it) so you can submit a clean new run after the deployment with the increased timeout. The current document `9dee7d41-4f38-4429-9da7-4d781363713b` has partial data from 4 incomplete Pass 2 attempts — its fact table may have duplicate partial records.

3. **Submit the document again** after the deployment completes. Monitor Vercel logs for Pass 2 to confirm it runs past the previously-killed section (BC-PROD-004) and reaches `Pass 2 complete: N total policy facts`.

### Short-term (next prompt — E014)

Refactor `process-rag-document.ts` to use per-section steps:

1. Wrap the inner body of each `for` loop in `pass-2-policies`, `pass-3-tables`, `pass-5-narrative`, `pass-6-verification`, and `generate-preambles` into individual `step.run()` calls keyed by section ID.

2. Add `rag_embedding_runs` lifecycle (create → pass runId → update on complete) to Step 11 (`generate-embeddings`), identical to the pattern already in `rag-ingestion-service.ts`.

3. After this refactor, the 800-second Vercel limit can optionally be reverted — each individual step will execute in 10–45 seconds maximum.

### Result after both fixes

- Multi-pass pipeline will process documents of any size without timeout
- Each section is checkpointed — a failure on section 25 retries from section 25, not section 1
- Every embedding produced by the pipeline will carry a `run_id` and appear in the golden-set test's embedding run selector
- The golden-set test can be used to compare specific multi-pass ingestion runs against each other

---

## 8. Summary

| Issue | Root Cause | Impact |
|---|---|---|
| Document stuck in `processing` | Pass 2 is a 29-section LLM loop inside a single `step.run()`, exceeding 300s Vercel timeout | Pipeline never completes |
| Same 19 sections re-processed each retry | Inngest has no checkpoint inside a monolithic step | Wasted LLM cost, no progress |
| Vercel 800s setting is a workaround | Solves Pass 2 for this document, but doesn't fix Passes 3, 5, 6 or preambles | Remaining passes may also timeout |
| Multi-pass embeddings not selectable in golden-set tool | Step 11 doesn't create `rag_embedding_runs` or pass `runId` | Embeddings appear as untagged/legacy |

---

## 9. Are the Claude Prompts Too Large for the Context Window?

**Short answer: No — not for the current test document. But two passes have a structural scalability ceiling for larger documents.**

### Context Window Reference

All models used in the pipeline share the same context window limit:

| Model | Pass | Context Window |
|---|---|---|
| claude-sonnet-4-5-20250929 | Pass 1, 2, 3, 5 | 200,000 tokens |
| claude-haiku-4-5-20251001 | Pass 4 | 200,000 tokens |
| claude-opus-4-6 | Pass 6 | 200,000 tokens |

**Token conversion rule of thumb:** 1 token ≈ 4 characters. For dense policy/legal prose: ~1.3–1.5 tokens per word, ~650–750 tokens per page (500 words/page).

---

### Per-Pass Analysis

#### Pass 1 — `analyzeDocumentStructure` — **Sends full document**

The entire `doc.originalText` is embedded inside the prompt:

```
<document>
${documentText}
</document>
```

- Prompt overhead (system + user, excluding document): ~900 tokens
- Max output: 8,192 tokens
- Available for document input: 200,000 − 8,192 − 900 = **~190,900 tokens**
- That translates to approximately **255 pages** of dense policy text

**For the current test document (~30–50 pages):**
~33,000 input tokens. Uses ~16% of the context window. **SAFE.**

---

#### Pass 2 — `extractPoliciesForSection` — **Sends one section at a time**

Only one section's `originalText` is sent. Even the densest policy section (e.g., BC-PROD-004 Jumbo Mortgage) is at most ~3,000–4,000 words.

- Typical input per call: ~4,000–6,000 tokens
- Max output: 16,384 tokens
- Total: ~20,000–22,000 tokens → **~10% of the context window**

**No risk regardless of document size.** Per-section calls will never approach the ceiling.

---

#### Pass 3 — `extractTableData` — **Sends one table at a time**

Only the table text (a few dozen to a few hundred lines) plus 5 lines of surrounding context.

- Typical input: ~500–2,000 tokens
- Max output: 8,192 tokens
- Total: ~8,700–10,200 tokens → **~5% of the context window**

**No risk.**

---

#### Pass 4 — `extractGlossaryAndRelationships` — **Sends full document**

The entire `doc.originalText` is sent again, identical to Pass 1:

```
<document>
${documentText}
</document>
```

- Same risk profile as Pass 1
- Available for document input: ~190,900 tokens → approximately **255 pages**
- Max output: 8,192 tokens

**For the current test document:** ~33,000 input tokens. **SAFE.**

---

#### Pass 5 — `extractNarrativeFacts` — **Sends one section at a time**

Same profile as Pass 2 — per-section call, always small.

- Typical input: ~4,000–6,000 tokens
- Max output: 16,384 tokens
- Total: ~20,000–22,000 tokens → **No risk.**

---

#### Pass 6 — `verifyExtractionCompleteness` — **Sends section text + all existing facts**

Each call sends:
1. The section's original text
2. A formatted list of all facts already extracted for that section (from Passes 2, 3, 5)

The concern is whether the facts list grows large enough to overflow. For the densest policy section with ~60 facts at ~25 tokens each:

- Section text: ~5,000 tokens
- Facts list (60 facts × 25 tokens): ~1,500 tokens
- Prompt overhead: ~800 tokens
- Total input: ~7,300 tokens
- Max output: 8,192 tokens
- Total: ~15,500 tokens → **~8% of the context window**

**No risk.** Even a section with 200 extracted facts (~5,000 tokens for the list) stays well inside the limit.

---

### Scalability Ceiling: Passes 1 and 4

The only structural risk in the architecture is Pass 1 and Pass 4, which both send the **entire document** in a single prompt. The safe limit for both passes is:

```
200,000 tokens − 8,192 (max output) − 900 (prompt overhead) = ~190,900 tokens for document text
~190,900 ÷ 700 tokens/page ≈ 273 pages
```

| Document Size | Pass 1 & 4 Status | All Other Passes |
|---|---|---|
| 1–50 pages (current test doc) | Safe — ~16% of limit used | Safe |
| 50–150 pages | Safe — up to ~53% of limit | Safe |
| 150–255 pages | Approaching limit — monitor | Safe |
| 255+ pages | **Context window overflow — will fail** | Safe |

**The pipeline config states `maxDocumentPages: 500`, but no enforcement exists in the multi-pass pipeline before sending to Pass 1 or Pass 4.** For a 500-page document, Pass 1 would attempt to send ~350,000 input tokens — nearly double the model's limit.

---

### Conclusion

**For the current test document (the BC policy manual, ~30–50 pages):** The prompts are comfortably within limits. No changes needed for this document or similar-sized policy manuals.

**For the pipeline architecture at scale:** Pass 1 and Pass 4 will fail for documents over approximately **255 pages** due to context overflow. All per-section passes (2, 3, 5, 6) are architecturally sound regardless of document size, as they operate on one section at a time.

**No immediate action required** for the current use case. If BrightHub intends to process larger documents (100+ pages), the fix is to add a document length guard before ingestion, and/or split Pass 1 and Pass 4 to operate on document chunks rather than the full text.
